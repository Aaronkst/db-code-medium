import { EditorContext } from "@/lib/context/editor-context";
import type { ColumnProps } from "@/utils/types/database-types";
import { X } from "lucide-react";
import { FormEvent, useCallback, useContext, useEffect, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";

type ColumnEditorProps = {
  onSubmit: (id: string, payload: ColumnProps) => void;
  column: ColumnProps;
};

export function ColumnEditor({ onSubmit, column }: ColumnEditorProps) {
  const { setEditingColumn } = useContext(EditorContext);

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
        value={column.name}
        onChange={(e) =>
          onSubmit(column.id, { ...column, name: e.target.value })
        }
        className="dark:bg-neutral-600 p-2"
      />

      <label htmlFor="column-data-type">Data Type</label>
      <select
        id="column-data-type"
        value={column.dataType}
        onChange={(e) =>
          onSubmit(column.id, {
            ...column,
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
          checked={!!column.primaryKey}
          onChange={() =>
            onSubmit(column.id, { ...column, primaryKey: !column.primaryKey })
          }
        />
        <label htmlFor="column-primary-key">Primary Key</label>
      </div>

      <div className="flex gap-2">
        <input
          id="column-unique"
          type="checkbox"
          checked={!!column.unique}
          onChange={() =>
            onSubmit(column.id, { ...column, unique: !column.unique })
          }
        />
        <label htmlFor="column-unique">Unique</label>
      </div>

      <div className="flex gap-2">
        <input
          id="column-index"
          type="checkbox"
          checked={!!column.index}
          onChange={() =>
            onSubmit(column.id, { ...column, index: !column.index })
          }
        />
        <label htmlFor="column-index">Index</label>
      </div>

      {!column.primaryKey && !column.autoIncrement && !column.unique && (
        <>
          <label htmlFor="column-default-value">Default Value</label>
          <input
            id="column-default-value"
            type="text"
            value={column.defaultValue?.toString() || ""}
            onChange={(e) =>
              onSubmit(column.id, { ...column, defaultValue: e.target.value })
            }
            className="dark:bg-neutral-600 p-2"
          />
        </>
      )}

      <label htmlFor="column-length">Length</label>
      <input
        id="column-length"
        type="number"
        value={column.length}
        onChange={(e) =>
          onSubmit(column.id, {
            ...column,
            length: parseInt(e.target.value || "0"),
          })
        }
        className="dark:bg-neutral-600 p-2"
      />

      {column.dataType === "float" && (
        <>
          <label htmlFor="column-precision">Precision</label>
          <input
            id="column-precision"
            type="number"
            value={column.precision || 0}
            onChange={(e) =>
              onSubmit(column.id, {
                ...column,
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
        {column.id}
      </code>
    </form>
  );
}
