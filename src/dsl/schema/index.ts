import type { DSLSchema } from "./types";

export type {
  AnyArgument,
  AnyField,
  CardinalityArgument,
  DSLSchema,
  IdArgument,
  NodeSpec
} from "./types";

export {
  isCardinalityArgument,
  isEnumField,
  isIdArgument,
  isIdField,
  isPrefixField,
  isScopeField
} from "./types";

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
        },
        {
          kind: "enum",
          child: "Type",
          astField: "kind",
          enumOptions: [
            { value: "ST", label: "Strong entity" },
            { value: "WK", label: "Weak entity" }
          ]
        }
      ],

      missingIdMessage:
        "Invalid entity declaration. Expected: entity name TYPE",
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
          child: "EntityRef",
          astField: "entity",
          refCollection: "entities",
          refField: "name"
        },
        {
          kind: "id",
          child: "AttributeName",
          astField: "names",
          multiple: true
        },
        {
          kind: "enum",
          child: "Type",
          astField: "kind",
          enumOptions: [
            { value: "PK", label: "Primary key" },
            { value: "UK", label: "Unique" },
            { value: "OP", label: "Optional" },
            { value: "DR", label: "Derived" },
            { value: "SP", label: "Simple" },
            { value: "CP", label: "Composite" },
            { value: "MV", label: "Multivalued" }
          ]
        }
      ],

      arguments: [
        {
          kind: "id",
          child: "CompositionArg",
          astField: "composition",
          when: { enumField: "kind", value: "CP" },
          requiredMessage:
            "Composite attribute requires a composition name after CP",
          unexpectedMessage: kind =>
            `Attribute type '${kind}' does not accept a composition name`,
          autocompleteName: {
            label: "compositionName",
            info: "Name of the composite attribute"
          },
          uniqueKey: true
        },
        {
          kind: "cardinality",
          child: "CardinalityArg",
          astField: "cardinality",
          when: { enumField: "kind", value: "MV" },
          requiredMessage:
            "Multivalued attribute requires cardinality after MV. Expected: (min,max)",
          unexpectedMessage: kind =>
            `Attribute type '${kind}' does not accept cardinality arguments`,
          autocompleteName: {
            label: "(0,n)",
            info: "Cardinality for a multivalued attribute"
          }
        }
      ],

      missingIdMessage:
        "Invalid attribute declaration. Expected: attribute entityName attributeName1, attributeName2 TYPE",
      duplicateIdMessage: (name, scope) =>
        `Duplicate attribute name '${name}' for entity '${scope ?? "?"}'`,

      invalidScopeMessage: name =>
        `Unknown entity '${name}' referenced in attribute declaration`,

      uniqueKeyFields: ["entity", "names"],

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
