import { parser } from "../grammar/dsl-parser";
import type { AST, ParseError } from "../model";
import { buildASTStructure } from "./ast-builder";
import { extractNodes } from "./extract";
import { createEmptyAST } from "../schema/utils";
import { validateScopeReferences, validateUniqueness } from "./validators";

export function parseDSL(input: string): AST {
  const tree = parser.parse(input);
  const ast = createEmptyAST();
  const errors: ParseError[] = [];

  const { extracted, pendingScopeRefs } = extractNodes(
    input,
    tree.topNode,
    errors
  );

  buildASTStructure(extracted, ast, errors);
  validateUniqueness(extracted, errors);
  validateScopeReferences(ast, pendingScopeRefs, errors);

  ast.errors.push(...errors);
  return ast;
}
