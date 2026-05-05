import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const secretPatterns = [
  { name: "Google API key", regex: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "Google OAuth access token", regex: /ya29\.[0-9A-Za-z_.-]+/ },
  { name: "Private key block", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Service account private key", regex: /"private_key"\s*:\s*"/ },
  { name: "Filled Gemini API key", regex: /^GEMINI_API_KEY=AIza/m },
  { name: "Filled Google client secret", regex: /^GOOGLE_CLIENT_SECRET=.+/m },
  { name: "Filled NextAuth secret", regex: /^NEXTAUTH_SECRET=.+/m }
];

function listCandidateFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8"
  });
  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !file.includes("node_modules/"))
    .filter((file) => !file.startsWith(".next/"))
    .filter((file) => !file.startsWith("key/"));
}

const findings = [];

for (const file of listCandidateFiles()) {
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      findings.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No obvious secrets found in files Git would add.");
