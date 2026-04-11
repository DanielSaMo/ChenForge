import { parser } from "./dsl-parser";
import type { AST, EntityNode } from "./core";

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);
  const entities: EntityNode[] = [];

  tree.cursor().iterate(node => {
    if (node.type.name === "entityDecl") {
      if (node.node.getChild("⚠")) return;

      const id = node.node.getChild("Identifier");
      if (id) {
        entities.push({
          name: input.slice(id.from, id.to)
        });
      }
    }
  });

  return { entities };
}
