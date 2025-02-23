import { TableProps } from "@/lib/types/database-types";
import { parse } from "@typescript-eslint/parser";
import { Node } from "@xyflow/react";

// TODO: return error if the parsed program contains errors.
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
      // You can add more options here as needed
    });

    console.log("parsed code:", JSON.stringify(parsed));

    return new Response(
      JSON.stringify({
        data: parsed,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response("Cannot validate", { status: 406 });
  }
}
