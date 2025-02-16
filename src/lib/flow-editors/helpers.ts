import type { TableDataProps } from "@/components/flow-nodes/table-node";
import type { ColumnProps, TableProps } from "@/lib/types/database-types";

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
  id: table.columns.length.toString(),
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
export const getDefaultTable = (
  id: string | number,
  onChange: (id: string, data: Partial<TableProps>) => void,
  onDelete: (id: string) => void,
): TableDataProps => {
  const table: TableDataProps = {
    id: id.toString(),
    name: "",
    dbName: "",
    primaryKey: "",
    description: "",
    timestamps: true,
    engine: "InnoDB", // for MySQL only
    columns: [],
    joins: [],
    onChange,
    onDelete,
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
