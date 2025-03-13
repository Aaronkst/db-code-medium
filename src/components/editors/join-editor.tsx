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
import { Input } from "../ui/input";

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

  const targetNode = useMemo(() => {
    if (!nodes.length || !editingJoin) return;

    const targetNode = nodes.find(
      (node) => node.id === editingJoin.target?.table,
    );

    return targetNode;
  }, [nodes, editingJoin]);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!editingJoin || !editingJoin.target || !currentNode || !targetNode)
        return;

      const targetCol = targetNode.data.columns.find(
        (col) => col.id === editingJoin.target?.column,
      ) as ColumnProps;

      const sourceColumn = currentNode.data.columns.find(
        (col) => col.foreignKey?.id === editingJoin.id,
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
            columns: columns,
          },
        ];
        if (currentNode.id === targetNode.id) {
          payload.push({ id: targetNode.id });
        }
        // apply join updates
        setNodes((nds) => updateNodes(payload, nds));
      } else {
        const newColumn = getDefaultColumn(currentNode.data, {
          name: targetNode.data.name?.toLowerCase() || targetNode.data.id,
          dbName:
            (targetNode.data.name?.toLowerCase() || targetNode.data.id) + "_id",
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
            columns: [...currentNode.data.columns, newColumn],
          },
        ];
        if (currentNode.id === targetNode.id) {
          payload.push({ id: targetNode.id });
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
            edges,
          );
        }

        return edges;
      });
      setEditingJoin(null);
    },
    [currentNode, targetNode, editingJoin, setNodes, setEdges],
  );

  const removeEdge = useCallback(() => {
    if (!currentNode || !editingJoin) return;

    const sourceJoinIdx = currentNode.data.columns.findIndex(
      (column) => column.foreignKey?.id === editingJoin.id,
    );

    if (sourceJoinIdx < 0) return;

    const sourceColumns = [...currentNode.data.columns];
    sourceColumns.splice(sourceJoinIdx, 1);

    // apply join updates
    setNodes((nds) =>
      updateNodes({ id: currentNode.id, columns: sourceColumns }, nds),
    );

    // remove edge
    setEdges((edges) => deleteEdges(editingJoin.id, edges));

    setEditingColumn(null);
    setEditingJoin(null);
  }, [currentNode, targetNode, editingJoin, setNodes, setEdges]);

  useEffect(() => {
    if (!nodes.length || !editingJoin) {
      return;
    }

    let editIdx = -1;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const join = node.data.columns.find(
        (column) =>
          column.foreignKey &&
          column.foreignKey.id === editingJoin.id &&
          column.foreignKey.target?.table === node.id, // no source or self join only.
      );
      if (join) {
        editIdx = i;
        break;
      }
    }

    setCurrentNode(nodes[editIdx]);
  }, [nodes, editingJoin]);

  return (
    <Dialog
      open={!!editingJoin}
      onOpenChange={(open) => {
        if (!open) {
          if (editingJoin)
            setEdges((edges) => deselectEdges(editingJoin.id, edges));
          setEditingJoin(null);
        }
      }}
    >
      {editingJoin && (
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
                  <SelectTrigger type="reset" id="target-table">
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

              {targetNode && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="target-col">Data Type</Label>
                  <span className="block text-xs">
                    The foreign key to reference from{" "}
                    {targetNode.data.name || targetNode.data.id}
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
                    <SelectTrigger type="reset" id="target-col">
                      <SelectValue placeholder="Target column"></SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {targetNode.data.columns
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
                  <SelectTrigger type="reset" id="on-delete">
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
                  <SelectTrigger type="reset" id="on-update">
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
                  <SelectTrigger type="reset" id="join-type">
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

              {editingJoin.type === "many-to-many" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="join-through">Through</Label>
                  <Input
                    id="join-through"
                    type="text"
                    value={editingJoin.through || ""}
                    onChange={(e) =>
                      setEditingJoin({
                        ...editingJoin,
                        through: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <DialogFooter className="flex gap-4">
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
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
