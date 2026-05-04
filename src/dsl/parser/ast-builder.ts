import type { AST, ParseError } from "../model";
import { isIdField } from "../schema";
import type { ExtractedNode } from "./types";

export function buildASTStructure(
  extracted: ExtractedNode[],
  ast: AST,
  errors: ParseError[]
) {
  for (const { spec, node, record } of extracted) {
    const idField = spec.fields.find(isIdField);

    if (idField?.astField) {
      const ids = toList(record[idField.astField]);

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

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}
