import type {
  AttributeCardinality,
  CardinalityValue,
  RelationshipCardinality
} from "../model";

export type AnyCardinality = AttributeCardinality | RelationshipCardinality;

export function normalizeManyCardinality(
  value: string
): Extract<CardinalityValue, "n"> | undefined {
  return value === "n" || value === "m" ? "n" : undefined;
}

export function isManyCardinalityValue(
  value: CardinalityValue
): value is Extract<CardinalityValue, "n"> {
  return value === "n";
}

export function shouldUseCardinalityArrow(
  cardinality: Pick<AnyCardinality, "max">
): boolean {
  return isManyCardinalityValue(cardinality.max);
}

export function formatCardinality(cardinality: AnyCardinality): string {
  const bothMany =
    isManyCardinalityValue(cardinality.min) &&
    isManyCardinalityValue(cardinality.max);

  return `(${formatCardinalityValue(
    cardinality.min,
    "min"
  )},${formatCardinalityValue(cardinality.max, bothMany ? "max" : "min")})`;
}

export function formatRelationshipRatio(
  left: CardinalityValue,
  right: CardinalityValue
): string {
  return `${formatCardinalityValue(left, "min")}:${formatCardinalityValue(
    right,
    "max"
  )}`;
}

function formatCardinalityValue(
  value: CardinalityValue,
  position: "min" | "max"
): string {
  if (!isManyCardinalityValue(value)) return String(value);
  return position === "max" ? "m" : "n";
}
