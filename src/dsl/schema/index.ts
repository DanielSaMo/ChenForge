import type { DSLSchema } from "./types";

export type {
  AnyArgument,
  AnyField,
  CardinalityArgument,
  DSLSchema,
  IdField,
  IdArgument,
  NodeSpec,
  ScopeField,
  ScopeReference
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

      uniqueKeyFields: ["name"],
      uniqueScope: "modelNames",
      completionOrder: ["Entity", "Identifier", "Type"]
    },

    {
      lezerNode: "relationshipDecl",
      astCollection: "relationships",

      fields: [
        {
          kind: "prefix",
          child: "Relationship"
        },
        {
          kind: "scope",
          child: "EntityRef",
          astField: "entities",
          multiple: true,
          refCollection: "entities",
          refField: "name"
        },
        {
          kind: "id",
          child: "RelationshipName",
          astField: "name"
        },
        {
          kind: "enum",
          child: "Type",
          astField: "kind",
          enumOptions: [
            { value: "ST", label: "Strong relationship" },
            { value: "EX", label: "Existence-dependent weak relationship" },
            { value: "ID", label: "Identifying weak relationship" }
          ]
        }
      ],

      arguments: [
        {
          kind: "cardinality",
          child: "CardinalityArg",
          astField: "cardinalities",
          multiple: true,
          allowManyMin: true,
          expectedCount: 2,
          requiredMessage:
            "Missing cardinality after entity. Expected: (min,max)",
          unexpectedMessage: () =>
            "Relationship cardinality must follow an entity reference",
          autocompleteOptions: [
            {
              value: "(1,1)",
              label: "(1,1)",
              info: "Exactly one participating entity instance"
            },
            {
              value: "(0,1)",
              label: "(0,1)",
              info: "Zero or one participating entity instance"
            },
            {
              value: "(1,n)",
              label: "(1,n)",
              info: "One or more participating entity instances"
            },
            {
              value: "(0,n)",
              label: "(0,n)",
              info: "Zero or more participating entity instances"
            },
            {
              value: "(n,m)",
              label: "(n,m)",
              info: "Many-to-many notation; normalized internally"
            }
          ]
        }
      ],

      missingIdMessage:
        "Invalid relationship declaration. Expected: relationship entityNameA (min,max) entityNameB (min,max) relationshipName TYPE",
      duplicateIdMessage: name => `Duplicate relationship name '${name}'`,

      invalidScopeMessage: name =>
        `Unknown entity '${name}' referenced in relationship declaration`,

      uniqueKeyFields: ["name"],
      uniqueScope: "modelNames",
      completionOrder: [
        "Relationship",
        "EntityRef",
        "CardinalityArg",
        "EntityRef",
        "CardinalityArg",
        "RelationshipName",
        "Type"
      ],

      scopeAutocompleteName: {
        label: "entityName",
        info: "Name of the participating entity"
      },

      autocompleteName: {
        label: "relationshipName",
        info: "Name of the new relationship"
      }
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
          refCollections: [
            {
              refCollection: "entities",
              refField: "name",
              info: "Existing entity"
            },
            {
              refCollection: "relationships",
              refField: "name",
              info: "Existing relationship"
            }
          ]
        },
        {
          kind: "id",
          child: "AttributeName",
          astField: "names",
          multiple: true,
          repeatSeparator: ","
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
          autocompleteOptions: [
            {
              value: "(0,n)",
              label: "(0,n)",
              info: "Optional multivalued attribute"
            },
            {
              value: "(1,n)",
              label: "(1,n)",
              info: "Required multivalued attribute"
            },
            {
              value: "(0,1)",
              label: "(0,1)",
              info: "Optional single value, accepted by the cardinality model"
            }
          ]
        }
      ],

      missingIdMessage:
        "Invalid attribute declaration. Expected: attribute entityName attributeName1, attributeName2 TYPE",
      duplicateIdMessage: (name, scope) =>
        `Duplicate attribute name '${name}' for entity '${scope ?? "?"}'`,

      invalidScopeMessage: name =>
        `Unknown entity or relationship '${name}' referenced in attribute declaration`,

      uniqueKeyFields: ["entity", "names"],
      completionOrder: ["Attribute", "EntityRef", "AttributeName", "Type"],

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
