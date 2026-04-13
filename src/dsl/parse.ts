import { parser } from "./dsl-parser";
import type { AST, EntityNode, ParseError } from "./core";

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);
  const entities: EntityNode[] = [];
  const errors: ParseError[] = [];

  const seen = new Map<string, { from: number; to: number }>();

  tree.cursor().iterate(node => {
    if (node.type.name === "entityDecl") {
      if (node.node.getChild("⚠")) {
        errors.push({
          message: "Invalid entity declaration. Expected: entity name",
          from: node.from,
          to: node.to
        });
        return;
      }

      const id = node.node.getChild("Identifier")!;
      const name = input.slice(id.from, id.to);

      if (seen.has(name)) {
        errors.push({
          message: `Duplicate entity name '${name}'`,
          from: id.from,
          to: id.to
        });
      } else {
        seen.set(name, { from: id.from, to: id.to });
      }

      entities.push({ name });
    }
  });

  return { entities, errors };
}
