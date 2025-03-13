export type JoinTypes =
  | "one-to-many"
  | "one-to-one"
  | "many-to-many"
  | "many-to-one";

export type TableProps = {
  id: string;
  name: string;
  dbName: string; // underscore or pascal transformation of name
  primaryKey: string; // col id
  description: string;
  timestamps: boolean;
  engine: "InnoDB" | "MyISAM"; // MySQL only
  columns: ColumnProps[];
};

export type ColumnProps = {
  id: string;
  table: string;
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
  primaryKey: boolean;
  index: boolean;
  unique: boolean;
  nullable: boolean;
  defaultValue: string | number | boolean | null;
  length: number;
  precision: number | null; // total number of digits.
  scale: number | null; // total number of digits after decimal points.
  collation: string | null;
  description: string;
  autoIncrement: boolean; // defaults false
  foreignKey: JoinProps | null;
  select: boolean;
  zerofill: boolean; // MySQL only
  enum: string[] | null;
  enumName: string | null;
  hstoreType: "object" | "string" | null; // Postgres only
  array: boolean; // Postgres, cockroachdb
};

export type JoinProps = {
  id: string;
  // target: where to get the foreign key from.
  target: {
    table: string; // table id
    tableName?: string;
    column: string; // column id, left join on. etc...
    columnName?: string;
  } | null;
  onDelete: "CASCADE" | "SET NULL" | "RESTRICT";
  onUpdate: "CASCADE" | "SET NULL" | "RESTRICT";
  through: string | null; // Join table for many-to-many
  // source: string | null; // Which node is referencing the current node's columns.
  joinColumn: {
    name: string;
    referencedColumnName: string;
  } | null;
  inverseColumn: {
    name: string;
    referencedColumnName: string;
  } | null; // Which column is bein referenced by the junction table in a ManyToMany join scenario
  type: JoinTypes;
};
