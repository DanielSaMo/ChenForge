interface EntityNode {
  name: string;
}

export type AttributeKind = "PK" | "UK" | "OP" | "DR" | "SP" | "CP";

interface AttributeNode {
  entity: string;
  names: string[];
  kind: AttributeKind;
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
  }
} as const;
