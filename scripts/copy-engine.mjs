import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "stockfish", "src");
const target = join(root, "public", "engines");

const files = [
    "stockfish-17.1-lite-single-03e3232.js",
    "stockfish-17.1-lite-single-03e3232.wasm"
];

mkdirSync(target, { recursive: true });

for (const file of files) {
    const from = join(source, file);
    const to = join(target, file);

    if (!existsSync(from)) {
        console.warn(`Missing engine file: ${from}`);
        process.exitCode = 1;
        continue;
    }

    if (existsSync(to) && statSync(from).size === statSync(to).size) continue;

    copyFileSync(from, to);
    console.log(`Copied ${file}`);
}
