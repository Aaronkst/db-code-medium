"use client";

import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultColumn } from "@/utils/constants";
import type { ColumnProps, TableProps } from "@/utils/types/database-types";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import {
  ALargeSmall,
  Braces,
  Calendar,
  FileDigit,
  Hash,
  Key,
  Pencil,
  Plus,
  Search,
  Star,
  Text,
  Trash,
} from "lucide-react";
import { nanoid } from "nanoid";
import { ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";

export type TableDataProps = TableProps & {
  onChange: (id: string, table: Partial<TableProps>) => void;
  onDelete: (id: string) => void;
};

export function TableNode({
  id,
  data,
}: NodeProps<Node<TableDataProps, "tableData">>) {
  const handleColumnChange = (idx: number, payload: Partial<ColumnProps>) => {
    // Transform payload here if necessary
    const columns = [...data.columns];
    columns.splice(idx, 1, {
      ...columns[idx],
      ...payload,
    });
    return columns;
  };

  const [hovered, setHovered] = useState(false);
  const { setEditingColumn } = useContext(EditorContext);

  const relations = useMemo(
    () => data.columns.filter((col) => !!col.foreignKey),
    [data.columns],
  );

  const renderIcon = useCallback((column: ColumnProps): ReactNode => {
    if (column.primaryKey) return <Key size="0.9rem" />;
    if (column.index) return <Search size="0.9rem" />;
    if (column.unique) return <Star size="0.9rem" />;
    return "";
  }, []);

  const renderDatatypeIcon = useCallback((column: ColumnProps): ReactNode => {
    switch (column.dataType) {
      case "string":
        return <ALargeSmall size="0.9rem" />;

      case "number":
        return <FileDigit size="0.9rem" />;

      case "date":
        return <Calendar size="0.9rem" />;

      case "json":
        return <Braces size="0.9rem" />;

      case "float":
        return <FileDigit size="0.9rem" />;

      case "uuid":
        return <Hash size="0.9rem" />;

      case "objectId":
        return <Hash size="0.9rem" />;

      default:
        return <Text size="0.9rem" />;
    }
  }, []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative shadow-md rounded-md bg-neutral-300 dark:bg-neutral-900 dark:text-white"
    >
      <IconButton
        icon={<Trash size="0.9rem" color="white" />}
        className="absolute -top-4 -right-4 bg-red-400 hover:bg-red-700"
        onClick={() => data.onDelete(id)}
      />
      <div className="flex flex-col p-3 gap-3">
        <input
          type="text"
          value={data.name}
          onChange={(e) => data.onChange(id, { name: e.target.value })}
          autoFocus
          className="nodrag dark:bg-neutral-600 p-2"
        />
        <hr />
        {data.columns.map((column, idx) => (
          <div className="flex items-center gap-1" key={idx}>
            <span className="px-1">{renderIcon(column)}</span>
            <div className="flex-1 flex items-stretch nodrag dark:bg-neutral-600 w-full px-2 rounded-md">
              <label
                htmlFor={"column-name-input-" + idx}
                className="px-1 flex items-center"
              >
                {renderDatatypeIcon(column)}
              </label>
              <div className="relative group flex-1">
                <input
                  id={"column-name-input-" + idx}
                  type="text"
                  value={column.name}
                  onChange={(e) =>
                    data.onChange(id, {
                      columns: handleColumnChange(idx, {
                        name: e.target.value,
                      }),
                    })
                  }
                  autoFocus
                  className="p-2 bg-transparent"
                />
                <div className="absolute right-0 top-0 bottom-0 rounded-md p-1 hidden group-hover:block">
                  <IconButton
                    icon={<Pencil size="0.8rem" />}
                    onClick={() => setEditingColumn(column)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <hr />
        <IconButton
          className="nodrag"
          icon={<Plus size="0.9rem" />}
          onClick={() =>
            data.onChange(id, {
              columns: [...data.columns, getDefaultColumn(nanoid(), id)],
            })
          }
        />
      </div>
      {relations.map((col, idx) => (
        <Handle
          type="target"
          position={Position.Left}
          id={id + "-" + idx}
          style={{ top: (idx + 2) * 10 }}
          isConnectable={false}
        />
      ))}
      <Handle
        type="target"
        position={Position.Left}
        id={id + "-" + relations.length}
        style={{ top: 10 }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Right}
        id={id + "-target-" + relations.length}
        isConnectable
      />
    </div>
  );
}
