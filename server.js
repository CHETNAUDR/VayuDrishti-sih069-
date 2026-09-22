
// Starts the backend server as a child process so running
// `node server.js` from the repo root works even when the
// root package.json uses ESM (`type: "module"`).
import { spawn } from "child_process";

const child = spawn(process.execPath, ["backend/server.js"], {
	stdio: "inherit",
});

child.on("close", (code) => process.exit(code));

