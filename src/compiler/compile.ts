import type { AST } from "../dsl/model";
import { parseDSL } from "../dsl/parser";
import { graphToDOT } from "../diagram/dot";
import type { GraphModel } from "./graph";
import { astToGraph } from "./transform";

export interface CompileResult {
  ast: AST;
  graph: GraphModel;
  dot: string;
  hasErrors: boolean;
}

export function compileDSL(source: string): CompileResult {
  const ast = parseDSL(source);
  const graph = astToGraph(ast);
  const dot = graphToDOT(graph);

  return {
    ast,
    graph,
    dot,
    hasErrors: ast.errors.length > 0
  };
}
