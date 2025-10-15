import { Request, Response, NextFunction } from "express";
import z, { ZodError } from "zod";

/**
 * Generic validation middleware factory that creates middleware for any Zod schema
 * @param schema - The Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'query', 'params')
 */
export const validate = (schema: z.ZodType, target: "body" | "query" | "params" = "body") => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const data = req[target];
			const validatedData = schema.parse(data);
			
			// Replace the original data with validated data
			req[target] = validatedData;
			
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				// Format Zod validation errors into a user-friendly format
				const formattedErrors = error.issues.map((err: any) => ({
					field: err.path.join("."),
					message: err.message,
					code: err.code
				}));

				return res.status(400).json({
					error: "Validation failed",
					details: formattedErrors
				});
			}
			
			// Handle other errors
			console.error("Validation middleware error:", error);
			return res.status(500).json({
				error: "Internal server error during validation"
			});
		}
	};
};

/**
 * Specific validation middleware for message validation
 */
export const validateMessage = validate;

/**
 * Specific validation middleware for message batch validation
 */
export const validateMessageBatch = validate;
