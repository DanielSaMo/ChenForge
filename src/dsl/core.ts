export interface EntityNode {
  name: string;
}

export interface AST {
  entities: EntityNode[];
}

export const DSL = {
  keywords: ["entity"] as const,
};
