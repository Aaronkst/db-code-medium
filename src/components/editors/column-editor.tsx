import { EditorContext } from "@/lib/context/editor-context";
import type { ColumnProps } from "@/utils/types/database-types";
import { X } from "lucide-react";
import { FormEvent, useCallback, useContext, useEffect, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";

export function ColumnEditor() {
  const { editingColumn, setEditingColumn } = useContext(EditorContext);

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
      <label htmlFor="column-name">Name</label>
      <input
        id="column-name"
        type="text"
        value={editingColumn.name}
        onChange={(e) =>
          setEditingColumn({ ...editingColumn, name: e.target.value })
        }
        className="dark:bg-neutral-600 p-2"
      />

      <label htmlFor="column-data-type">Data Type</label>
      <select
        id="column-data-type"
        value={editingColumn.dataType}
        onChange={(e) =>
          setEditingColumn({
            ...editingColumn,
            dataType: e.target.value as ColumnProps["dataType"],
          })
        }
        className="dark:bg-neutral-600 p-2"
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="json">JSON</option>
      </select>

      <div className="flex gap-2">
        <input
          id="column-primary-key"
          type="checkbox"
          checked={!!editingColumn.primaryKey}
          onChange={() =>
            setEditingColumn({
              ...editingColumn,
              primaryKey: !editingColumn.primaryKey,
            })
          }
        />
        <label htmlFor="column-primary-key">Primary Key</label>
      </div>

      <div className="flex gap-2">
        <input
          id="column-unique"
          type="checkbox"
          checked={!!editingColumn.unique}
          onChange={() =>
            setEditingColumn({
              ...editingColumn,
              unique: !editingColumn.unique,
            })
          }
        />
        <label htmlFor="column-unique">Unique</label>
      </div>

      <div className="flex gap-2">
        <input
          id="column-index"
          type="checkbox"
          checked={!!editingColumn.index}
          onChange={() =>
            setEditingColumn({ ...editingColumn, index: !editingColumn.index })
          }
        />
        <label htmlFor="column-index">Index</label>
      </div>

      {!editingColumn.primaryKey &&
        !editingColumn.autoIncrement &&
        !editingColumn.unique && (
          <>
            <label htmlFor="column-default-value">Default Value</label>
            <input
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
            />
          </>
        )}

      <label htmlFor="column-length">Length</label>
      <input
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

      {editingColumn.dataType === "float" && (
        <>
          <label htmlFor="column-precision">Precision</label>
          <input
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
        </>
      )}
      <hr />
      {/* TODO: Foreign key column. */}

      <code className="text-xs text-neutral-700 dark:text-neutral-400">
        {editingColumn.id}
      </code>
    </form>
  );
}
