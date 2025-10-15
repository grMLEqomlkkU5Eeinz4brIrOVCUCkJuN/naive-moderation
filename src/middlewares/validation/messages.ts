import * as z from "zod";
import "dotenv/config";

// Schema for single message validation
export const messageSchema = z.object({
	message: z.string().min(1).max(process.env.maxStringLength ? parseInt(process.env.maxStringLength) : 1000),
});

// Schema for batch message validation
export const messageBatchSchema = z.object({
	messages: z
		.array(z.union([z.string(), messageSchema]))
		.min(process.env.minBatchSize ? parseInt(process.env.minBatchSize) : 1)
		.max(process.env.maxBatchSize ? parseInt(process.env.maxBatchSize) : 100), // Limit batch size
});

// Type inference for TypeScript
export type MessageInput = z.infer<typeof messageSchema>;
export type MessageBatchInput = {
    messages: (string | MessageInput)[];
};