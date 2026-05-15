import type { GraphModel } from "../compiler/graph";
import { renderAttributes } from "./attributes";
import { renderRelationships } from "./relationships";
import { dotId, dotLabel } from "./dot-utils";

export function graphToDOT(model: GraphModel): string {
  let dot = openGraph();

  dot += renderEntities(model);
  dot += renderRelationships(model);
  dot += renderAttributes(model);

  dot += closeGraph();
  return dot;
}

function renderEntities(model: GraphModel): string {
  return model.entities
    .map(ent => {
      const isWeak = ent.kind === "WK";

      const shape = isWeak
        ? `shape=box, peripheries=2`
        : `shape=box`;

      return `${dotId(ent.id)} [${shape}, ${dotLabel(ent.name)}];\n`;
    })
    .join("");
}

function openGraph(): string {
  return `graph G {
    layout=neato;
    overlap=false;
    splines=true;
    sep="+15";

    node [
      fontname="Arial",
      fontsize=12
    ];`;
}

function closeGraph(): string {
  return "}";
}
