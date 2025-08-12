import fs from "node:fs";
import { join } from "node:path";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Program } from "../src/schemas/jexl";

async function main() {
	// Generate the JSON schema
	const jexlVersion = "v0.1"; // Extract this from the schema definition

	// Compile the schema
	const compiledSchema = TypeCompiler.Compile(Program);

	// Create spec directory if it doesn't exist
	if (!fs.existsSync("spec")) {
		fs.mkdirSync("spec");
	}

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
