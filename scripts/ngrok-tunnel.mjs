import { spawn } from "node:child_process";

const port = process.argv[2] ?? process.env.PORT ?? "3000";
const child = spawn("ngrok", ["http", port], {
  stdio: "inherit"
});

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error(
      "ngrok was not found. Install ngrok first, then rerun: npm run tunnel:ngrok"
    );
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 0);
});
