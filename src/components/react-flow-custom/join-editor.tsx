import { Button } from "@/components/shared/buttons/button";
import Modal from "@/components/shared/modals";
import type { JoinProps } from "@/utils/types/database-types";
import { FormEvent, useCallback, useState } from "react";

type BaseJoinProps = Omit<JoinProps, "edge">;

type JoinEditorModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (edgeId: string, settings: BaseJoinProps) => void;
  edgeId: string;
};

export function JoinEditorModal({
  isOpen,
  onClose,
  onSubmit,
  edgeId,
}: JoinEditorModalProps) {
  const [settings, setSettings] = useState<BaseJoinProps>({
    target: {
      table: "",
      column: "",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    through: null,
    type: "one-to-one",
  });

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      onSubmit(edgeId, settings);
    },
    [edgeId, onSubmit, settings],
  );

  return (
    <Modal isOpen={isOpen && !!edgeId} onClose={onClose} title="Join Settings">
      <form onClick={handleFormSubmit} className="flex flex-col gap-2">
        <span>// TODO: Build Settings Form here</span>
        <Button type="submit" label="Save" />
      </form>
    </Modal>
  );
}
