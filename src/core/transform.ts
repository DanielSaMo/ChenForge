import type { AST } from "../dsl/core";
import type { GraphModel, GraphAttribute } from "./graph";

export function astToGraph(ast: AST): GraphModel {
  return {
    entities: ast.entities.map(ent => ({
      id: `ent_${ent.name}`,
      name: ent.name
    })),

    attributes: ast.attributes.flatMap(attr => astAttributeToGraph(attr))
  };
}

function astAttributeToGraph(attr: AST["attributes"][number]): GraphAttribute[] {
  if (attr.kind === "CP") {
    return [
      {
        id: `attr_${attr.entity}_${attr.kind}_${attr.names.join("_")}`,
        entityId: `ent_${attr.entity}`,
        names: attr.names,
        kind: attr.kind
      }
    ];
  }

  return attr.names.map(name => ({
    id: `attr_${attr.entity}_${attr.kind}_${name}`,
    entityId: `ent_${attr.entity}`,
    names: [name],
    kind: attr.kind
  }));
}
