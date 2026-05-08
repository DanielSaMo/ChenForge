import type {
  Completion,
  CompletionContext,
  CompletionResult
} from "@codemirror/autocomplete";
import type { SyntaxNodeRef } from "@lezer/common";
import { DSL } from "../model";
import {
  type AnyArgument,
  type NodeSpec,
  isEnumField,
  isIdField,
  isScopeField
} from "../schema";
import { getParsedAST } from "./completion-context";

export function keywordFallback(from: number): CompletionResult {
  return completionResult(
    from,
    Object.values(DSL.keywords).map(keyword => ({
      label: keyword.label,
      type: "keyword",
      info: keyword.info
    }))
  );
}

export function suggestScopeField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  const scopeField = spec.fields.find(isScopeField);
  if (!scopeField) return null;

  const ast = getParsedAST(context.state) as any;
  const collection = ast[scopeField.refCollection] as any[] | undefined;
  const existing = ref.node.getChildren(scopeField.child);
  let typed = "";

  if (existing.length > 0) {
    const child = existing[0].node;
    if (!(context.pos >= child.from && context.pos <= child.to)) return null;
    typed = context.state.sliceDoc(child.from, child.to);
  } else if (context.pos !== from) {
    return null;
  }

  if (collection && collection.length > 0) {
    return completionResult(
      from,
      collection
        .filter(item => String(item[scopeField.refField]).startsWith(typed))
        .map(item => ({
          label: String(item[scopeField.refField]),
          type: "variable",
          info: `Existing ${String(scopeField.refCollection).slice(0, -1)}`
        }))
    );
  }

  if (!spec.scopeAutocompleteName) return null;

  return completionResult(from, [
    {
      label: spec.scopeAutocompleteName.label,
      type: "variable",
      info: spec.scopeAutocompleteName.info
    }
  ]);
}

export function suggestIdField(
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

  return completionResult(from, options);
}

export function suggestEnumField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number
): CompletionResult | null {
  const enumField = spec.fields.find(isEnumField);
  if (!enumField || !enumField.enumOptions?.length) return null;
  if (ref.node.getChildren(enumField.child).length > 0) return null;

  return completionResult(
    from,
    enumField.enumOptions.map(opt => ({
      label: opt.value,
      type: "type",
      info: opt.info ?? opt.label
    }))
  );
}

export function suggestCardinalityArgument(
  from: number,
  arg: AnyArgument
): CompletionResult {
  return completionResult(from, [
    {
      label: arg.autocompleteName?.label ?? "(0,n)",
      type: "constant",
      info: arg.autocompleteName?.info
    },
    {
      label: "(1,n)",
      type: "constant",
      info: "At least one value, with no fixed upper limit"
    },
    {
      label: "(0,1)",
      type: "constant",
      info: "Zero or one value"
    }
  ]);
}

export function suggestNamedArgument(
  from: number,
  arg: AnyArgument
): CompletionResult | null {
  if (!arg.autocompleteName) return null;

  return completionResult(from, [
    {
      label: arg.autocompleteName.label,
      type: "variable",
      info: arg.autocompleteName.info
    }
  ]);
}

function completionResult(
  from: number,
  options: Completion[]
): CompletionResult {
  return { from, options };
}
