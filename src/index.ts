import express from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import "dotenv/config";
import routes from "./routes/routeHandler.js";
import moderation from "./models/moderation.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

const corsOptions: CorsOptions = {
	origin: /.*/,
	credentials: true,
};

// express web server configuration
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: process.env.REQUEST_LIMIT || "10mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || "10mb" }));

// health check route
app.get("/health", (req, res) => {
	res.status(200).send("OK");
});

// API routes
app.use("/api", routes);

// 404 error handler (Express 5: avoid "*" path which is invalid in path-to-regexp v6)
app.use((req, res) => {
	res.status(404).json({ error: "Route not found" });
});

// global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error("Global error handler:", err);
	res.status(500).json({ error: "Internal server error" });
});

const startServer = async (): Promise<void> => {
	try {
		// Initialize moderation trie from slur list before starting server
		const bufferSizeBytes = process.env.SLUR_FILE_BUFFER_BYTES ? parseInt(process.env.SLUR_FILE_BUFFER_BYTES) : 16 *1024 * 1024;
		await moderation.initFromFile(bufferSizeBytes);
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
			console.log("API endpoints available at:");
			console.log("  POST /api/words/validate - Single message validation");
			console.log("  POST /api/words/validate-batch - Batch message validation");
		});
	} catch (error) {
		console.error("Error starting server:", error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received. Shutting down gracefully...");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("SIGINT received. Shutting down gracefully...");
	process.exit(0);
});

// Start the server
startServer();