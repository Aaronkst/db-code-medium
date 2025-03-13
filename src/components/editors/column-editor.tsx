import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditorContext } from "@/lib/context/editor-context";
import { updateNodes } from "@/lib/flow-editors/nodes";
import type { ColumnProps } from "@/lib/types/database-types";
import { memo, useContext, useEffect, useMemo } from "react";

const dataTypes = [
  {
    label: "String",
    value: "string",
  },
  {
    label: "Number",
    value: "number",
  },
  {
    label: "Date",
    value: "date",
  },
  {
    label: "JSON",
    value: "json",
  },
  {
    label: "Float",
    value: "float",
  },
];

function ColumnEditorComponent() {
  const {
    editingColumn,
    setEditingColumn,
    setEditingJoin,
    setNodes,
    database,
  } = useContext(EditorContext);

  const dataTypeOpts = useMemo(() => {
    if (editingColumn?.primaryKey) {
      const primaryType = [...dataTypes, { label: "UUID", value: "uuid" }];
      if (database === "mongodb") {
        primaryType.push({
          label: "ObjectID",
          value: "objectId",
        });
      }
      return primaryType;
    } else {
      return dataTypes;
    }
  }, [editingColumn?.primaryKey, database]);

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

      return updateNodes({ id: node.id, columns }, nds);
    });
  }, [editingColumn]);

  return (
    <Sheet
      open={!!editingColumn}
      onOpenChange={(open) => {
        if (!open) setEditingColumn(null);
      }}
    >
      {editingColumn && (
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Column Editor</SheetTitle>
          </SheetHeader>
          <hr className="my-3" />
          <form className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <Label htmlFor="column-name">Name</Label>
              <Input
                id="column-name"
                type="text"
                value={editingColumn.name}
                onChange={(e) =>
                  setEditingColumn({ ...editingColumn, name: e.target.value })
                }
              />
            </div>
            {/* Db name */}
            <div>
              <Label htmlFor="column-db-name">Name (Database)</Label>
              <span className="block text-xs">
                Encouraged to use{" "}
                <code className="text-pink-700">snake_case</code> for RDS naming
                and <code className="text-pink-700">camelCase</code> for NoSQL
                naming.
              </span>
              <Input
                id="column-db-name"
                type="text"
                value={editingColumn.dbName}
                onChange={(e) =>
                  setEditingColumn({ ...editingColumn, dbName: e.target.value })
                }
              />
            </div>
            {/* Data type */}
            <div>
              <Label htmlFor="column-data-type">Data Type</Label>
              <Select
                value={editingColumn.dataType}
                onValueChange={(e) => {
                  setEditingColumn({
                    ...editingColumn,
                    dataType: e as ColumnProps["dataType"],
                  });
                }}
              >
                <SelectTrigger id="column-data-type">
                  <SelectValue placeholder="Data Type"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOpts.map((dataType) => (
                    <SelectItem
                      key={dataType.value}
                      value={dataType.value}
                      className="cursor-pointer"
                    >
                      {dataType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Primary Key */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-primary-key"
                checked={!!editingColumn.primaryKey}
                disabled={!!editingColumn.foreignKey}
                onChange={() =>
                  setEditingColumn({
                    ...editingColumn,
                    primaryKey: !editingColumn.primaryKey,
                  })
                }
              />
              <Label htmlFor="column-primary-key">Primary Key</Label>
            </div>
            {/* Auto Increment */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-auto-increment"
                checked={!!editingColumn.autoIncrement}
                disabled={
                  !editingColumn.primaryKey ||
                  editingColumn.dataType !== "number"
                }
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    autoIncrement: !!checked,
                  })
                }
              />
              <Label htmlFor="column-auto-increment">Auto Increment</Label>
            </div>
            {/* Unique */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-unique"
                checked={!!editingColumn.unique}
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    unique: !!checked,
                    nullable: false,
                  })
                }
              />
              <Label htmlFor="column-unique">Unique</Label>
            </div>
            {/* Index */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-index"
                checked={!!editingColumn.index}
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    index: !!checked,
                  })
                }
              />
              <Label htmlFor="column-index">Index</Label>
            </div>
            {/* Nullable */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-nullable"
                checked={!!editingColumn.nullable}
                disabled={
                  !!editingColumn.primaryKey ||
                  !!editingColumn.autoIncrement ||
                  !!editingColumn.unique
                }
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    nullable: !!checked,
                  })
                }
              />
              <Label htmlFor="column-nullable">Nullable</Label>
            </div>
            {/* Default Value */}
            <div>
              <Label htmlFor="column-default-value">Default Value</Label>
              <Input
                id="column-default-value"
                type="text"
                value={editingColumn.defaultValue?.toString() || ""}
                onChange={(e) =>
                  setEditingColumn({
                    ...editingColumn,
                    defaultValue: e.target.value,
                  })
                }
                disabled={
                  !!editingColumn.primaryKey ||
                  !!editingColumn.autoIncrement ||
                  !!editingColumn.unique
                }
              />
            </div>
            {/* Length */}
            <div>
              <Label htmlFor="column-length">Length</Label>
              <Input
                id="column-length"
                type="number"
                value={editingColumn.length}
                onChange={(e) =>
                  setEditingColumn({
                    ...editingColumn,
                    length: parseInt(e.target.value || "0"),
                  })
                }
              />
            </div>
            {/* Precision */}
            {["float", "number"].includes(editingColumn.dataType) && (
              <div>
                <Label htmlFor="column-precision">Precision</Label>
                <Input
                  id="column-precision"
                  type="number"
                  value={editingColumn.precision || 0}
                  onChange={(e) =>
                    setEditingColumn({
                      ...editingColumn,
                      precision: parseInt(e.target.value || "0"),
                    })
                  }
                />
              </div>
            )}
            {/* Scale */}
            {editingColumn.dataType === "float" && (
              <div>
                <Label htmlFor="column-scale">Scale</Label>
                <Input
                  id="column-scale"
                  type="number"
                  value={editingColumn.scale || 0}
                  onChange={(e) =>
                    setEditingColumn({
                      ...editingColumn,
                      scale: parseInt(e.target.value || "0"),
                    })
                  }
                />
              </div>
            )}
            {/* Collation */}
            {editingColumn.dataType === "string" && (
              <div>
                <Label htmlFor="column-collation">Collation</Label>
                <Input
                  id="column-collation"
                  type="number"
                  value={editingColumn.collation || 0}
                  onChange={(e) =>
                    setEditingColumn({
                      ...editingColumn,
                      collation: e.target.value || "",
                    })
                  }
                />
              </div>
            )}
            {/* Select */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-select"
                checked={!!editingColumn.select}
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    select: !!checked,
                  })
                }
              />
              <Label htmlFor="column-select">Select</Label>
            </div>
            {/* MySQL Only: Zerofill */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-zerofill"
                checked={!!editingColumn.zerofill}
                onCheckedChange={(checked) =>
                  setEditingColumn({
                    ...editingColumn,
                    zerofill: !!checked,
                  })
                }
              />
              <Label htmlFor="column-zerofill">Zerofill</Label>
            </div>
            {/* Enum */}
            {editingColumn.dataType === "string" && (
              <>
                <div>
                  <Label htmlFor="column-enum">Enum</Label>
                  <span className="block text-xs">
                    Please enter enum values seperated by comma
                  </span>
                  <Input
                    placeholder="value1, value2, etc..."
                    id="column-enum"
                    type="string"
                    value={
                      editingColumn.enum?.length
                        ? editingColumn.enum.join(",")
                        : ""
                    }
                    onChange={(e) =>
                      setEditingColumn({
                        ...editingColumn,
                        enum: e.target.value?.split(",") || null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="column-enum-name">Name</Label>
                  <Input
                    id="column-enum-name"
                    type="text"
                    value={editingColumn.enumName || 0}
                    onChange={(e) =>
                      setEditingColumn({
                        ...editingColumn,
                        enumName: e.target.value || "",
                      })
                    }
                  />
                </div>
              </>
            )}
            {/* Postgres only */}
            <div>
              <Label htmlFor="column-hstore-type">Hstore Type</Label>
              <Select
                value={editingColumn.hstoreType || ""}
                onValueChange={(e) => {
                  setEditingColumn({
                    ...editingColumn,
                    hstoreType: e as ColumnProps["hstoreType"],
                  });
                }}
              >
                <SelectTrigger id="column-hstore-type">
                  <SelectValue placeholder="Select Hstore Type"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string" className="cursor-pointer">
                    String
                  </SelectItem>
                  <SelectItem value="object" className="cursor-pointer">
                    Object
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* <Select
              label="Hstore Type"
              id="column-hstore-type"
              value={editingColumn.hstoreType || ""}
              onChange={(e) =>
                setEditingColumn({
                  ...editingColumn,
                  hstoreType: e.target.value as ColumnProps["hstoreType"],
                })
              }
              className="dark:bg-neutral-600 p-2"
              data={[
                {
                  label: "String",
                  value: "string",
                },
                {
                  label: "Object",
                  value: "object",
                },
              ]}
            /> */}

            {/* Postgres and Cockroach db */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="column-array"
                checked={!!editingColumn.array}
                onChange={() =>
                  setEditingColumn({
                    ...editingColumn,
                    array: !editingColumn.array,
                  })
                }
              />
              <Label htmlFor="column-array">Array</Label>
            </div>
            <hr />

            {!!editingColumn.foreignKey && (
              <Button
                type="reset"
                onClick={() => {
                  setEditingJoin(editingColumn.foreignKey);
                }}
              >
                Edit FK Settings
              </Button>
            )}

            <code className="text-xs text-neutral-700 dark:text-neutral-400">
              {editingColumn.id}
            </code>
          </form>
        </SheetContent>
      )}
    </Sheet>
  );
}

ColumnEditorComponent.displayName = "ColumnEditor";

export const ColumnEditor = memo(ColumnEditorComponent);
