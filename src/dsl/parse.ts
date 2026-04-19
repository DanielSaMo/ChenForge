import { parser } from "./dsl-parser";
import type { AST, ParseError } from "./core";
import { DSL_SCHEMA, type NodeSpec } from "./dsl-schema";

function specByLezerNode(nodeName: string): NodeSpec | undefined {
  return DSL_SCHEMA.nodes.find(s => s.lezerNode === nodeName);
}

type AnyFieldSpec =
  | NodeSpec["idField"]
  | NodeSpec["scopeField"]
  | NonNullable<NodeSpec["extraFields"]>[number]
  | undefined;

interface FieldValueWithPos {
  value: string;
  from: number;
  to: number;
}

interface PendingScopeRef {
  spec: NodeSpec;
  value: string;
  from: number;
  to: number;
}

function collectFieldValues(
  input: string,
  node: import("@lezer/common").SyntaxNode,
  field: AnyFieldSpec
): FieldValueWithPos[] | undefined {
  if (!field) return undefined;

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

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);

  const partialAst: Partial<AST> = {
    errors: [] as ParseError[]
  };

  ensureAstCollections(partialAst);
  const ast = partialAst as AST;

  const uniquenessMaps = new Map<
    NodeSpec,
    Map<string, { from: number; to: number }>
  >();

  for (const spec of DSL_SCHEMA.nodes) {
    if (spec.uniqueKeyFields && spec.uniqueKeyFields.length > 0) {
      uniquenessMaps.set(spec, new Map());
    }
  }

  const pendingScopeRefs: PendingScopeRef[] = [];

  tree.cursor().iterate(node => {
    const spec = specByLezerNode(node.type.name);
    if (!spec) return;

    if (node.node.getChild("⚠")) {
      ast.errors.push({
        message: spec.missingIdMessage,
        from: node.from,
        to: node.to
      });
      return;
    }

    const record: any = {};
    const fieldPositions: Record<string, FieldValueWithPos[]> = {};

    if (spec.scopeField) {
      const vals = collectFieldValues(input, node.node, spec.scopeField);
      if (vals && vals.length > 0) {
        record[spec.scopeField.astField] = vals.map(v => v.value);
        fieldPositions[spec.scopeField.astField] = vals;

        for (const v of vals) {
          pendingScopeRefs.push({
            spec,
            value: v.value,
            from: v.from,
            to: v.to
          });
        }
      }
    }

    if (spec.idField) {
      const vals = collectFieldValues(input, node.node, spec.idField);
      if (vals && vals.length > 0) {
        record[spec.idField.astField] = vals.map(v => v.value);
        fieldPositions[spec.idField.astField] = vals;
      }
    }

    if (spec.extraFields) {
      for (const f of spec.extraFields) {
        const vals = collectFieldValues(input, node.node, f);
        if (vals && vals.length > 0) {
          record[f.astField] = vals.map(v => v.value);
          fieldPositions[f.astField] = vals;
        }
      }
    }

    const idsRaw = spec.idField ? record[spec.idField.astField] : undefined;
    const ids: string[] = Array.isArray(idsRaw)
      ? idsRaw
      : idsRaw
        ? [idsRaw]
        : [];

    if (spec.idField && ids.length === 0) {
      ast.errors.push({
        message: spec.missingIdMessage,
        from: node.from,
        to: node.to
      });
      return;
    }

    (ast as any)[spec.astCollection].push(record);

    const map = uniquenessMaps.get(spec);
    if (map && spec.uniqueKeyFields && spec.idField) {
      const idFieldName = spec.idField.astField;

      for (const id of ids) {
        const keyParts = spec.uniqueKeyFields.map(fieldName => {
          if (fieldName === idFieldName) return id;
          return record[fieldName];
        });

        const key = String(keyParts.join("|"));

        if (map.has(key)) {
          const posList = fieldPositions[idFieldName];
          const pos = posList?.find(p => p.value === id);

          ast.errors.push({
            message: spec.duplicateIdMessage(
              id,
              spec.scopeField
                ? record[spec.scopeField.astField]?.[0]
                : undefined
            ),
            from: pos?.from ?? node.from,
            to: pos?.to ?? node.to
          });
        } else {
          map.set(key, { from: node.from, to: node.to });
        }
      }
    }
  });

  const refSets = new Map<string, Set<string>>();

  for (const spec of DSL_SCHEMA.nodes) {
    if (!spec.scopeField) continue;
    const sf = spec.scopeField;
    const key = `${sf.refCollection}:${sf.refField}`;

    if (refSets.has(key)) continue;

    const refItems = (ast as any)[sf.refCollection] as any[];
    const set = new Set<string>(
      refItems
        .map(item => {
          const v = item[sf.refField];
          if (Array.isArray(v)) return v[0];
          return v;
        })
        .filter((v: unknown): v is string => typeof v === "string")
    );

    refSets.set(key, set);
  }

  for (const ref of pendingScopeRefs) {
    const sf = ref.spec.scopeField;
    if (!sf) continue;

    const key = `${sf.refCollection}:${sf.refField}`;
    const validNames = refSets.get(key);
    if (!validNames) continue;

    if (!validNames.has(ref.value)) {
      ast.errors.push({
        message: ref.spec.invalidScopeMessage
          ? ref.spec.invalidScopeMessage(ref.value)
          : `Invalid reference '${ref.value}' for field '${sf.astField}'`,
        from: ref.from,
        to: ref.to
      });
    }
  }

  return ast;
}
