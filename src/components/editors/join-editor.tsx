import { Button } from "@/components/ui/button";
import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultColumn, joinTables } from "@/lib/flow-editors/helpers";
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
import { type Node, addEdge, applyEdgeChanges } from "@xyflow/react";
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
    edges,
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
      // @ts-expect-error: Typing error for `e.target`
      if (e.target.tagName.toLowerCase() !== "button") return;

      if (!editingJoin || !editingJoin.target || !currentNode || !targetNode)
        return;

      const targetCol = targetNode.data.columns.find(
        (col) => col.id === editingJoin.target?.column,
      ) as ColumnProps;

      const sourceColumn = currentNode.data.columns.find(
        (col) => col.foreignKey?.id === editingJoin.id,
      );

      let needsRemove: boolean = false;

      if (editingJoin.type === "many-to-many") {
        const joinTableRelt = joinTables(editingJoin, currentNode, targetNode);
        if (joinTableRelt) {
          const { edge1, edge2, joinNode } = joinTableRelt;
          setEdges((eds) => {
            const addEdge1 = addEdge(edge1, eds);
            return addEdge(edge2, addEdge1);
          });
          setNodes((nds) => {
            let nodes = cloneDeep(nds);
            if (sourceColumn) {
              const nodeIdx = nodes.findIndex(
                (node) => node.id === sourceColumn.table,
              );
              if (nodeIdx > -1) {
                const node = nodes[nodeIdx];
                const editedColumns = [...node.data.columns];

                const toRemove = editedColumns.findIndex(
                  (col) => col.id === sourceColumn.id,
                );

                editedColumns.splice(toRemove, 1);

                nodes[nodeIdx] = {
                  ...node,
                  data: {
                    ...node.data,
                    columns: editedColumns,
                  },
                };
              }
            }
            return [...nodes, joinNode];
          });
          needsRemove = true;
        }
      } else {
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
              (targetNode.data.name?.toLowerCase() || targetNode.data.id) +
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
      }

      if (needsRemove) {
        // remove edge
        setEdges((edges) => deleteEdges(editingJoin.id, edges));
      } else {
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
      }

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
    if (!nodes.length || !editingJoin || !edges.length) {
      return;
    }

    const edge = edges.find((edge) => edge.id === editingJoin.id);
    if (!edge) return;

    const node = nodes.find((node) => node.id === edge.source);

    setCurrentNode(node);
  }, [nodes, editingJoin, edges]);

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

              {targetNode &&
                (editingJoin.type === "many-to-many" ? (
                  <JoinTableOptions
                    currentNode={currentNode}
                    targetNode={targetNode}
                  />
                ) : (
                  <JoinColumnOptions
                    currentNode={currentNode}
                    targetNode={targetNode}
                  />
                ))}

              <DialogFooter className="flex gap-4">
                <Button type="submit">
                  <CheckIcon size="0.8rem" />
                  Save
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

type JoinOptionProps = {
  currentNode: Node<TableProps>;
  targetNode: Node<TableProps>;
};

function JoinColumnOptions({ currentNode, targetNode }: JoinOptionProps) {
  const { nodes, editingJoin, setEditingJoin } = useContext(EditorContext);

  if (!editingJoin) return null;

  return (
    <>
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
          <Label htmlFor="target-col">Target Column</Label>
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
    </>
  );
}

function JoinTableOptions({ currentNode, targetNode }: JoinOptionProps) {
  const { editingJoin, setEditingJoin } = useContext(EditorContext);

  if (!editingJoin) return null;

  return (
    <>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="join-through">Source Name</Label>
        <Input
          id="join-through"
          type="text"
          value={editingJoin.joinColumn?.name || ""}
          onChange={(e) => {
            setEditingJoin({
              ...editingJoin,
              joinColumn: {
                name: e.target.value,
                referencedColumnName:
                  editingJoin.joinColumn?.referencedColumnName || "",
              },
            });
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="source-col">Source Column</Label>
        <span className="block text-xs">
          The foreign key to reference from{" "}
          {targetNode.data.name || targetNode.data.id}
        </span>
        <Select
          value={editingJoin.joinColumn?.referencedColumnName}
          onValueChange={(e) => {
            setEditingJoin({
              ...editingJoin,
              joinColumn: {
                referencedColumnName: e,
                name: editingJoin.joinColumn?.name || "",
              },
            });
          }}
        >
          <SelectTrigger type="reset" id="source-col">
            <SelectValue placeholder="Target column"></SelectValue>
          </SelectTrigger>
          <SelectContent>
            {currentNode.data.columns
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="join-through">Target Name</Label>
        <Input
          id="join-through"
          type="text"
          value={editingJoin.inverseColumn?.name || ""}
          onChange={(e) => {
            setEditingJoin({
              ...editingJoin,
              inverseColumn: {
                name: e.target.value,
                referencedColumnName:
                  editingJoin.inverseColumn?.referencedColumnName || "",
              },
            });
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="target-col">Target Column</Label>
        <span className="block text-xs">
          The foreign key to reference from{" "}
          {targetNode.data.name || targetNode.data.id}
        </span>
        <Select
          value={editingJoin.inverseColumn?.referencedColumnName}
          onValueChange={(e) => {
            setEditingJoin({
              ...editingJoin,
              inverseColumn: {
                referencedColumnName: e,
                name: editingJoin.inverseColumn?.name || "",
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
    </>
  );
}
