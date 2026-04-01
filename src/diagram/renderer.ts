import * as joint from "jointjs";
import { createEntityShape } from "./shapes/entity";
import type { GraphModel } from "../core/graph";

export function renderDiagram(container: HTMLElement, model: GraphModel, positions: any) {
  const graph = new joint.dia.Graph();

  new joint.dia.Paper({
    el: container,
    model: graph,
    width: "100%",
    height: "100%",
    gridSize: 1
  });

  model.entities.forEach(ent => {
    const pos = positions[ent.id];
    const shape = createEntityShape(ent.name, pos.x, pos.y);
    graph.addCell(shape);
  });
}
