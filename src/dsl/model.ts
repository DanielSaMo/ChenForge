export type EntityKind = "ST" | "WK";

interface EntityNode {
  name: string;
  kind: EntityKind;
}

export type AttributeKind = "PK" | "UK" | "OP" | "DR" | "SP" | "CP" | "MV";

export interface AttributeCardinality {
  min: number;
  max: number | "n";
}

interface AttributeNode {
  entity: string;
  names: string[];
  kind: AttributeKind;
  composition?: string;
  cardinality?: AttributeCardinality;
}

export interface ParseError {
  message: string;
  from: number;
  to: number;
}

export interface AST {
  entities: EntityNode[];
  attributes: AttributeNode[];
  errors: ParseError[];
}

export const DSL = {
  keywords: {
    entity: {
      label: "entity",
      info: "Declares a new entity in the data model"
    },
    attribute: {
      label: "attribute",
      info: "Declares one or more attributes for an existing entity"
    }
  },
  invalidDeclarationMessage: "Invalid declaration. Expected: entity or attribute"
} as const;
