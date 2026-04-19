import type { AST } from "./core";

interface FieldSpec {
  child: string;
  astField: string;
  multiple?: boolean;
  skipFirst?: boolean;
}

interface ScopeFieldSpec extends FieldSpec {
  refCollection: keyof AST;
  refField: string;
}

interface EnumOption {
  value: string;
  label: string;
  info?: string;
}

interface ExtraFieldSpec extends FieldSpec {
  enumOptions?: EnumOption[];
}

export interface NodeSpec {
  lezerNode: string;
  astCollection: keyof AST;

  idField?: FieldSpec;
  scopeField?: ScopeFieldSpec;
  extraFields?: ExtraFieldSpec[];

  prefixChildren: string[];

  missingIdMessage: string;
  duplicateIdMessage: (name: string, scope?: string) => string;

  autocompleteName?: {
    label: string;
    info: string;
  };

  scopeAutocompleteName?: {
    label: string;
    info: string;
  };

  invalidScopeMessage?: (name: string) => string;
  uniqueKeyFields?: string[];
}

interface DSLSchema {
  nodes: NodeSpec[];
}

export const DSL_SCHEMA: DSLSchema = {
  nodes: [
    {
      lezerNode: "entityDecl",
      astCollection: "entities",

      idField: {
        child: "Identifier",
        astField: "name"
      },

      prefixChildren: ["Entity"],

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

      scopeField: {
        child: "Identifier",
        astField: "entity",
        refCollection: "entities",
        refField: "name"
      },

      idField: {
        child: "Identifier",
        astField: "names",
        multiple: true,
        skipFirst: true
      },

      extraFields: [
        {
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

      prefixChildren: ["Attribute"],

      missingIdMessage:
        "Invalid attribute declaration. Expected: attribute entityName attributeName1, attributeName2 PK",
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
        info: "Name of the attribute"
      }
    }
  ]
};
