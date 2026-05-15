import type { AST } from "../model";

export interface EnumOption {
  value: string;
  label: string;
  info?: string;
}

export type FieldKind = "id" | "scope" | "enum" | "prefix";
export type ArgumentKind = "id" | "cardinality";

export interface BaseField {
  kind: FieldKind;
  child: string;
  astField?: string;
  multiple?: boolean;
  skipFirst?: boolean;
}

export interface IdField extends BaseField {
  kind: "id";
  astField: string;
  repeatSeparator?: string;
}

export interface ScopeField extends BaseField {
  kind: "scope";
  astField: string;
  refCollection?: keyof AST;
  refField?: string;
  refCollections?: ScopeReference[];
}

export interface EnumField extends BaseField {
  kind: "enum";
  astField: string;
  enumOptions: EnumOption[];
}

export interface PrefixField extends BaseField {
  kind: "prefix";
  astField?: undefined;
}

export type AnyField = IdField | ScopeField | EnumField | PrefixField;

export interface ArgumentWhen {
  enumField: string;
  value: string;
}

export interface BaseArgument {
  kind: ArgumentKind;
  child: string;
  astField: string;
  when?: ArgumentWhen;
  requiredMessage: string;
  unexpectedMessage: (kind: string) => string;
  autocompleteName?: {
    label: string;
    info: string;
  };
  uniqueKey?: boolean;
}

export interface IdArgument extends BaseArgument {
  kind: "id";
}

export interface CardinalityArgument extends BaseArgument {
  kind: "cardinality";
  multiple?: boolean;
  allowManyMin?: boolean;
  expectedCount?: number;
  autocompleteOptions: EnumOption[];
}

export type AnyArgument = IdArgument | CardinalityArgument;

export interface NodeSpec {
  lezerNode: string;
  astCollection: keyof AST;

  fields: AnyField[];
  arguments?: AnyArgument[];

  missingIdMessage: string;
  duplicateIdMessage: (name: string, scope?: string) => string;
  invalidScopeMessage?: (name: string) => string;

  uniqueKeyFields?: string[];
  uniqueScope?: string;

  autocompleteName?: {
    label: string;
    info: string;
  };

  scopeAutocompleteName?: {
    label: string;
    info: string;
  };

  completionOrder: string[];
}

export interface ScopeReference {
  refCollection: keyof AST;
  refField: string;
  info?: string;
}

export interface DSLSchema {
  nodes: NodeSpec[];
}

export const isIdField = (field: AnyField): field is IdField =>
  field.kind === "id";

export const isScopeField = (field: AnyField): field is ScopeField =>
  field.kind === "scope";

export const isEnumField = (field: AnyField): field is EnumField =>
  field.kind === "enum";

export const isPrefixField = (field: AnyField): field is PrefixField =>
  field.kind === "prefix";

export const isIdArgument = (arg: AnyArgument): arg is IdArgument =>
  arg.kind === "id";

export const isCardinalityArgument = (
  arg: AnyArgument
): arg is CardinalityArgument => arg.kind === "cardinality";
