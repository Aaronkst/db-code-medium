"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppContext } from "@/lib/context/app-context";
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { toBlob } from "html-to-image";
import { DownloadIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";

type ImageExportDialogProps = {
  open: boolean;
  onClose: () => void;
};

// TODO: allow for custom resolutions
const imageWidth = 1024;
const imageHeight = 768;

export function ImageExportDialog({ open, onClose }: ImageExportDialogProps) {
  const { getNodes } = useReactFlow();
  const [image, setImage] = useState<string>();

  useEffect(() => {
    if (image || !open) return;
    const element = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    if (element) {
      const nodesBounds = getNodesBounds(getNodes());
      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        1,
        2,
        1,
      );

      // TODO: fix edges not showing.
      toBlob(element, {
        backgroundColor: "#ccc",
        width: imageWidth,
        height: imageHeight,
        style: {
          width: imageWidth + "px",
          height: imageHeight + "px",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      })
        .then((blob) => {
          if (blob) setImage(URL.createObjectURL(blob));
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [image, open]);

  const downloadImage = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.setAttribute("download", "reactflow.png");
    a.setAttribute("href", image);
    a.click();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // clean up image.
          setImage(undefined);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px] md:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Image Export</DialogTitle>
          {/* <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription> */}
        </DialogHeader>
        <div>{image ? <img src={image} /> : "Taking ss."}</div>
        <DialogFooter>
          <Button disabled={!image} onClick={downloadImage}>
            <DownloadIcon />
            <span>Download Image</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
