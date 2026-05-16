import type { GraphModel, GraphRelationship } from "../compiler/graph";
import {
  formatAttributeOrEntityCardinality,
  formatRelationshipRatioDisplay,
  shouldUseCardinalityArrow
} from "../dsl/schema/cardinality";
import { dotId, dotLabel, dotString } from "./dot-utils";

export function renderRelationships(model: GraphModel): string {
  return model.relationships.map(renderRelationship).join("");
}

function renderRelationship(rel: GraphRelationship): string {
  return [
    renderRelationshipNode(rel),
    renderRelationshipEdge(rel, 0),
    renderRelationshipEdge(rel, 1)
  ].join("");
}

function renderRelationshipNode(rel: GraphRelationship): string {
  const ratio = formatRelationshipRatioDisplay(
    rel.cardinalities[0].max,
    rel.cardinalities[1].max
  );

  return `
  ${dotId(rel.id)} [
    shape=diamond,
    ${dotLabel(`${ratio}\n${rel.name}`)}
  ];`;
}

function renderRelationshipEdge(
  rel: GraphRelationship,
  index: 0 | 1
): string {
  const cardinality = rel.cardinalities[index];
  const hasArrow = shouldUseCardinalityArrow(cardinality);

  return `
  ${dotId(rel.id)} -- ${dotId(rel.entityIds[index])} [
    len=3,
    weight=3,

    style=solid,
    dir=forward,
    arrowhead=${hasArrow ? "normal" : "none"},

    headlabel=${dotString(formatAttributeOrEntityCardinality(cardinality))},
    labeldistance=${hasArrow ? 2.75 : 1.5},
    labelangle=0
  ];`;
}
