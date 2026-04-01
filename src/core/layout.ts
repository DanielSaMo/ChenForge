import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";
import type { GraphModel } from "./graph";

import {
  ENTITY_WIDTH,
  ENTITY_HEIGHT,
  LAYOUT_PADDING,
  NODE_SEPARATION,
  LAYER_SEPARATION,
  EDGE_NODE_SEPARATION,
  EDGE_EDGE_SEPARATION
} from "./constants";

const elk = new ELK();

export async function layoutGraph(
  model: GraphModel,
  container: { width: number; height: number }
) {
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",

      "elk.spacing.nodeNode": NODE_SEPARATION,
      "elk.layered.spacing.nodeNodeBetweenLayers": LAYER_SEPARATION,
      "elk.spacing.edgeNode": EDGE_NODE_SEPARATION,
      "elk.spacing.edgeEdge": EDGE_EDGE_SEPARATION,

      "elk.padding": LAYOUT_PADDING,

      "elk.width": `${container.width}`,
      "elk.height": `${container.height}`
    },
    children: [],
    edges: []
  };

  model.entities.forEach(ent => {
    elkGraph.children!.push({
      id: ent.id,
      width: ENTITY_WIDTH,
      height: ENTITY_HEIGHT
    });
  });

  const result = await elk.layout(elkGraph);

  const positions: Record<string, { x: number; y: number }> = {};

  result.children?.forEach(node => {
    positions[node.id] = { x: node.x!, y: node.y! };
  });

  return positions;
}
