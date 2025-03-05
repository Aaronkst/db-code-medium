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
    []
  );

  // edge manipulators
  const onEdgesChange: OnEdgesChange<Edge<JoinProps>> = useCallback(
    (changes) => {
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
          (node) => node.data.id === currentNodeId
        );
        const targetTable = nodes.find((node) => node.data.id === targetNodeId);

        if (!currentNode || !targetTable) return;

        const sourceJoinIdx = currentNode.data.joins.findIndex(
          (join) => join.id === joinId
        );

        const targetJoinIdx = targetTable.data.joins.findIndex(
          (join) => join.id === joinId
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
            nds
          );
        });
      }

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [nodes]
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
          nds
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
        nds
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
        eds
      )
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
    [setEdges]
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
