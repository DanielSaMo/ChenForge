<script lang="ts">
  import { onMount } from "svelte";
  import { parseDSL } from "../dsl/parse";
  import { astToGraph } from "../core/transform";
  import { graphToDOT } from "../diagram/dot";
  import { graphviz } from "d3-graphviz";

  import DiagramToolbar from "./DiagramToolbar.svelte";

  let container: HTMLDivElement;
  let renderer: any;

  onMount(() => {
    const btn = document.getElementById("compileBtn");
    if (!btn) return;

    renderer = graphviz(container, {
      zoom: true,
      fit: true,
      useWorker: false,
    });

    renderer.on("end", () => {
      const svg = container.querySelector("svg");
      if (!svg) return;

      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
    });

    btn.addEventListener("click", () => {
      const code = window.editorView.state.doc.toString();
      const ast = parseDSL(code);
      const graph = astToGraph(ast);
      const dot = graphToDOT(graph);

      renderer.engine("dot").renderDot(dot);
    });
  });
</script>

<div class="relative w-full h-full overflow-hidden">
  <div bind:this={container} class="w-full h-full"></div>
  <DiagramToolbar {renderer} />
</div>
