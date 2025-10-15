import { Request, Response } from "express";
import moderation from "../models/moderation.js";
import { MessageInput, MessageBatchInput } from "../middlewares/validation/messages.js";

// Controller for single message validation
export const getIsMessageVulgar = async (req: Request, res: Response) => {
	try {
		const { message }: MessageInput = req.body;
		const isVulgar = await moderation.isStringVulgar(message);
		return res.status(200).json({ isVulgar });
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
			normalizedMessages.map((message) => moderation.isStringVulgar(message))
		);
		return res.status(200).json({ results });
	} catch (error) {
		console.error("Error checking batch message vulgarity:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}