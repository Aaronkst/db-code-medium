"use client";

import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { deleteEdges } from "@/lib/flow-editors/nodes";
import { TableProps } from "@/lib/types/database-types";
import { Editor, type Monaco } from "@monaco-editor/react";
import { parse } from "@typescript-eslint/parser";
import { addEdge, type Connection, type Node } from "@xyflow/react";
import { debounce } from "lodash";
import { memo, useContext, useMemo, useRef } from "react";

type CodeEditorProps = {
  ormCode: string;
  className?: string;
  wasmModule?: typeof import("@/wasm/src_rs");
  nodeManiuplators: {
    editNode: (id: string, data: Partial<TableProps>) => void;
    removeNode: (id: string) => void;
  };
};

type ESLintProgram = ReturnType<typeof parse>;

/* <div>[TODO] Language: Typescript, Syntax: TypeORM</div> */
const CodeEditor = memo(
  ({
    ormCode,
    className,
    wasmModule,
    nodeManiuplators: { editNode, removeNode },
  }: CodeEditorProps) => {
    const { colorTheme } = useContext(AppContext);
    const { nodes, setNodes, edges, setEdges, setEditingJoin, editingColumn } =
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
              data: ESLintProgram;
            } = await response.json();

            if (data.data) {
              const convertedNodes = wasmModule.convert_from_typeorm(
                JSON.stringify(data.data),
              );

              const parsedNodes = JSON.parse(
                convertedNodes,
              ) as Node<TableProps>[];

              const parsedNodesCopy = [...parsedNodes];

              const connections: Connection[] = [];

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
                // @ts-expect-error: TODO: better node types
                node.data.onChange = editNode;
                // @ts-expect-error: TODO: better node types
                node.data.onDelete = removeNode;

                let joinIdx = 0;
                for (const { target, ...join } of node.data.joins) {
                  if (target) {
                    const targetTable = parsedNodesCopy.find(
                      (node) => node.id === target.table,
                    );
                    if (targetTable) {
                      const connection: Connection = {
                        source: node.id,
                        target: target.table,
                        sourceHandle: `_source_${joinIdx}`,
                        targetHandle: `_target_${targetTable.data.joins.length}`,
                      };

                      const joinId = `${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}`;

                      connections.push(connection);
                      node.data.joins[joinIdx] = {
                        ...node.data.joins[joinIdx],
                        id: joinId,
                      };
                    }
                  }
                  joinIdx++;
                }
              }

              for (const connection of connections) {
                const targetTableIdx = parsedNodes.findIndex(
                  (node) => node.id === connection.target,
                );
                const sourceNode = parsedNodes.find(
                  (node) => node.id === connection.source,
                );
                if (targetTableIdx > -1 && sourceNode) {
                  const joinId = `${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}`;

                  const join = sourceNode.data.joins.find(
                    (join) => join.id === joinId,
                  );

                  if (join) {
                    parsedNodes[targetTableIdx].data.joins.push({
                      id: joinId,
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
                for (const connection of connections) {
                  eds = addEdge(connection, eds);
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
