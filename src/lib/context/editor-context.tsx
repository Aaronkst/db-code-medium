"use client";

import type { ColumnProps, JoinProps } from "@/utils/types/database-types";
import { createContext, useEffect, useState } from "react";

const EditorContext = createContext<{
  editingColumn: ColumnProps | null;
  setEditingColumn: (column: ColumnProps | null) => void;
  editingJoin: JoinProps | null;
  setEditingJoin: (column: JoinProps | null) => void;
}>({
  editingColumn: null,
  setEditingColumn: () => {},
  editingJoin: null,
  setEditingJoin: () => {},
});

const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [editingColumn, _setEditingColumn] = useState<ColumnProps | null>(null);
  const [editingJoin, _setEditingJoin] = useState<JoinProps | null>(null);

  function setEditingColumn(column: ColumnProps | null) {
    _setEditingColumn(column);
  }

  function setEditingJoin(join: JoinProps | null) {
    _setEditingJoin(join);
  }

  return (
    <EditorContext.Provider
      value={{
        // column
        editingColumn,
        setEditingColumn,
        // join
        editingJoin,
        setEditingJoin,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export { EditorContext, EditorProvider };
