"use client";

import { findDuplicateTableNames } from "@/lib/utils";
import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/lib/types/database-types";
import type { Edge, Node } from "@xyflow/react";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useMemo,
  useState,
} from "react";

const EditorContext = createContext<{
  // tables and relations
  nodes: Node<TableProps>[];
  setNodes: Dispatch<SetStateAction<Node<TableProps>[]>>;
  edges: Edge<TableProps>[];
  setEdges: Dispatch<SetStateAction<Edge<TableProps>[]>>;
  // editing panes
  editingColumn: ColumnProps | null;
  setEditingColumn: (column: ColumnProps | null) => void;
  editingJoin: JoinProps | null;
  setEditingJoin: (column: JoinProps | null) => void;
  // validation checks
  duplicates: string[];
}>({
  nodes: [],
  setNodes: () => {},
  edges: [],
  setEdges: () => {},
  editingColumn: null,
  setEditingColumn: () => {},
  editingJoin: null,
  setEditingJoin: () => {},
  duplicates: [],
});

const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [nodes, setNodes] = useState<Node<TableProps>[]>([]);
  const [edges, setEdges] = useState<Edge<TableProps>[]>([]);

  const [editingColumn, _setEditingColumn] = useState<ColumnProps | null>(null);
  const [editingJoin, _setEditingJoin] = useState<JoinProps | null>(null);

  const duplicates = useMemo(() => findDuplicateTableNames(nodes), [nodes]);

  function setEditingColumn(column: ColumnProps | null) {
    _setEditingColumn(column);
  }

  function setEditingJoin(join: JoinProps | null) {
    _setEditingJoin(join);
  }

  return (
    <EditorContext.Provider
      value={{
        // nodes & edges,
        nodes,
        edges,
        setNodes,
        setEdges,
        // column
        editingColumn,
        setEditingColumn,
        // join
        editingJoin,
        setEditingJoin,
        // duplicates,
        duplicates,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export { EditorContext, EditorProvider };
