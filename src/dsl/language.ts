import {
  LRLanguage,
  LanguageSupport,
  syntaxTree
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import type {
  CompletionContext,
  CompletionResult,
  Completion
} from "@codemirror/autocomplete";
import type { SyntaxNodeRef, SyntaxNode } from "@lezer/common";
import type { EditorState } from "@codemirror/state";

import { parser } from "./dsl-parser";
import { DSL, type AST } from "./core";
import { dslLinter } from "./linter";
import {
  DSL_SCHEMA,
  type NodeSpec,
  isScopeField,
  isIdField,
  isEnumField,
  isPrefixField
} from "./dsl-schema";
import { parseDSL } from "./parse";

type SpecAtPosition = { spec: NodeSpec; ref: SyntaxNodeRef };

function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(s => s.lezerNode === nodeName);
}

function createCompletionResult(
  from: number,
  options: Completion[]
): CompletionResult {
  return { from, options };
}

function keywordFallback(from: number): CompletionResult {
  const options: Completion[] = Object.values(DSL.keywords).map(k => ({
    label: k.label,
    type: "keyword",
    info: k.info
  }));

  return createCompletionResult(from, options);
}

function toRef(node: SyntaxNode): SyntaxNodeRef {
  return {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;
}

function getSpecAtPosition(context: CompletionContext): SpecAtPosition | null {
  const tree = syntaxTree(context.state);
  const pos = context.pos;

  let node = tree.resolve(pos, -1);
  let spec = specByLezerNode(node.type.name);

  while (!spec && node.parent) {
    node = node.parent;
    spec = specByLezerNode(node.type.name);
  }

  if (!spec) return null;

  return { spec, ref: toRef(node) };
}

function hasAllPrefixes(spec: NodeSpec, ref: SyntaxNodeRef): boolean {
  const prefixFields = spec.fields.filter(isPrefixField);
  return prefixFields.every(prefix => !!ref.node.getChild(prefix.child));
}

let lastDocText: string | null = null;
let lastAst: AST | null = null;

function getParsedAST(state: EditorState): AST {
  const text = state.doc.toString();
  if (text === lastDocText && lastAst) return lastAst;

  const ast = parseDSL(text);
  lastDocText = text;
  lastAst = ast;
  return ast;
}

function suggestScopeField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  const scopeField = spec.fields.find(isScopeField);
  if (!scopeField) return null;

  const existing = ref.node.getChildren(scopeField.child);
  if (existing.length > 0) return null;

  const ast = getParsedAST(context.state) as any;
  const collection = ast[scopeField.refCollection] as any[] | undefined;

  if (collection && collection.length > 0) {
    const options: Completion[] = collection.map(item => ({
      label: String(item[scopeField.refField]),
      type: "variable",
      info: `Existing ${String(scopeField.refCollection).slice(0, -1)}`
    }));

    return createCompletionResult(from, options);
  }

  if (spec.scopeAutocompleteName) {
    const { label, info } = spec.scopeAutocompleteName;
    return createCompletionResult(from, [
      {
        label,
        type: "variable",
        info
      }
    ]);
  }

  return null;
}

function suggestIdField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number
): CompletionResult | null {
  const idField = spec.fields.find(isIdField);
  if (!idField || !spec.autocompleteName) return null;

  const all = ref.node.getChildren(idField.child);
  const effective = idField.skipFirst ? all.slice(1) : all;

  if (effective.length > 0) return null;

  const base = spec.autocompleteName.label;

  const options: Completion[] = [
    {
      label: base,
      type: "variable",
      info: spec.autocompleteName.info
    }
  ];

  if (idField.multiple) {
    options.push({
      label: `${base}1, ${base}2`,
      type: "variable",
      info: `Multiple ${base}s separated by commas`
    });
  }

  return createCompletionResult(from, options);
}

function suggestEnumField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number
): CompletionResult | null {
  const enumField = spec.fields.find(isEnumField);
  if (!enumField || !enumField.enumOptions?.length) return null;

  const existing = ref.node.getChildren(enumField.child);
  if (existing.length > 0) return null;

  const options: Completion[] = enumField.enumOptions.map(opt => ({
    label: opt.value,
    type: "type",
    info: opt.info ?? opt.label
  }));

  return createCompletionResult(from, options);
}

function isCursorAtEndOfLine(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos);
  return pos === line.to;
}

function isCommentLine(state: EditorState, pos: number): boolean {
  const tree = syntaxTree(state);
  const line = state.doc.lineAt(pos);

  let isComment = false;

  tree.iterate({
    from: line.from,
    to: line.to,
    enter(cursor) {
      if (cursor.name === "LineComment") {
        isComment = true;
        return false;
      }
    }
  });

  return isComment;
}

function isAfterCompletedStatement(state: EditorState, pos: number): boolean {
  const tree = syntaxTree(state);
  const line = state.doc.lineAt(pos);

  let firstDeclEnd = -1;

  tree.iterate({
    from: line.from,
    to: line.to,
    enter(cursor) {
      if (specByLezerNode(cursor.name)) {
        if (firstDeclEnd === -1 || cursor.to < firstDeclEnd) {
          firstDeclEnd = cursor.to;
        }
      }
    }
  });

  return firstDeclEnd !== -1 && pos > firstDeclEnd;
}

function autocompleteFromSchema(
  context: CompletionContext
): CompletionResult | null {
  const state = context.state;
  const pos = context.pos;

  if (!isCursorAtEndOfLine(state, pos)) {
    return null;
  }

  if (isCommentLine(state, pos)) {
    return null;
  }

  if (isAfterCompletedStatement(state, pos)) {
    return null;
  }

  const word = context.matchBefore(/[\w\u00C0-\uFFFF]+/u);
  const from = word ? word.from : pos;

  const specInfo = getSpecAtPosition(context);
  if (!specInfo) return keywordFallback(from);

  const { spec, ref } = specInfo;

  if (!hasAllPrefixes(spec, ref)) return keywordFallback(from);

  return (
    suggestScopeField(spec, ref, from, context) ??
    suggestIdField(spec, ref, from) ??
    suggestEnumField(spec, ref, from) ??
    keywordFallback(from)
  );
}

const dslLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Entity: t.keyword,
        Attribute: t.keyword,
        Identifier: t.variableName,
        AttributeType: t.typeName,
        LineComment: t.lineComment
      })
    ]
  }),
  languageData: {
    autocomplete: autocompleteFromSchema
  }
});

export function dsl(): LanguageSupport {
  return new LanguageSupport(dslLanguage, [dslLinter]);
}
