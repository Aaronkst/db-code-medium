#!/bin/bash

# Exit on error
set -e

# Ensure Rust is installed
if ! command -v cargo &> /dev/null; then
  echo "Installing Rust and Cargo..."
  curl https://sh.rustup.rs -sSf | sh -s -- -y && . /tmp/cargo/env
fi

# Ensure wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
  echo "Installing wasm-pack..."
  cargo install wasm-pack
fi

cd src-rs
cargo build

# Build Wasm
echo "Building WebAssembly..."

if ! command -v wasm-pack &> /dev/null; then
  /tmp/cargo/bin/wasm-pack build --target web --out-dir ../src/wasm --release
else
  wasm-pack build --target web --out-dir ../src/wasm --release
fi

cd ..
