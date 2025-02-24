"use client";

import { ColumnEditor, JoinEditor } from "@/components/editors";
import { CodeEditor } from "@/components/editors/code-editor";
import { TableNode } from "@/components/flow-nodes/table-node";
import { IconButton } from "@/components/shared/buttons/icon-button";
import { TYPEORM_IMPORTS } from "@/lib/constants";
import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultTable } from "@/lib/flow-editors/helpers";
import { deleteNodes, updateNodes } from "@/lib/flow-editors/nodes";
import type { JoinProps, TableProps } from "@/lib/types/database-types";
import { extractTypeORMEntities, extractTypeORMEntitiesV2 } from "@/lib/utils";
import { Editor, Monaco } from "@monaco-editor/react";
import { parse } from "@typescript-eslint/parser";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Connection,
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
import { check, format } from "prettier";
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

type AppProps = {
  // TODO: App settings; types.ts?
  dbType: string; // TODO: use string types later.
  nodes: Node<TableProps>[];
  edges: Edge<TableProps>[];
};

function App() {
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

  // code compilers
  useEffect(() => {
    editorPanelRef.current?.resize(showEditingPane ? 15 : 0);
    nodePanelRef.current?.resize(showEditingPane ? 45 : 50);
    codePanelRef.current?.resize(showEditingPane ? 40 : 50);
  }, [showEditingPane]);

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

            // const _typeORMCode: string[] = parsedNodes.map((node) =>
            //   wasm.convert_to_typeorm(JSON.stringify(node)),
            // );
            // setTypeORMCode(
            //   `${TYPEORM_IMPORTS}\n\n${_typeORMCode.join("\n\n")}`,
            // );
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
          data: getDefaultTable(nodeId, editNode, removeNode),
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

  // Legacy code for reference.
  // const debouncedCompileFromTypeORM = useMemo(
  //     () =>
  //       debounce((wasm: typeof import("@/wasm/src_rs"), code: string) => {
  //         console.log("⚒️ converting from code...");

  //         try {
  //           // TODO: code validation
  //           // const entities = extractTypeORMEntities(code);
  //           // console.log("entities:", entities);
  //           // let editedNodes: Node<TableProps>[] = [];
  //           // entities.forEach((entity, index) => {
  //           //   const result = wasm.convert_from_typeorm(entity);
  //           //   const node = JSON.parse(result) as Node<TableProps>;
  //           //   node.id = index.toString();
  //           //   node.position = nodes[index]?.position || { x: 10, y: 10 };
  //           //   node.type = "table";
  //           //   node.data.id = index.toString();
  //           //   node.data.columns = node.data.columns.map((column, index) => {
  //           //     column.id = index.toString();
  //           //     column.table = node.id;
  //           //     return column;
  //           //   });
  //           //   // @ts-expect-error: TODO: Better types.
  //           //   node.data.onChange = editNode;
  //           //   // @ts-expect-error: TODO: Better types.
  //           //   node.data.onDelete = removeNode;
  //           //   editedNodes.push(node);
  //           // });
  //           // editedNodes.map((node, idx) => {
  //           //   if (nodes[idx]) {
  //           //     node.id = nodes[idx].id;
  //           //     node.data.id = nodes[idx].id;
  //           //   }
  //           //   return node;
  //           // });
  //           // const connections: Connection[] = [];
  //           // let i = 0;
  //           // // loop through all nodes to append.
  //           // for (const node of [...editedNodes]) {
  //           //   if (node.data.joins.length) {
  //           //     const foreignKeyIndexes = node.data.columns
  //           //       .filter((col) => !!col.foreignKey)
  //           //       .map((col) => parseInt(col.id));
  //           //     // process all the joins
  //           //     let j = 0;
  //           //     for (const { target, ...join } of node.data.joins) {
  //           //       if (target) {
  //           //         const targetTableIdx = editedNodes.findIndex(
  //           //           (n) => n.data.name === target.table,
  //           //         );
  //           //         if (targetTableIdx > -1) {
  //           //           const targetTable = editedNodes[targetTableIdx];
  //           //           const targetColumnIdx = targetTable.data.columns.findIndex(
  //           //             (col) => col.name === target.column,
  //           //           );
  //           //           if (targetColumnIdx > -1) {
  //           //             const connection: Connection = {
  //           //               source: node.data.id,
  //           //               target: targetTable.data.id,
  //           //               sourceHandle: `_source_${j}`,
  //           //               targetHandle: `_target_${targetTable.data.joins.length}`,
  //           //             };
  //           //             const joinId = `${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}`;
  //           //             connections.push(connection);
  //           //             // both the table and columns are found
  //           //             // append the source joins and edit the current join with the actual ids.
  //           //             editedNodes[targetTableIdx].data.joins.push({
  //           //               id: joinId,
  //           //               target: null,
  //           //               onDelete: join.onDelete,
  //           //               onUpdate: join.onUpdate,
  //           //               through: join.through,
  //           //               source: node.data.id,
  //           //               inverseColumn: null,
  //           //               type: join.type,
  //           //             });
  //           //             const newJoin: JoinProps = {
  //           //               ...join,
  //           //               id: joinId,
  //           //               target: {
  //           //                 table: targetTableIdx.toString(),
  //           //                 column: targetColumnIdx.toString(),
  //           //               },
  //           //             };
  //           //             editedNodes[i].data.joins[j] = newJoin;
  //           //             editedNodes[i].data.columns[
  //           //               foreignKeyIndexes[j]
  //           //             ].foreignKey = newJoin;
  //           //           }
  //           //         }
  //           //       }
  //           //       j++;
  //           //     }
  //           //   }
  //           //   i++;
  //           // }
  //           // console.log(editedNodes);
  //           // setNodes(editedNodes);
  //           // setEdges((eds) => {
  //           //   for (const connection of connections) {
  //           //     eds = addEdge(connection, eds);
  //           //   }
  //           //   return eds;
  //           // });
  //         } catch (e) {
  //           console.log("⚠️ wasm error:", e);
  //         }
  //       }, 500),
  //     [nodes],
  //   );

  return (
    <PanelGroup direction="horizontal" className="flex-1 min-w-screen">
      <Panel
        defaultSize={0}
        className="bg-neutral-100 dark:bg-neutral-900 duration-500 ease-in-out"
        ref={editorPanelRef}
      >
        <div className="max-h-screen overflow-y-scroll">
          <ColumnEditor />
        </div>
      </Panel>

      <PanelResizeHandle disabled></PanelResizeHandle>

      <Panel
        defaultSize={50}
        className="relative"
        ref={nodePanelRef}
        onMouseDown={() => (compileNodes.current = true)}
      >
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
          colorMode={colorTheme}
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
  );
}

export function AppView() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
