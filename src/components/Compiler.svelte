<script lang="ts">
  import { onMount } from "svelte";
  import Diagram from "./Diagram.svelte";
  import { parseDSL } from "../dsl";
  import { astToGraph } from "../core/transform";
  import { layoutGraph } from "../core/layout";
  import type { GraphModel } from "../core/graph";

  let model: GraphModel | undefined = undefined;
  let positions: Record<string, { x: number; y: number }> | undefined =
    undefined;

  let diagramKey = 0;
  let diagramContainer: HTMLDivElement;

  onMount(() => {
    document
      .getElementById("compileBtn")
      ?.addEventListener("click", async () => {
        const code = window.editorView.state.doc.toString();

        const ast = parseDSL(code);
        const graph = astToGraph(ast);

        const width = diagramContainer.clientWidth;
        const height = diagramContainer.clientHeight;

        const layout = await layoutGraph(graph, { width, height });

        model = graph;
        positions = layout;

        diagramKey += 1;
      });
  });
</script>

<div bind:this={diagramContainer} class="w-full h-full">
  {#if model && positions}
    {#key diagramKey}
      <Diagram {model} {positions} />
    {/key}
  {/if}
</div>
