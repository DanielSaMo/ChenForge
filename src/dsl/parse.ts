import { parser } from "./dsl-parser";
import type { AST, ParseError } from "./core";
import {
  DSL_SCHEMA,
  type NodeSpec,
  type AnyField,
  isIdField,
  isScopeField,
  isPrefixField
} from "./dsl-schema";

import type { SyntaxNode } from "@lezer/common";

interface FieldValueWithPos {
  value: string;
  from: number;
  to: number;
}

interface ExtractedNode {
  spec: NodeSpec;
  node: SyntaxNode;
  record: any;
  fieldPositions: Record<string, FieldValueWithPos[]>;
}

interface PendingScopeRef {
  spec: NodeSpec;
  field: AnyField;
  value: string;
  from: number;
  to: number;
}

function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(s => s.lezerNode === nodeName);
}

function ensureAstCollections(ast: Partial<AST>): asserts ast is AST {
  for (const spec of DSL_SCHEMA.nodes) {
    const key = spec.astCollection;
    if (!(ast as any)[key]) {
      (ast as any)[key] = [];
    }
  }
  if (!ast.errors) {
    (ast as any).errors = [];
  }
}

function extractFieldValues(
  input: string,
  node: SyntaxNode,
  field: AnyField
): FieldValueWithPos[] | undefined {
  if (isPrefixField(field)) return undefined;

  const children = node.getChildren(field.child);
  if (!children.length) return field.multiple ? [] : undefined;

  const sliceChildren = field.skipFirst ? children.slice(1) : children;

  if (!field.multiple) {
    const ch = sliceChildren[0];
    if (!ch) return [];
    return [
      {
        value: input.slice(ch.from, ch.to),
        from: ch.from,
        to: ch.to
      }
    ];
  }

  return sliceChildren.map(ch => ({
    value: input.slice(ch.from, ch.to),
    from: ch.from,
    to: ch.to
  }));
}

function extractNodes(input: string, root: SyntaxNode): {
  extracted: ExtractedNode[];
  pendingScopeRefs: PendingScopeRef[];
  errors: ParseError[];
} {
  const extracted: ExtractedNode[] = [];
  const pendingScopeRefs: PendingScopeRef[] = [];
  const errors: ParseError[] = [];

  root.cursor().iterate(node => {
    const spec = specByLezerNode(node.type.name);
    if (!spec) return;

    if (node.node.getChild("⚠")) {
      errors.push({
        message: spec.missingIdMessage,
        from: node.from,
        to: node.to
      });
      return;
    }

    const record: any = {};
    const fieldPositions: Record<string, FieldValueWithPos[]> = {};

    for (const field of spec.fields) {
      if (isPrefixField(field)) continue;

      const vals = extractFieldValues(input, node.node, field);
      if (!vals || vals.length === 0 || !field.astField) continue;

      const values = field.multiple ? vals.map(v => v.value) : vals[0].value;
      record[field.astField] = values;
      fieldPositions[field.astField] = vals;

      if (isScopeField(field)) {
        for (const v of vals) {
          pendingScopeRefs.push({
            spec,
            field,
            value: v.value,
            from: v.from,
            to: v.to
          });
        }
      }
    }

    extracted.push({ spec, node: node.node, record, fieldPositions });
  });

  return { extracted, pendingScopeRefs, errors };
}

function buildASTStructure(
  extracted: ExtractedNode[],
  ast: AST,
  errors: ParseError[]
) {
  for (const { spec, node, record } of extracted) {
    const idField = spec.fields.find(isIdField);

    if (idField && idField.astField) {
      const raw = record[idField.astField];
      const ids: string[] = Array.isArray(raw)
        ? raw
        : raw
          ? [raw]
          : [];

      if (ids.length === 0) {
        errors.push({
          message: spec.missingIdMessage,
          from: node.from,
          to: node.to
        });
        continue;
      }
    }

    (ast as any)[spec.astCollection].push(record);
  }
}

function validateUniqueness(
  extracted: ExtractedNode[],
  errors: ParseError[]
) {
  const maps = new Map<NodeSpec, Map<string, { from: number; to: number }>>();

  for (const spec of DSL_SCHEMA.nodes) {
    if (spec.uniqueKeyFields?.length) {
      maps.set(spec, new Map());
    }
  }

  for (const { spec, node, record, fieldPositions } of extracted) {
    const map = maps.get(spec);
    if (!map || !spec.uniqueKeyFields) continue;

    const idField = spec.fields.find(isIdField);
    if (!idField || !idField.astField) continue;

    const raw = record[idField.astField];
    const ids: string[] = Array.isArray(raw)
      ? raw
      : raw
        ? [raw]
        : [];

    for (const id of ids) {
      const keyParts = spec.uniqueKeyFields.map(fieldName => {
        if (fieldName === idField.astField) return id;
        return record[fieldName];
      });

      const key = keyParts.join("|");

      if (map.has(key)) {
        const posList = fieldPositions[idField.astField];
        const pos = posList?.find(p => p.value === id);

        const scopeField = spec.fields.find(isScopeField);
        const scopeName =
          scopeField && scopeField.astField
            ? (Array.isArray(record[scopeField.astField])
              ? record[scopeField.astField][0]
              : record[scopeField.astField])
            : undefined;

        errors.push({
          message: spec.duplicateIdMessage(id, scopeName),
          from: pos?.from ?? node.from,
          to: pos?.to ?? node.to
        });
      } else {
        map.set(key, { from: node.from, to: node.to });
      }
    }
  }
}

function validateScopeReferences(
  ast: AST,
  pending: PendingScopeRef[],
  errors: ParseError[]
) {
  const refSets = new Map<string, Set<string>>();

  for (const spec of DSL_SCHEMA.nodes) {
    for (const field of spec.fields.filter(isScopeField)) {
      const key = `${field.refCollection}:${field.refField}`;
      if (refSets.has(key)) continue;

      const refItems = (ast as any)[field.refCollection] as any[];
      const set = new Set<string>(
        refItems
          .map(item => {
            const v = item[field.refField];
            return Array.isArray(v) ? v[0] : v;
          })
          .filter((v): v is string => typeof v === "string")
      );

      refSets.set(key, set);
    }
  }

  for (const ref of pending) {
    const field = ref.field;
    if (!isScopeField(field)) continue;

    const key = `${field.refCollection}:${field.refField}`;
    const valid = refSets.get(key);
    if (!valid) continue;

    if (!valid.has(ref.value)) {
      errors.push({
        message: ref.spec.invalidScopeMessage
          ? ref.spec.invalidScopeMessage(ref.value)
          : `Invalid reference '${ref.value}' for field '${field.astField}'`,
        from: ref.from,
        to: ref.to
      });
    }
  }
}

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);

  const partialAst: Partial<AST> = { errors: [] };
  ensureAstCollections(partialAst);
  const ast = partialAst as AST;

  const { extracted, pendingScopeRefs, errors } = extractNodes(
    input,
    tree.topNode
  );

  buildASTStructure(extracted, ast, errors);
  validateUniqueness(extracted, errors);
  validateScopeReferences(ast, pendingScopeRefs, errors);

  ast.errors.push(...errors);
  return ast;
}
