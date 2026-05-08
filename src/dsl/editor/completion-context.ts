import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { CompletionContext } from "@codemirror/autocomplete";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import type { AST } from "../model";
import type { NodeSpec } from "../schema";
import { parseDSL } from "../parser";
import { specByLezerNode } from "../schema/utils";

type SpecAtPosition = {
  spec: NodeSpec;
  ref: SyntaxNodeRef;
  missingChild: string | null;
};

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

  if (!spec && node.prevSibling) {
    const line = context.state.doc.lineAt(pos);

    if (node.prevSibling.from >= line.from) {
      const deep = findSpecNodeDeep(node.prevSibling);

      if (deep && pos >= node.prevSibling.to) {
        node = deep;
        spec = specByLezerNode(deep.type.name)!;
      }
    }
  }

  let climb = node;
  while (!spec && climb.parent) {
    climb = climb.parent;
    const parentSpec = specByLezerNode(climb.type.name);
    if (parentSpec) {
      node = climb;
      spec = parentSpec;
      break;
    }
  }

  if (!spec) return null;

  const missingChild = detectMissingChild(node, spec, pos);
  return { spec, ref: toRef(node), missingChild };
}

function findSpecNodeDeep(node: SyntaxNode): SyntaxNode | null {
  const stack: SyntaxNode[] = [node];

  while (stack.length) {
    const current = stack.pop()!;
    if (specByLezerNode(current.type.name)) {
      return current;
    }

    for (let child = current.firstChild; child; child = child.nextSibling) {
      stack.push(child);
    }
  }

  return null;
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

function detectMissingChild(
  node: SyntaxNode,
  spec: NodeSpec,
  pos: number
): string | null {
  for (const field of spec.fields) {
    const child = node.getChild(field.child);

    if (!child) return field.child;
    if (child.type.isError) return field.child;

    if (pos >= child.from && pos <= child.to) return field.child;
  }

  const last = node.lastChild;
  if (last && pos > last.to) {
    const nextField = spec.fields.find(f => {
      const child = node.getChild(f.child);
      return !child || child.type.isError;
    });
    return nextField ? nextField.child : null;
  }

  return null;
}

function toRef(node: SyntaxNode): SyntaxNodeRef {
  return {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;
}
