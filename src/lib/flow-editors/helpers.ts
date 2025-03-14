import type {
  ColumnProps,
  JoinProps,
  TableProps,
} from "@/lib/types/database-types";
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

export const joinTables = (
  join: JoinProps,
  node: Node<TableProps>,
  targetNode: Node<TableProps>,
) => {
  const joinTableId = nanoid();
  const joinTable = {
    ...getDefaultTable(
      joinTableId,
      join.through || node.data.name + targetNode.data.name,
    ),
  };

  const sourceCol1 = node.data.columns.find(
    (col) =>
      col.name === join.joinColumn?.referencedColumnName ||
      col.primaryKey === true,
  );

  const sourceCol2 = targetNode.data.columns.find(
    (col) =>
      col.name === join.joinColumn?.referencedColumnName ||
      col.primaryKey === true,
  );

  if (sourceCol1 && sourceCol2) {
    // main join
    const edge1: Edge<JoinProps> = {
      id: `${joinTableId}-${node.id}`,
      type: "smoothstep",
      source: joinTableId,
      target: node.id,
      markerStart: "marker-many-start",
      markerEnd: "marker-one",
      style: {
        strokeWidth: 2,
        stroke: "#FF0072",
      },
    };
    const join1: JoinProps = {
      id: edge1.id,
      target: {
        table: node.id,
        column: sourceCol1.id,
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      through: null,
      joinColumn: null,
      inverseColumn: null,
      type: "one-to-many",
    };
    edge1.data = join1;

    // inverse join
    const edge2: Edge<JoinProps> = {
      id: `${joinTableId}-${targetNode.id}`,
      type: "smoothstep",
      source: joinTableId,
      target: targetNode.id,
      markerStart: "marker-many-start",
      markerEnd: "marker-one",
      style: {
        strokeWidth: 2,
        stroke: "#FF0072",
      },
    };
    const join2: JoinProps = {
      id: edge2.id,
      target: {
        table: targetNode.id,
        column: sourceCol2.id,
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      through: null,
      joinColumn: null,
      inverseColumn: null,
      type: "one-to-many",
    };
    edge2.data = join2;

    // append foreignKeys
    const col1 = getDefaultColumn(joinTable, {
      foreignKey: join1,
    });
    const col2 = getDefaultColumn(joinTable, {
      foreignKey: join2,
    });
    joinTable.columns.push(col1, col2);

    const joinNode = {
      id: joinTableId,
      position: { x: 0, y: 0 },
      // position: getMidpoint(
      //   node.position,
      //   targetNode.position,
      // ),
      type: "table",
      data: joinTable,
    };

    return { edge1, edge2, joinNode };
  }
};
