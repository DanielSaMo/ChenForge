export type EntityKind = "ST" | "WK";
export type AttributeKind = "PK" | "UK" | "OP" | "DR" | "SP" | "CP" | "MV";
export type RelationshipKind = "ST" | "EX" | "ID";

export type ManyCardinalityId = "many";
export type CardinalityValue = number | ManyCardinalityId;

interface EntityNode {
  name: string;
  kind: EntityKind;
}

export interface AttributeCardinality {
  min: number;
  max: CardinalityValue;
}

interface AttributeNode {
  entity: string;
  names: string[];
  kind: AttributeKind;
  composition?: string;
  cardinality?: AttributeCardinality;
}

export interface RelationshipCardinality {
  min: CardinalityValue;
  max: CardinalityValue;
}

interface RelationshipNode {
  entities: string[];
  cardinalities: RelationshipCardinality[];
  name: string;
  kind: RelationshipKind;
}

export interface ParseError {
  message: string;
  from: number;
  to: number;
}

export interface AST {
  entities: EntityNode[];
  relationships: RelationshipNode[];
  attributes: AttributeNode[];
  errors: ParseError[];
}

export const CardinalityConfig = {
  manyId: "many" as ManyCardinalityId,
  dslSymbols: ["n", "m", "N", "M"] as string[],

  display: {
    node: {
      single: "n",
      first: "n",
      second: "m"
    },
    relationship: {
      single: "N",
      first: "N",
      second: "M"
    }
  }
} as const;

export const DSL = {
  keywords: {
    entity: {
      label: "entity",
      info: "Declares a new entity in the data model"
    },
    attribute: {
      label: "attribute",
      info: "Declares one or more attributes for an existing entity"
    },
    relationship: {
      label: "relationship",
      info: "Declares a relationship between two existing entities"
    }
  },
  invalidDeclarationMessage:
    "Invalid declaration. Expected: entity, attribute or relationship"
} as const;
