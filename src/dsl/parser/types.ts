import type { SyntaxNode } from "@lezer/common";
import type { AnyField, NodeSpec } from "../schema";

export interface FieldValueWithPos {
  value: string;
  from: number;
  to: number;
}

export interface ExtractedNode {
  spec: NodeSpec;
  node: SyntaxNode;
  record: Record<string, any>;
  fieldPositions: Record<string, FieldValueWithPos[]>;
}

export interface PendingScopeRef {
  spec: NodeSpec;
  field: AnyField;
  value: string;
  from: number;
  to: number;
}

export interface ExtractionResult {
  extracted: ExtractedNode[];
  pendingScopeRefs: PendingScopeRef[];
}
