import express from "express";
import wordRoutes from "./routes/word.js";

const router = express.Router();

// Mount word validation routes
router.use("/words", wordRoutes);

export default router;
