"use client";

import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultColumn } from "@/lib/flow-editors/helpers";
import type { ColumnProps, TableProps } from "@/lib/types/database-types";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import {
  ALargeSmall,
  Braces,
  Calendar,
  ChevronRight,
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
  const [expanded, setExpanded] = useState<boolean>(true);

  const joinTargets = useMemo(
    () => data.joins.filter((join) => !!join.target),
    [data.joins],
  );
  const joinSources = useMemo(
    () => data.joins.filter((join) => !!join.source),
    [data.joins],
  );

  const handleColumnChange = (idx: number, payload: Partial<ColumnProps>) => {
    // Transform payload here if necessary
    const columns = [...data.columns];
    columns.splice(idx, 1, {
      ...columns[idx],
      ...payload,
    });
    return columns;
  };

  const { setEditingColumn } = useContext(EditorContext);

  const renderIcon = useCallback((column: ColumnProps): ReactNode => {
    if (column.primaryKey) return <Key className="mx-1" size="0.9rem" />;
    if (column.index) return <Search className="mx-1" size="0.9rem" />;
    if (column.unique) return <Star className="mx-1" size="0.9rem" />;
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
    <div className="relative shadow-md rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-400 dark:text-white group/table">
      <IconButton
        icon={<Trash size="0.9rem" color="white" />}
        className="group-hover/table:block hidden absolute -top-4 -right-4 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-full"
        onClick={() => data.onDelete(id)}
      />
      <div className="p-3 overflow-hidden">
        <div className="flex gap-1 z-20">
          <input
            type="text"
            value={data.name}
            onChange={(e) => data.onChange(id, { name: e.target.value })}
            autoFocus
            className="nodrag dark:bg-neutral-600 p-2 flex-1"
          />
          <IconButton
            icon={
              <ChevronRight
                size="0.9rem"
                className="duration-500 ease-in-out"
                style={{
                  transform: `rotate(${expanded ? "90deg" : "0deg"})`,
                }}
              />
            }
            onClick={() => setExpanded(!expanded)}
          />
        </div>
        <div
          className={`duration-500 ease-in-out z-0 mt-3 transition-all nowheel ${
            expanded
              ? "max-h-[500px] overflow-y-auto"
              : "max-h-0 overflow-hidden"
          }`}
        >
          <div className="flex flex-col gap-3">
            <hr />
            {data.columns.map((column, idx) => (
              <div className="flex items-center gap-1" key={idx}>
                <span>{renderIcon(column)}</span>
                <div className="flex-1 flex items-stretch nodrag dark:bg-neutral-600 w-full px-2 rounded-md">
                  <label
                    htmlFor={"column-name-input-" + idx}
                    className="px-1 flex items-center"
                  >
                    {renderDatatypeIcon(column)}
                  </label>
                  <div className="relative group/column flex-1">
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
                    <div className="absolute right-0 top-0 bottom-0 rounded-md p-1 hidden group-hover/column:block">
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
                  columns: [...data.columns, getDefaultColumn(data)],
                })
              }
            />
          </div>
        </div>
      </div>
      {joinTargets.map((join, idx) => (
        <Handle
          key={"_source_-" + idx}
          type="source" // target other sources from this node
          position={Position.Right}
          id={"_source_" + idx}
          style={{ top: 20 + (idx + 2) * 10 }}
          isConnectable={false}
        />
      ))}
      <Handle
        type="source"
        position={Position.Right}
        id={"_source_" + joinTargets.length}
        style={{ top: 30 }}
        isConnectable
      />

      {joinSources.map((join, idx) => (
        <Handle
          key={"_target_" + idx}
          type="target" // other source will target this node
          position={Position.Left}
          id={"_target_" + idx}
          style={{ top: 20 + (idx + 2) * 10 }}
          isConnectable={false}
        />
      ))}
      <Handle
        type="target"
        position={Position.Left}
        id={"_target_" + joinSources.length}
        style={{ top: 30 }}
        isConnectable
      />
    </div>
  );
}
