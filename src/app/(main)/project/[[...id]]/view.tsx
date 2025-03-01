"use client";

import { ColumnEditor, JoinEditor } from "@/components/editors";
import { CodeEditor } from "@/components/editors/code-editor";
import { FlowMenu } from "@/components/editors/flow-menu";
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
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
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
            console.log("⚠️ wasm error:", e);
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
        console.log("⚠️ wasm error:", e);
      }
    };
    if (!wasmModule) loadWasm();
  }, [wasmModule]);

  useEffect(() => {
    if (!initialized) {
      if (!project) {
        //... fetch local storage
        const nodes = localStorage.getItem("nodes");
        const edges = localStorage.getItem("edges");
        try {
          if (nodes) setNodes(JSON.parse(nodes));
          if (edges) setEdges(JSON.parse(edges));
        } catch (err) {
          // JSON parse error.
        }
      } else {
        setNodes(project.nodes);
        setEdges(project.edges);
      }
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
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  // custom node crud
  const removeNode = (id: string) => {
    setNodes((nds) => deleteNodes(id, nds));
  };
  const editNode = (id: string, data: Partial<TableProps>) => {
    setNodes((nds) => updateNodes({ ...data, id }, nds));
  };
  const appendNode = () => {
    setNodes((nds) => {
      const nodeId = nanoid();
      const nodes = [
        ...nds,
        {
          id: nodeId,
          position: { x: 10, y: 10 },
          type: "table",
          data: getDefaultTable(
            nodeId,
            `Entity_${nds.length}`,
            editNode,
            removeNode,
          ),
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
  };

  // apply `colum-editor` updates.
  useEffect(() => {
    if (!editingColumn) return;

    setNodes((nds) => {
      const node = nds.find((_node) => _node.id === editingColumn.table);
      if (!node) return nds;

      let columns = [...node.data.columns];

      if (editingColumn.primaryKey) node.data.primaryKey = editingColumn.id;

      columns = columns.map((col) => {
        if (col.id !== editingColumn.id) {
          if (editingColumn.primaryKey) return { ...col, primaryKey: false };
          return col;
        }
        return editingColumn;
      });

      return updateNodes({ id: node.id, columns }, nodes);
    });
  }, [editingColumn]);

  // edge manipulators
  const onEdgesChange: OnEdgesChange<Edge<TableProps>> = useCallback(
    (changes) => {
      const change = changes[0];

      if (change?.type === "select" && change?.selected) {
        let join: JoinProps | null = null;

        const id = (change?.id || "").replace("xy-edge__", "");

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

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [nodes],
  );
  const onConnect: OnConnect = useCallback((connection) => {
    let applyEdgeEffects: boolean = false; // append the new edge connection only if the nodes update succeeds
    const baseEdgeId = `${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}`;

    setNodes((nds) => {
      const sourceNode = nds.find((node) => node.id === connection.source);
      const targetNode = nds.find((node) => node.id === connection.target);
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

    if (!applyEdgeEffects) return;

    setEdges((eds) => addEdge(connection, eds));
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

  if (loading) return "Loading...";

  return (
    <>
      <PanelGroup direction="horizontal" className="flex-1 min-w-screen">
        {/* <Panel
        defaultSize={0}
        className="bg-neutral-100 dark:bg-neutral-900 duration-500 ease-in-out"
        ref={editorPanelRef}
      >
        <div className="max-h-screen overflow-y-scroll">
          <ColumnEditor />
        </div>
      </Panel> */}

        {/* <PanelResizeHandle disabled></PanelResizeHandle> */}

        <Panel
          defaultSize={50}
          className="flex flex-col"
          ref={nodePanelRef}
          onMouseDown={() => (compileNodes.current = true)}
        >
          <FlowMenu methods={{ removeNode, editNode, appendNode }} />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            colorMode={colorTheme}
            className="flex-1"
          >
            <Background />
            <Controls />
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
              nodeManiuplators={{
                editNode,
                removeNode,
              }}
            />
          </div>
        </Panel>
        <JoinEditor />
      </PanelGroup>
      <ColumnEditor open={showEditingPane} />
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
