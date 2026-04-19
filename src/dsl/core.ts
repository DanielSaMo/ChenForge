interface EntityNode {
  name: string;
}

type AttributeKind = "PK" | "UK" | "OP" | "DR" | "SP" | "CP";

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
  keywords: ["entity", "attribute"] as const
};
