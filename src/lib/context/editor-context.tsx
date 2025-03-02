"use client";

// import { findDuplicateTableNames } from "@/lib/utils";
import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/lib/types/database-types";
import { applyNodeChanges, type Edge, type Node } from "@xyflow/react";
import { debounce } from "lodash";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { deleteNodes, updateNodes } from "../flow-editors/nodes";
import { nanoid } from "nanoid";
import { getDefaultTable } from "../flow-editors/helpers";

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
  // custom node crud
  removeNode: (id: string) => void;
  editNode: (id: string, data: Partial<TableProps>) => void;
  appendNode: () => void;
  duplicateNode: (id: string) => void;
}>({
  nodes: [],
  setNodes: () => {},
  edges: [],
  setEdges: () => {},
  editingColumn: null,
  setEditingColumn: () => {},
  editingJoin: null,
  setEditingJoin: () => {},
  removeNode: () => {},
  editNode: () => {},
  appendNode: () => {},
  duplicateNode: () => {},
});

const debouncedSetLocalStorage = debounce((key: string, value: string) => {
  localStorage.setItem(key, value);
}, 300);

const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [nodes, setNodes] = useState<Node<TableProps>[]>([]);
  const [edges, setEdges] = useState<Edge<TableProps>[]>([]);

  const [editingColumn, _setEditingColumn] = useState<ColumnProps | null>(null);
  const [editingJoin, _setEditingJoin] = useState<JoinProps | null>(null);

  // const duplicates = useMemo(() => findDuplicateTableNames(nodes), [nodes]);

  function setEditingColumn(column: ColumnProps | null) {
    _setEditingColumn(column);
  }

  function setEditingJoin(join: JoinProps | null) {
    _setEditingJoin(join);
  }

  useEffect(() => {
    debouncedSetLocalStorage("nodes", JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    debouncedSetLocalStorage("edges", JSON.stringify(edges));
  }, [edges]);

  // custom node crud
  function removeNode(id: string) {
    setNodes((nds) => deleteNodes(id, nds));
  }
  function editNode(id: string, data: Partial<TableProps>) {
    setNodes((nds) => updateNodes({ ...data, id }, nds));
  }
  function appendNode() {
    setNodes((nds) => {
      const nodeId = nanoid();
      const nodes = [
        ...nds,
        {
          id: nodeId,
          position: { x: 10, y: 10 },
          type: "table",
          data: getDefaultTable(nodeId, `Entity_${nds.length}`),
        },
      ];
      return applyNodeChanges(
        nodes.map((node) => ({
          type: "select",
          id: node.id,
          selected: node.id === nodeId,
        })),
        nodes,
      );
    });
  }
  function duplicateNode(id: string) {
    setNodes((nds) => {
      const node = nds.find((node) => node.id === id);
      if (!node) return nds;
      const nodeId = nanoid();
      const nodes = [
        ...nds,
        {
          id: nodeId,
          position: { x: node.position.x + 10, y: node.position.y + 10 },
          type: "table",
          data: {
            ...node.data,
            id: nodeId,
          },
        },
      ];
      return applyNodeChanges(
        nodes.map((node) => ({
          type: "select",
          id: node.id,
          selected: node.id === nodeId,
        })),
        nodes,
      );
    });
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
        // custom node crud
        removeNode,
        editNode,
        appendNode,
        duplicateNode,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export { EditorContext, EditorProvider };
