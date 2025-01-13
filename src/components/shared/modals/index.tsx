import { X } from "lucide-react";
import React, { useRef, useEffect } from "react";

type ModalProps = {
  isOpen: boolean; // Controls modal visibility
  onClose?: () => void; // Callback for closing the modal
  title?: string; // Optional title for the modal
  children: React.ReactNode; // Content inside the modal
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal if click is outside the modal container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        onClose
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      {/* Modal container */}
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {onClose && (
            <button
              onClick={onClose}
              className="text-neutral-600 hover:text-neutral-800 dark:text-white dark:hover:text-neutral-200 focus:outline-none"
            >
              <X />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
