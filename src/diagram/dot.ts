import type { GraphModel } from "../core/graph";

export function graphToDOT(model: GraphModel) {
  let dot = `
    digraph G {
      graph [
        rankdir=LR,
        splines=true,
        overlap=false,
        nodesep=0.6,
        ranksep=0.8,
        margin=0.1
      ];

      node [
        shape=box,
        fontname="Arial",
        fontsize=14
      ];
    `;

  for (const ent of model.entities) {
    dot += `"${ent.id}" [label="${ent.name}"];\n`;
  }

  dot += "}";
  return dot;
}
