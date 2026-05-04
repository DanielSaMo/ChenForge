import type { SyntaxNode } from "@lezer/common";
import type { AttributeCardinality, ParseError } from "../model";
import type { FieldValueWithPos } from "./types";

export function getNodeValue(
  input: string,
  node: SyntaxNode
): FieldValueWithPos {
  return {
    value: input.slice(node.from, node.to),
    from: node.from,
    to: node.to
  };
}

export function parseCardinalityArg(
  input: string,
  node: SyntaxNode,
  errors: ParseError[]
): AttributeCardinality | undefined {
  const before = errors.length;
  const values = node
    .getChildren("CardinalityValue")
    .map(child => getNodeValue(input, child));

  if (values.length !== 2) {
    errors.push({
      message: "Invalid cardinality. Expected: (min,max)",
      from: node.from,
      to: node.to
    });
    return undefined;
  }

  const [minPos, maxPos] = values;
  const min = parseMin(minPos, errors);
  const max = parseMax(maxPos, errors);

  if (
    min !== undefined &&
    typeof max === "number" &&
    min >= 0 &&
    max > 0 &&
    min > max
  ) {
    errors.push({
      message: "Cardinality min cannot be greater than max",
      from: node.from,
      to: node.to
    });
  }

  return errors.length === before && min !== undefined && max !== undefined
    ? { min, max }
    : undefined;
}

function parseMin(
  pos: FieldValueWithPos,
  errors: ParseError[]
): number | undefined {
  if (pos.value === "n") {
    errors.push({
      message: "'n' is only allowed as max cardinality",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  const min = parseInteger(pos.value);
  if (min === undefined) {
    errors.push({
      message: "Cardinality min must be a number",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  if (min < 0) {
    errors.push({
      message: "Cardinality min must be greater than or equal to 0",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  return min;
}

function parseMax(
  pos: FieldValueWithPos,
  errors: ParseError[]
): number | "n" | undefined {
  if (pos.value === "n") return "n";

  const max = parseInteger(pos.value);
  if (max === undefined) {
    errors.push({
      message: "Cardinality max must be a number greater than 0 or 'n'",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  if (max <= 0) {
    errors.push({
      message: "Cardinality max must be greater than 0 or 'n'",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  return max;
}

function parseInteger(raw: string): number | undefined {
  return /^-?\d+$/.test(raw) ? Number(raw) : undefined;
}
