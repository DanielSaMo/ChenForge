import type { AST, ParseError } from "../model";
import {
  DSL_SCHEMA,
  type NodeSpec,
  isEnumField,
  isIdField,
  isScopeField
} from "../schema";
import { getScopeReferences } from "../schema/utils";
import type {
  ExtractedNode,
  FieldValueWithPos,
  PendingScopeRef
} from "./types";

export function validateUniqueness(
  extracted: ExtractedNode[],
  errors: ParseError[]
) {
  const maps = new Map<string, Map<string, { from: number; to: number }>>();

  for (const spec of DSL_SCHEMA.nodes) {
    if (spec.uniqueKeyFields?.length) {
      maps.set(getUniquenessMapKey(spec), new Map());
    }
  }

  for (const extractedNode of extracted) {
    validateNodeUniqueness(extractedNode, maps, errors);
  }
}

export function validateEnumTypes(
  extracted: ExtractedNode[],
  errors: ParseError[]
) {
  for (const extractedNode of extracted) {
    const { spec, record, fieldPositions, node } = extractedNode;

    for (const field of spec.fields) {
      if (!isEnumField(field)) continue;

      const astField = field.astField;
      if (!astField) continue;

      const value = record[astField];
      if (typeof value !== "string") continue;

      const validValues = field.enumOptions?.map(o => o.value) ?? [];

      if (!validValues.includes(value)) {
        const pos = fieldPositions[astField]?.[0];

        errors.push({
          message: `Invalid type '${value}'. Expected: ${validValues.join(", ")}`,
          from: pos?.from ?? node.from,
          to: pos?.to ?? node.to
        });
      }
    }
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

    const isValid = getScopeReferences(field).some(scopeRef => {
      const valid = refSets.get(
        `${scopeRef.refCollection}:${scopeRef.refField}`
      );
      return valid?.has(ref.value);
    });

    if (isValid) continue;

    errors.push({
      message: ref.spec.invalidScopeMessage
        ? ref.spec.invalidScopeMessage(ref.value)
        : `Invalid reference '${ref.value}' for field '${field.astField}'`,
      from: ref.from,
      to: ref.to
    });
  }
}

export function validateRelationshipTypes(
  ast: AST,
  extracted: ExtractedNode[],
  errors: ParseError[]
) {
  const entityByName = new Map(ast.entities.map(entity => [entity.name, entity]));

  for (const extractedNode of extracted) {
    if (extractedNode.spec.astCollection !== "relationships") continue;

    const { record, fieldPositions, node } = extractedNode;
    const entities = toList(record.entities);
    const kind = record.kind;

    if (entities.length !== 2 || typeof kind !== "string") continue;

    const left = entityByName.get(entities[0]);
    const right = entityByName.get(entities[1]);
    if (!left || !right) continue;

    const kindPos = fieldPositions.kind?.[0] ?? { from: node.from, to: node.to };

    if (left.kind === "WK" && right.kind === "WK") {
      errors.push({
        message: "Relationships between two weak entities are not allowed",
        from: node.from,
        to: node.to
      });
      continue;
    }

    if (left.kind === "ST" && right.kind === "ST" && kind !== "ST") {
      errors.push({
        message:
          "A relationship between two strong entities must use relationship type 'ST'",
        from: kindPos.from,
        to: kindPos.to
      });
      continue;
    }

    if (left.kind !== right.kind && kind === "ST") {
      errors.push({
        message:
          "A relationship between a strong entity and a weak entity must use relationship type 'EX' or 'ID'",
        from: kindPos.from,
        to: kindPos.to
      });
    }
  }
}

function validateNodeUniqueness(
  extractedNode: ExtractedNode,
  maps: Map<string, Map<string, { from: number; to: number }>>,
  errors: ParseError[]
) {
  const { spec, node, record, fieldPositions } = extractedNode;
  const map = maps.get(getUniquenessMapKey(spec));
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
      for (const scopeRef of getScopeReferences(field)) {
        const key = `${scopeRef.refCollection}:${scopeRef.refField}`;
        if (refSets.has(key)) continue;

        const refItems = (ast as any)[scopeRef.refCollection] as any[];
        const set = new Set<string>(
          refItems
            .map(item => {
              const value = item[scopeRef.refField];
              return Array.isArray(value) ? value[0] : value;
            })
            .filter((value): value is string => typeof value === "string")
        );

        refSets.set(key, set);
      }
    }
  }

  return refSets;
}

function getUniquenessMapKey(spec: NodeSpec): string {
  return spec.uniqueScope ?? spec.lezerNode;
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
