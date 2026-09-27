// Saves the API's OpenAPI document so the generated types only change when we pull on purpose.
// Usage: pnpm api:pull [origin]   (defaults to the live API)
import { writeFile } from "node:fs/promises";

const origin = (
  process.argv[2] ?? "https://bss-restaurant-fastapi-e3dfa7e8.fastapicloud.dev"
).replace(/\/$/, "");
const response = await fetch(`${origin}/openapi.json`);
if (!response.ok) {
  console.error(`${origin}/openapi.json answered ${response.status}`);
  process.exit(1);
}

const spec = await response.json();
await writeFile("src/lib/api/openapi.json", `${JSON.stringify(spec, null, 2)}\n`);
console.log(`openapi ${spec.info.version}: ${Object.keys(spec.paths).length} paths from ${origin}`);
