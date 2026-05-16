import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { CompletionContext } from "@codemirror/autocomplete";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import type { AST } from "../model";
import { isIdField, type IdField, type NodeSpec } from "../schema";
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

  const activeChild = detectActiveChild(context, node, spec, pos);
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
  context: CompletionContext,
  node: SyntaxNode,
  spec: NodeSpec,
  pos: number
): string | null {
  const order = spec.completionOrder;
  let orderIndex = 0;
  let lastMatched: { name: string; to: number } | null = null;

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const name = child.type.name;

    if (!order.includes(name)) continue;

    const repeatedPrevious =
      orderIndex > 0 &&
      order[orderIndex - 1] === name &&
      isRepeatableCompletionChild(spec, name);

    while (
      !repeatedPrevious &&
      orderIndex < order.length &&
      order[orderIndex] !== name
    ) {
      orderIndex++;
    }

    if (orderIndex >= order.length) return null;

    if (pos >= child.from && pos <= child.to) {
      return name;
    }

    if (child.to <= pos) {
      lastMatched = { name, to: child.to };
      if (!repeatedPrevious) {
        orderIndex++;
      }
      continue;
    }

    return order[orderIndex] ?? null;
  }

  if (
    lastMatched &&
    isRepeatableCompletionChild(spec, lastMatched.name)
  ) {
    const field = spec.fields.find(
      (current): current is IdField =>
        current.child === lastMatched.name && isIdField(current)
    )!;
    const between = context.state.sliceDoc(lastMatched.to, context.pos);

    if (shouldContinueRepeatableChild(between, field.repeatSeparator!)) {
      return lastMatched.name;
    }

    if (between.startsWith(field.repeatSeparator!)) {
      return null;
    }

    const nextIndex = order.indexOf(lastMatched.name) + 1;
    return order[nextIndex] ?? null;
  }

  return order[orderIndex] ?? null;
}

function isRepeatableCompletionChild(spec: NodeSpec, childName: string): boolean {
  const field = spec.fields.find(
    (current): current is IdField =>
      current.child === childName && isIdField(current)
  );

  return Boolean(field?.multiple && field.repeatSeparator);
}

function shouldContinueRepeatableChild(
  between: string,
  repeatSeparator: string
): boolean {
  return (
    between.startsWith(repeatSeparator) &&
    between.length > repeatSeparator.length &&
    between.slice(repeatSeparator.length).trim() === ""
  );
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
