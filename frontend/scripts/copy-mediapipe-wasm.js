// Restores frontend/public/mediapipe/wasm/ from the @mediapipe/tasks-vision
// package (node_modules), which ships the identical files. Kept out of git
// (see .gitignore) since they're install-time-derivable, not source — this
// runs on every `npm install` so `next dev`/`next build` always finds them
// under /mediapipe/wasm (useProctoring.ts serves them from that public path).
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "node_modules", "@mediapipe", "tasks-vision", "wasm");
const DEST = path.join(__dirname, "..", "public", "mediapipe", "wasm");

if (!fs.existsSync(SRC)) {
  console.warn(`[copy-mediapipe-wasm] Source not found at ${SRC} — skipping (is @mediapipe/tasks-vision installed?)`);
  process.exit(0);
}

fs.mkdirSync(DEST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".wasm") || f.endsWith(".js"));
for (const f of files) {
  fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
}

console.log(`[copy-mediapipe-wasm] Copied ${files.length} files to public/mediapipe/wasm`);
