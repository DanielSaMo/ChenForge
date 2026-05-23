import type { AttributeKind } from "../dsl/model";
import type { GraphModel, GraphAttribute } from "../compiler/graph";
import {
  formatAttributeOrEntityCardinality
} from "../dsl/schema/cardinality";
import {
  dotHtmlText,
  dotHtmlXLabel,
  dotId,
  dotString,
  dotXLabel
} from "./dot-utils";

interface AttributeStyle {
  node: string;
  edge: string;
}

function attributeStyle(kind: AttributeKind): AttributeStyle {
  switch (kind) {
    case "PK":
      return {
        node: `style=filled, fillcolor=black`,
        edge: `style=solid`
      };

    case "UK":
      return {
        node: `style=filled, fillcolor="black:white", gradientangle=90`,
        edge: `style=solid`
      };

    case "OP":
      return {
        node: `style=solid`,
        edge: `style=dashed`
      };

    case "DR":
      return {
        node: `style=dashed`,
        edge: `style=solid`
      };

    default:
      return {
        node: `style=solid`,
        edge: `style=solid`
      };
  }
}

function renderNode(
  id: string,
  label: string,
  style: string,
  underlined = false
): string {
  const xLabel = underlined
    ? dotHtmlXLabel(`<U>${dotHtmlText(label)}</U>`)
    : dotXLabel(label);

  return `
  ${dotId(id)} [
    shape=circle,
    width=0.275,
    height=0.275,
    fixedsize=true,
    label="",
    ${xLabel},
    ${style}
  ];`;
}

function renderEdge(
  from: string,
  to: string,
  style: string,
  extra = ""
): string {
  return `
  ${dotId(from)} -- ${dotId(to)} [
    len=1,
    weight=1,
    constraint=false,
    ${style}
    ${extra}
  ];`;
}

export function renderAttributes(model: GraphModel): string {
  return model.attributes.map(renderAttribute).join("");
}

function renderAttribute(attr: GraphAttribute): string {
  return attr.kind === "CP"
    ? renderComposite(attr)
    : renderSimple(attr);
}

function renderSimple(attr: GraphAttribute): string {
  const { node, edge } = attributeStyle(attr.kind);

  const id = attr.id;
  const label = attr.names[0];

  const extra =
    attr.kind === "MV" && attr.cardinality
      ? `dir=forward,
    arrowhead=normal,
    taillabel=${dotString(formatAttributeOrEntityCardinality(attr.cardinality))},
    labeldistance=0.75,
    labelangle=0`
      : "";

  return [
    renderNode(id, label, node, attr.underlined),
    renderEdge(attr.entityId, id, edge, extra)
  ].join("");
}

function renderComposite(attr: GraphAttribute): string {
  const subNames = attr.composition ? attr.names : attr.names.slice(0, -1);
  const finalName = attr.composition ?? attr.names[attr.names.length - 1];

  const style = attributeStyle("SP");
  const parts: string[] = [];

  const finalId = `${attr.id}_final`;
  parts.push(renderNode(finalId, finalName, style.node));
  parts.push(renderEdge(attr.entityId, finalId, style.edge));

  subNames.forEach(name => {
    const id = `${attr.id}_sub_${name}`;
    parts.push(renderNode(id, name, style.node));
    parts.push(renderEdge(finalId, id, style.edge));
  });

  return parts.join("");
}
