import { EditorContext } from "@/lib/context/editor-context";
import type { ColumnProps } from "@/utils/types/database-types";
import { X } from "lucide-react";
import { FormEvent, useCallback, useContext, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";

type ColumnEditorProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (id: string, payload: ColumnProps) => void;
  column: ColumnProps;
};

export function ColumnEditor({
  isOpen,
  onClose,
  onSubmit,
  column,
}: ColumnEditorProps) {
  const [settings, setSettings] = useState<ColumnProps>(column);
  const { setEditingColumn } = useContext(EditorContext);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      console.log("form on change");
      // TODO: Build column settings here.
      // onSubmit(columnId, settings);
    },
    [column, onSubmit, settings],
  );

  return (
    <form onChange={handleFormSubmit} className="flex flex-col gap-3 p-2">
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
        value={settings.name}
        onChange={(e) =>
          setSettings((prev) => ({ ...prev, name: e.target.value }))
        }
        className="dark:bg-neutral-600 p-2"
      />

      <label htmlFor="column-data-type">Data Type</label>
      <select
        id="column-data-type"
        value={settings.dataType}
        onChange={(e) =>
          setSettings((prev) => ({
            ...prev,
            dataType: e.target.value as ColumnProps["dataType"],
          }))
        }
        className="dark:bg-neutral-600 p-2"
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="json">JSON</option>
      </select>

      {/* TODO: fix checkbox */}
      <div className="flex gap-2">
        <input
          id="column-index"
          type="checkbox"
          checked={settings.index}
          onChange={() =>
            setSettings((prev) => ({ ...prev, index: !prev.index }))
          }
        />
        <label htmlFor="column-index">Index</label>
      </div>

      <label htmlFor="column-default-value">Default Value</label>
      <input
        id="column-default-value"
        type="text"
        value={settings.defaultValue?.toString() || ""}
        onChange={(e) =>
          setSettings((prev) => ({ ...prev, defaultValue: e.target.value }))
        }
        className="dark:bg-neutral-600 p-2"
      />

      <label htmlFor="column-length">Length</label>
      <input
        id="column-length"
        type="number"
        value={settings.length}
        onChange={(e) =>
          setSettings((prev) => ({
            ...prev,
            length: parseInt(e.target.value || "0"),
          }))
        }
        className="dark:bg-neutral-600 p-2"
      />

      {settings.dataType === "float" && (
        <>
          <label htmlFor="column-precision">Precision</label>
          <input
            id="column-precision"
            type="number"
            value={settings.precision || 0}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                precision: parseInt(e.target.value || "0"),
              }))
            }
            className="dark:bg-neutral-600 p-2"
          />
        </>
      )}
      <hr />
      {/* Foreign key settings. */}
      <code className="text-xs text-neutral-700 dark:text-neutral-400">
        {settings.id}
      </code>
    </form>
  );
}
