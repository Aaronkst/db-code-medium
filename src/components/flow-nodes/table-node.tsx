"use client";

import { EditorContext } from "@/lib/context/editor-context";
import { getDefaultColumn } from "@/lib/flow-editors/helpers";
import type { ColumnProps, TableProps } from "@/lib/types/database-types";
import { Handle, Node, NodeProps, NodeToolbar, Position } from "@xyflow/react";
import {
  ALargeSmall,
  Braces,
  Calendar,
  ChevronRight,
  Copy,
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
import {
  memo,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

function TableNodeComponent({
  id,
  data,
  selected,
}: NodeProps<Node<TableProps, "tableData">>) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const { removeNode, editNode, duplicateNode } = useContext(EditorContext);

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
    <div
      className={cn(
        "rounded-md bg-white dark:bg-zinc-950 border dark:text-white group/table overflow-hidden",
        selected ? "border border-[#1d4ed8]" : "",
      )}
    >
      {/* <Button
        size="icon"
        className="group-hover/table:flex hidden absolute -top-6 -right-6 rounded-3xl"
        onClick={() => removeNode(id)}
        variant="destructive"
      >
        <Trash size="0.8rem" color="white" />
      </Button> */}
      <NodeToolbar isVisible={selected} position={Position.Bottom}>
        <div className="flex gap-2">
          <Button
            size="icon"
            onClick={() =>
              editNode(id, {
                columns: [...data.columns, getDefaultColumn(data)],
              })
            }
          >
            <Plus size="0.8rem" />
          </Button>
          <Button size="icon" onClick={() => duplicateNode(id)}>
            <Copy size="0.8rem" />
          </Button>
          <Button
            size="icon"
            onClick={() => removeNode(id)}
            variant="destructive"
          >
            <Trash size="0.8rem" color="white" />
          </Button>
        </div>
      </NodeToolbar>
      <div className="overflow-hidden">
        <div className="relative z-20">
          <Input
            type="text"
            value={data.dbName}
            onChange={(e) => editNode(id, { dbName: e.target.value })}
            autoFocus
            className="bg-blue-700 text-white rounded-none ring-0 focus-visible:ring-0 border-0"
          />
          {/* <Button
            size="icon"
            onClick={() => setExpanded(!expanded)}
            variant="ghost"
            className="absolute top-0 bottom-0 right-0 nodrag"
          >
            <ChevronRight
              size="0.8rem"
              className="duration-300 ease-in-out"
              style={{
                transform: `rotate(${expanded ? "-90deg" : "90deg"})`,
              }}
            />
          </Button> */}
        </div>
        <div
          className={`ease-in-out z-0 p-3 nowheel ${
            expanded
              ? "max-h-[500px] overflow-y-auto"
              : "max-h-0 overflow-hidden"
          }`}
        >
          <div className="flex flex-col gap-3">
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
                      editNode(id, {
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
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        isConnectable
        style={{
          width: "10px",
          height: "10px",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        isConnectable
        style={{
          width: "10px",
          height: "10px",
        }}
      />
    </div>
  );
}

TableNodeComponent.displayName = "TableNode";

export const TableNode = memo(TableNodeComponent);
