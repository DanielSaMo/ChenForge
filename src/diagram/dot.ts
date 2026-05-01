import type { GraphModel } from "../core/graph";
import { renderAttributes } from "./attributes";

export function graphToDOT(model: GraphModel): string {
  let dot = openGraph();

  dot += renderEntities(model);
  dot += renderAttributes(model);

  dot += closeGraph();
  return dot;
}

function renderEntities(model: GraphModel): string {
  return model.entities
    .map(ent => `"${ent.id}" [shape=box, label="${ent.name}"];\n`)
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
