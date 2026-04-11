<script lang="ts">
  import { onMount } from "svelte";
  import { EditorState, Compartment } from "@codemirror/state";
  import {
    EditorView,
    lineNumbers,
    highlightActiveLine,
  } from "@codemirror/view";
  import { autocompletion } from "@codemirror/autocomplete";
  import { oneDark } from "@codemirror/theme-one-dark";

  import { dsl } from "../dsl/language";
  import { dslHighlight } from "../dsl/highlight";

  export let initial: string = "";

  let container: HTMLDivElement;
  let view: EditorView;

  const language = new Compartment();
  const theme = new Compartment();
  const highlight = new Compartment();

  onMount(() => {
    const state = EditorState.create({
      doc: initial,
      extensions: [
        language.of(dsl()),
        autocompletion({ activateOnTyping: true }),
        theme.of(oneDark),
        highlight.of(dslHighlight),
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
