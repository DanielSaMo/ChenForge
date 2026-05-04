<script lang="ts">
  import { compileDSL, type CompileResult } from "../../compiler/compile";
  import Diagram from "../diagram/Diagram.svelte";
  import Editor from "../editor/Editor.svelte";

  const initialCode = "// Write your DSL here...";

  let code = initialCode;
  let result: CompileResult | null = null;
  let dot = "";
  let renderVersion = 0;
  let editor: { getValue: () => string } | null = null;

  function handleCodeChange(nextCode: string) {
    code = nextCode;
  }

  function compile() {
    code = editor?.getValue() ?? code;
    result = compileDSL(code);
    dot = result.dot;
    renderVersion += 1;
  }
</script>

<header class="p-4 bg-white shadow flex items-center justify-between gap-4">
  <div class="flex items-center gap-3 min-w-0">
    <h1 class="text-xl font-semibold shrink-0">ChenForge</h1>
    {#if result?.hasErrors}
      <span class="text-sm text-red-600 truncate">
        {result.ast.errors.length} error{result.ast.errors.length === 1 ? "" : "s"}
      </span>
    {/if}
  </div>

  <button
    class="px-4 py-2 rounded-md font-medium text-white
      bg-blue-600 hover:bg-blue-700
      active:bg-blue-800 active:scale-[0.97]
      shadow-sm hover:shadow transition-all duration-150"
    on:click={compile}
  >
    Compile
  </button>
</header>

<main class="flex flex-1 min-h-0">
  <section
    class="w-full md:w-1/2 border-r border-gray-300 p-4 flex flex-col min-h-0"
  >
    <h2 class="text-lg font-medium mb-2">Editor</h2>

    <div class="flex-1 min-h-0">
      <Editor bind:this={editor} value={code} onChange={handleCodeChange} />
    </div>
  </section>

  <section class="w-full md:w-1/2 p-4 flex flex-col min-h-0">
    <h2 class="text-lg font-medium mb-2">Diagram</h2>

    <div class="flex-1 min-h-0 bg-white border border-gray-300 rounded overflow-auto">
      <Diagram {dot} version={renderVersion} />
    </div>
  </section>
</main>
