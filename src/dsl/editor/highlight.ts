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
    },
    {
      tag: tags.typeName,
      color: "#8be9fd"
    },
    {
      tag: tags.number,
      color: "#f1fa8c",
      fontWeight: "600"
    },
    {
      tag: tags.lineComment,
      color: "#6272a4",
      fontStyle: "italic"
    },
    {
      tag: tags.invalid,
      color: "#ff5555",
      textDecoration: "underline wavy"
    }
  ])
);
