export interface EntityNode {
  name: string;
}

export interface ParseError {
  message: string;
  from: number;
  to: number;
}

export interface AST {
  entities: EntityNode[];
  errors: ParseError[];
}

export const DSL = {
  keywords: ["entity"] as const
};
