import type {
  EntityKind,
  AttributeKind,
  AttributeCardinality
} from "../dsl/model";

export interface GraphEntity {
  id: string;
  name: string;
  kind: EntityKind;
}

export interface GraphAttribute {
  id: string;
  entityId: string;
  names: string[];
  kind: AttributeKind;
  composition?: string;
  cardinality?: AttributeCardinality;
}

export interface GraphModel {
  entities: GraphEntity[];
  attributes: GraphAttribute[];
}
