<script lang="ts">
  import { onMount } from "svelte";
  import { graphviz } from "d3-graphviz";

  import DiagramToolbar from "./DiagramToolbar.svelte";

  export let dot: string = "";
  export let version = 0;

  let container: HTMLDivElement;
  let renderer: any;
  let renderedDot = "";
  let renderedVersion = -1;
  let renderError = "";

  function renderDot(currentDot: string, currentVersion: number) {
    if (!renderer || !currentDot) return;
    if (currentDot === renderedDot && currentVersion === renderedVersion)
      return;

    try {
      renderError = "";
      renderedDot = currentDot;
      renderedVersion = currentVersion;
      renderer.engine("neato").renderDot(currentDot);
    } catch (err) {
      renderError =
        err instanceof Error ? err.message : "Unable to render diagram";
    }
  }

  onMount(() => {
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
  });

  $: renderDot(dot, version);
</script>

<div class="relative w-full h-full overflow-hidden">
  <div bind:this={container} class="w-full h-full"></div>

  {#if renderError}
    <div
      class="absolute left-4 bottom-4 max-w-[calc(100%-2rem)] rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 shadow"
    >
      {renderError}
    </div>
  {/if}

  <DiagramToolbar {renderer} />
</div>
