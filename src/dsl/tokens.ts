import { createToken, Lexer } from "chevrotain";

export const Entity = createToken({ name: "Entity", pattern: /entity/ });
export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });
export const Newline = createToken({ name: "Newline", pattern: /\n+/, group: Lexer.SKIPPED });
export const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[ \t\r]+/, group: Lexer.SKIPPED });

export const allTokens = [WhiteSpace, Newline, Entity, Identifier];
