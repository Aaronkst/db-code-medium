import { classNames } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
}

export function IconButton({ icon, className, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "flex justify-center items-center bg-neutra-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 dark:bg-neutral-700 rounded-md p-2",
        className || "",
      )}
    >
      {icon}
    </button>
  );
}
