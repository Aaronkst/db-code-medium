"use client";

import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { deleteEdges } from "@/lib/flow-editors/nodes";
import { JoinProps, TableProps } from "@/lib/types/database-types";
import { Editor, type Monaco } from "@monaco-editor/react";
import { parse } from "@typescript-eslint/parser";
import { addEdge, type Edge, type Node } from "@xyflow/react";
import { cloneDeep, debounce } from "lodash";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CodeEditorProps = {
  className?: string;
  wasmModule?: typeof import("@/wasm/src_rs");
};

type ESLintProgram = ReturnType<typeof parse>;

/**
 * @deprecated use version 2
 */
function CodeEditorComponent({ className, wasmModule }: CodeEditorProps) {
  return null;
  // const [code, setCode] = useState<string>("");
  // const { colorTheme } = useContext(AppContext);
  // const { nodes, setNodes, setEdges, editNode, removeNode } =
  //   useContext(EditorContext);

  // const editorRef = useRef<any>(null);
  // const editorFocusedRef = useRef<boolean>(false);

  // // monaco options.
  // const handleEditorDidMount = async (editor: unknown, monaco: Monaco) => {
  //   try {
  //     editorRef.current = editor;
  //   } catch (err) {
  //     console.log("monaco err:", err);
  //   }
  // };

  // const debouncedCompileFromORM = useMemo(
  //   () =>
  //     debounce(async (code: string, nodes: Node<TableProps>[]) => {
  //       if (!wasmModule) return;
  //       try {
  //         // first, clear all existing edges.
  //         setEdges((eds) => {
  //           eds = deleteEdges(
  //             eds.map((edge) => edge.id),
  //             eds,
  //           );
  //           return eds;
  //         });

  //         code = code.replaceAll("export ", "");

  //         const response = await fetch("api/validate", {
  //           method: "POST",
  //           body: JSON.stringify({ code }),
  //         });

  //         const data: {
  //           code: number;
  //           data?: ESLintProgram;
  //           message?: string;
  //         } = await response.json();

  //         if (data.code !== 200) {
  //           // commented due to annoying UX while typing.
  //           // toast.error("Could not validate your code 😬");
  //         }

  //         if (data.data) {
  //           const convertedNodes = wasmModule.convert_from_typeorm(
  //             JSON.stringify(data.data),
  //           );

  //           const parsedNodes = JSON.parse(
  //             convertedNodes,
  //           ) as Node<TableProps>[];

  //           const parsedNodesCopy = [...parsedNodes];

  //           const newEdges: Edge<JoinProps>[] = [];

  //           let idx = 0;
  //           for (const node of parsedNodes) {
  //             const matchedNode = nodes[idx];
  //             /* Find and use original position if available. */
  //             node.position = matchedNode
  //               ? matchedNode.position
  //               : { x: (idx + 1) * 10, y: (idx + 1) * 10 };
  //             node.type = "table";

  //             let joinIdx = 0;
  //             for (const { target, ...join } of node.data.joins) {
  //               if (target) {
  //                 const targetTable = parsedNodesCopy.find(
  //                   (node) => node.id === target.table,
  //                 );
  //                 if (targetTable) {
  //                   const edge: Edge<JoinProps> = {
  //                     id: `${node.id}-${target.table}`,
  //                     type:
  //                       node.id === target.table
  //                         ? "selfconnecting"
  //                         : "smoothstep",
  //                     source: node.id,
  //                     target: target.table,
  //                     label:
  //                       node.id === target.table ? "Self Join" : join.through,
  //                     markerStart: join.type.startsWith("many")
  //                       ? "marker-many-start"
  //                       : "marker-one",
  //                     markerEnd: join.type.endsWith("many")
  //                       ? "marker-many-end"
  //                       : "marker-one",
  //                     style: {
  //                       strokeWidth: 2,
  //                       stroke: "#FF0072",
  //                     },
  //                     animated: true,
  //                     data: node.data.joins[joinIdx],
  //                   };

  //                   newEdges.push(edge);
  //                   node.data.joins[joinIdx] = {
  //                     ...node.data.joins[joinIdx],
  //                     id: edge.id,
  //                   };
  //                 }
  //               }
  //               joinIdx++;
  //               idx++;
  //             }
  //           }

  //           for (const edge of newEdges) {
  //             const targetTableIdx = parsedNodes.findIndex(
  //               (node) => node.id === edge.target,
  //             );
  //             const sourceNode = parsedNodes.find(
  //               (node) => node.id === edge.source,
  //             );
  //             if (targetTableIdx > -1 && sourceNode) {
  //               const join = sourceNode.data.joins.find(
  //                 (join) => join.id === edge.id,
  //               );
  //               if (join) {
  //                 parsedNodes[targetTableIdx].data.joins.push({
  //                   id: edge.id,
  //                   target: null,
  //                   onDelete: join.onDelete,
  //                   onUpdate: join.onUpdate,
  //                   through: join.through,
  //                   source: sourceNode.id,
  //                   joinColumn: null,
  //                   inverseColumn: null,
  //                   type: join.type,
  //                 });
  //               }
  //             }
  //           }

  //           setEdges((eds) => {
  //             for (const edge of newEdges) {
  //               eds = addEdge(edge, eds);
  //             }
  //             return eds;
  //           });
  //           setNodes(parsedNodes);
  //         }
  //       } catch (e) {
  //         console.log("⚠️ wasm error:", e);
  //       }
  //     }, 500),
  //   [wasmModule, editNode, removeNode],
  // );

  // const handleCodeChanges = useCallback(
  //   (code: string | undefined) => {
  //     if (!code) return;
  //     debouncedCompileFromORM(code, nodes);
  //   },
  //   [nodes],
  // );

  // const debouncedCompileToORM = useMemo(
  //   () =>
  //     debounce((nodes: Node<TableProps>[]) => {
  //       if (!wasmModule) return;
  //       try {
  //         let parsedNodes = cloneDeep(nodes);
  //         parsedNodes = parsedNodes.map((node) => {
  //           if (!node.data.joins.length) return node;
  //           const columns = node.data.columns.map((col) => {
  //             if (!col.foreignKey?.target) return col;
  //             const targetTable = nodes.find(
  //               (target) => target.id === col.foreignKey?.target?.table,
  //             );
  //             if (!targetTable) return col;
  //             const targetColumn = targetTable.data.columns.find(
  //               (target) => target.id === col.foreignKey?.target?.column,
  //             );
  //             if (!targetColumn) return col;
  //             return {
  //               ...col,
  //               foreignKey: {
  //                 ...col.foreignKey,
  //                 target: {
  //                   ...col.foreignKey.target,
  //                   tableName: targetTable.data.name || targetTable.data.id,
  //                   columnName: targetColumn.name || targetColumn.id,
  //                 },
  //               },
  //             };
  //           });
  //           return { ...node, data: { ...node.data, columns } };
  //         });

  //         setCode(wasmModule.convert_to_typeorm(JSON.stringify(parsedNodes)));
  //       } catch (e) {
  //         console.warn("⚠️ wasm error:", e);
  //       }
  //     }, 500),
  //   [wasmModule],
  // );

  // useEffect(() => {
  //   if (editorFocusedRef.current) return;
  //   debouncedCompileToORM(nodes);
  // }, [nodes]);

  // return (
  //   <div
  //     className="flex-1"
  //     onFocus={() => (editorFocusedRef.current = true)}
  //     onBlur={() => (editorFocusedRef.current = false)}
  //   >
  //     <Editor
  //       language="typescript"
  //       value={code}
  //       theme={colorTheme === "dark" ? "vs-dark" : "vs-light"}
  //       onMount={handleEditorDidMount}
  //       className={className}
  //       onChange={handleCodeChanges}
  //     />
  //   </div>
  // );
}

// CodeEditorComponent.displayName = "CodeEditor";

// export const CodeEditor = memo(CodeEditorComponent);
