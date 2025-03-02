"use client";

import { ColumnEditor, JoinEditor } from "@/components/editors";
import { CodeEditor } from "@/components/editors/code-editor";
import { FlowMenu } from "@/components/editors/flow-menu";
import { SelfConnection } from "@/components/flow-nodes/edges/self-connecting";
import { TableNode } from "@/components/flow-nodes/table-node";
import { Button } from "@/components/ui/button";
import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultTable } from "@/lib/flow-editors/helpers";
import { deleteNodes, updateNodes } from "@/lib/flow-editors/nodes";
import type { JoinProps, TableProps } from "@/lib/types/database-types";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  OnSelectionChangeFunc,
  ReactFlow,
  ReactFlowProvider,
  useOnSelectionChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cloneDeep, debounce } from "lodash";
import { EllipsisVertical, FilePlus } from "lucide-react";
import { nanoid } from "nanoid";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  selfconnecting: SelfConnection,
};

// Migrate to api lib later
export type ProjectT = {
  dbType: string;
  nodes: Node<TableProps>[];
  edges: Edge<TableProps>[];
};

type AppProps = {
  project?: ProjectT;
};

function App({ project }: AppProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [wasmModule, setWasmModule] =
    useState<typeof import("@/wasm/src_rs")>();
  const [typeORMCode, setTypeORMCode] = useState<string>("");

  const { nodes, setNodes, edges, setEdges, setEditingJoin, editingColumn } =
    useContext(EditorContext);

  const { colorTheme } = useContext(AppContext);

  // editing pane controllers
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const nodePanelRef = useRef<ImperativePanelHandle>(null);
  const codePanelRef = useRef<ImperativePanelHandle>(null);

  // control when to compile codes
  const compileNodes = useRef<boolean>(true);

  // add more conditions as more editors are added.
  // TODO: table editor
  const showEditingPane = useMemo(() => !!editingColumn, [editingColumn]);

  const debouncedCompileToTypeORM = useMemo(
    () =>
      debounce(
        (wasm: typeof import("@/wasm/src_rs"), nodes: Node<TableProps>[]) => {
          try {
            console.log("⚒️ converting to code...");

            let parsedNodes = cloneDeep(nodes);

            parsedNodes = parsedNodes.map((node) => {
              if (!node.data.joins.length) return node;
              const columns = node.data.columns.map((col) => {
                if (!col.foreignKey?.target) return col;
                const targetTable = nodes.find(
                  (target) => target.id === col.foreignKey?.target?.table,
                );
                if (!targetTable) return col;
                const targetColumn = targetTable.data.columns.find(
                  (target) => target.id === col.foreignKey?.target?.column,
                );
                if (!targetColumn) return col;
                return {
                  ...col,
                  foreignKey: {
                    ...col.foreignKey,
                    target: {
                      ...col.foreignKey.target,
                      tableName: targetTable.data.name || targetTable.data.id,
                      columnName: targetColumn.name || targetColumn.id,
                    },
                  },
                };
              });
              return { ...node, data: { ...node.data, columns } };
            });

            const _typeORMCode = wasm.convert_to_typeorm(
              JSON.stringify(parsedNodes),
            );
            setTypeORMCode(_typeORMCode);
          } catch (e) {
            console.warn("⚠️ wasm error:", e);
          }
        },
        500,
      ),
    [],
  );

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
      let edges: Edge<TableProps>[] = [];
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
    if (!wasmModule || !compileNodes.current) return;
    debouncedCompileToTypeORM(wasmModule, nodes);
  }, [wasmModule, nodes]);

  // node manipulators
  const onNodesChange: OnNodesChange<Node<TableProps>> = useCallback(
    (changes) => {
      compileNodes.current = true;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );

  // edge manipulators
  const onEdgesChange: OnEdgesChange<Edge<TableProps>> = useCallback(
    (changes) => {
      compileNodes.current = true;
      const change = changes[0];

      if (change?.type === "select" && change?.selected) {
        let join: JoinProps | null = null;

        const id = change?.id || "";

        for (const node of nodes) {
          const findJoin = node.data.joins
            .filter((join) => !join.source)
            .find((join) => join.id === id);
          if (findJoin) {
            join = findJoin;
            break;
          }
        }

        setEditingJoin(join); // open modal on selecting an edge.
      }
      if (change?.type === "remove") {
        const joinId = change.id;

        const splitId = joinId.split("-");
        const currentNodeId = splitId[0].split("_source")[0];
        const targetNodeId = splitId[0].split("_source")[1];

        const currentNode = nodes.find(
          (node) => node.data.id === currentNodeId,
        );
        const targetTable = nodes.find((node) => node.data.id === targetNodeId);

        if (!currentNode || !targetTable) return;

        const sourceJoinIdx = currentNode.data.joins.findIndex(
          (join) => join.id === joinId,
        );

        const targetJoinIdx = targetTable.data.joins.findIndex(
          (join) => join.id === joinId,
        );

        if (sourceJoinIdx < 0 || targetJoinIdx < 0) return;

        const sourceJoins = [...currentNode.data.joins];
        sourceJoins.splice(sourceJoinIdx, 1);

        const targetJoins = [...targetTable.data.joins];
        targetJoins.splice(targetJoinIdx, 1);

        // apply join updates
        setNodes((nds) => {
          return updateNodes(
            [
              { id: currentNode.id, joins: sourceJoins },
              { id: targetTable.id, joins: targetJoins },
            ],
            nds,
          );
        });
      }

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [nodes],
  );
  const onConnect: OnConnect = useCallback((connection) => {
    let applyEdgeEffects: boolean = false; // append the new edge connection only if the nodes update succeeds
    const baseEdgeId = `${connection.source} -> ${connection.target}`;

    let sourceNode: Node<TableProps> | null = null;
    let targetNode: Node<TableProps> | null = null;

    setNodes((nds) => {
      sourceNode = nds.find((node) => node.id === connection.source) || null;
      targetNode = nds.find((node) => node.id === connection.target) || null;
      if (!sourceNode || !targetNode) return nds;

      applyEdgeEffects = true;

      const newJoin: JoinProps = {
        id: baseEdgeId,
        target: {
          table: connection.target,
          column:
            targetNode.data.columns.find((col) => col.primaryKey || col.unique)
              ?.id || "",
        },
        source: null,
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        through: null,
        type: "one-to-one",
        inverseColumn: null,
      };

      if (sourceNode.id === targetNode.id) {
        // self join.
        newJoin.source === sourceNode.id;
        return updateNodes(
          { id: sourceNode.id, joins: [...sourceNode.data.joins, newJoin] },
          nds,
        );
      }
      // other join.
      return updateNodes(
        [
          { id: sourceNode.id, joins: [...sourceNode.data.joins, newJoin] },
          {
            id: targetNode.id,
            joins: [
              ...targetNode.data.joins,
              {
                id: baseEdgeId,
                target: null,
                source: connection.source,
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
                through: null,
                type: "one-to-one",
                inverseColumn: null,
              },
            ],
          },
        ],
        nds,
      );
    });

    if (!applyEdgeEffects || !targetNode || !sourceNode) return;

    setEdges((eds) =>
      addEdge(
        {
          id: baseEdgeId,
          type:
            connection.source === connection.target
              ? "selfconnecting"
              : "smoothstep",
          source: connection.source,
          target: connection.target,
          label:
            connection.source === connection.target
              ? "Self Join"
              : `${sourceNode?.data.name} -> ${targetNode?.data.name}`,
          markerEnd: {
            type: MarkerType.Arrow,
            color: "#FF0072",
          },
          style: {
            strokeWidth: 2,
            stroke: "#FF0072",
          },
          animated: true,
        },
        eds,
      ),
    );
    setEditingJoin({
      id: baseEdgeId,
      target: {
        table: connection.target,
        column: "",
      },
      source: null,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      through: null,
      type: "one-to-one",
      inverseColumn: null,
    });
  }, []);

  const onSelectChange: OnSelectionChangeFunc = useCallback(
    ({ nodes }) => {
      const nodeIds = nodes.map((node) => node.id);
      setEdges((eds) => {
        return eds.map((edge) => ({
          ...edge,
          markerEnd: {
            type: MarkerType.Arrow,
            color:
              nodeIds.includes(edge.source) || nodeIds.includes(edge.target)
                ? "#FF0072"
                : undefined,
          },
          style: {
            strokeWidth: 2,
            stroke:
              nodeIds.includes(edge.source) || nodeIds.includes(edge.target)
                ? "#FF0072"
                : undefined,
          },
          animated:
            nodeIds.includes(edge.source) || nodeIds.includes(edge.target),
        }));
      });
    },
    [setEdges],
  );

  useOnSelectionChange({
    onChange: onSelectChange,
  });

  useEffect(() => {
    if (showEditingPane) compileNodes.current = true;
  }, [showEditingPane]);

  if (loading) return "Loading...";

  return (
    <>
      <FlowMenu />
      <ColumnEditor open={showEditingPane} />
      <PanelGroup direction="horizontal" className="flex-1 min-w-screen">
        <Panel defaultSize={50} className="flex flex-col" ref={nodePanelRef}>
          <ReactFlow
            id="node-canvas"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={colorTheme}
            className="flex-1"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Panel>
        <PanelResizeHandle className="bg-neutral-100 dark:bg-neutral-900 flex justify-center items-center">
          <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm">
            <EllipsisVertical className="h-2.5 w-2.5" />
          </div>
        </PanelResizeHandle>
        <Panel
          defaultSize={50}
          ref={codePanelRef}
          onMouseDown={() => (compileNodes.current = false)}
        >
          <div className="flex flex-col h-full">
            <CodeEditor
              ormCode={typeORMCode}
              className="flex-1"
              wasmModule={wasmModule}
            />
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
