import fs from "node:fs";
import { join } from "node:path";
import { Program } from "../src/schemas/jexl";

async function main() {
  // Generate the JSON schema
  const jexlVersion = Program.properties.jexl_version.const;

  // Write the schema to a file
  const schemaPath = join("spec", `jexl-${jexlVersion}.json`);
  fs.writeFileSync(schemaPath, JSON.stringify(Program, null, 2));

  console.log(`✓ JSON Schema written to ${schemaPath}`);
}

// Execute the main function
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
