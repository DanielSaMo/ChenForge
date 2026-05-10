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
  activeChild: string | null;
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

  const activeChild = detectActiveChild(node, spec, pos);
  return { spec, ref: toRef(node), activeChild };
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

function detectActiveChild(
  node: SyntaxNode,
  spec: NodeSpec,
  pos: number
): string | null {
  const children: { name: string; from: number; to: number }[] = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    children.push({
      name: child.type.name,
      from: child.from,
      to: child.to
    });
  }

  for (const field of spec.fields) {
    const childNode = node.getChild(field.child);

    if (childNode) {
      if (pos >= childNode.from && pos <= childNode.to) {
        return field.child;
      }
    } else {
      for (let i = 0; i < children.length - 1; i++) {
        const left = children[i];
        const right = children[i + 1];

        if (pos >= left.to && pos <= right.from) {
          return field.child;
        }
      }
    }
  }

  const last = children[children.length - 1];
  if (last && pos > last.to) {
    const nextField = spec.fields.find(f => !node.getChild(f.child));
    return nextField ? nextField.child : null;
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

function toRef(node: SyntaxNode): SyntaxNodeRef {
  return {
    from: node.from,
    to: node.to,
    type: node.type,
    node
  } as SyntaxNodeRef;
}
