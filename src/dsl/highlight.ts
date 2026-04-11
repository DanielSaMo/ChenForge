import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const dslHighlight = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: tags.keyword,
      color: "#ff79c6"
    },
    {
      tag: tags.variableName,
      color: "#50fa7b"
    }
  ])
);
