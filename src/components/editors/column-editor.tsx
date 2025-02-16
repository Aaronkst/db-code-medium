import { EditorContext } from "@/lib/context/editor-context";
import type { ColumnProps } from "@/lib/types/database-types";
import { X } from "lucide-react";
import { useContext, useMemo } from "react";
import { Button } from "../shared/buttons/button";
import { IconButton } from "../shared/buttons/icon-button";
import { Input, Select } from "../shared/inputs";

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

export function ColumnEditor() {
  const { editingColumn, setEditingColumn, setEditingJoin } =
    useContext(EditorContext);

  // TODO: handle `objectId` for mongodb.
  const dataTypeOpts = useMemo(
    () =>
      editingColumn?.primaryKey
        ? [...dataTypes, { label: "UUID", value: "uuid" }]
        : dataTypes,
    [editingColumn?.primaryKey],
  );

  if (!editingColumn) return <></>;

  return (
    <form className="flex flex-col gap-3 p-2">
      <div className="flex justify-between">
        <span className="text-xl">Column Editor</span>
        <IconButton
          icon={<X size="0.9rem" />}
          onClick={() => setEditingColumn(null)}
          type="reset"
        />
      </div>
      <hr />
      <Input
        label="Name"
        id="column-name"
        type="text"
        value={editingColumn.name}
        onChange={(e) =>
          setEditingColumn({ ...editingColumn, name: e.target.value })
        }
        className="dark:bg-neutral-600 p-2"
      />

      <Input
        label="Name (Database)"
        description={
          <>
            Encouraged to use <code className="text-pink-700">snake_case</code>{" "}
            for RDS naming and <code className="text-pink-700">camelCase</code>{" "}
            for NoSQL naming.
          </>
        }
        id="column-name"
        type="text"
        value={editingColumn.name}
        onChange={(e) =>
          setEditingColumn({ ...editingColumn, name: e.target.value })
        }
        className="dark:bg-neutral-600 p-2"
      />

      <Select
        label="Data Type"
        id="column-data-type"
        value={editingColumn.dataType}
        onChange={(e) =>
          setEditingColumn({
            ...editingColumn,
            dataType: e.target.value as ColumnProps["dataType"],
          })
        }
        className="dark:bg-neutral-600 p-2"
        data={dataTypeOpts}
      />

      <Input
        label="Primary Key"
        id="column-primary-key"
        type="checkbox"
        checked={!!editingColumn.primaryKey}
        disabled={!!editingColumn.foreignKey}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            primaryKey: !editingColumn.primaryKey,
          })
        }
      />

      <Input
        label="Auto Increment"
        id="column-auto-increment"
        type="checkbox"
        checked={!!editingColumn.autoIncrement}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            autoIncrement: !editingColumn.autoIncrement,
          })
        }
        disabled={
          !editingColumn.primaryKey || editingColumn.dataType !== "number"
        }
      />

      <Input
        label="Unique"
        id="column-unique"
        type="checkbox"
        checked={!!editingColumn.unique}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            unique: !editingColumn.unique,
            nullable: false,
          })
        }
      />

      <Input
        label="Index"
        id="column-index"
        type="checkbox"
        checked={!!editingColumn.index}
        onChange={() =>
          setEditingColumn({ ...editingColumn, index: !editingColumn.index })
        }
      />

      <Input
        label="Nullable"
        id="column-nullable"
        type="checkbox"
        checked={!!editingColumn.nullable}
        disabled={
          editingColumn.primaryKey ||
          editingColumn.autoIncrement ||
          editingColumn.unique
        }
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            nullable: !editingColumn.nullable,
          })
        }
      />

      <Input
        label="Default Value"
        id="column-default-value"
        type="text"
        value={editingColumn.defaultValue?.toString() || ""}
        onChange={(e) =>
          setEditingColumn({
            ...editingColumn,
            defaultValue: e.target.value,
          })
        }
        className="dark:bg-neutral-600 p-2"
        disabled={
          editingColumn.primaryKey ||
          editingColumn.autoIncrement ||
          editingColumn.unique
        }
      />

      <Input
        label="Length"
        id="column-length"
        type="number"
        value={editingColumn.length}
        onChange={(e) =>
          setEditingColumn({
            ...editingColumn,
            length: parseInt(e.target.value || "0"),
          })
        }
        className="dark:bg-neutral-600 p-2"
      />

      {["float", "number"].includes(editingColumn.dataType) && (
        <Input
          label="Precision"
          id="column-precision"
          type="number"
          value={editingColumn.precision || 0}
          onChange={(e) =>
            setEditingColumn({
              ...editingColumn,
              precision: parseInt(e.target.value || "0"),
            })
          }
          className="dark:bg-neutral-600 p-2"
        />
      )}

      {editingColumn.dataType === "float" && (
        <Input
          label="Scale"
          id="column-scale"
          type="number"
          value={editingColumn.scale || 0}
          onChange={(e) =>
            setEditingColumn({
              ...editingColumn,
              scale: parseInt(e.target.value || "0"),
            })
          }
          className="dark:bg-neutral-600 p-2"
        />
      )}

      {editingColumn.dataType === "string" && (
        <Input
          label="Collation"
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
      )}

      <Input
        label="Select"
        id="column-select"
        type="checkbox"
        checked={!!editingColumn.select}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            select: !editingColumn.select,
          })
        }
      />

      {/* MySQL Only */}
      <Input
        label="Zerofill"
        id="column-zerofill"
        type="checkbox"
        checked={!!editingColumn.zerofill}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            zerofill: !editingColumn.zerofill,
          })
        }
      />

      {editingColumn.dataType === "string" && (
        <Input
          label="Enum"
          description="Please enter enum values seperated by comma"
          placeholder="value1, value2, etc..."
          id="column-enum"
          type="string"
          value={editingColumn.enum?.length ? editingColumn.enum.join(",") : ""}
          onChange={(e) =>
            setEditingColumn({
              ...editingColumn,
              enum: e.target.value?.split(",") || null,
            })
          }
        />
      )}

      {editingColumn.dataType === "string" && (
        <Input
          label="Enum name"
          id="column-enum-name"
          type="string"
          value={editingColumn.enumName || 0}
          onChange={(e) =>
            setEditingColumn({
              ...editingColumn,
              enumName: e.target.value || "",
            })
          }
        />
      )}

      {/* Postgres only */}
      <Select
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
      />

      {/* Postgres and Cockroach db */}
      <Input
        label="Array"
        id="column-array"
        type="checkbox"
        checked={!!editingColumn.array}
        onChange={() =>
          setEditingColumn({
            ...editingColumn,
            array: !editingColumn.array,
          })
        }
      />
      <hr />

      {!!editingColumn.foreignKey && (
        <Button
          type="reset"
          onClick={() => {
            setEditingJoin(editingColumn.foreignKey);
          }}
          label="Edit FK Settings"
        />
      )}

      <code className="text-xs text-neutral-700 dark:text-neutral-400">
        {editingColumn.id}
      </code>
    </form>
  );
}
