"use client";

import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { deleteEdges } from "@/lib/flow-editors/nodes";
import { TableProps } from "@/lib/types/database-types";
import { Editor, type Monaco } from "@monaco-editor/react";
import { parse } from "@typescript-eslint/parser";
import { addEdge, MarkerType, type Edge, type Node } from "@xyflow/react";
import { debounce } from "lodash";
import { memo, useContext, useMemo, useRef } from "react";
import { toast } from "sonner";

type CodeEditorProps = {
  ormCode: string;
  className?: string;
  wasmModule?: typeof import("@/wasm/src_rs");
};

type ESLintProgram = ReturnType<typeof parse>;

const CodeEditor = memo(
  ({ ormCode, className, wasmModule }: CodeEditorProps) => {
    const { colorTheme } = useContext(AppContext);
    const { nodes, setNodes, setEdges, editNode, removeNode } =
      useContext(EditorContext);

    const editorRef = useRef<any>(null);

    // monaco options.
    const handleEditorDidMount = async (editor: unknown, monaco: Monaco) => {
      try {
        editorRef.current = editor;
      } catch (err) {
        console.log("monaco err:", err);
      }
    };

    const debouncedCompileFromTypeORM = useMemo(
      () =>
        debounce(async (code: string, nodes: Node<TableProps>[]) => {
          if (!wasmModule) return;
          console.log("⚒️ converting from code...");

          try {
            // first, clear all existing edges.
            setEdges((eds) => {
              eds = deleteEdges(
                eds.map((edge) => edge.id),
                eds,
              );
              return eds;
            });

            code = code.replaceAll("export ", "");

            const response = await fetch("api/validate", {
              method: "POST",
              body: JSON.stringify({ code }),
            });

            const data: {
              code: number;
              data?: ESLintProgram;
              message?: string;
            } = await response.json();

            if (data.code !== 200) {
              toast.error("Could not validate your code 😬");
            }

            if (data.data) {
              const convertedNodes = wasmModule.convert_from_typeorm(
                JSON.stringify(data.data),
              );

              const parsedNodes = JSON.parse(
                convertedNodes,
              ) as Node<TableProps>[];

              const parsedNodesCopy = [...parsedNodes];

              const newEdges: Edge<TableProps>[] = [];

              let idx = 1;
              for (const node of parsedNodes) {
                const matchedNode = nodes.find(
                  (originalNode) => originalNode.data.name === node.data.name,
                );

                /* Find and use original position if available. */
                node.position = matchedNode
                  ? matchedNode.position
                  : { x: idx * 10, y: idx * 10 };
                node.type = "table";

                let joinIdx = 0;
                for (const { target, ...join } of node.data.joins) {
                  if (target) {
                    const targetTable = parsedNodesCopy.find(
                      (node) => node.id === target.table,
                    );
                    if (targetTable) {
                      const edge: Edge<TableProps> = {
                        id: `${node.id} -> ${target.table}`,
                        type:
                          node.id === target.table
                            ? "selfconnecting"
                            : "smoothstep",
                        source: node.id,
                        target: target.table,
                        label:
                          node.id === target.table
                            ? "Self Join"
                            : `${node.data.name} -> ${targetTable.data.name}`,
                        markerEnd: {
                          type: MarkerType.Arrow,
                          color: "#FF0072",
                        },
                        style: {
                          strokeWidth: 2,
                          stroke: "#FF0072",
                        },
                        animated: true,
                      };

                      newEdges.push(edge);
                      node.data.joins[joinIdx] = {
                        ...node.data.joins[joinIdx],
                        id: edge.id,
                      };
                    }
                  }
                  joinIdx++;
                }
              }

              for (const edge of newEdges) {
                const targetTableIdx = parsedNodes.findIndex(
                  (node) => node.id === edge.target,
                );
                const sourceNode = parsedNodes.find(
                  (node) => node.id === edge.source,
                );
                if (targetTableIdx > -1 && sourceNode) {
                  const join = sourceNode.data.joins.find(
                    (join) => join.id === edge.id,
                  );
                  if (join) {
                    parsedNodes[targetTableIdx].data.joins.push({
                      id: edge.id,
                      target: null,
                      onDelete: join.onDelete,
                      onUpdate: join.onUpdate,
                      through: join.through,
                      source: sourceNode.id,
                      inverseColumn: null,
                      type: join.type,
                    });
                  }
                }
              }

              setEdges((eds) => {
                for (const edge of newEdges) {
                  eds = addEdge(edge, eds);
                }
                return eds;
              });
              setNodes(parsedNodes);
            }
          } catch (e) {
            console.log("⚠️ wasm error:", e);
          }
        }, 500),
      [wasmModule, editNode, removeNode],
    );

    const handleCodeChanges = (code: string | undefined) => {
      if (!code) return;
      debouncedCompileFromTypeORM(code, nodes);
    };

    return (
      <Editor
        language="typescript"
        value={ormCode}
        theme={colorTheme === "dark" ? "vs-dark" : "vs-light"}
        onMount={handleEditorDidMount}
        className={className}
        onChange={handleCodeChanges}
      />
    );
  },
);

CodeEditor.displayName = "CodeEditor";

export { CodeEditor };
