"use client";

import type { ColumnProps } from "@/utils/types/database-types";
import { createContext, useEffect, useState } from "react";

const EditorContext = createContext<{
  editingColumn: ColumnProps | null;
  setEditingColumn: (column: ColumnProps | null) => void;
}>({
  editingColumn: null,
  setEditingColumn: () => {},
});

const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [editingColumn, _setEditingColumn] = useState<ColumnProps | null>(null);

  function setEditingColumn(column: ColumnProps | null) {
    _setEditingColumn(column);
  }

  return (
    <EditorContext.Provider
      value={{
        // categories
        editingColumn,
        setEditingColumn,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export { EditorContext, EditorProvider };
