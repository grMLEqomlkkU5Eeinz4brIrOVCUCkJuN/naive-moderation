import express from "express";
import { getIsMessageVulgar, getIsMessageBatchVulgar } from "../../controllers/words.js";
import { messageSchema, messageBatchSchema } from "../../middlewares/validation/messages.js";
import { validate } from "../../middlewares/validation/validationMiddleware.js";

const router = express.Router();

// Route for single message validation
router.post("/validate", validate(messageSchema), getIsMessageVulgar);

// Route for batch message validation
router.post("/validate-batch", validate(messageBatchSchema), getIsMessageBatchVulgar);

export default router;
