import { LRLanguage, LanguageSupport, syntaxTree } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { parser } from "./dsl-parser";
import { DSL } from "./core";
import { dslLinter } from "./linter";

function shouldSuggestEntityName(context: CompletionContext): boolean {
  const tree = syntaxTree(context.state);
  const pos = context.pos;

  let suggest = false;

  tree.iterate({
    enter(node) {
      if (node.type.name === "entityDecl" && node.from <= pos && node.to >= pos) {
        const hasEntity = !!node.node.getChild("Entity");
        const hasIdentifier = !!node.node.getChild("Identifier");

        if (hasEntity && !hasIdentifier) {
          suggest = true;
        }
      }
    }
  });

  return suggest;
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
    autocomplete(context: CompletionContext): CompletionResult | null {
      const word = context.matchBefore(/[\w\u00C0-\uFFFF]+/u);
      const from = word ? word.from : context.pos;

      if (shouldSuggestEntityName(context)) {
        return {
          from,
          options: [
            {
              label: "name",
              type: "variable",
              info: "Name of the new entity"
            }
          ]
        };
      }

      const options = DSL.keywords.map(k => ({
        label: k,
        type: "keyword" as const,
        info: "DSL keyword"
      }));

      return {
        from,
        options
      };
    }
  }
});

export function dsl(): LanguageSupport {
  return new LanguageSupport(dslLanguage, [dslLinter]);
}
