"use client";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import type { TableProps } from "@/lib/types/database-types";
import { DatabaseIcon, DatabaseZapIcon } from "lucide-react";
import { Button } from "../../ui/button";
import { ImageExportDialog } from "./image-export";
import { useContext, useState } from "react";
import { EditorContext } from "@/lib/context/editor-context";

type FlowMenuProps = {
  methods: {
    removeNode: (id: string) => void;
    editNode: (id: string, data: Partial<TableProps>) => void;
    appendNode: () => void;
  };
};

export function FlowMenu({
  methods: { removeNode, editNode, appendNode },
}: FlowMenuProps) {
  const [exportImage, setExportImage] = useState<boolean>(false);
  const { nodes, edges } = useContext(EditorContext);

  const exportJson = () => {
    const payload = JSON.stringify({
      nodes,
      edges,
    });

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute(
      "download",
      `enterpretor_diagram_${new Date().getTime()}.json`,
    );
    a.setAttribute("href", url);
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Menubar className="rounded-none border-none border-b">
        {/* <Button onClick={appendNode} variant="ghost" size="sm">
          Add Entity
        </Button> */}
        <MenubarMenu>
          <MenubarTrigger className="cursor-pointer">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={appendNode} className="cursor-pointer">
              Add Entity
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Import</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>JSON</MenubarItem>
                <MenubarItem>Mermaid</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger>Export</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={exportJson}>JSON</MenubarItem>
                <MenubarItem onClick={() => setExportImage(true)}>
                  Image
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <ImageExportDialog
        open={exportImage}
        onClose={() => setExportImage(false)}
      />
    </>
  );
}
