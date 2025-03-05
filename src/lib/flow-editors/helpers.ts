import type { ColumnProps, JoinProps, TableProps } from "@/lib/types/database-types";
import type { Edge, Node } from "@xyflow/react";
import { nanoid } from "nanoid";

/**
 * Helper function to retur a default column object for a table.
 * @param table
 * @param columnProps
 * @returns
 */
export const getDefaultColumn = (
  table: TableProps,
  columnProps?: Partial<ColumnProps>,
): ColumnProps => ({
  id: nanoid(),
  table: table.id,
  name: "",
  dbName: "",
  dataType: "string",
  primaryKey: false,
  index: false,
  unique: false,
  nullable: false,
  defaultValue: null,
  length: 255,
  precision: null,
  scale: null,
  collation: "",
  description: "",
  autoIncrement: false,
  foreignKey: null,
  select: true,
  zerofill: false,
  enum: null,
  enumName: null,
  hstoreType: null,
  array: false,
  ...columnProps,
});

/**
 * Helper function to return a default table object with one primary `id` column.
 * @param id
 * @param onChange
 * @param onDelete
 * @returns
 */
export const getDefaultTable = (id: string, name: string): TableProps => {
  const table: TableProps = {
    id: id.toString(),
    name: name,
    dbName: "",
    primaryKey: "",
    description: "",
    timestamps: true,
    engine: "InnoDB", // for MySQL only
    columns: [],
    joins: [],
  };

  const column = getDefaultColumn(table, {
    name: "id",
    dbName: "id",
    primaryKey: true,
  });

  table.columns.push(column);
  table.primaryKey = column.id;

  return table;
};

/**
 * Helper function to parse uploaded JSON file
 * @param file
 * @param onParse
 */
export const importJson = async (
  file: File,
  onParse: (nodes: Node<TableProps>[], edges: Edge<JoinProps>[]) => void,
) => {
  const payload = JSON.parse(await file.text());
  if (!payload.nodes && !payload.edges) throw new Error("Invalid format.");
  onParse(payload.nodes, payload.edges);
};
