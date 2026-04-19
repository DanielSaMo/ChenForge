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
import type { SyntaxNodeRef } from "@lezer/common";
import { parser } from "./dsl-parser";
import { DSL } from "./core";
import { dslLinter } from "./linter";
import { DSL_SCHEMA, type NodeSpec } from "./dsl-schema";
import { parseDSL } from "./parse";

function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(s => s.lezerNode === nodeName);
}

function keywordFallback(from: number): CompletionResult {
  return {
    from,
    options: DSL.keywords.map(k => ({
      label: k,
      type: "keyword",
      info: "DSL keyword"
    }))
  };
}

function getSpecAtPosition(
  context: CompletionContext
): { spec: NodeSpec; ref: SyntaxNodeRef } | null {
  const tree = syntaxTree(context.state);
  const pos = context.pos;

  let node = tree.resolve(pos, -1);
  let spec = specByLezerNode(node.type.name);

  while (!spec && node.parent) {
    node = node.parent;
    spec = specByLezerNode(node.type.name);
  }

  if (!spec) return null;

  const ref: SyntaxNodeRef = {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;

  return { spec, ref };
}

function hasAllPrefixes(spec: NodeSpec, ref: SyntaxNodeRef): boolean {
  return spec.prefixChildren.every(prefix => !!ref.node.getChild(prefix));
}

function suggestScopeField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  if (!spec.scopeField) return null;

  const sf = spec.scopeField;
  const existing = ref.node.getChildren(sf.child);

  if (existing.length > 0) return null;

  const doc = context.state.doc.toString();
  const ast = parseDSL(doc);
  const collection = (ast as any)[sf.refCollection] as any[];

  if (collection.length > 0) {
    const options: Completion[] = collection.map(item => ({
      label: String(item[sf.refField]),
      type: "variable",
      info: `Existing ${String(sf.refCollection).slice(0, -1)}`
    }));

    return { from, options };
  }

  if (spec.scopeAutocompleteName) {
    return {
      from,
      options: [
        {
          label: spec.scopeAutocompleteName.label,
          type: "variable",
          info: spec.scopeAutocompleteName.info
        }
      ]
    };
  }

  return null;
}

function suggestIdField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number
): CompletionResult | null {
  if (!spec.idField || !spec.autocompleteName) return null;

  const idf = spec.idField;

  const all = ref.node.getChildren(idf.child);
  const effective = idf.skipFirst ? all.slice(1) : all;

  const hasId = effective.length > 0;
  if (hasId) return null;

  const base = spec.autocompleteName.label;

  const options: Completion[] = [
    {
      label: base,
      type: "variable",
      info: spec.autocompleteName.info
    }
  ];

  if (idf.multiple) {
    options.push({
      label: `${base}1, ${base}2`,
      type: "variable",
      info: `Multiple ${base}s separated by commas`
    });
  }

  return { from, options };
}

function suggestExtraEnumField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number
): CompletionResult | null {
  if (!spec.extraFields) return null;

  for (const f of spec.extraFields) {
    const existing = ref.node.getChildren(f.child);
    if (existing.length > 0) continue;

    if (!f.enumOptions || f.enumOptions.length === 0) continue;

    const options: Completion[] = f.enumOptions.map(opt => ({
      label: opt.value,
      type: "type",
      info: opt.info ?? opt.label
    }));

    return { from, options };
  }

  return null;
}

function autocompleteFromSchema(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/[\w\u00C0-\uFFFF]+/u);
  const from = word ? word.from : context.pos;

  const specInfo = getSpecAtPosition(context);
  if (!specInfo) return keywordFallback(from);

  const { spec, ref } = specInfo;

  if (!hasAllPrefixes(spec, ref)) return keywordFallback(from);

  const scopeResult = suggestScopeField(spec, ref, from, context);
  if (scopeResult) return scopeResult;

  const idResult = suggestIdField(spec, ref, from);
  if (idResult) return idResult;

  const extraResult = suggestExtraEnumField(spec, ref, from);
  if (extraResult) return extraResult;

  return keywordFallback(from);
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
