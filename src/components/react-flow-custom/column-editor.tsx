import { Button } from "@/components/shared/buttons/button";
import Modal from "@/components/shared/modals";
import type { ColumnProps } from "@/utils/types/database-types";
import { FormEvent, useCallback, useState } from "react";

type JoinEditorModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (columnId: string, settings: ColumnProps) => void;
  columnId: string;
};

export function JoinEditorModal({
  isOpen,
  onClose,
  onSubmit,
  columnId,
}: JoinEditorModalProps) {
  const [settings, setSettings] = useState<ColumnProps>();

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // TODO: Build column settings here.
      // onSubmit(columnId, settings);
    },
    [columnId, onSubmit, settings],
  );

  return (
    <Modal isOpen={isOpen && !!columnId} onClose={onClose} title="Edit Column">
      <form onClick={handleFormSubmit} className="flex flex-col gap-2">
        <span>// TODO: Build Settings Form here</span>
        <Button type="submit" label="Save" />
      </form>
    </Modal>
  );
}
