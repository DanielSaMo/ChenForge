<script lang="ts">
  import { onMount } from "svelte";
  import { renderDiagram } from "../diagram/renderer";
  import type { GraphModel } from "../core/graph";

  export let model: GraphModel;
  export let positions: Record<string, { x: number; y: number }>;

  let container: HTMLDivElement;

  onMount(() => {
    renderDiagram(container, model, positions);
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
