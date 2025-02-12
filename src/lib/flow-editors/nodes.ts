import type { TableProps } from "@/lib/types/database-types";
import {
  applyNodeChanges,
  type NodeChange,
  type Node,
  type Edge,
  applyEdgeChanges,
} from "@xyflow/react";

/**
 * Deletes nodes from the flow.
 * @param ids
 * @param nodes
 * @returns
 */
export function deleteNodes(ids: string | string[], nodes: Node<TableProps>[]) {
  if (!Array.isArray(ids)) ids = [ids];
  return applyNodeChanges(
    ids.map((id) => ({
      id,
      type: "remove",
    })),
    nodes,
  );
}

type UpdateNodesPayload = { id: string } & Partial<TableProps>;

/**
 * Updates nodes and table data from the flow.
 * @param data
 * @param nodes
 * @returns
 */
export function updateNodes(
  data: UpdateNodesPayload | UpdateNodesPayload[],
  nodes: Node<TableProps>[],
) {
  if (!Array.isArray(data)) data = [data];
  return applyNodeChanges(
    data
      .map((payload): NodeChange<Node<TableProps>> | null => {
        const node = nodes.find((nds) => nds.id === payload.id);
        if (!node) return null;
        return {
          id: payload.id,
          type: "replace",
          item: { ...node, data: { ...node.data, ...payload } },
        };
      })
      .filter((change) => !!change),
    nodes,
  );
}

/**
 * Delete wires from the flow.
 * @param ids
 * @param edges
 * @returns
 */
export function deleteEdges(ids: string | string[], edges: Edge<TableProps>[]) {
  if (!Array.isArray(ids)) ids = [ids];
  return applyEdgeChanges(
    ids.map((id) => ({
      type: "remove",
      id: id,
    })),
    edges,
  );
}

/**
 * Deselect wires..
 * @param ids
 * @param edges
 * @returns
 */
export function deselectEdges(
  ids: string | string[],
  edges: Edge<TableProps>[],
) {
  if (!Array.isArray(ids)) ids = [ids];
  return applyEdgeChanges(
    ids.map((id) => ({
      type: "select",
      id: id,
      selected: false,
    })),
    edges,
  );
}
