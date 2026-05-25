import type { GraphModel, GraphRelationship } from "../compiler/graph";
import {
  formatAttributeOrEntityCardinality,
  formatRelationshipRatioDisplay,
  shouldUseCardinalityArrow
} from "../dsl/schema/cardinality";
import {
  dotHtmlLabel,
  dotHtmlText,
  dotId,
  dotLabel,
  dotString
} from "./dot-utils";

export function renderRelationships(model: GraphModel): string {
  return model.relationships.map(renderRelationship).join("");
}

function isRecursive(rel: GraphRelationship): boolean {
  return rel.entityIds[0] === rel.entityIds[1];
}

function dummyId(rel: GraphRelationship, index: number): string {
  return `${rel.id}_dummy_${index}`;
}

function renderDummyNode(id: string): string {
  return `
    ${dotId(id)} [
      shape=point
    ];
  `;
}

function baseEdgeAttrs(): string {
  return `
    len=3,
    weight=3,
    style=solid
  `;
}

function cardinalityAttrs(card: string, hasArrow: boolean): string {
  return `
    dir=forward,
    arrowhead=${hasArrow ? "normal" : "none"},
    headlabel=${dotString(card)},
    labeldistance=${hasArrow ? 2.75 : 1.5},
    labelangle=0
  `;
}

function renderSimpleEdge(from: string, to: string): string {
  return `
    ${dotId(from)} -- ${dotId(to)} [
      ${baseEdgeAttrs()}
    ];
  `;
}

function renderCardinalityEdge(
  from: string,
  to: string,
  card: string,
  hasArrow: boolean
): string {
  return `
    ${dotId(from)} -- ${dotId(to)} [
      ${baseEdgeAttrs()}
      ${cardinalityAttrs(card, hasArrow)}
    ];
  `;
}

function renderRelationship(rel: GraphRelationship): string {
  return isRecursive(rel)
    ? renderRecursiveRelationship(rel)
    : renderNormalRelationship(rel);
}

function renderNormalRelationship(rel: GraphRelationship): string {
  return [
    renderRelationshipNode(rel),
    renderRelationshipEdge(rel, 0),
    renderRelationshipEdge(rel, 1)
  ].join("");
}

function renderRelationshipEdge(
  rel: GraphRelationship,
  index: 0 | 1
): string {
  const card = formatAttributeOrEntityCardinality(rel.cardinalities[index]);
  const hasArrow = shouldUseCardinalityArrow(rel.cardinalities[index]);

  return renderCardinalityEdge(rel.id, rel.entityIds[index], card, hasArrow);
}

function renderRecursiveRelationship(rel: GraphRelationship): string {
  const entityId = rel.entityIds[0];
  const parts: string[] = [];

  parts.push(renderRelationshipNode(rel));

  for (const index of [0, 1] as const) {
    const dId = dummyId(rel, index);
    const card = formatAttributeOrEntityCardinality(rel.cardinalities[index]);
    const hasArrow = shouldUseCardinalityArrow(rel.cardinalities[index]);

    parts.push(renderDummyNode(dId));
    parts.push(renderSimpleEdge(rel.id, dId));
    parts.push(renderCardinalityEdge(dId, entityId, card, hasArrow));
  }

  return parts.join("");
}

function renderRelationshipNode(rel: GraphRelationship): string {
  const ratio = formatRelationshipRatioDisplay(
    rel.cardinalities[0].max,
    rel.cardinalities[1].max
  );

  return `
    ${dotId(rel.id)} [
      shape=diamond,
      ${renderRelationshipLabel(rel, ratio)}
    ];
  `;
}

function renderRelationshipLabel(
  rel: GraphRelationship,
  ratio: string
): string {
  if (rel.kind === "ST") {
    return dotLabel(`${ratio}\n${rel.name}`);
  }

  return dotHtmlLabel(
    `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0">` +
    `<TR>` +
    `<TD BORDER="1" SIDES="R" CELLPADDING="4">${dotHtmlText(rel.kind)}</TD>` +
    `<TD CELLPADDING="4">${dotHtmlText(ratio)}<BR/>${dotHtmlText(rel.name)}</TD>` +
    `</TR>` +
    `</TABLE>`
  );
}
