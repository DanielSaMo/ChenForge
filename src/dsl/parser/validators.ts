import type { AST, ParseError } from "../model";
import {
  DSL_SCHEMA,
  type NodeSpec,
  isIdField,
  isScopeField
} from "../schema";
import type {
  ExtractedNode,
  FieldValueWithPos,
  PendingScopeRef
} from "./types";

export function validateUniqueness(
  extracted: ExtractedNode[],
  errors: ParseError[]
) {
  const maps = new Map<NodeSpec, Map<string, { from: number; to: number }>>();

  for (const spec of DSL_SCHEMA.nodes) {
    if (spec.uniqueKeyFields?.length) {
      maps.set(spec, new Map());
    }
  }

  for (const extractedNode of extracted) {
    validateNodeUniqueness(extractedNode, maps, errors);
  }
}

export function validateScopeReferences(
  ast: AST,
  pending: PendingScopeRef[],
  errors: ParseError[]
) {
  const refSets = createReferenceSets(ast);

  for (const ref of pending) {
    const field = ref.field;
    if (!isScopeField(field)) continue;

    const valid = refSets.get(`${field.refCollection}:${field.refField}`);
    if (!valid || valid.has(ref.value)) continue;

    errors.push({
      message: ref.spec.invalidScopeMessage
        ? ref.spec.invalidScopeMessage(ref.value)
        : `Invalid reference '${ref.value}' for field '${field.astField}'`,
      from: ref.from,
      to: ref.to
    });
  }
}

function validateNodeUniqueness(
  extractedNode: ExtractedNode,
  maps: Map<NodeSpec, Map<string, { from: number; to: number }>>,
  errors: ParseError[]
) {
  const { spec, node, record, fieldPositions } = extractedNode;
  const map = maps.get(spec);
  if (!map || !spec.uniqueKeyFields) return;

  const idField = spec.fields.find(isIdField);
  if (!idField?.astField) return;

  const scopeName = getScopeName(spec, record);

  for (const idInfo of collectUniqueIds(spec, record, fieldPositions)) {
    const id = idInfo.value;
    const pos =
      idInfo.from === 0 && idInfo.to === 0
        ? { from: node.from, to: node.to }
        : idInfo;

    const key = spec.uniqueKeyFields
      .map(fieldName => (fieldName === idField.astField ? id : record[fieldName]))
      .join("|");

    if (!map.has(key)) {
      map.set(key, { from: pos.from, to: pos.to });
      continue;
    }

    errors.push({
      message: spec.duplicateIdMessage(id, scopeName),
      from: pos.from,
      to: pos.to
    });
  }
}

function collectUniqueIds(
  spec: NodeSpec,
  record: Record<string, any>,
  fieldPositions: Record<string, FieldValueWithPos[]>
): FieldValueWithPos[] {
  const ids: FieldValueWithPos[] = [];
  const idField = spec.fields.find(isIdField);

  if (idField?.astField) {
    const values = toList(record[idField.astField]);
    const positions = fieldPositions[idField.astField] ?? [];

    values.forEach((value, index) => {
      const pos = positions[index];
      ids.push({
        value,
        from: pos?.from ?? 0,
        to: pos?.to ?? 0
      });
    });
  }

  for (const arg of spec.arguments ?? []) {
    if (!arg.uniqueKey) continue;

    const value = record[arg.astField];
    if (typeof value !== "string") continue;

    const pos = fieldPositions[arg.astField]?.[0];
    ids.push({
      value,
      from: pos?.from ?? 0,
      to: pos?.to ?? 0
    });
  }

  return ids;
}

function createReferenceSets(ast: AST): Map<string, Set<string>> {
  const refSets = new Map<string, Set<string>>();

  for (const spec of DSL_SCHEMA.nodes) {
    for (const field of spec.fields.filter(isScopeField)) {
      const key = `${field.refCollection}:${field.refField}`;
      if (refSets.has(key)) continue;

      const refItems = (ast as any)[field.refCollection] as any[];
      const set = new Set<string>(
        refItems
          .map(item => {
            const value = item[field.refField];
            return Array.isArray(value) ? value[0] : value;
          })
          .filter((value): value is string => typeof value === "string")
      );

      refSets.set(key, set);
    }
  }

  return refSets;
}

function getScopeName(
  spec: NodeSpec,
  record: Record<string, any>
): string | undefined {
  const scopeField = spec.fields.find(isScopeField);
  if (!scopeField?.astField) return undefined;

  const value = record[scopeField.astField];
  return Array.isArray(value) ? value[0] : value;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}
