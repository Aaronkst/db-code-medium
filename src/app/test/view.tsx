"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const App: React.FC = () => {
  const router = useRouter();
  const [result, setResult] = useState<number | null>(null);
  const [wasmModule, setWasmModule] = useState<typeof import("@/pkg/src_rs")>();

  useEffect(() => {
    console.log(window.location.hostname);
    if (window.location.hostname !== "localhost") router.replace("/");

    const loadWasm = async () => {
      try {
        console.log("⏳ Loading WASM module...");
        const wasm = await import("@/pkg/src_rs");
        console.log("✅ WASM module loaded:", wasm);

        const wasmPath = "wasm/src_rs_bg.wasm"; // Adjust as needed
        await wasm.default(wasmPath);

        setWasmModule(wasm);
      } catch (e) {
        console.log("⚠️ wasm error:", e);
      }
    };
    loadWasm();
  }, []);

  const getSum = () => {
    if (!wasmModule) return;
    setResult(wasmModule.add_numbers(10, 15));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1>Rust + WebAssembly in React</h1>
      <p>Result from Wasm: {result === null ? "Loading..." : result}</p>
      <button
        onClick={getSum}
        disabled={!wasmModule}
        className="bg-green-600 text-white"
      >
        Load WASM
      </button>
    </div>
  );
};

export default App;
