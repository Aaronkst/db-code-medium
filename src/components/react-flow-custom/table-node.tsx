"use client";

import type { ColumnProps, TableProps } from "@/utils/types/database-types";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";
import { nanoid } from "nanoid";
import { getDefaultColumn } from "@/utils/constants";

export type TableDataProps = TableProps & {
  onChange: (id: string, table: Partial<TableProps>) => void;
  onDelete: (id: string) => void;
};

export function TableNode({
  id,
  data,
}: NodeProps<Node<TableDataProps, "tableData">>) {
  const handleColumnChange = (idx: number, payload: Partial<ColumnProps>) => {
    // TODO: transform payload here if necessary
    const columns = [...data.columns];
    columns.splice(idx, 1, {
      ...columns[idx],
      ...payload,
    });
    return columns;
  };

  const [hovered, setHovered] = useState(false);

  const relations = useMemo(
    () => data.columns.filter((col) => !!col.foreignKey),
    [data.columns],
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative shadow-md rounded-md bg-neutral-300 dark:bg-neutral-800 dark:text-white"
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
          <div className="relative group" key={idx}>
            <input
              type="text"
              value={column.name}
              onChange={(e) =>
                data.onChange(id, {
                  columns: handleColumnChange(idx, { name: e.target.value }),
                })
              }
              autoFocus
              className="nodrag dark:bg-neutral-600 p-2"
            />
            <div className="absolute right-0 top-0 bottom-0 rounded-md p-1 hidden group-hover:block">
              <IconButton icon={<Pencil size="0.8rem" />} />
            </div>
          </div>
        ))}
        <hr />
        <IconButton
          className="nodrag"
          icon={<Plus size="0.9rem" />}
          onClick={() =>
            data.onChange(id, {
              columns: [...data.columns, getDefaultColumn(nanoid())],
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
