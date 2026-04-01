<script lang="ts">
  import { onMount } from "svelte";
  import { EditorState, Compartment } from "@codemirror/state";
  import {
    EditorView,
    lineNumbers,
    highlightActiveLine,
  } from "@codemirror/view";
  import { javascript } from "@codemirror/lang-javascript";
  import { oneDark } from "@codemirror/theme-one-dark";

  export let initial: string = "";

  let container: HTMLDivElement;
  let view: EditorView;

  const language = new Compartment();
  const theme = new Compartment();

  onMount(() => {
    const state = EditorState.create({
      doc: initial,
      extensions: [
        language.of(javascript()),
        theme.of(oneDark),
        lineNumbers(),
        highlightActiveLine(),
        EditorView.lineWrapping,
      ],
    });

    view = new EditorView({ state, parent: container });
    window.editorView = view;
    return () => view.destroy();
  });
</script>

<div
  class="h-full w-full rounded-md overflow-hidden"
  bind:this={container}
></div>
