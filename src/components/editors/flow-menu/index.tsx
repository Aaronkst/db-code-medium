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
import {
  DatabaseIcon,
  DatabaseZapIcon,
  DownloadIcon,
  PlusIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "../../ui/button";
import { ImageExportDialog } from "./image-export";
import { useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "@/lib/context/editor-context";
import { toast } from "sonner";
import { importJson } from "@/lib/flow-editors/helpers";

export function FlowMenu() {
  const [exportImage, setExportImage] = useState<boolean>(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const { nodes, edges, setNodes, setEdges, appendNode, editNode, removeNode } =
    useContext(EditorContext);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    toast.success("Successfully exported! 🎉");
  };

  useEffect(() => {
    if (!files || !files.length) return;
    const file = files[0];
    if (file.type === "application/json") {
      toast.promise(
        importJson(file, (nodes, edges) => {
          setNodes(
            nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                onDelete: removeNode,
                onChange: editNode,
              },
            })),
          );
          setEdges(edges);
        }),
        {
          loading: "Processing...",
          success: () => "Successfully imported! 🎉",
          error: "Wrong JSON file format ☹️",
        },
      );
    }
    // cleanup files
    return () => setFiles(null);
  }, [files]);

  return (
    <div className="flex justify-between">
      <Menubar className="rounded-none border-none border-b">
        <MenubarMenu>
          <MenubarTrigger asChild>
            <Button className="cursor-pointer" variant="ghost" size="sm">
              File
            </Button>
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled className="cursor-pointer gap-2">
              <UsersIcon size="0.8rem" />
              <span>Collaborators</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger className="cursor-pointer gap-2">
                <DownloadIcon size="0.8rem" />
                <span>Import</span>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  className="cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  JSON
                </MenubarItem>
                {/* <MenubarItem className="cursor-pointer">Mermaid</MenubarItem> */}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger className="cursor-pointer gap-2">
                <UploadIcon size="0.8rem" />
                <span>Export</span>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem className="cursor-pointer" onClick={exportJson}>
                  JSON
                </MenubarItem>
                <MenubarItem
                  className="cursor-pointer"
                  onClick={() => setExportImage(true)}
                >
                  Image
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <Button
          onClick={appendNode}
          variant="ghost"
          size="sm"
          className="rounded-sm"
        >
          <span>New Entity</span>
          <PlusIcon size="0.8rem" />
        </Button>
      </Menubar>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/json"
        onChange={(e) => setFiles(e.target.files)}
      />
      <ImageExportDialog
        open={exportImage}
        onClose={() => setExportImage(false)}
      />
    </div>
  );
}
