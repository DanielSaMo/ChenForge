import { CstParser } from "chevrotain";
import { allTokens, Entity, Identifier } from "./tokens";

class DSLParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  public program = this.RULE("program", () => {
    this.MANY(() => this.SUBRULE(this.entityDecl));
  });

  private entityDecl = this.RULE("entityDecl", () => {
    this.CONSUME(Entity);
    this.CONSUME(Identifier);
  });
}

export const parser = new DSLParser();
