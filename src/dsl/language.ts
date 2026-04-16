import {
  LRLanguage,
  LanguageSupport,
  syntaxTree
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import type {
  CompletionContext,
  CompletionResult
} from "@codemirror/autocomplete";
import type { SyntaxNodeRef } from "@lezer/common";
import { parser } from "./dsl-parser";
import { DSL } from "./core";
import { dslLinter } from "./linter";
import { DSL_SCHEMA, type NodeSpec } from "./dsl-schema";

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

function shouldSuggestFromSpec(node: SyntaxNodeRef, spec: NodeSpec): boolean {
  const hasAllPrefixes = spec.prefixChildren.every(prefix =>
    !!node.node.getChild(prefix)
  );

  const hasId = !!node.node.getChild(spec.idField.child);

  return hasAllPrefixes && !hasId;
}

function autocompleteFromSchema(context: CompletionContext): CompletionResult | null {
  const tree = syntaxTree(context.state);
  const pos = context.pos;

  const word = context.matchBefore(/[\w\u00C0-\uFFFF]+/u);
  const from = word ? word.from : pos;

  let node = tree.resolve(pos, -1);

  let spec = specByLezerNode(node.type.name);
  while (!spec && node.parent) {
    node = node.parent;
    spec = specByLezerNode(node.type.name);
  }

  if (!spec) return keywordFallback(from);

  const ref: SyntaxNodeRef = {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;

  if (shouldSuggestFromSpec(ref, spec)) {
    return {
      from,
      options: [
        {
          label: spec.autocompleteName.label,
          type: "variable",
          info: spec.autocompleteName.info
        }
      ]
    };
  }

  return keywordFallback(from);
}

const dslLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Entity: t.keyword,
        Identifier: t.variableName,
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
