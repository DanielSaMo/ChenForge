import { lexer } from "./lexer";
import { parser } from "./parser";
import { Identifier } from "./tokens";
import type { AST } from "./ast";

export function parseDSL(input: string): AST {
  const lex = lexer.tokenize(input);
  parser.input = lex.tokens;
  parser.program();

  if (parser.errors.length > 0) {
    throw new Error("Error de sintaxis en el DSL");
  }

  const entities = lex.tokens
    .filter(t => t.tokenType === Identifier)
    .map(t => t.image);

  return { entities };
}
