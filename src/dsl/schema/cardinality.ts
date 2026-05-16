import {
  CardinalityConfig,
  type AttributeCardinality,
  type CardinalityValue,
  type ManyCardinalityId,
  type RelationshipCardinality
} from "../model";

export type AnyCardinality = AttributeCardinality | RelationshipCardinality;

export function normalizeManyCardinality(
  value: string
): ManyCardinalityId | undefined {
  return CardinalityConfig.dslSymbols.includes(value)
    ? CardinalityConfig.manyId
    : undefined;
}

export function isManyCardinalityValue(
  value: CardinalityValue
): value is ManyCardinalityId {
  return value === CardinalityConfig.manyId;
}

export function shouldUseCardinalityArrow(
  cardinality: Pick<AnyCardinality, "max">
): boolean {
  return isManyCardinalityValue(cardinality.max);
}

export function formatAttributeOrEntityCardinality(
  cardinality: AttributeCardinality | RelationshipCardinality
): string {
  return formatCardinalityPair(
    cardinality.min,
    cardinality.max,
    CardinalityConfig.display.node
  );
}

export function formatRelationshipRatioDisplay(
  left: CardinalityValue,
  right: CardinalityValue
): string {
  const pair = formatCardinalityPair(
    left,
    right,
    CardinalityConfig.display.relationship
  );

  return pair.slice(1, -1).replace(",", ":");
}

function formatCardinalityPair(
  min: CardinalityValue,
  max: CardinalityValue,
  display: { single: string; first: string; second: string }
): string {
  const minMany = isManyCardinalityValue(min);
  const maxMany = isManyCardinalityValue(max);

  if (!minMany && !maxMany) {
    return `(${min},${max})`;
  }

  if (minMany && maxMany) {
    return `(${display.first},${display.second})`;
  }

  if (minMany) {
    return `(${display.single},${max})`;
  }

  return `(${min},${display.single})`;
}
