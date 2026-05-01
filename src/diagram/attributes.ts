import type { AttributeKind } from "../dsl/core";
import type { GraphModel, GraphAttribute } from "../core/graph";

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

    case "SP":
    case "CP":
      return {
        node: `style=solid`,
        edge: `style=solid`
      };
  }
}

function renderNode(id: string, label: string, style: string): string {
  return `
  "${id}" [
    shape=circle,
    width=0.3,
    height=0.3,
    fixedsize=true,
    label="",
    xlabel="${label}",
    ${style}
  ];`;
}

function renderEdge(
  from: string,
  to: string,
  style: string,
  len = 1.0,
  weight = 3
): string {
  return `
  "${from}" -- "${to}" [
    len=${len},
    weight=${weight},
    ${style}
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

  return [
    renderNode(id, label, node),
    renderEdge(attr.entityId, id, edge)
  ].join("");
}

function renderComposite(attr: GraphAttribute): string {
  const subNames = attr.names.slice(0, -1);
  const finalName = attr.names[attr.names.length - 1];

  const style = attributeStyle("SP");
  const parts: string[] = [];

  const finalId = `${attr.id}_final`;
  parts.push(renderNode(finalId, finalName, style.node));
  parts.push(renderEdge(attr.entityId, finalId, style.edge, 1.0, 3));

  subNames.forEach((name, i) => {
    const id = `${attr.id}_sub_${i}`;
    parts.push(renderNode(id, name, style.node));
    parts.push(renderEdge(finalId, id, style.edge, 0.6, 2));
  });

  return parts.join("");
}
