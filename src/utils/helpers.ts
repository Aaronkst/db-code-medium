/**
 * Helper function to combine all class names.
 * @param classes List of class names to combine
 * @returns
 */
export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
