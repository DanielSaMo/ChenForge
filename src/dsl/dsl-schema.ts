import type { AST } from "./core";

interface EnumOption {
  value: string;
  label: string;
  info?: string;
}

type FieldKind = "id" | "scope" | "enum" | "prefix";

interface BaseField {
  kind: FieldKind;
  child: string;
  astField?: string;
  multiple?: boolean;
  skipFirst?: boolean;
}

interface IdField extends BaseField {
  kind: "id";
  astField: string;
}

interface ScopeField extends BaseField {
  kind: "scope";
  astField: string;
  refCollection: keyof AST;
  refField: string;
}

interface EnumField extends BaseField {
  kind: "enum";
  astField: string;
  enumOptions: EnumOption[];
}

interface PrefixField extends BaseField {
  kind: "prefix";
  astField?: undefined;
}

export type AnyField = IdField | ScopeField | EnumField | PrefixField;

export const isIdField = (f: AnyField): f is IdField => f.kind === "id";
export const isScopeField = (f: AnyField): f is ScopeField =>
  f.kind === "scope";
export const isEnumField = (f: AnyField): f is EnumField =>
  f.kind === "enum";
export const isPrefixField = (f: AnyField): f is PrefixField =>
  f.kind === "prefix";

export interface NodeSpec {
  lezerNode: string;
  astCollection: keyof AST;

  fields: AnyField[];

  missingIdMessage: string;
  duplicateIdMessage: (name: string, scope?: string) => string;
  invalidScopeMessage?: (name: string) => string;

  uniqueKeyFields?: string[];

  autocompleteName?: {
    label: string;
    info: string;
  };

  scopeAutocompleteName?: {
    label: string;
    info: string;
  };
}

interface DSLSchema {
  nodes: NodeSpec[];
}

export const DSL_SCHEMA: DSLSchema = {
  nodes: [
    {
      lezerNode: "entityDecl",
      astCollection: "entities",

      fields: [
        {
          kind: "prefix",
          child: "Entity"
        },
        {
          kind: "id",
          child: "Identifier",
          astField: "name"
        }
      ],

      missingIdMessage: "Invalid entity declaration. Expected: entity name",
      duplicateIdMessage: name => `Duplicate entity name '${name}'`,

      autocompleteName: {
        label: "name",
        info: "Name of the new entity"
      },

      uniqueKeyFields: ["name"]
    },
    {
      lezerNode: "attributeDecl",
      astCollection: "attributes",

      fields: [
        {
          kind: "prefix",
          child: "Attribute"
        },
        {
          kind: "scope",
          child: "Identifier",
          astField: "entity",
          refCollection: "entities",
          refField: "name"
        },
        {
          kind: "id",
          child: "Identifier",
          astField: "names",
          multiple: true,
          skipFirst: true
        },
        {
          kind: "enum",
          child: "AttributeType",
          astField: "kind",
          enumOptions: [
            { value: "PK", label: "Primary key" },
            { value: "UK", label: "Unique" },
            { value: "OP", label: "Optional" },
            { value: "DR", label: "Derived" },
            { value: "SP", label: "Simple" },
            { value: "CP", label: "Composite" }
          ]
        }
      ],

      missingIdMessage:
        "Invalid attribute declaration. Expected: attribute entityName attributeName1, attributeName2 TYPE",
      duplicateIdMessage: (name, scope) =>
        `Duplicate attribute name '${name}' for entity '${scope ?? "?"}' and type`,

      invalidScopeMessage: name =>
        `Unknown entity '${name}' referenced in attribute declaration`,

      uniqueKeyFields: ["entity", "kind", "names"],

      scopeAutocompleteName: {
        label: "entityName",
        info: "Name of the entity"
      },

      autocompleteName: {
        label: "attributeName",
        info: "Name of the new attribute"
      }
    }
  ]
};
