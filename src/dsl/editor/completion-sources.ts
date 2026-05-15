import type {
  Completion,
  CompletionContext,
  CompletionResult
} from "@codemirror/autocomplete";
import type { SyntaxNodeRef } from "@lezer/common";
import { DSL } from "../model";
import {
  type AnyArgument,
  type CardinalityArgument,
  type NodeSpec,
  type ScopeField,
  isEnumField,
  isIdField,
  isScopeField
} from "../schema";
import { getScopeReferences } from "../schema/utils";
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
  const existing = ref.node.getChildren(scopeField.child);
  let typed = "";

  if (existing.length > 0) {
    const child = existing
      .map(item => item.node)
      .find(item => context.pos >= item.from && context.pos <= item.to);

    if (!child && (!scopeField.multiple || context.pos !== from)) return null;
    if (child) {
      typed = context.state.sliceDoc(child.from, child.to);
    }
  } else if (context.pos !== from) {
    return null;
  }

  const scopeOptions = getScopeOptions(ast, scopeField);

  if (scopeOptions.length > 0) {
    return completionResult(
      from,
      scopeOptions
        .filter(item => item.label.startsWith(typed))
        .map(item => ({
          label: item.label,
          type: "variable",
          info: item.info
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

function getScopeOptions(
  ast: any,
  scopeField: ScopeField
): { label: string; info: string }[] {
  return getScopeReferences(scopeField).flatMap(scopeRef => {
    const collection = ast[scopeRef.refCollection] as any[] | undefined;
    if (!collection) return [];

    return collection.map(item => ({
      label: String(item[scopeRef.refField]),
      info:
        scopeRef.info ??
        `Existing ${String(scopeRef.refCollection).slice(0, -1)}`
    }));
  });
}

export function suggestIdField(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  from: number,
  context: CompletionContext
): CompletionResult | null {
  const idField = spec.fields.find(isIdField);
  if (!idField || !spec.autocompleteName) return null;

  const all = ref.node.getChildren(idField.child);
  const effective = idField.skipFirst ? all.slice(1) : all;
  if (effective.length > 0 && !idField.multiple) return null;
  if (effective.length > 0 && idField.multiple && from !== context.pos) {
    return null;
  }

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
  arg: CardinalityArgument
): CompletionResult {
  return completionResult(
    from,
    arg.autocompleteOptions.map(option => ({
      label: option.value,
      type: "constant",
      info: option.info ?? option.label
    }))
  );
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
