import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const profileName = process.argv[2];
const customNgrokUrl = process.argv[3];
const targetPath = path.join(root, ".env.local");

if (!profileName || !["local", "ngrok"].includes(profileName)) {
  console.error("Usage: node scripts/use-env-profile.mjs <local|ngrok> [ngrokUrl]");
  process.exit(1);
}

const lines = readFileSync(targetPath, "utf8").split("\n");
const localUrl = "http://localhost:3000";
const ngrokUrl = customNgrokUrl || "https://a1e5-2001-f70-a140-8e00-9825-4d8-4435-4abf.ngrok-free.app";

let sawActive = false;
let sawCommented = false;

const nextLines = lines.map((line) => {
  if (line.startsWith("NEXTAUTH_URL=")) {
    sawActive = true;
    return profileName === "local" ? `NEXTAUTH_URL=${localUrl}` : `#NEXTAUTH_URL=${ngrokUrl}`;
  }
  if (line.startsWith("#NEXTAUTH_URL=")) {
    sawCommented = true;
    return profileName === "local" ? `#NEXTAUTH_URL=${ngrokUrl}` : `NEXTAUTH_URL=${ngrokUrl}`;
  }
  return line;
});

if (!sawActive) {
  nextLines.push(profileName === "local" ? `NEXTAUTH_URL=${localUrl}` : `NEXTAUTH_URL=${ngrokUrl}`);
}
if (!sawCommented) {
  nextLines.push(profileName === "local" ? `#NEXTAUTH_URL=${ngrokUrl}` : `#NEXTAUTH_URL=${localUrl}`);
}

writeFileSync(targetPath, `${nextLines.join("\n")}\n`, "utf8");

writeFileSync(path.join(root, ".env.profile.last-used"), `${profileName}\n`, "utf8");
console.log(`Switched to ${profileName} profile`);
console.log(`NEXTAUTH_URL=${profileName === "local" ? localUrl : ngrokUrl}`);
