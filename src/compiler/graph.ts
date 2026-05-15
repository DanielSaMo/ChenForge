import type {
  EntityKind,
  AttributeKind,
  AttributeCardinality,
  RelationshipCardinality
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

export interface GraphRelationship {
  id: string;
  name: string;
  entityIds: [string, string];
  cardinalities: [RelationshipCardinality, RelationshipCardinality];
}

export interface GraphModel {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  attributes: GraphAttribute[];
}
