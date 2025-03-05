import { Button } from "@/components/ui/button";
import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultColumn } from "@/lib/flow-editors/helpers";
import {
  deleteEdges,
  deselectEdges,
  updateNodes,
  UpdateNodesPayload,
} from "@/lib/flow-editors/nodes";
import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/lib/types/database-types";
import { type Node, applyEdgeChanges } from "@xyflow/react";
import { cloneDeep } from "lodash";
import { CheckIcon, TrashIcon } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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
      (node) => node.id === editingJoin.target?.table
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
        (col) => col.id === editingJoin.target?.column
      ) as ColumnProps;

      const sourceColumn = currentNode.data.columns.find(
        (col) => col.foreignKey?.id === editingJoin.id
      );

      if (sourceColumn) {
        const columns = currentNode.data.columns.map((col) => {
          if (col.id !== sourceColumn.id) return col;
          return {
            ...sourceColumn,
            foreignKey: editingJoin,
          };
        });
        const payload: UpdateNodesPayload[] = [
          {
            id: currentNode.id,
            joins: sourceJoins,
            columns: columns,
          },
        ];
        if (currentNode.id === targetTable.id) {
          payload.push({ id: targetTable.id, joins: targetJoins });
        }
        // apply join updates
        setNodes((nds) => updateNodes(payload, nds));
      } else {
        const newColumn = getDefaultColumn(currentNode.data, {
          name: targetTable.data.name?.toLowerCase() || targetTable.data.id,
          dbName:
            (targetTable.data.name?.toLowerCase() || targetTable.data.id) +
            "_id",
          dataType: targetCol.dataType,
          length: targetCol.length,
          precision: targetCol.precision,
          scale: targetCol.scale,
          collation: targetCol.collation,
          foreignKey: editingJoin,
        });
        const payload: UpdateNodesPayload[] = [
          {
            id: currentNode.id,
            joins: sourceJoins,
            columns: [...currentNode.data.columns, newColumn],
          },
        ];
        if (currentNode.id === targetTable.id) {
          payload.push({ id: targetTable.id, joins: targetJoins });
        }
        // apply join updates
        setNodes((nds) => updateNodes(payload, nds));
        setEditingColumn(newColumn); // open column editor with the new foreign key
      }

      // deselect edge
      setEdges((edges) => {
        edges = deselectEdges(editingJoin.id, edges);
        const origEdge = edges.find(({ id }) => id === editingJoin.id);
        if (origEdge) {
          edges = applyEdgeChanges(
            [
              {
                id: editingJoin.id,
                type: "replace",
                item: {
                  ...origEdge,
                  markerStart: editingJoin.type.startsWith("many")
                    ? "marker-many-start"
                    : "marker-one",
                  markerEnd: editingJoin.type.endsWith("many")
                    ? "marker-many-end"
                    : "marker-one",
                  data: editingJoin!,
                },
              },
            ],
            edges
          );
        }

        return edges;
      });
      setEditingJoin(null);
    },
    [currentNode, targetTable, editingJoin, setNodes, setEdges]
  );

  const removeEdge = useCallback(() => {
    if (!currentNode || !targetTable || !editingJoin) return;

    const sourceJoinIdx = currentNode.data.joins.findIndex(
      (join) => join.id === editingJoin.id
    );

    const targetJoinIdx = targetTable.data.joins.findIndex(
      (join) => join.id === editingJoin.id
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

    // remove edge
    setEdges((edges) => deleteEdges(editingJoin.id, edges));

    setEditingColumn(null);
    setEditingJoin(null);
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
          (!join.source || join.source === node.id) // no source or self join only.
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setEdges((edges) => deselectEdges(editingJoin.id, edges));
          setEditingJoin(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Settings</DialogTitle>
          <DialogDescription>
            Make changes to your foreign key settings here. Click save when
            you're done.
          </DialogDescription>
        </DialogHeader>
        {currentNode && (
          <form onClick={handleFormSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target-table">Target Table</Label>
              <Select
                value={editingJoin.target?.table}
                onValueChange={(e) => {
                  setEditingJoin({
                    ...editingJoin,
                    target: {
                      table: e,
                      column: editingJoin.target?.column || "",
                    },
                  });
                }}
              >
                <SelectTrigger id="target-table">
                  <SelectValue placeholder="Target table"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((target, idx) => (
                    <SelectItem
                      key={target.data.id}
                      value={target.data.id}
                      className="cursor-pointer"
                    >
                      {target.data.name || target.data.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetTable && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="target-col">Data Type</Label>
                <span className="block text-xs">
                  The foreign key to reference from{" "}
                  {targetTable.data.name || targetTable.data.id}
                </span>
                <Select
                  value={editingJoin.target?.column}
                  onValueChange={(e) => {
                    setEditingJoin({
                      ...editingJoin,
                      target: {
                        column: e,
                        table: editingJoin.target?.table || "",
                      },
                    });
                  }}
                >
                  <SelectTrigger id="target-col">
                    <SelectValue placeholder="Target column"></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {targetTable.data.columns
                      .filter((col) => !!col.primaryKey || !!col.unique)
                      .map((target, idx) => (
                        <SelectItem
                          key={target.id}
                          value={target.id}
                          className="cursor-pointer"
                        >
                          {target.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="on-delete">On Delete</Label>
              <Select
                value={editingJoin.onDelete}
                onValueChange={(e) => {
                  setEditingJoin({
                    ...editingJoin,
                    onDelete: e as JoinProps["onDelete"],
                  });
                }}
              >
                <SelectTrigger id="on-delete">
                  <SelectValue placeholder="On delete behaviour"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTRICT" className="cursor-pointer">
                    RESTRICT
                  </SelectItem>
                  <SelectItem value="CASCADE" className="cursor-pointer">
                    CASCADE
                  </SelectItem>
                  <SelectItem value="SET NULL" className="cursor-pointer">
                    SET NULL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="on-update">On Update</Label>
              <Select
                value={editingJoin.onUpdate}
                onValueChange={(e) => {
                  setEditingJoin({
                    ...editingJoin,
                    onUpdate: e as JoinProps["onDelete"],
                  });
                }}
              >
                <SelectTrigger id="on-update">
                  <SelectValue placeholder="On update behaviour"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTRICT" className="cursor-pointer">
                    RESTRICT
                  </SelectItem>
                  <SelectItem value="CASCADE" className="cursor-pointer">
                    CASCADE
                  </SelectItem>
                  <SelectItem value="SET NULL" className="cursor-pointer">
                    SET NULL
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="join-type">Join Type</Label>
              <Select
                value={editingJoin.type}
                onValueChange={(e) => {
                  setEditingJoin({
                    ...editingJoin,
                    type: e as JoinProps["type"],
                  });
                }}
              >
                <SelectTrigger id="join-type">
                  <SelectValue placeholder="Join Type"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-to-one" className="cursor-pointer">
                    One to one
                  </SelectItem>
                  <SelectItem value="many-to-one" className="cursor-pointer">
                    Many to one
                  </SelectItem>
                  <SelectItem value="one-to-many" className="cursor-pointer">
                    One to many
                  </SelectItem>
                  <SelectItem value="many-to-many" className="cursor-pointer">
                    Many to many
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TODO: through */}

            <DialogFooter className="flex gap-4">
              {/* <div className="flex gap-4 justify-between"> */}
              <Button type="submit">
                <CheckIcon size="0.8rem" />
                <span>Save</span>
              </Button>
              <Button
                size="icon"
                onClick={removeEdge}
                type="reset"
                variant="destructive"
              >
                <TrashIcon size="0.8rem" />
              </Button>
              {/* </div> */}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
