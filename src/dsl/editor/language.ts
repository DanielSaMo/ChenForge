import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { autocompleteFromSchema } from "./completion";
import { parser } from "../grammar/dsl-parser";
import { dslLinter } from "./linter";

const dslLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Entity: t.keyword,
        Attribute: t.keyword,
        Identifier: t.variableName,
        Number: t.number,
        "CardinalityArg/Identifier": t.atom,
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
