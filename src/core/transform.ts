import type { AST } from "../dsl/core";
import type { GraphModel, GraphEntity, GraphAttribute } from "./graph";

export function astToGraph(ast: AST): GraphModel {
  const uniqueEntities = dedupeEntities(ast.entities);
  const uniqueAttributes = dedupeAttributes(ast.attributes);

  return {
    entities: uniqueEntities.map(toGraphEntity),
    attributes: uniqueAttributes.flatMap(astAttributeToGraph)
  };
}

function dedupeEntities(entities: AST["entities"]): AST["entities"] {
  const seen = new Set<string>();
  const result: AST["entities"] = [];

  for (const ent of entities) {
    if (!seen.has(ent.name)) {
      seen.add(ent.name);
      result.push(ent);
    }
  }

  return result;
}

function dedupeAttributes(attributes: AST["attributes"]): AST["attributes"] {
  const seenByEntity = new Map<string, Set<string>>();
  const result: AST["attributes"] = [];

  for (const attr of attributes) {
    const entity = attr.entity;

    if (!seenByEntity.has(entity)) {
      seenByEntity.set(entity, new Set());
    }

    const seen = seenByEntity.get(entity)!;

    if (attr.kind === "CP") {
      const key = attr.names.join("_");
      if (!seen.has(key)) {
        seen.add(key);
        result.push(attr);
      }
      continue;
    }

    let added = false;
    for (const name of attr.names) {
      if (!seen.has(name)) {
        seen.add(name);
        added = true;
      }
    }

    if (added) {
      result.push(attr);
    }
  }

  return result;
}

function toGraphEntity(ent: AST["entities"][number]): GraphEntity {
  return {
    id: `ent_${ent.name}`,
    name: ent.name
  };
}

function astAttributeToGraph(attr: AST["attributes"][number]): GraphAttribute[] {
  if (attr.kind === "CP") {
    const key = attr.names.join("_");
    return [
      {
        id: `attr_${attr.entity}_${attr.kind}_${key}`,
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
