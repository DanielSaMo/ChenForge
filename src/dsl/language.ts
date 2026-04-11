import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { parser } from "./dsl-parser";
import { DSL } from "./core";
import { parseDSL } from "./parse";

const dslLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Entity: t.keyword,
        Identifier: t.variableName
      })
    ]
  }),

  languageData: {
    autocomplete(context: CompletionContext): CompletionResult | null {
      const word = context.matchBefore(/\w*/);
      if (!word) return null;

      const doc = context.state.doc.toString();
      const ast = parseDSL(doc);

      const options = [
        ...DSL.keywords.map(k => ({
          label: k,
          type: "keyword" as const,
          info: "Palabra clave del DSL"
        })),
        ...ast.entities.map(e => ({
          label: e.name,
          type: "variable" as const,
          info: "Entidad definida en este documento"
        }))
      ];

      return {
        from: word.from,
        options
      };
    }
  }
});

export function dsl(): LanguageSupport {
  return new LanguageSupport(dslLanguage);
}
