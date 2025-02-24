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
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";

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
    if (column.primaryKey) return <Key className="w-4 h-4 text-yellow-500" />;
    if (column.index) return <Search className="w-4 h-4" />;
    if (column.unique) return <Star className="w-4 h-4" />;
    return <span className="block w-4 h-4"></span>;
  }, []);

  const renderDatatypeIcon = useCallback((column: ColumnProps): ReactNode => {
    switch (column.dataType) {
      case "string":
        return <ALargeSmall className="w-4 h-4" />;

      case "number":
        return <FileDigit className="w-4 h-4" />;

      case "date":
        return <Calendar className="w-4 h-4" />;

      case "json":
        return <Braces className="w-4 h-4" />;

      case "float":
        return <FileDigit className="w-4 h-4" />;

      case "uuid":
        return <Hash className="w-4 h-4" />;

      case "objectId":
        return <Hash className="w-4 h-4" />;

      default:
        return <Text className="w-4 h-4" />;
    }
  }, []);

  return (
    <div className="relative shadow-md rounded-md bg-white dark:bg-zinc-950 border dark:text-white group/table">
      <Button
        size="icon"
        className="group-hover/table:flex hidden absolute -top-6 -right-6 rounded-3xl"
        onClick={() => data.onDelete(id)}
        variant="destructive"
      >
        <Trash size="0.8rem" color="white" />
      </Button>
      <div className="p-3 overflow-hidden">
        <div className="relative z-20">
          <Input
            type="text"
            value={data.name}
            onChange={(e) => data.onChange(id, { name: e.target.value })}
            autoFocus
          />
          <Button
            size="icon"
            onClick={() => setExpanded(!expanded)}
            variant="ghost"
            className="absolute top-0 bottom-0 right-0"
          >
            <ChevronRight
              size="0.8rem"
              className="duration-300 ease-in-out"
              style={{
                transform: `rotate(${expanded ? "-90deg" : "90deg"})`,
              }}
            />
          </Button>
        </div>
        <div
          className={`ease-in-out z-0 mt-3 nowheel ${
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
                <label
                  htmlFor={"column-name-input-" + idx}
                  className="px-1 flex items-center"
                >
                  {renderDatatypeIcon(column)}
                </label>
                <div className="relative group/column flex-1">
                  <Input
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
                  />
                  <Button
                    size="icon"
                    onClick={() => setEditingColumn(column)}
                    variant="secondary"
                    className="absolute hidden group-hover/column:flex right-0 top-0 bottom-0"
                  >
                    <Pencil size="0.8rem" />
                  </Button>
                </div>
              </div>
            ))}
            <hr />
            <Button
              className="nodrag"
              // size="icon"
              onClick={() =>
                data.onChange(id, {
                  columns: [...data.columns, getDefaultColumn(data)],
                })
              }
            >
              <Plus size="0.8rem" />
            </Button>
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
