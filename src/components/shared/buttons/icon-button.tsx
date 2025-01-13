import { classNames } from "@/utils/helpers";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
}

export function IconButton({ icon, className, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "flex justify-center items-center hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:bg-neutral-700 rounded-md p-2",
        className || "",
      )}
    >
      {icon}
    </button>
  );
}
