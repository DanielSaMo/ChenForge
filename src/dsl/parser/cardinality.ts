import type { SyntaxNode } from "@lezer/common";
import {
  normalizeManyCardinality,
  isManyCardinalityValue
} from "../schema/cardinality";
import {
  CardinalityConfig,
  type AttributeCardinality,
  type CardinalityValue,
  type ParseError,
  type RelationshipCardinality
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

  if (
    values.length !== 2 ||
    values[0].value.trim() === "" ||
    values[1].value.trim() === ""
  ) {
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
    min > max
  ) {
    errors.push({
      message: "Cardinality min cannot be greater than max",
      from: node.from,
      to: node.to
    });
  }

  if (
    min !== undefined &&
    max !== undefined &&
    isManyCardinalityValue(min) &&
    !isManyCardinalityValue(max)
  ) {
    errors.push({
      message:
        "If cardinality min is a many value, max must also be a many value",
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

  if (many) {
    if (options.allowManyMin) {
      return many;
    }

    errors.push({
      message: `${manySymbolsText()} are not allowed as min cardinality`,
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  const min = Number(pos.value);

  if (min < 0) {
    if (options.allowManyMin) {
      errors.push({
        message: `Cardinality min must be greater than or equal to 0 or one of ${manySymbolsText()}`,
        from: pos.from,
        to: pos.to
      });
    } else {
      errors.push({
        message: "Cardinality min must be greater than or equal to 0",
        from: pos.from,
        to: pos.to
      });
    }
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

  const max = Number(pos.value);

  if (max <= 0) {
    errors.push({
      message: `Cardinality max must be greater than 0 or one of ${manySymbolsText()}`,
      from: pos.from,
      to: pos.to
    });
    return undefined;
  }

  return max;
}

function manySymbolsText(): string {
  const symbols = CardinalityConfig.dslSymbols.map(s => `'${s}'`);
  if (symbols.length <= 1) return symbols.join("");

  const head = symbols.slice(0, -1).join(", ");
  const last = symbols[symbols.length - 1];
  return `${head} or ${last}`;
}
