import type {
  CompletionContext,
  CompletionResult
} from "@codemirror/autocomplete";
import {
  getSpecAtPosition,
  isCommentLine
} from "./completion-context";
import {
  keywordFallback,
  suggestCardinalityArgument,
  suggestEnumField,
  suggestIdField,
  suggestNamedArgument,
  suggestScopeField
} from "./completion-sources";
import {
  isCardinalityArgument,
  isEnumField,
  isIdField,
  isScopeField,
  type NodeSpec
} from "../schema";
import type { SyntaxNodeRef } from "@lezer/common";

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
    return keywordFallback(from);
  }

  const { spec, ref, missingChild } = specInfo;

  if (missingChild) {
    const targeted = suggestForMissingChild(spec, ref, missingChild, from, context);
    if (targeted) return targeted;
  }

  const deduced = suggestArgumentFromEnum(spec, ref, from, context);
  if (deduced) return deduced;

  return null;
}

export function suggestForMissingChild(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  missingChild: string,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  const field = spec.fields.find(f => f.child === missingChild);

  if (field && isScopeField(field)) {
    return suggestScopeField(spec, ref, from, context);
  }

  if (field && isIdField(field)) {
    return suggestIdField(spec, ref, from);
  }

  if (field && isEnumField(field)) {
    return suggestEnumField(spec, ref, from);
  }

  return null;
}

function suggestArgumentFromEnum(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  const enumField = spec.fields.find(isEnumField);
  if (!enumField) return null;

  const enumNode = ref.node.getChild(enumField.child);
  if (!enumNode) return null;

  const enumValue = context.state.sliceDoc(enumNode.from, enumNode.to);

  const arg = (spec.arguments ?? []).find(a => a.when.value === enumValue);
  if (!arg) return null;

  if (!ref.node.getChild(arg.child)) {
    return isCardinalityArgument(arg)
      ? suggestCardinalityArgument(from, arg)
      : suggestNamedArgument(from, arg);
  }

  return null;
}
