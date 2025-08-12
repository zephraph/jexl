import {
  type Expression,
  type Program,
  validateProgramTypes,
} from "./schemas/jexl";

// Type alias for runtime values in the JEXL interpreter
type JexlValue =
  | string
  | number
  | boolean
  | null
  | JexlValue[]
  | { [key: string]: JexlValue };

// Type for built-in functions
type BuiltinFunction = (...args: JexlValue[]) => JexlValue;

interface IEnvironment {
  parent: IEnvironment | null;
  vars: Map<string, JexlValue>;
  functions: Map<string, BuiltinFunction | UserFunction>;
  getVar(name: string): JexlValue;
  setVar(name: string, value: JexlValue): void;
  defineFunction(name: string, fn: BuiltinFunction | UserFunction): void;
  getFunction(name: string): BuiltinFunction | UserFunction;
}

interface UserFunction {
  params: Array<[string, string]>;
  body: Expression;
}

interface LetBinding {
  let: {
    name: string;
    value: Expression;
  };
}

interface DoBlock {
  do: Expression[];
}

interface IfExpression {
  if: {
    condition: Expression;
    true?: Expression;
    false?: Expression;
  };
}

interface FunctionDefinition {
  function: {
    name: string;
    params: Array<[string, string]>;
    body: Expression;
  };
}

interface VarReference {
  ref: string;
}

interface FunctionCall {
  [key: string]: Expression[];
}

class Environment implements IEnvironment {
  parent: IEnvironment | null;
  vars: Map<string, JexlValue>;
  functions: Map<string, BuiltinFunction | UserFunction>;

  constructor(parent: IEnvironment | null = null) {
    this.parent = parent;
    this.vars = new Map();
    this.functions = new Map();
  }

  getVar(name: string): JexlValue {
    if (this.vars.has(name)) {
      return this.vars.get(name);
    }
    if (this.parent) {
      return this.parent.getVar(name);
    }
    throw new Error(`Undefined variable: ${name}`);
  }

  setVar(name: string, value: JexlValue): void {
    this.vars.set(name, value);
  }

  defineFunction(name: string, fn: BuiltinFunction | UserFunction): void {
    this.functions.set(name, fn);
  }

  getFunction(name: string): BuiltinFunction | UserFunction {
    const func = this.functions.get(name);
    if (func !== undefined) {
      return func;
    }
    if (this.parent) {
      return this.parent.getFunction(name);
    }
    throw new Error(`Undefined function: ${name}`);
  }
}

// === Built-in functions ===

const builtins: Record<string, BuiltinFunction> = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => a / b,
  less: (a: number, b: number) => a < b,
  greater: (a: number, b: number) => a > b,
  equals: (a: JexlValue, b: JexlValue) => a === b,
  print: (...args: JexlValue[]) => console.log(...args),
  concat: (...args: JexlValue[]) => args.map(String).join(""),
};

// === Evaluator ===

function evaluate(expr: Expression, env: Environment): JexlValue {
  // Handle literal values
  if (
    typeof expr === "string" ||
    typeof expr === "number" ||
    typeof expr === "boolean" ||
    expr === null
  ) {
    return expr;
  }

  // Handle variable references
  if ("ref" in expr) {
    const varRef = expr as VarReference;
    return env.getVar(varRef.ref);
  }

  // Handle let bindings
  if ("let" in expr) {
    const letExpr = expr as LetBinding;
    const { name, value } = letExpr.let;
    const evaluatedValue = evaluate(value, env);
    env.setVar(name, evaluatedValue);
    return evaluatedValue;
  }

  // Handle do blocks
  if ("do" in expr) {
    const doExpr = expr as DoBlock;
    let result = null;
    for (const e of doExpr.do) {
      result = evaluate(e, env);
    }
    return result;
  }

  // Handle if expressions
  if ("if" in expr) {
    const ifExpr = expr as IfExpression;
    const { condition, true: thenExpr, false: elseExpr } = ifExpr.if;
    const condResult = evaluate(condition, env);
    return condResult
      ? thenExpr
        ? evaluate(thenExpr, env)
        : null
      : elseExpr
        ? evaluate(elseExpr, env)
        : null;
  }

  // Handle function definitions
  if ("function" in expr) {
    const funcDef = expr as FunctionDefinition;
    const { name, params, body } = funcDef.function;
    env.defineFunction(name, { params, body });
    return null;
  }

  // Handle macro definitions
  if ("macro" in expr) {
    throw new Error("Macro expansion not implemented yet");
  }

  // Handle imports
  if ("import" in expr) {
    throw new Error("Import not implemented yet");
  }

  // Handle function calls
  const functionCall = expr as FunctionCall;
  const [funcName] = Object.keys(functionCall);
  const args = functionCall[funcName];

  const func = env.getFunction(funcName);
  const evaluatedArgs = args.map((arg) => evaluate(arg, env));

  if (typeof func === "function") {
    return func(...evaluatedArgs);
  }

  if (typeof func === "object" && "params" in func && "body" in func) {
    const localEnv = new Environment(env);
    if (func.params.length !== evaluatedArgs.length) {
      throw new Error(
        `Function '${funcName}' expected ${func.params.length} args but got ${evaluatedArgs.length}`,
      );
    }
    func.params.forEach(([paramName], idx) => {
      localEnv.setVar(paramName, evaluatedArgs[idx]);
    });
    return evaluate(func.body, localEnv);
  }

  throw new Error(`Invalid expression: ${JSON.stringify(expr)}`);
}

// === Bootstrap Environment ===

function createGlobalEnv(): Environment {
  const env = new Environment();
  for (const [name, fn] of Object.entries(builtins)) {
    env.defineFunction(name, fn);
  }
  return env;
}

// === Run a full program ===

function runProgram(program: Program): void {
  if (!validateProgramTypes(program)) {
    throw new Error("Invalid program types");
  }

  const env = createGlobalEnv();

  if (!program.program) {
    throw new Error("No program to run");
  }

  for (const expr of program.program) {
    evaluate(expr, env);
  }
}

export {
  runProgram,
  evaluate,
  createGlobalEnv,
  Environment,
  type IEnvironment,
};
