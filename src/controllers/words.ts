import { Request, Response } from "express";
import moderation from "../models/moderation.js";
import { MessageInput, MessageBatchInput } from "../middlewares/validation/messages.js";

// Controller for single message validation
export const getIsMessageVulgar = async (req: Request, res: Response) => {
	try {
		const { message }: MessageInput = req.body;
		const result = await moderation.isStringVulgar(message);
		
		// Check if result is an Error (initialization not ready)
		if (result instanceof Error) {
			if (result.message.includes("not ready")) {
				return res.status(503).json({ 
					error: "Service temporarily unavailable", 
					message: "Moderation system is still initializing. Please try again in a moment." 
				});
			}
			return res.status(500).json({ error: "Internal server error" });
		}
		
		return res.status(200).json({ isVulgar: result });
	} catch (error) {
		console.error("Error checking message vulgarity:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}

// Controller for batch message validation
export const getIsMessageBatchVulgar = async (req: Request, res: Response) => {
	try {
		const { messages }: MessageBatchInput = req.body;
		const normalizedMessages = messages.map((item) =>
			typeof item === "string" ? item : item.message
		);
		
		const results = await Promise.all(
			normalizedMessages.map(async (message) => {
				const result = await moderation.isStringVulgar(message);
				// If any result is an initialization error, return it
				if (result instanceof Error && result.message.includes("not ready")) {
					throw new Error("Moderation system is still initializing");
				}
				return result;
			})
		);
		
		return res.status(200).json({ results });
	} catch (error) {
		console.error("Error checking batch message vulgarity:", error);
		
		// Check if it's an initialization error
		if (error instanceof Error && error.message.includes("still initializing")) {
			return res.status(503).json({ 
				error: "Service temporarily unavailable", 
				message: "Moderation system is still initializing. Please try again in a moment." 
			});
		}
		
		return res.status(500).json({ error: "Internal server error" });
	}
}