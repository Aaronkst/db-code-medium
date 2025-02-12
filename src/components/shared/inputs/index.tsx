import { classNames } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string | ReactNode;
  id: string;
}

export function Input({
  label,
  description,
  id,
  type,
  value,
  checked,
  onChange,
  className,
  ...props
}: InputProps) {
  return (
    <div className={type === "checkbox" ? "flex flex-row-reverse gap-2" : ""}>
      {label && (
        <label
          className={
            props.disabled ? "text-neutral-400 dark:text-neutral-700" : ""
          }
          htmlFor={id}
        >
          {label}
        </label>
      )}
      {description && (
        <span className="text-xs text-neutral-700 dark:text-neutral-400">
          {description}
        </span>
      )}
      <input
        {...props}
        id={id}
        type={type}
        value={value}
        checked={checked}
        onChange={onChange}
        className={classNames("dark:bg-neutral-600 p-2", className || "")}
      />
    </div>
  );
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  description?: string | ReactNode;
  id: string;
  data: {
    label: string;
    value: string;
  }[];
}

export function Select({
  label,
  description,
  id,
  value,
  onChange,
  className,
  data,
  ...props
}: SelectProps) {
  return (
    <div>
      {label && (
        <label
          className={
            props.disabled ? "text-neutral-400 dark:text-neutral-700" : ""
          }
          htmlFor={id}
        >
          {label}
        </label>
      )}
      {description && (
        <span className="text-xs text-neutral-700 dark:text-neutral-400">
          {description}
        </span>
      )}
      <select
        {...props}
        id={id}
        value={value}
        onChange={onChange}
        className={classNames("dark:bg-neutral-600 p-2", className || "")}
      >
        {data.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
