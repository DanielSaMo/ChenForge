<script lang="ts">
  import { onMount } from "svelte";
  import { EditorState } from "@codemirror/state";
  import {
    EditorView,
    lineNumbers,
    highlightActiveLine,
  } from "@codemirror/view";
  import { javascript } from "@codemirror/lang-javascript";
  import { oneDark } from "@codemirror/theme-one-dark";

  let container: HTMLDivElement;
  let view: EditorView;

  onMount(() => {
    const state = EditorState.create({
      doc: "// Escribe tu DSL aquí...\n",
      extensions: [
        javascript(),
        oneDark,
        lineNumbers(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            window.dispatchEvent(
              new CustomEvent("editor-change", { detail: content }),
            );
          }
        }),
      ],
    });

    view = new EditorView({
      state,
      parent: container,
    });

    return () => view.destroy();
  });
</script>

<div class="h-full w-full rounded-md" bind:this={container}></div>
