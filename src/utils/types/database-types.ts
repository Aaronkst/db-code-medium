import type { Edge } from "@xyflow/react";

export type TableProps = {
  id: string;
  name: string;
  dbName: string; // underscore or pascal transformation of name
  primaryKey: string; // col id
  description: string;
  timestamps: boolean;
  engine: "InnoDB" | "MyISAM"; // only for MySQL
  columns: ColumnProps[];
  joins: JoinProps[];
};

export type ColumnProps = {
  id: string;
  name: string;
  dbName: string; // underscore or pascal transformation of name
  dataType:
    | "string"
    | "number"
    | "date"
    | "json"
    | "float"
    | "uuid"
    | "objectId"; // db types
  primaryKey?: boolean;
  index: boolean;
  unique: boolean;
  nullable: boolean;
  defaultValue: string | number | boolean | null;
  length: number;
  precision: number | null;
  scale: number | null;
  collation: string;
  description: string;
  autoIncrement: boolean; // defaults false
  foreignKey: {
    id: string; // removed "xy-edge__"
    target: {
      table: string; // table id
      column: string; // column id
    };
    onDelete: "CASCADE" | "SET NULL" | "RESTRICT";
    onUpdate: "CASCADE" | "SET NULL" | "RESTRICT";
  } | null;
};

export type JoinProps = {
  edge: Edge;
  target: {
    table: string; // table id
    column: string; // column id, left join on. etc...
  };
  onDelete: "CASCADE" | "SET NULL" | "RESTRICT";
  onUpdate: "CASCADE" | "SET NULL" | "RESTRICT";
  through: string | null; // Join table for many-to-many
  type: "one-to-many" | "one-to-one" | "many-to-many";
};
