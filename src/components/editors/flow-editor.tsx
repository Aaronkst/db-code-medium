"use client";

import { SelfConnection } from "@/components/flow-nodes/edges/self-connecting";
import { TableNode } from "@/components/flow-nodes/table-node";
import { AppContext } from "@/lib/context/app-context";
import { EditorContext } from "@/lib/context/editor-context";
import { updateNodes } from "@/lib/flow-editors/nodes";
import type { JoinProps, TableProps } from "@/lib/types/database-types";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  ReactFlow,
  useOnSelectionChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo, useCallback, useContext } from "react";
import {
  MarkerManyEnd,
  MarkerManyStart,
  MarkerOne,
} from "../flow-nodes/edges/arrow-heads";

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  selfconnecting: SelfConnection,
};

function FlowEditorComponent() {
  const { nodes, setNodes, edges, setEdges, setEditingJoin } =
    useContext(EditorContext);

  const { colorTheme } = useContext(AppContext);

  // node manipulators
  const onNodesChange: OnNodesChange<Node<TableProps>> = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );

  // edge manipulators
  const onEdgesChange: OnEdgesChange<Edge<JoinProps>> = useCallback(
    (changes) => {
      const change = changes[0];

      if (change?.type === "select" && change?.selected) {
        let join: JoinProps | null = null;

        const id = change?.id || "";

        for (const node of nodes) {
          const findJoin = node.data.columns.find(
            (column) => column.foreignKey?.id === id,
          );
          if (findJoin) {
            join = findJoin.foreignKey;
            break;
          }
        }

        setEditingJoin(join); // open modal on selecting an edge.
      }
      if (change?.type === "remove") {
        const joinId = change.id;

        const currentNodeId = joinId.split("-")[0];

        const currentNode = nodes.find(
          (node) => node.data.id === currentNodeId,
        );

        if (currentNode) {
          const sourceJoinIdx = currentNode.data.columns.findIndex(
            (column) => column.foreignKey?.id === joinId,
          );

          if (sourceJoinIdx > -1) {
            const sourceColumns = [...currentNode.data.columns];
            sourceColumns.splice(sourceJoinIdx, 1);

            // apply join updates
            setNodes((nds) =>
              updateNodes({ id: currentNode.id, columns: sourceColumns }, nds),
            );
          }
        }
      }

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [nodes],
  );
  const onConnect: OnConnect = useCallback((connection) => {
    const edgeId = `${connection.source}-${connection.target}`;

    setEdges((eds) =>
      addEdge(
        {
          id: edgeId,
          type:
            connection.source === connection.target
              ? "selfconnecting"
              : "smoothstep",
          source: connection.source,
          target: connection.target,
          sourceHandle: "source",
          targetHandle: "target",
          label: connection.source === connection.target ? "Self Join" : "",
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
      id: edgeId,
      target: {
        table: connection.target,
        column: "",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      through: null,
      type: "one-to-one",
      joinColumn: null,
      inverseColumn: null,
    });
  }, []);

  // selection hook
  const onSelectChange: OnSelectionChangeFunc = useCallback(
    ({ nodes }) => {
      const nodeIds = nodes.map((node) => node.id);
      setEdges((eds) => {
        return eds.map((edge) => ({
          ...edge,
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

  return (
    <>
      <MarkerOne />
      <MarkerManyStart />
      <MarkerManyEnd />
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
      </ReactFlow>
    </>
  );
}

export const FlowEditor = memo(FlowEditorComponent);
