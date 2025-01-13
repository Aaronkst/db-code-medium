import { classNames } from "@/utils/helpers";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function Button({ label, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "flex justify-center items-center text-white bg-blue-500 hover:bg-blue-600 dark:hover:bg-neutral-800 dark:bg-neutral-700 rounded-md py-2 px-4",
        className || "",
      )}
    >
      {label}
    </button>
  );
}
