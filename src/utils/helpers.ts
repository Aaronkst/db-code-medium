import type { Node } from "@xyflow/react";
import type { TableProps } from "./types/database-types";

/**
 * Helper function to combine all class names.
 * @param classes List of class names to combine
 * @returns
 */
export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Extract all `@Entity()` class declarations for typeORM syntax
 * @param code
 * @returns
 */
export function extractTypeORMEntities(code: string) {
  let splitCode = code.split("@Entity()");
  const classRegex = /export\s+class\s+(\w+)/;
  const propertyRegex = /((@\w+\([^\n*]*\)\s*)+)(\w+:\s+\w+;)/g;

  splitCode = splitCode
    .filter((c) => c.trim().startsWith("export class"))
    .map((entity) => {
      // Extract class name
      const classMatch = entity.match(classRegex);
      const className = classMatch ? classMatch[1] : "Unknown"; // Default to "Unknown" if not found

      const matchedProperties = [...entity.matchAll(propertyRegex)];

      const formattedProperties = matchedProperties.map(
        (match) => `${match[1].trim().replace(/\n/g, "")} ${match[3]}`,
      );

      return `export class ${className} {\n  ${formattedProperties.join("\n  ")}\n}`;
    });

  return splitCode;
}

/**
 * Find if there are any tables with duplicate names
 * @param nodes
 * @returns
 */
export function findDuplicateTableNames(nodes: Node<TableProps>[]) {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  nodes.forEach((node) => {
    // Get the nested value from the keyPath
    const value = node.data.name;

    if (value) {
      if (seen.has(value)) {
        duplicates.push(value);
      } else {
        seen.add(value);
      }
    }
  });

  return duplicates;
}
