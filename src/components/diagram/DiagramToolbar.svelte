<script lang="ts">
  import { ZoomReset } from "svelte-tabler";

  export let renderer: any;

  function reset() {
    renderer?.resetZoom();
  }
</script>

<div
  class="absolute top-4 right-4 flex gap-2 bg-white/80 backdrop-blur-md shadow-lg rounded-lg px-2 py-2 z-50"
>
  <button
    class="w-9 h-9 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 active:scale-90 transition"
    on:click={reset}
    title="Reset view"
  >
    <ZoomReset size="20" />
  </button>
</div>
