import type { AST } from "../dsl/core";
import type { GraphModel } from "./graph";

export function astToGraph(ast: AST): GraphModel {
  return {
    entities: ast.entities.map(entitie => ({
      id: `ent_${entitie.name}`,
      name: entitie.name
    }))
  };
}
