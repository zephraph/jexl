import type { Static, TImport } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { Program, JexlTypes, validateProgramTypes } from "./jexl";

type ValidationError = {
  message: string;
  path: string;
  value?: unknown;
};

function cleanErrors(errors: Iterable<unknown>): ValidationError[] {
  return [...errors].map((err) => {
    const { schema, message, path, value } = err;
    return {
      type: schema.$id,
      message,
      path,
      ...(value !== undefined && { value }),
    };
  });
}

type JexlTypeKeys = Parameters<typeof JexlTypes.Import>[0];
type JexlInput = ReturnType<typeof JexlTypes.Import> extends TImport<infer R>
  ? R
  : never;
function expectType<S extends JexlTypeKeys>(
  type: S,
  validate: JexlInput[S]["static"],
) {
  const schema = JexlTypes.Import(type);
  const errors = Value.Errors(schema, validate);
  return expect(cleanErrors(errors));
}

describe("Jexl Literals", () => {
  it("numbers are valid", () => {
    expectType("Literal", 1).toEqual([]);
  });

  it("strings are valid", () => {
    expectType("Literal", "hello").toEqual([]);
  });

  it("booleans are valid", () => {
    expectType("Literal", true).toEqual([]);
  });

  it("null is valid", () => {
    expectType("Literal", null).toEqual([]);
  });
});

describe("Jexl variable references", () => {
  it("can be represented as an object", () => {
    expectType("VarReference", { ref: "x" }).toEqual([]);
  });
});

describe("Jexl parameters", () => {
  it("can be a string", () => {
    expectType("Param", "x").toEqual([]);
  });

  it("can be a record", () => {
    expectType("Param", { x: "y" }).toEqual([]);
  });

  it("cannot be an empty record", () => {
    expectType("Param", {}).toMatchObject([
      {
        type: "Param",
      },
    ]);
  });

});

describe("Jexl function definitions", () => {
  it("can be a function", () => {
    expectType("FunctionDef", {
      function: {
        name: "x",
        params: ["x", "y"],
        body: 42,
      },
    }).toEqual([]);
  });
});

describe("Jexl function calls", () => {
  it("Can have no parameters", () => {
    expectType("FunctionCall", { x: [] }).toEqual([]);
  });

  it("can have a single parameter", () => {
    expectType("FunctionCall", { x: ["y"] }).toEqual([]);
  });

  it("can have multiple parameters", () => {
    expectType("FunctionCall", { x: ["y", "z"] }).toEqual([]);
  });

  it("can have nested expressions", () => {
    expectType("FunctionCall", { x: ["y", { ref: "z" }] }).toEqual([]);
  });
});

describe("Jexl Schema Validation", () => {
  it("validates proper function calls", () => {
    const program = {
      jexl_version: "v0.1" as const,
      name: "function_calls",
      program: [
        { "print": ["hello"] },
        { "add": [1, 2] },
        { "not": [true] },
        { "is-null": [null] },
      ],
    };

    expectType("Program", program).toEqual([]);
  });

  it("validates function definitions", () => {
    const program = {
      jexl_version: "v0.1" as const,
      name: "functions",
      program: [
        {
          function: {
            name: "add",
            params: ["x", "y"],
            body: { "add": [{ ref: "x" }, { ref: "y" }] },
          },
        },
        // Call the defined function
        { "add": [5, 3] },
      ],
    };

    expectType("Program", program).toEqual([]);
  });

  it("validates macro definitions", () => {
    const program = {
      jexl_version: "v0.1" as const,
      name: "macros",
      program: [
        {
          macro: {
            name: "unless",
            params: ["condition", "body"],
            body: {
              if: {
                condition: { ref: "condition" },
                false: { ref: "body" },
              },
            },
          },
        },
        // Use the macro
        {
          unless: {
            condition: { equals: [1, 2] },
            body: { print: "not equal" },
          },
        },
      ],
    };

    expectType("Program", program).toEqual([]);
  });

  it("validates modules and imports", () => {
    const program = {
      jexl_version: "v0.1",
      name: "modules_example",
      modules: {
        math: {
          exports: [
            {
              function: {
                name: "square",
                params: ["x"],
                body: { multiply: [{ ref: "x" }, { ref: "x" }] },
              },
            },
          ],
        },
      },
      program: [
        {
          import: {
            module: "math",
            symbols: ["square"],
          },
        },
        { square: [5] },
      ],
    };

    expect(cleanErrors(Value.Errors(Program, program))).toEqual([]);
  });

  it("validates programs with type definitions", () => {
    const program = {
      jexl_version: "v0.1",
      name: "typed_program",
      types: {
        Point: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
          required: ["x", "y"],
        },
      },
      program: [
        {
          function: {
            name: "makePoint",
            params: ["x", "y"],
            body: {
              object: [
                { tuple: ["x", { ref: "x" }] },
                { tuple: ["y", { ref: "y" }] },
              ],
            },
          },
        },
      ],
    };

    expect(cleanErrors(Value.Errors(Program, program))).toEqual([]);

    // Also validate that the JSON Schema types are valid
    expect(validateProgramTypes(program)).toBe(true);
  });

  it("rejects programs with wrong version", () => {
    const program = {
      jexl_version: "v0.2",
      name: "invalid_version",
      program: [],
    };
    const errors = cleanErrors(Value.Errors(Program, program));
    expect(errors).toEqual([
      {
        path: "/jexl_version",
        message: expect.stringContaining("v0.1"),
        value: "v0.2",
      },
    ]);
  });

  it("rejects programs with invalid function call format", () => {
    const program = {
      jexl_version: "v0.1",
      name: "invalid_function_call",
      program: [
        { call: "add", args: [1, 2] }, // Wrong format for function call
      ],
    };
    const errors = cleanErrors(Value.Errors(Program, program));
    expect(errors).toEqual([
      {
        type: "Expression",
        path: "/program/0",
        message: expect.any(String),
        value: { call: "add", args: [1, 2] },
      },
    ]);
  });

  it("rejects invalid JSON Schema types", () => {
    const programWithInvalidSchema = {
      jexl_version: "v0.1" as const,
      name: "invalid_schema",
      types: {
        Invalid: {
          type: "not_a_valid_type",
          properties: 123, // should be an object
        },
      },
      program: [],
    };

    // The program structure is valid according to TypeBox
    expectType("Program", programWithInvalidSchema).toEqual([]);

    // But the JSON Schema validation should fail
    expect(validateProgramTypes(programWithInvalidSchema)).toBe(false);
  });
});
