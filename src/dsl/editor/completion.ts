import type {
  CompletionContext,
  CompletionResult
} from "@codemirror/autocomplete";
import {
  getSpecAtPosition,
  hasAllPrefixes,
  isAfterCompletedStatement,
  isCommentLine,
  isCursorAtEndOfLine
} from "./completion-context";
import {
  keywordFallback,
  suggestArgumentField,
  suggestEnumField,
  suggestIdField,
  suggestScopeField
} from "./completion-sources";

export function autocompleteFromSchema(
  context: CompletionContext
): CompletionResult | null {
  const state = context.state;
  const pos = context.pos;

  if (isCommentLine(state, pos)) {
    return null;
  }

  const word = context.matchBefore(/[\w\u00C0-\uFFFF]+/u);
  const from = word ? word.from : pos;
  const specInfo = getSpecAtPosition(context);

  if (!specInfo) {
    if (isAfterCompletedStatement(state, pos)) return null;
    return keywordFallback(from);
  }

  const { spec, ref } = specInfo;

  if (!isCursorAtEndOfLine(state, pos) && isAfterCompletedStatement(state, pos)) {
    return suggestScopeField(spec, ref, from, context) ??
      suggestEnumField(spec, ref, from)
  }

  if (!hasAllPrefixes(spec, ref, pos)) return keywordFallback(from);

  return (
    suggestScopeField(spec, ref, from, context) ??
    suggestIdField(spec, ref, from) ??
    suggestEnumField(spec, ref, from) ??
    suggestArgumentField(spec, ref, from, context)
  );
}
