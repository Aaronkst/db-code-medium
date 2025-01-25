"use client";

import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/utils/types/database-types";
import type { Edge, Node } from "@xyflow/react";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useState,
} from "react";

const EditorContext = createContext<{
  nodes: Node<TableProps>[];
  setNodes: Dispatch<SetStateAction<Node<TableProps>[]>>;
  edges: Edge<TableProps>[];
  setEdges: Dispatch<SetStateAction<Edge<TableProps>[]>>;
  editingColumn: ColumnProps | null;
  setEditingColumn: (column: ColumnProps | null) => void;
  editingJoin: JoinProps | null;
  setEditingJoin: (column: JoinProps | null) => void;
}>({
  nodes: [],
  setNodes: () => {},
  edges: [],
  setEdges: () => {},
  editingColumn: null,
  setEditingColumn: () => {},
  editingJoin: null,
  setEditingJoin: () => {},
});

const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [nodes, setNodes] = useState<Node<TableProps>[]>([]);
  const [edges, setEdges] = useState<Edge<TableProps>[]>([]);

  const [editingColumn, _setEditingColumn] = useState<ColumnProps | null>(null);
  const [editingJoin, _setEditingJoin] = useState<JoinProps | null>(null);

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
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export { EditorContext, EditorProvider };
