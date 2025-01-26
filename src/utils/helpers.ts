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

  splitCode = splitCode
    .filter((c) => c.trim().startsWith("export class"))
    .map((c) => {
      // Use a regular expression to match the property declarations
      const regex = /(@\w+\(\s*\))\s*(\w+:\s+\w+;)/g;
      // const regex = /(@\w+\s*\(.*?\)\s*)(\w+:\s+\w+;)/g;

      // Replace the matched patterns with the desired format
      const output = c.replace(regex, "$1 $2");

      return "@Entity()" + output;
    });

  return splitCode;
  // const entityRegex = /(@Entity\(\)\s+export class \w+ \{[^]*?\})/g;
  // const entities: string[] = [];
  // let match;

  // while ((match = entityRegex.exec(code)) !== null) {
  //   entities.push(match[1].trim()); // Push the full class declaration
  // }

  // return entities;
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
