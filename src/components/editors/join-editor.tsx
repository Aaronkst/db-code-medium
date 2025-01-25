import { Button } from "@/components/shared/buttons/button";
import { Modal } from "@/components/shared/modals";
import { EditorContext } from "@/lib/context/editor-context";
import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/utils/types/database-types";
import { applyEdgeChanges, applyNodeChanges, type Node } from "@xyflow/react";
import { cloneDeep } from "lodash";
import { nanoid } from "nanoid";
import {
  type FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export function JoinEditor() {
  const {
    nodes,
    setNodes,
    setEdges,
    editingJoin,
    setEditingColumn,
    setEditingJoin,
  } = useContext(EditorContext);
  const [currentNode, setCurrentNode] = useState<Node<TableProps>>();

  const targetTable = useMemo(() => {
    if (!nodes.length || !editingJoin) return;

    const targetNode = nodes.find(
      (node) => node.id === editingJoin.target?.table,
    );

    return targetNode;
  }, [nodes, editingJoin]);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // @ts-expect-error: e.target is a valid HTML Node
      if (e.target.tagName !== "BUTTON") return;

      if (
        !editingJoin ||
        !editingJoin.target?.table ||
        !editingJoin.target?.column ||
        !currentNode ||
        !targetTable
      )
        return;

      const sourceJoins = currentNode.data.joins.map((join) => {
        if (join.id !== editingJoin.id) return join;
        return editingJoin;
      });

      const targetJoins = targetTable.data.joins.map((join) => {
        if (join.id !== editingJoin.id) return join;
        return {
          ...join,
          onDelete: editingJoin.onDelete,
          onUpdate: editingJoin.onUpdate,
          through: editingJoin.through,
          type: editingJoin.type,
        };
      });

      const targetCol = targetTable.data.columns.find(
        (col) => col.id === editingJoin.target?.column,
      ) as ColumnProps;

      const newColumn = {
        id: nanoid(),
        table: currentNode.data.id,
        name: (targetTable.data.name || targetTable.data.id) + "Id",
        dbName: (targetTable.data.name || targetTable.data.id) + "_id",
        dataType: targetCol.dataType,
        primaryKey: false,
        index: false,
        unique: false,
        nullable: false,
        defaultValue: null,
        length: targetCol.length,
        precision: targetCol.precision,
        scale: targetCol.scale,
        collation: targetCol.collation,
        description: "",
        autoIncrement: false,
        foreignKey: editingJoin,
      };

      // apply join updates
      setNodes((nds) => {
        if (currentNode.id === targetTable.id) {
          // self join.
          return applyNodeChanges<Node<TableProps>>(
            [
              {
                id: currentNode.id,
                type: "replace",
                item: {
                  ...currentNode,
                  data: {
                    ...currentNode.data,
                    joins: sourceJoins,
                    columns: [...currentNode.data.columns, newColumn],
                  },
                },
              },
            ],
            nds,
          );
        }
        return applyNodeChanges<Node<TableProps>>(
          [
            {
              id: currentNode.id,
              type: "replace",
              item: {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  joins: sourceJoins,
                  columns: [...currentNode.data.columns, newColumn],
                },
              },
            },
            {
              id: targetTable.id,
              type: "replace",
              item: {
                ...targetTable,
                data: {
                  ...targetTable.data,
                  joins: targetJoins,
                },
              },
            },
          ],
          nds,
        );
      });

      // deselect edge
      setEdges((edges) =>
        applyEdgeChanges(
          [
            {
              type: "select",
              id: "xy-edge__" + editingJoin.id,
              selected: false,
            },
          ],
          edges,
        ),
      );

      setEditingColumn(newColumn); // open column editor with the new foreign key
      setEditingJoin(null);
    },
    [currentNode, targetTable, editingJoin, setNodes, setEdges],
  );

  const removeEdge = useCallback(() => {
    if (!currentNode || !targetTable || !editingJoin) return;

    const sourceJoinIdx = currentNode.data.joins.findIndex(
      (join) => join.id === editingJoin.id,
    );

    const targetJoinIdx = targetTable.data.joins.findIndex(
      (join) => join.id === editingJoin.id,
    );

    if (sourceJoinIdx < 0 || targetJoinIdx < 0) return;

    const sourceJoins = [...currentNode.data.joins];
    sourceJoins.splice(sourceJoinIdx, 1);

    const targetJoins = [...targetTable.data.joins];
    targetJoins.splice(targetJoinIdx, 1);

    // apply join updates
    setNodes((nds) => {
      return applyNodeChanges<Node<TableProps>>(
        [
          {
            id: currentNode.id,
            type: "replace",
            item: {
              ...currentNode,
              data: {
                ...currentNode.data,
                joins: sourceJoins,
              },
            },
          },
          {
            id: targetTable.id,
            type: "replace",
            item: {
              ...targetTable,
              data: {
                ...targetTable.data,
                joins: targetJoins,
              },
            },
          },
        ],
        nds,
      );
    });

    // remove edge
    setEdges((edges) =>
      applyEdgeChanges(
        [
          {
            type: "remove",
            id: "xy-edge__" + editingJoin.id,
          },
        ],
        edges,
      ),
    );
  }, [currentNode, targetTable, editingJoin, setNodes, setEdges]);

  useEffect(() => {
    if (!nodes.length || !editingJoin) {
      return;
    }
    const clonedNodes = cloneDeep(nodes);

    let editIdx = -1;
    for (let i = 0; i < clonedNodes.length; i++) {
      const node = clonedNodes[i];
      const join = node.data.joins.find(
        (join) =>
          join.id === editingJoin.id &&
          (!join.source || join.source === node.id), // no source or self join only.
      );
      if (join) {
        editIdx = i;
        break;
      }
    }

    setCurrentNode(clonedNodes[editIdx]);
  }, [nodes, editingJoin]);

  if (!editingJoin) return <></>;

  return (
    <Modal isOpen onClose={() => setEditingJoin(null)} title="Join Settings">
      {currentNode && (
        <form onClick={handleFormSubmit} className="flex flex-col gap-3">
          <label htmlFor="join-target-entity">Table / Entity</label>
          <select
            id="join-target-entity"
            value={editingJoin.target?.table || ""}
            onChange={(e) =>
              setEditingJoin({
                ...editingJoin,
                target: {
                  table: e.target.value,
                  column: editingJoin.target?.column || "",
                },
              })
            }
            className="dark:bg-neutral-600 p-2"
          >
            {nodes.map((target, idx) => (
              <option key={"target-" + idx} value={target.data.id}>
                {target.data.name || target.data.id}
              </option>
            ))}
          </select>

          {targetTable && (
            <>
              <div>
                <label htmlFor="join-target-column">Reference Column</label>
                <span className="text-sm text-neutral-500 block">
                  The foreign key to reference from{" "}
                  {targetTable.data.name || targetTable.data.id}
                </span>
              </div>
              <select
                id="join-target-column"
                value={editingJoin.target?.column || ""}
                onChange={(e) =>
                  setEditingJoin({
                    ...editingJoin,
                    target: {
                      column: e.target.value,
                      table: editingJoin.target?.table || "",
                    },
                  })
                }
                className="dark:bg-neutral-600 p-2"
              >
                <option value="">-</option>
                {targetTable.data.columns
                  .filter((col) => !!col.primaryKey || !!col.unique)
                  .map((col, idx) => (
                    <option key={"target-column-" + idx} value={col.id}>
                      {col.name}
                    </option>
                  ))}
              </select>
            </>
          )}

          <label htmlFor="join-ondelete">On Delete</label>
          <select
            id="join-ondelete"
            value={editingJoin.onDelete}
            onChange={(e) =>
              setEditingJoin({
                ...editingJoin,
                onDelete: e.target.value as JoinProps["onDelete"],
              })
            }
            className="dark:bg-neutral-600 p-2"
          >
            <option value="CASCADE">CASCADE</option>
            <option value="SET NULL">SET NULL</option>
            <option value="RESTRICT">RESTRICT</option>
          </select>

          <label htmlFor="join-onupdate">On Update</label>
          <select
            id="join-onupdate"
            value={editingJoin.onUpdate}
            onChange={(e) =>
              setEditingJoin({
                ...editingJoin,
                onUpdate: e.target.value as JoinProps["onUpdate"],
              })
            }
            className="dark:bg-neutral-600 p-2"
          >
            <option value="CASCADE">CASCADE</option>
            <option value="SET NULL">SET NULL</option>
            <option value="RESTRICT">RESTRICT</option>
          </select>

          <label htmlFor="join-type">Type</label>
          <select
            id="join-type"
            value={editingJoin.type}
            onChange={(e) =>
              setEditingJoin({
                ...editingJoin,
                type: e.target.value as JoinProps["type"],
              })
            }
            className="dark:bg-neutral-600 p-2"
          >
            <option value="one-to-one">One to one</option>
            <option value="one-to-many">One to many</option>
            <option value="many-to-many">Many to many</option>
          </select>
          <Button type="submit" label="Save" />

          <Button
            onClick={removeEdge}
            type="reset"
            label="Delete Join"
            className="bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700"
          />
        </form>
      )}
    </Modal>
  );
}
