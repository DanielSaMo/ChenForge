import type { AST } from "../dsl/model";
import type {
  GraphModel,
  GraphEntity,
  GraphAttribute,
  GraphRelationship
} from "./graph";

export function astToGraph(ast: AST): GraphModel {
  const uniqueEntities = dedupeEntities(ast.entities);
  const uniqueRelationships = dedupeRelationships(ast.relationships);
  const uniqueAttributes = dedupeAttributes(ast.attributes);
  const propagatedAttributes = identifyingRelationshipAttributes(
    uniqueRelationships,
    uniqueEntities,
    uniqueAttributes
  );

  return {
    entities: uniqueEntities.map(toGraphEntity),
    relationships: uniqueRelationships.flatMap(toGraphRelationship),
    attributes: [
      ...uniqueAttributes.flatMap(attr =>
        astAttributeToGraph(attr, uniqueEntities, uniqueRelationships)
      ),
      ...propagatedAttributes
    ]
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
      const key = attr.composition ?? attr.names.join("_");
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

function dedupeRelationships(
  relationships: AST["relationships"]
): AST["relationships"] {
  const seen = new Set<string>();
  const result: AST["relationships"] = [];

  for (const rel of relationships) {
    if (!seen.has(rel.name)) {
      seen.add(rel.name);
      result.push(rel);
    }
  }

  return result;
}

function toGraphEntity(ent: AST["entities"][number]): GraphEntity {
  return {
    id: `ent_${ent.name}`,
    name: ent.name,
    kind: ent.kind
  };
}

function toGraphRelationship(
  rel: AST["relationships"][number]
): GraphRelationship[] {
  if (rel.entities.length !== 2 || rel.cardinalities.length !== 2) {
    return [];
  }

  return [
    {
      id: `rel_${rel.name}`,
      name: rel.name,
      kind: rel.kind,
      entityIds: [`ent_${rel.entities[0]}`, `ent_${rel.entities[1]}`],
      cardinalities: [rel.cardinalities[0], rel.cardinalities[1]]
    }
  ];
}

function astAttributeToGraph(
  attr: AST["attributes"][number],
  entities: AST["entities"],
  relationships: AST["relationships"]
): GraphAttribute[] {
  const entityId = resolveAttributeOwnerId(attr.entity, entities, relationships);

  if (attr.kind === "CP") {
    const key = attr.composition ?? attr.names.join("_");
    return [
      {
        id: `attr_${attr.entity}_${attr.kind}_${key}`,
        entityId,
        names: attr.names,
        kind: attr.kind,
        composition: attr.composition
      }
    ];
  }

  return attr.names.map(name => ({
    id: `attr_${attr.entity}_${attr.kind}_${name}`,
    entityId,
    names: [name],
    kind: attr.kind,
    cardinality: attr.kind === "MV" ? attr.cardinality : undefined
  }));
}

function resolveAttributeOwnerId(
  name: string,
  entities: AST["entities"],
  relationships: AST["relationships"]
): string {
  if (entities.some(ent => ent.name === name)) return `ent_${name}`;
  if (relationships.some(rel => rel.name === name)) return `rel_${name}`;
  return `ent_${name}`;
}

function identifyingRelationshipAttributes(
  relationships: AST["relationships"],
  entities: AST["entities"],
  attributes: AST["attributes"]
): GraphAttribute[] {
  const entityByName = new Map(entities.map(entity => [entity.name, entity]));
  const attributesByEntity = groupAttributesByEntity(attributes);
  const propagatedByWeakEntity = new Map<string, Set<string>>();
  const result: GraphAttribute[] = [];

  for (const rel of relationships) {
    if (rel.kind !== "ID" || rel.entities.length !== 2) continue;

    const roles = relationshipEntityRoles(rel, entityByName);
    if (!roles) continue;

    const weakAttributeNames =
      propagatedByWeakEntity.get(roles.weakName) ??
      new Set(
        (attributesByEntity.get(roles.weakName) ?? []).flatMap(attr => attr.names)
      );

    for (const pk of attributesByEntity.get(roles.strongName) ?? []) {
      if (pk.kind !== "PK") continue;

      for (const name of pk.names) {
        if (weakAttributeNames.has(name)) continue;

        result.push({
          id: `attr_${roles.weakName}_ID_${roles.strongName}_${name}`,
          entityId: `ent_${roles.weakName}`,
          names: [name],
          kind: "PK",
          underlined: true
        });
        weakAttributeNames.add(name);
      }
    }

    propagatedByWeakEntity.set(roles.weakName, weakAttributeNames);
  }

  return result;
}

function relationshipEntityRoles(
  rel: AST["relationships"][number],
  entityByName: Map<string, AST["entities"][number]>
): { strongName: string; weakName: string } | undefined {
  const [leftName, rightName] = rel.entities;
  const left = entityByName.get(leftName);
  const right = entityByName.get(rightName);

  if (!left || !right || left.kind === right.kind) return undefined;

  return left.kind === "ST"
    ? { strongName: leftName, weakName: rightName }
    : { strongName: rightName, weakName: leftName };
}

function groupAttributesByEntity(
  attributes: AST["attributes"]
): Map<string, AST["attributes"]> {
  const grouped = new Map<string, AST["attributes"]>();

  for (const attr of attributes) {
    if (!grouped.has(attr.entity)) {
      grouped.set(attr.entity, []);
    }

    grouped.get(attr.entity)!.push(attr);
  }

  return grouped;
}
