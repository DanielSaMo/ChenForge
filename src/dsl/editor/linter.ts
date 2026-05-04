import { linter, type Diagnostic } from "@codemirror/lint";
import { parseDSL } from "../parser";

export const dslLinter = linter(view => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc.toString();
  const ast = parseDSL(doc);

  for (const err of ast.errors) {
    diagnostics.push({
      from: err.from,
      to: err.to,
      severity: "error",
      message: err.message
    });
  }

  return diagnostics;
});
