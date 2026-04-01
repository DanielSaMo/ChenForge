import type { AST } from "../dsl/ast";
import type { GraphModel } from "./graph";

export function astToGraph(ast: AST): GraphModel {
  return {
    entities: ast.entities.map(name => ({
      id: `ent_${name}`,
      name
    }))
  };
}
