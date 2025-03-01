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
import { useState } from "react";

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
                <MenubarItem>JSON</MenubarItem>
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
