
// Starts the backend server as a child process so running
// `node server.js` from the repo root works even when the
// root package.json uses ESM (`type: "module"`).
import { spawn } from "child_process";

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `VayuDrishti backend running on port ${PORT}`
  );
});