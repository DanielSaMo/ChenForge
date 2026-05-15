import type { SyntaxNode } from "@lezer/common";
import { normalizeManyCardinality } from "../schema/cardinality";
import type {
  AttributeCardinality,
  CardinalityValue,
  ParseError,
  RelationshipCardinality
} from "../model";
import type { FieldValueWithPos } from "./types";

export interface CardinalityParseOptions {
  allowManyMin?: boolean;
}

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
  errors: ParseError[],
  options: CardinalityParseOptions = {}
): AttributeCardinality | RelationshipCardinality | undefined {
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
  const min = parseMin(minPos, errors, options);
  const max = parseMax(maxPos, errors);

  if (
    typeof min === "number" &&
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
  errors: ParseError[],
  options: CardinalityParseOptions
): CardinalityValue | undefined {
  const many = normalizeManyCardinality(pos.value);

  if (many && options.allowManyMin) {
    return many;
  }

  if (many) {
    errors.push({
      message: "'n' or 'm' is only allowed as max cardinality",
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
): CardinalityValue | undefined {
  const many = normalizeManyCardinality(pos.value);
  if (many) return many;

  const max = parseInteger(pos.value);
  if (max === undefined) {
    errors.push({
      message: "Cardinality max must be a number greater than 0, 'n' or 'm'",
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  if (max <= 0) {
    errors.push({
      message: "Cardinality max must be greater than 0, 'n' or 'm'",
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
