import type { AST } from "../model";
import { DSL_SCHEMA, type NodeSpec } from "./index";

export function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(spec => spec.lezerNode === nodeName);
}

export function createEmptyAST(): AST {
  const ast: Partial<AST> = { errors: [] };

  for (const spec of DSL_SCHEMA.nodes) {
    const key = spec.astCollection;
    if (!(ast as any)[key]) {
      (ast as any)[key] = [];
    }
  }

  return ast as AST;
}
