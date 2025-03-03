import { TableProps } from "@/lib/types/database-types";
import { parse } from "@typescript-eslint/parser";
import { Node } from "@xyflow/react";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) return new Response("Bad Request", { status: 400 });

    const parsed = parse(code, {
      sourceType: "module", // Can be 'module' or 'script'
      ecmaVersion: 2020, // Specify ECMAScript version
      range: true, // Include range information
      loc: true, // Include location information
      tokens: true, // Include tokens
    });

    for (const node of parsed.body) {
      const attributes: string[] = [];
      if (node.type === "ClassDeclaration") {
        for (const attribute of node.body.body) {
          if (
            attribute.type === "PropertyDefinition" &&
            attribute.key.type === "Identifier"
          ) {
            if (attributes.includes(attribute.key.name)) {
              return new Response(
                JSON.stringify({
                  code: 406,
                  message: "Duplicate.",
                }),
                { status: 406 },
              );
            }
            attributes.push(attribute.key.name);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        code: 200,
        data: parsed,
      }),
      { status: 200 },
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({
        code: 406,
        message: "Cannot validate.",
      }),
      { status: 406 },
    );
  }
}
