import { Graphviz } from "@hpcc-js/wasm";

export async function generateSVG(dot: string): Promise<string> {
  const gv = await Graphviz.load();
  return gv.layout(dot, "svg", "dot");
}
