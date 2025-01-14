import { Button } from "@/components/shared/buttons/button";
import Modal from "@/components/shared/modals";
import type { ColumnProps } from "@/utils/types/database-types";
import { FormEvent, useCallback, useContext, useState } from "react";
import { IconButton } from "../shared/buttons/icon-button";
import { EditorContext } from "@/lib/context/editor-context";
import { X } from "lucide-react";

type ColumnEditorModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (id: string, payload: ColumnProps) => void;
  column: ColumnProps;
};

export function ColumnEditorModal({
  isOpen,
  onClose,
  onSubmit,
  column,
}: ColumnEditorModalProps) {
  const [settings, setSettings] = useState<ColumnProps>(column);
  const { setEditingColumn } = useContext(EditorContext);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // TODO: Build column settings here.
      // onSubmit(columnId, settings);
    },
    [column, onSubmit, settings],
  );

  return (
    <form onClick={handleFormSubmit} className="flex flex-col gap-2">
      <div className="flex flex-row-reverse p-2">
        <IconButton
          icon={<X size="0.9rem" />}
          onClick={() => setEditingColumn(null)}
        />
      </div>
      <span>// TODO: Build Settings Form here</span>
      <Button type="submit" label="Save" />
    </form>
  );
}
