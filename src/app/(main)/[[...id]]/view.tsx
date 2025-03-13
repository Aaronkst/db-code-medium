"use client";

import { ColumnEditor, JoinEditor } from "@/components/editors";
import { CodeEditor } from "@/components/editors/code-editor.v2";
import { FlowEditor } from "@/components/editors/flow-editor";
import { FlowMenu } from "@/components/editors/flow-menu";
import { EditorContext } from "@/lib/context/editor-context";
import type { JoinProps, TableProps } from "@/lib/types/database-types";
import { type Edge, type Node, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EllipsisVertical } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// Migrate to api lib later
export type ProjectT = {
  dbType: string;
  nodes: Node<TableProps>[];
  edges: Edge<JoinProps>[];
};

type AppProps = {
  project?: ProjectT;
};

function App({ project }: AppProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [wasmModule, setWasmModule] =
    useState<typeof import("@/wasm/src_rs")>();

  const { setNodes, setEdges, editingColumn } = useContext(EditorContext);

  // control when to compile codes
  const compileNodes = useRef<boolean>(true);

  // add more conditions as more editors are added.
  // TODO: table editor
  const showEditingPane = useMemo(() => !!editingColumn, [editingColumn]);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        console.log("⏳ Loading WASM module...");
        const wasm = await import("@/wasm/src_rs");
        console.log("✅ WASM module loaded:", wasm);

        await wasm.default();

        setWasmModule(wasm);
      } catch (e) {
        console.warn("⚠️ wasm error:", e);
      }
    };
    if (!wasmModule) loadWasm();
  }, [wasmModule]);

  useEffect(() => {
    if (!initialized) {
      let nodes: Node<TableProps>[] = [];
      let edges: Edge<JoinProps>[] = [];
      if (!project) {
        //... fetch local storage
        const localNodes = localStorage.getItem("nodes");
        const localEdges = localStorage.getItem("edges");
        try {
          if (localNodes) nodes = JSON.parse(localNodes);
          if (localEdges) edges = JSON.parse(localEdges);
        } catch (err) {
          // JSON parse error.
        }
      } else {
        nodes = project.nodes;
        edges = project.edges;
      }
      setNodes(nodes);
      setEdges(edges);

      setInitialized(true);
    } else if (!!wasmModule) {
      setLoading(false);
    }
  }, [wasmModule, project, initialized]);

  useEffect(() => {
    if (showEditingPane) compileNodes.current = true;
  }, [showEditingPane]);

  if (loading) return "Loading...";

  return (
    <>
      <FlowMenu />
      <ColumnEditor />
      <PanelGroup direction="horizontal" className="flex-1 min-w-screen">
        <Panel defaultSize={50} className="flex flex-col">
          <FlowEditor />
        </Panel>
        <PanelResizeHandle className="bg-neutral-100 dark:bg-neutral-900 flex justify-center items-center">
          <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm">
            <EllipsisVertical className="h-2.5 w-2.5" />
          </div>
        </PanelResizeHandle>
        <Panel
          defaultSize={50}
          onMouseDown={() => (compileNodes.current = false)}
        >
          <div className="flex flex-col h-full">
            <CodeEditor className="flex-1" wasmModule={wasmModule} />
          </div>
        </Panel>
        <JoinEditor />
      </PanelGroup>
    </>
  );
}

export function AppView({ project }: AppProps) {
  return (
    <ReactFlowProvider>
      <App project={project} />
    </ReactFlowProvider>
  );
}
