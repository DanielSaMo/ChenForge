<script lang="ts">
  import { onMount } from "svelte";
  import { EditorState, Compartment } from "@codemirror/state";
  import {
    EditorView,
    lineNumbers,
    highlightActiveLine
  } from "@codemirror/view";
  import { autocompletion } from "@codemirror/autocomplete";
  import { oneDark } from "@codemirror/theme-one-dark";

  import { dsl } from "../../dsl/editor/language";
  import { dslHighlight } from "../../dsl/editor/highlight";

  export let value: string = "";
  export let onChange: (value: string) => void = () => {};

  let container: HTMLDivElement;
  let view: EditorView | null = null;

  const language = new Compartment();
  const theme = new Compartment();
  const highlight = new Compartment();

  export function getValue(): string {
    return view?.state.doc.toString() ?? value;
  }

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        language.of(dsl()),
        autocompletion({ activateOnTyping: true }),
        theme.of(oneDark),
        highlight.of(dslHighlight),
        lineNumbers(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      ]
    });

    view = new EditorView({ state, parent: container });

    return () => {
      view?.destroy();
      view = null;
    };
  });

  $: if (view && value !== view.state.doc.toString()) {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value
      }
    });
  }
</script>

<div
  class="h-full w-full rounded-md overflow-hidden"
  bind:this={container}
></div>
