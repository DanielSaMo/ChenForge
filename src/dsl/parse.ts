import { parser } from "./dsl-parser";
import type { AST, ParseError } from "./core";
import { DSL_SCHEMA, type NodeSpec } from "./dsl-schema";

function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(s => s.lezerNode === nodeName);
}

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);

  const ast = {
    errors: [] as ParseError[]
  } as Partial<AST>;

  for (const spec of DSL_SCHEMA.nodes) {
    (ast as any)[spec.astCollection] = [];
  }

  const finalAst = ast as AST;

  const scopes = new Map<string, Map<string, { from: number; to: number }>>();
  for (const spec of DSL_SCHEMA.nodes) {
    scopes.set(spec.astCollection, new Map());
  }

  tree.cursor().iterate(node => {
    const spec = specByLezerNode(node.type.name);
    if (!spec) return;

    if (node.node.getChild("⚠")) {
      finalAst.errors.push({
        message: spec.missingIdMessage,
        from: node.from,
        to: node.to
      });
      return;
    }

    const idNode = node.node.getChild(spec.idField.child);
    if (!idNode) {
      finalAst.errors.push({
        message: spec.missingIdMessage,
        from: node.from,
        to: node.to
      });
      return;
    }

    const name = input.slice(idNode.from, idNode.to);

    const scope = scopes.get(spec.astCollection)!;
    if (scope.has(name)) {
      finalAst.errors.push({
        message: spec.duplicateIdMessage(name),
        from: idNode.from,
        to: idNode.to
      });
    } else {
      scope.set(name, { from: idNode.from, to: idNode.to });
    }

    (finalAst as any)[spec.astCollection].push({
      [spec.idField.astField]: name
    });
  });

  return finalAst;
}
