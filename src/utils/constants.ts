import type { TableDataProps } from "@/components/react-flow-custom/table-node";
import type { ColumnProps, TableProps } from "./types/database-types";
import { nanoid } from "nanoid";

export const getDefaultColumn = (
  id: string,
  tableId: string,
  columnProps?: Partial<ColumnProps>,
): ColumnProps => ({
  id,
  table: tableId,
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
  id: string,
  onChange: (id: string, data: Partial<TableProps>) => void,
  onDelete: (id: string) => void,
): TableDataProps => {
  const colId = nanoid();
  return {
    id,
    name: "",
    dbName: "",
    primaryKey: colId,
    description: "",
    timestamps: true,
    engine: "InnoDB", // for MySQL only
    columns: [
      getDefaultColumn(colId, id, {
        name: "id",
        dbName: "id",
        primaryKey: true,
      }),
    ],
    joins: [],
    onChange,
    onDelete,
  };
};

// Monaco imports
export const TYPEORM_IMPORTS = `import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm"`;
