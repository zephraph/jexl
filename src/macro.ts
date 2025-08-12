// biome-disable lint/complexity/noBannedTypes
import type { Expression, Macro, Param } from "./schemas/jexl";

function getParamName(param: Param): string {
	if (typeof param === "string") {
		return param;
	}
	return Object.keys(param)[0];
}

function isExpressionArray(value: unknown): value is Expression[] {
	return Array.isArray(value);
}

function isExpressionObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function expand(
	expr: Expression,
	macros: Map<string, Macro>,
): Expression {
	// Handle primitive values and non-function-call expressions
	if (
		typeof expr === "string" ||
		typeof expr === "number" ||
		typeof expr === "boolean" ||
		expr === null
	) {
		return expr;
	}

	// Handle special forms and other expression types
	if (typeof expr === "object") {
		// Handle function calls which might be macro invocations
		const keys = Object.keys(expr);
		if (keys.length === 1) {
			const macroName = keys[0];
			const macroDef = macros.get(macroName);
			if (macroDef) {
				const args = (expr as Record<string, Expression[]>)[macroName];

				const bindings = new Map<string, Expression>();
				macroDef.macro.params.forEach((param, i) => {
					const paramName = getParamName(param as Param);
					bindings.set(paramName, args[i]);
				});

				return expand(substitute(macroDef.macro.body, bindings), macros);
			}
		}

		// Recursively expand all other expression types
		const result: Record<string, unknown> = {};

		for (const key of Object.keys(expr)) {
			const value = (expr as Record<string, unknown>)[key];
			if (isExpressionArray(value)) {
				result[key] = value.map((v) => expand(v, macros));
			} else if (isExpressionObject(value)) {
				result[key] = expand(value as Expression, macros);
			} else {
				result[key] = value;
			}
		}
		return result as Expression;
	}

	return expr;
}

export function substitute(
	expr: Expression,
	bindings: Map<string, Expression>,
): Expression {
	// Handle primitive values
	if (
		typeof expr === "string" ||
		typeof expr === "number" ||
		typeof expr === "boolean" ||
		expr === null
	) {
		return expr;
	}

	// Handle variable references
	if (typeof expr === "object" && expr !== null) {
		if (
			"ref" in expr &&
			typeof expr.ref === "string" &&
			bindings.has(expr.ref)
		) {
			const boundValue = bindings.get(expr.ref);
			if (boundValue !== undefined) {
				return boundValue;
			}
		}

		// Recursively substitute in all other expression types
		const result: Record<string, unknown> = {};

		for (const key of Object.keys(expr)) {
			const value = (expr as Record<string, unknown>)[key];
			if (isExpressionArray(value)) {
				result[key] = value.map((v) => substitute(v, bindings));
			} else if (isExpressionObject(value)) {
				result[key] = substitute(value as Expression, bindings);
			} else {
				result[key] = value;
			}
		}
		return result as Expression;
	}

	return expr;
}
