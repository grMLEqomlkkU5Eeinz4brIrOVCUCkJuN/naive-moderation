import { Seshat } from "seshat-trie";
import path from "node:path";

const filePath = path.resolve("./slurs.txt");
const bufferSize = 1024 * 64; // 64KB buffer

try {
	const seshat = new Seshat();
	const count = seshat.insertFromFile(filePath, bufferSize);
	console.log(`OK: Inserted ${count} words from file ${filePath}`);
	console.log(seshat.search("shit"));
	process.exit(0);
} catch (err) {
	console.error("ERROR during insertFromFile:", err);
	process.exit(1);
}
