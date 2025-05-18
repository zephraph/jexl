import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// A permissive type that just requires an object
export const JsonSchemaType = Type.Object({}, { additionalProperties: true });

// Create an AJV instance
const ajv = new Ajv({
	strict: false,
	allErrors: true,
	validateSchema: true, // This enables schema validation without requiring the meta-schema
	validateFormats: true,
});
addFormats(ajv, [
	"date-time",
	"time",
	"date",
	"email",
	"hostname",
	"ipv4",
	"ipv6",
	"uri",
	"uri-reference",
	"uuid",
	"uri-template",
	"json-pointer",
	"relative-json-pointer",
	"regex",
]);

// Validation function that ensures the object is a valid JSON Schema
export function validateJsonSchema(schema: unknown): boolean {
	try {
		// First check if it's a valid object using TypeBox
		if (!Value.Check(JsonSchemaType, schema)) {
			return false;
		}

		// Validate that it's a valid JSON Schema
		return ajv.validateSchema(schema) as boolean;
	} catch {
		return false;
	}
}
