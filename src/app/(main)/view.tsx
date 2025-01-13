"use client";

import { TableNode } from "@/components/react-flow-custom/table-node";
import { IconButton } from "@/components/shared/buttons/icon-button";
import { getDefaultTable } from "@/utils/constants";
import type { TableProps } from "@/utils/types/database-types";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EllipsisVertical, FilePlus } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { JoinEditorModal } from "./components/join-editor";
import { debounce } from "lodash";

const nodeTypes = {
  table: TableNode,
};

type AppProps = {
  // TODO: App settings; types.ts?
  dbType: string; // TODO: use a enum later.
  nodes: Node<TableProps>[];
  edges: Edge<TableProps>[];
};

function App() {
  const [nodes, setNodes] = useState<Node<TableProps>[]>([]);
  const [edges, setEdges] = useState<Edge<TableProps>[]>([]);
  const [newJoinId, setNewJoinId] = useState<string | null>(null);
  const [wasmModule, setWasmModule] = useState<typeof import("@/pkg/src_rs")>();
  const [typeORMCode, setTypeORMCode] = useState<string>("");

  const debouncedCompile = useMemo(
    () =>
      debounce(
        (wasm: typeof import("@/pkg/src_rs"), nodes: Node<TableProps>[]) => {
          console.log("⚒️ converting...", nodes);
          const _typeORMCode: string[] = nodes.map((node) =>
            wasm.convert_to_typeorm(JSON.stringify(node)),
          );
          setTypeORMCode(_typeORMCode.join("\n\n"));
        },
        500,
      ),
    [],
  );

  useEffect(() => {
    const loadWasm = async () => {
      try {
        console.log("⏳ Loading WASM module...");
        const wasm = await import("@/pkg/src_rs");
        console.log("✅ WASM module loaded:", wasm);

        const wasmPath = "wasm/src_rs_bg.wasm"; // Adjust as needed
        await wasm.default(wasmPath);

        setWasmModule(wasm);
      } catch (e) {
        console.log("⚠️ wasm error:", e);
      }
    };
    loadWasm();
  }, []);

  useEffect(() => {
    if (wasmModule) debouncedCompile(wasmModule, nodes);
  }, [wasmModule, nodes]);

  // node manipulators
  const onNodesChange: OnNodesChange<Node<TableProps>> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange<Edge<TableProps>> = useCallback(
    (changes) => {
      console.log("changes:", changes);
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [],
  );
  const onConnect: OnConnect = useCallback((params) => {
    console.log(params);
    setEdges((eds) => addEdge(params, eds));
    setNewJoinId(
      `xy-edge__${params.source}${params.sourceHandle}${params.target}${params.targetHandle}`,
    );
  }, []);

  // custom node crud
  const removeNode = (id: string) => {
    setNodes((nds) =>
      applyNodeChanges(
        [
          {
            id,
            type: "remove",
          },
        ],
        nds,
      ),
    );
  };
  const editNode = (id: string, data: Partial<TableProps>) => {
    setNodes((nds) => {
      const node = nds.find((_node) => _node.id === id);
      if (!node) return nds;
      return applyNodeChanges<Node<TableProps>>(
        [
          {
            id,
            type: "replace",
            item: { ...node, data: { ...node.data, ...data } },
          },
        ],
        nds,
      );
    });
  };
  const appendNode = () => {
    const id = nanoid();
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 10, y: 10 },
        type: "table",
        data: getDefaultTable(id, editNode, removeNode),
      },
    ]);
  };

  return (
    <PanelGroup
      autoSaveId="example"
      direction="horizontal"
      className="flex-1 min-w-screen"
    >
      <Panel defaultSize={50} className="relative">
        <div className="flex absolute top-8 right-8 rounded-md p-1 z-10 dark:bg-neutral-800">
          <IconButton icon={<FilePlus size="0.9rem" />} onClick={appendNode} />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Panel>
      <PanelResizeHandle className="bg-neutral-100 dark:bg-neutral-800 flex justify-center items-center">
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm">
          <EllipsisVertical className="h-2.5 w-2.5" />
        </div>
      </PanelResizeHandle>
      <Panel defaultSize={50}>
        <code className="whitespace-pre-wrap">
          {/* TODO: generate typeorm codes here */}
          {/* {JSON.stringify(nodes, undefined, 4)} */}
          {typeORMCode}
        </code>
      </Panel>
      <JoinEditorModal
        isOpen={!!newJoinId}
        onSubmit={(edgeId, settings) => {}}
        edgeId={newJoinId || ""}
      />
    </PanelGroup>
  );
}

export function AppView() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
