import type { GraphModel, GraphRelationship } from "../compiler/graph";
import {
  formatCardinality,
  formatRelationshipRatio,
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
  const ratio = formatRelationshipRatio(
    rel.cardinalities[0].max,
    rel.cardinalities[1].max
  );

  return `
  ${dotId(rel.id)} [
    shape=diamond,
    width=1.8,
    height=1.0,
    margin=0.08,
    ${dotLabel(`${ratio}\n${rel.name}`)}
  ];`;
}

function renderRelationshipEdge(
  rel: GraphRelationship,
  index: 0 | 1
): string {
  const cardinality = rel.cardinalities[index];
  const arrowhead = shouldUseCardinalityArrow(cardinality) ? "normal" : "none";

  return `
  ${dotId(rel.id)} -- ${dotId(rel.entityIds[index])} [
    len=2.2,
    weight=4,
    style=solid,
    dir=forward,
    arrowhead=${arrowhead},
    headlabel=${dotString(formatCardinality(cardinality))},
    labeldistance=1.25,
    labelangle=0
  ];`;
}
