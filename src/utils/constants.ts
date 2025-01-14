import type { TableDataProps } from "@/components/react-flow-custom/table-node";
import type { ColumnProps, TableProps } from "./types/database-types";
import { nanoid } from "nanoid";

export const getDefaultColumn = (
  id: string,
  name?: string,
  dbName?: string,
): ColumnProps => ({
  id,
  name: name || "",
  dbName: dbName || name || "",
  dataType: "string",
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
    columns: [getDefaultColumn(id, "id", "id")],
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
