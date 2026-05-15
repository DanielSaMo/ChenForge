import type { SyntaxNode } from "@lezer/common";
import { DSL, type ParseError } from "../model";
import {
  type AnyArgument,
  type AnyField,
  type NodeSpec,
  isCardinalityArgument,
  isEnumField,
  isIdArgument,
  isPrefixField,
  isScopeField
} from "../schema";
import { parseCardinalityArg, getNodeValue } from "./cardinality";
import type {
  ExtractionResult,
  FieldValueWithPos,
  PendingScopeRef
} from "./types";
import { specByLezerNode } from "../schema/utils";

export function extractNodes(
  input: string,
  root: SyntaxNode,
  errors: ParseError[]
): ExtractionResult {
  const extracted: ExtractionResult["extracted"] = [];
  const pendingScopeRefs: PendingScopeRef[] = [];

  const validKeywords = Object.keys(DSL.keywords);
  const lines = input.split(/\r?\n/);
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      offset += line.length + 1;
      continue;
    }

    if (trimmed.startsWith("//")) {
      offset += line.length + 1;
      continue;
    }

    const code = trimmed.split("//")[0].trim();

    const isValidStart = validKeywords.some(k => code.startsWith(k));

    if (!isValidStart) {
      errors.push({
        message: DSL.invalidDeclarationMessage,
        from: offset,
        to: offset + code.length
      });
    }

    offset += line.length + 1;
  }

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

    const record: Record<string, any> = {};
    const fieldPositions: Record<string, FieldValueWithPos[]> = {};

    extractFields(input, node.node, spec, record, fieldPositions, pendingScopeRefs);
    extractArguments(input, node.node, spec, record, fieldPositions, errors);

    extracted.push({ spec, node: node.node, record, fieldPositions });
  });

  return { extracted, pendingScopeRefs };
}

function extractFields(
  input: string,
  node: SyntaxNode,
  spec: NodeSpec,
  record: Record<string, any>,
  fieldPositions: Record<string, FieldValueWithPos[]>,
  pendingScopeRefs: PendingScopeRef[]
) {
  for (const field of spec.fields) {
    if (isPrefixField(field)) continue;

    const values = extractFieldValues(input, node, field);
    if (!values || values.length === 0 || !field.astField) continue;

    record[field.astField] = field.multiple
      ? values.map(value => value.value)
      : values[0].value;
    fieldPositions[field.astField] = values;

    if (isScopeField(field)) {
      pendingScopeRefs.push(
        ...values.map(value => ({
          spec,
          field,
          value: value.value,
          from: value.from,
          to: value.to
        }))
      );
    }
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

  const relevantChildren = field.skipFirst ? children.slice(1) : children;

  if (!field.multiple) {
    const child = relevantChildren[0];
    return child ? [getNodeValue(input, child)] : [];
  }

  return relevantChildren.map(child => getNodeValue(input, child));
}

function extractArguments(
  input: string,
  node: SyntaxNode,
  spec: NodeSpec,
  record: Record<string, any>,
  fieldPositions: Record<string, FieldValueWithPos[]>,
  errors: ParseError[]
) {
  for (const arg of spec.arguments ?? []) {
    const applies = argumentApplies(arg, record);

    const argNodes = node.getChildren(arg.child);

    if (argNodes.length === 0) {
      if (applies) {
        const enumField = spec.fields.find(isEnumField);
        const enumNode = enumField ? node.getChild(enumField.child) : null;

        errors.push({
          message: arg.requiredMessage,
          from: enumNode?.from ?? node.from,
          to: enumNode?.to ?? node.to
        });
      }
      continue;
    }

    if (!applies) {
      const enumValue = arg.when
        ? String(record[arg.when.enumField] ?? "?")
        : "?";
      errors.push({
        message: arg.unexpectedMessage(enumValue),
        from: argNodes[0].from,
        to: argNodes[0].to
      });
      continue;
    }

    if (isIdArgument(arg)) {
      const argNode = argNodes[0];
      const value = getNodeValue(input, argNode);
      record[arg.astField] = value.value;
      fieldPositions[arg.astField] = [value];
      continue;
    }

    if (isCardinalityArgument(arg)) {
      const cardinalities = argNodes
        .map(argNode => ({
          value: parseCardinalityArg(input, argNode, errors, {
            allowManyMin: arg.allowManyMin
          }),
          position: getNodeValue(input, argNode)
        }))
        .filter(item => Boolean(item.value));

      if (cardinalities.length) {
        record[arg.astField] = arg.multiple
          ? cardinalities.map(item => item.value)
          : cardinalities[0].value;
        fieldPositions[arg.astField] = arg.multiple
          ? cardinalities.map(item => item.position)
          : [cardinalities[0].position];
      }

      if (arg.expectedCount && argNodes.length !== arg.expectedCount) {
        errors.push({
          message: arg.requiredMessage,
          from: node.from,
          to: node.to
        });
      }
    }
  }
}

function argumentApplies(arg: AnyArgument, record: Record<string, any>): boolean {
  if (!arg.when) return true;
  return record[arg.when.enumField] === arg.when.value;
}
