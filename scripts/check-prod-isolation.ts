import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const files = await walk(dist);
const forbidden = ["__SCRAP_SWARM_DEV__", "DEV HARNESS", "prepare(scenario"];
const matches: string[] = [];

for (const file of files.filter((path) => /\.(js|html|css)$/.test(path))) {
  const content = await readFile(file, "utf8");
  for (const token of forbidden) {
    if (content.includes(token)) matches.push(`${file}: ${token}`);
  }
}

if (matches.length > 0) {
  console.error("Production bundle leaked developer controls:\n" + matches.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Production isolation passed across ${files.length} output files.`);
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}
