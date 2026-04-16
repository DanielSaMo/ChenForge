interface FieldSpec {
  child: string;
  astField: string;
}

export interface NodeSpec {
  lezerNode: string;
  astCollection: keyof import("./core").AST;
  idField: FieldSpec;

  prefixChildren: string[];

  missingIdMessage: string;
  duplicateIdMessage: (name: string) => string;

  autocompleteName: {
    label: string;
    info: string;
  };
}

interface DSLSchema {
  nodes: NodeSpec[];
}

export const DSL_SCHEMA: DSLSchema = {
  nodes: [
    {
      lezerNode: "entityDecl",
      astCollection: "entities",

      idField: {
        child: "Identifier",
        astField: "name"
      },

      prefixChildren: ["Entity"],

      missingIdMessage: "Invalid entity declaration. Expected: entity name",
      duplicateIdMessage: name => `Duplicate entity name '${name}'`,

      autocompleteName: {
        label: "name",
        info: "Name of the new entity"
      }
    }
  ]
};
