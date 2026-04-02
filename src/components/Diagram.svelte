<script lang="ts">
  import { onMount } from "svelte";
  import { parseDSL } from "../dsl";
  import { astToGraph } from "../core/transform";
  import { graphToDOT } from "../diagram/dot";
  import { generateSVG } from "../diagram/graphviz";

  let svg: string | null = null;
  let diagramKey = 0;

  onMount(() => {
    document
      .getElementById("compileBtn")
      ?.addEventListener("click", async () => {
        const code = window.editorView.state.doc.toString();

        const ast = parseDSL(code);
        const graph = astToGraph(ast);

        const dot = graphToDOT(graph);
        svg = await generateSVG(dot);

        diagramKey += 1;
      });
  });
</script>

<div class="w-full h-full">
  {#if svg}
    {#key diagramKey}
      {@html svg}
    {/key}
  {/if}
</div>
