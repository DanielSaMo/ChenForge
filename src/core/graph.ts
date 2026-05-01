import type { AttributeKind } from "../dsl/core";

export interface GraphEntity {
  id: string;
  name: string;
}

export interface GraphAttribute {
  id: string;
  entityId: string;
  names: string[];
  kind: AttributeKind;
}

export interface GraphModel {
  entities: GraphEntity[];
  attributes: GraphAttribute[];
}
