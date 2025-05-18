import { type Static, Type } from "@sinclair/typebox";
import { JsonSchemaType, validateJsonSchema } from "./json-schema-validator";

export const JexlTypes = Type.Module({
  Literal: Type.Union([
    Type.String(),
    Type.Number(),
    Type.Boolean(),
    Type.Null(),
  ]),

  VarReference: Type.Object({
    ref: Type.String(),
  }),

  LetBinding: Type.Object({
    let: Type.Object({
      name: Type.String(),
      value: Type.Ref("Expression"),
    }),
  }),

  DoDef: Type.Object({
    do: Type.Array(Type.Ref("Expression")),
  }),

  IfDef: Type.Object({
    if: Type.Object({
      condition: Type.Ref("Expression"),
      true: Type.Optional(Type.Ref("Expression")),
      false: Type.Optional(Type.Ref("Expression")),
    }),
  }),

  Param: Type.Union([
    Type.String(),
    Type.Record(Type.String(), Type.String(), {
      minProperties: 1,
      maxProperties: 1,
    }),
  ]),

  Import: Type.Object({
    import: Type.Object({
      module: Type.String(),
      symbols: Type.Array(Type.String()),
    }),
  }),

  FunctionDef: Type.Object({
    function: Type.Object({
      name: Type.String(),
      params: Type.Array(Type.Ref("Param")),
      body: Type.Ref("Expression"),
    }),
  }),

  MacroDef: Type.Object({
    macro: Type.Object({
      name: Type.String(),
      params: Type.Array(Type.Ref("Param")),
      body: Type.Ref("Expression"),
    }),
  }),

  FunctionCall: Type.Record(
    Type.String(),
    Type.Array(Type.Ref("Expression")),
    { minProperties: 1, maxProperties: 1 },
  ),

  SpecialForm: Type.Record(
    Type.String(),
    Type.Record(Type.String(), Type.Any()),
  ),

  Expression: Type.Union([
    Type.Ref("Literal"),
    Type.Ref("VarReference"),
    Type.Ref("LetBinding"),
    Type.Ref("DoDef"),
    Type.Ref("IfDef"),
    Type.Ref("FunctionDef"),
    Type.Ref("MacroDef"),
    Type.Ref("Import"),
    Type.Ref("FunctionCall"),
    Type.Ref("SpecialForm"),
  ]),

  Module: Type.Object({
    types: Type.Optional(Type.Record(Type.String(), JsonSchemaType)),
    exports: Type.Array(Type.Ref("Expression")),
  }),

  Program: Type.Object({
    jexl_version: Type.Literal("v0.1"),
    name: Type.String(),
    types: Type.Optional(Type.Record(Type.String(), JsonSchemaType)),
    modules: Type.Optional(Type.Record(Type.String(), Type.Ref("Module"))),
    program: Type.Array(Type.Ref("Expression")),
  }),
});

export const Program = JexlTypes.Import("Program");
export type Program = Static<typeof Program>;

export const Expression = JexlTypes.Import("Expression");
export type Expression = Static<typeof Expression>;

export const Macro = JexlTypes.Import("MacroDef");
export type Macro = Static<typeof Macro>;

export const Param = JexlTypes.Import("Param");
export type Param = Static<typeof Param>;

// Helper function to validate types in a program
export function validateProgramTypes(program: unknown): boolean {
  if (typeof program !== "object" || program === null) return false;

  // Check types at the program level
  if ("types" in program && program.types) {
    const types = program.types as Record<string, unknown>;
    for (const schema of Object.values(types)) {
      if (!validateJsonSchema(schema)) return false;
    }
  }

  // Check types in modules
  if ("modules" in program && program.modules) {
    const modules = program.modules as Record<
      string,
      { types?: Record<string, unknown> }
    >;
    for (const module of Object.values(modules)) {
      if (module.types) {
        for (const schema of Object.values(module.types)) {
          if (!validateJsonSchema(schema)) return false;
        }
      }
    }
  }

  return true;
}
