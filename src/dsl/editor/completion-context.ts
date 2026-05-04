import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { CompletionContext } from "@codemirror/autocomplete";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import type { AST } from "../model";
import type { NodeSpec } from "../schema";
import { isPrefixField } from "../schema";
import { parseDSL } from "../parser";
import { specByLezerNode } from "../schema/utils";

export type SpecAtPosition = { spec: NodeSpec; ref: SyntaxNodeRef };

let lastDocText: string | null = null;
let lastAst: AST | null = null;

export function getParsedAST(state: EditorState): AST {
  const text = state.doc.toString();
  if (text === lastDocText && lastAst) return lastAst;

  lastDocText = text;
  lastAst = parseDSL(text);
  return lastAst;
}

export function getSpecAtPosition(
  context: CompletionContext
): SpecAtPosition | null {
  const tree = syntaxTree(context.state);
  const pos = context.pos;

  let node = tree.resolve(pos, -1);
  let spec = specByLezerNode(node.type.name);

  while (!spec && node.parent) {
    node = node.parent;
    spec = specByLezerNode(node.type.name);
  }

  return spec ? { spec, ref: toRef(node) } : null;
}

export function hasAllPrefixes(
  spec: NodeSpec,
  ref: SyntaxNodeRef,
  cursorPos: number
): boolean {
  return spec.fields.filter(isPrefixField).every(prefix => {
    const child = ref.node.getChild(prefix.child);
    return !!child && cursorPos > child.to;
  });
}

export function isCursorAtEndOfLine(
  state: EditorState,
  pos: number
): boolean {
  return pos === state.doc.lineAt(pos).to;
}

export function isCommentLine(state: EditorState, pos: number): boolean {
  const tree = syntaxTree(state);
  const line = state.doc.lineAt(pos);

  let commentFrom = -1;

  tree.iterate({
    from: line.from,
    to: line.to,
    enter(cursor) {
      if (cursor.name === "LineComment") {
        commentFrom = cursor.from;
        return false;
      }
    }
  });

  return commentFrom !== -1 && pos >= commentFrom;
}

export function isAfterCompletedStatement(
  state: EditorState,
  pos: number
): boolean {
  const tree = syntaxTree(state);
  const line = state.doc.lineAt(pos);
  let firstDeclEnd = -1;

  tree.iterate({
    from: line.from,
    to: line.to,
    enter(cursor) {
      if (specByLezerNode(cursor.name)) {
        firstDeclEnd =
          firstDeclEnd === -1 || cursor.to < firstDeclEnd
            ? cursor.to
            : firstDeclEnd;
      }
    }
  });

  return firstDeclEnd !== -1 && pos > firstDeclEnd;
}

function toRef(node: SyntaxNode): SyntaxNodeRef {
  return {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;
}
