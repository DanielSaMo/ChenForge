import * as joint from "jointjs";
import { ENTITY_WIDTH, ENTITY_HEIGHT } from "../../core/constants";

export function createEntityShape(name: string, x: number, y: number) {
  return new joint.shapes.standard.Rectangle({
    position: { x, y },
    size: {
      width: ENTITY_WIDTH,
      height: ENTITY_HEIGHT
    },
    attrs: {
      body: {
        stroke: "#000",
        strokeWidth: 2,
        fill: "#fff"
      },
      label: {
        text: name,
        fontSize: 14,
        fontWeight: "bold"
      }
    }
  });
}
