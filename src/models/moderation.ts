import { Seshat } from "seshat-trie";
import fs from "node:fs";
import unleet from "@cityssm/unleet";
import * as diskycache from "diskycache";

class SeshatModel {
	private seshat: Seshat;
	private cache: diskycache.CacheService;
	private initStarted: boolean;
	private initCompleted: boolean;
	private initFailedCount: number;
	private latestRunFailed: boolean;

	// Configuration for optimization
	private readonly MAX_UNLEET_VARIANTS = process.env.MAX_UNLEET_VARIANTS ? parseInt(process.env.MAX_UNLEET_VARIANTS) : 5; // Reduced from 10
	private readonly MAX_NGRAM_SIZE = process.env.MAX_NGRAM_SIZE ? parseInt(process.env.MAX_NGRAM_SIZE) : 5; // Reduced from 5

	constructor() {
		this.cache = new diskycache.CacheService({
			cacheDir: "./cache",
			maxCacheAge: "7d",
			maxCacheSize: "100MB",
			maxCacheKeySize: "100KB",
			fileExtension: ".bin",
			metadataSaveDelayMs: 100,
			floatingPointPrecision: 10,
			cutoffDateRecalcIntervalMs: 60 * 60 * 1000,
			healthCheckConsistencyThreshold: 0.95,
			largeCacheWarningThresholdBytes: 400 * 1024 * 1024,
			processMaxListenersIncrement: 2
		} as any);
		this.seshat = new Seshat();
		this.initStarted = false;
		this.initCompleted = false;
		this.latestRunFailed = false;
		this.initFailedCount = 0;
	}

	async initFromArray(words: string[]): Promise<void> {
		this.initStarted = true;
		try {
			this.seshat.insertBatch(words);
			this.initCompleted = true;
			this.latestRunFailed = false;
			console.log(`Inserted ${words.length} words from array.`);
		} catch (error) {
			this.initCompleted = false;
			this.initStarted = false;
			this.initFailedCount += 1;
			this.latestRunFailed = true;
			console.error(`New failure, total count: ${this.initFailedCount}\nError inserting from array:`, error);
		}
	}

	async clearTrie(): Promise<boolean> {
		try {
			this.seshat.clear();
		} catch (error) {
			console.error("Error clearing trie:", error);
			return false;
		}
		console.log("Trie cleared successfully.");
		return true;
	}

	async initFromFile(bufferSizeBytes: number): Promise<void> {
		this.initStarted = true;
		try {
			// Use insertFromFileAsync with callback pattern
			await new Promise<void>((resolve, reject) => {
				this.seshat.insertFromFileAsync("./slurs.txt", bufferSizeBytes, (err: Error | null, count?: number) => {
					if (err) {
						reject(err);
					} else {
						this.initCompleted = true;
						this.latestRunFailed = false;
						console.log(`Inserted ${count || 0} words from file using insertFromFileAsync.`);
						resolve();
					}
				});
			});
		} catch (error) {
			this.initCompleted = false;
			this.initStarted = false;
			this.initFailedCount += 1;
			this.latestRunFailed = true;
			console.error(`New failure, total count: ${this.initFailedCount}\nError inserting from file:`, error);
			throw error;
		}
	}

	/**
	 * Normalizes a string for consistent comparison
	 */
	private normalizeString(text: string): string {
		return text.toLowerCase().trim().replace(/\s+/g, " ");
	}

	/**
	 * Deobfuscates spaced-out characters
	 * "b i t c h" -> "bitch"
	 * "hello w o r l d" -> "hello world"
	 */
	private deobfuscateSpacing(text: string): string {
		// Remove spaces between individual characters (max 2 chars per word to avoid false positives)
		// This pattern matches sequences like "a b c d" and joins them
		return text.replace(/\b(\w)(\s+\w){1,15}\b/g, (match) => {
			return match.replace(/\s+/g, "");
		});
	}

	/**
	 * Detects and reconstructs spaced-out words from arrays of single characters
	 * ["s", "l", "u", "r"] -> "slur"
	 * "hello" ["w", "o", "r", "l", "d"] -> "hello world"
	 */
	private reconstructSpacedWords(text: string): string[] {
		const variants = new Set<string>();
		
		// Split by spaces and process each token
		const tokens = text.split(/\s+/).filter(Boolean);
		const reconstructedTokens: string[] = [];
		let hasSpacedWords = false;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			
			// Check if this token is a single character and if we can form a word with subsequent single characters
			if (token.length === 1 && /[a-zA-Z]/.test(token)) {
				let spacedWord = token;
				let j = i + 1;
				
				// Look ahead for consecutive single characters
				while (j < tokens.length && tokens[j].length === 1 && /[a-zA-Z]/.test(tokens[j])) {
					spacedWord += tokens[j];
					j++;
				}
				
				// If we found a spaced word (2+ characters), add it as a variant
				if (spacedWord.length >= 2) {
					hasSpacedWords = true;
					reconstructedTokens.push(spacedWord);
					i = j - 1; // Skip the processed tokens
				} else {
					reconstructedTokens.push(token);
				}
			} else {
				reconstructedTokens.push(token);
			}
		}

		// If we found spaced words, create variants
		if (hasSpacedWords) {
			variants.add(reconstructedTokens.join(" "));
			
			// Also try without spaces between the reconstructed words
			const noSpaces = reconstructedTokens.join("");
			if (noSpaces !== reconstructedTokens.join(" ")) {
				variants.add(noSpaces);
			}
		}

		return Array.from(variants);
	}

	/**
	 * Generate text variants for checking
	 * Returns array of strings to check, avoiding duplicates
	 */
	private generateVariants(text: string): string[] {
		const variants = new Set<string>();
		
		// Original normalized
		const normalized = this.normalizeString(text);
		variants.add(normalized);
		
		// Deobfuscated version (existing functionality)
		const deobfuscated = this.deobfuscateSpacing(normalized);
		if (deobfuscated !== normalized) {
			variants.add(deobfuscated);
		}

		// Spaced-out word reconstruction (new functionality)
		const spacedVariants = this.reconstructSpacedWords(normalized);
		spacedVariants.forEach(variant => variants.add(variant));

		return Array.from(variants);
	}

	/**
	 * Check if any token or sequence of tokens matches
	 * Uses early termination for efficiency
	 */
	private checkText(text: string): boolean {
		const tokens = text.split(" ").filter(Boolean);

		// Check individual tokens first (most common case)
		for (const token of tokens) {
			if (this.seshat.search(token)) {
				if (process.env.DEBUG_PROFANITY === "true") {
					console.log(`  [MATCH] Single token: "${token}"`);
				}
				return true;
			}
		}

		// Check n-grams if configured and needed
		if (this.MAX_NGRAM_SIZE > 1) {
			const maxSize = Math.min(this.MAX_NGRAM_SIZE, tokens.length);
			for (let windowSize = 2; windowSize <= maxSize; windowSize++) {
				for (let i = 0; i <= tokens.length - windowSize; i++) {
					const ngram = tokens.slice(i, i + windowSize).join(" ");
					if (this.seshat.search(ngram)) {
						if (process.env.DEBUG_PROFANITY === "true") {
							console.log(`  [MATCH] N-gram (${windowSize}): "${ngram}"`);
						}
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Unleet individual words in a sentence and reconstruct
	 * Returns multiple sentence variants with different unleet combinations
	 */
	private generateUnleetedSentenceVariants(sentence: string): string[] {
		const words = sentence.split(" ").filter(Boolean);
		const unleetedWords: string[][] = [];

		// For each word, get its unleet variants (or keep original)
		for (const word of words) {
			// Skip unleeting very short or very long words
			if (word.length < 3 || word.length > 20) {
				unleetedWords.push([word]);
				continue;
			}

			let variants: string[];
			try {
				variants = unleet(word);
			} catch (error) {
				console.warn("Unleet failed for word, using original:", word);
				unleetedWords.push([word]);
				continue;
			}

			// Safety check
			if (variants.length > 1000) {
				console.warn(`Unleet generated ${variants.length} variants for "${word}", using original only`);
				unleetedWords.push([word]);
				continue;
			}

			// Take top variants for this word
			unleetedWords.push(variants.slice(0, this.MAX_UNLEET_VARIANTS));
		}

		// Generate sentence combinations (limit total to prevent explosion)
		// We'll use a greedy approach: try first variant of each word
		const sentenceVariants: string[] = [];
		const maxSentenceVariants = 20; // Safety limit

		// Strategy: Generate combinations intelligently
		// 1. Original sentence
		sentenceVariants.push(words.join(" "));

		// 2. All first variants (most common unleet for each word)
		const allFirstVariants = unleetedWords.map(variants => variants[0]).join(" ");
		if (allFirstVariants !== sentenceVariants[0]) {
			sentenceVariants.push(allFirstVariants);
		}

		// 3. Mix: Try unleeting each position while keeping others original
		for (let i = 0; i < words.length && sentenceVariants.length < maxSentenceVariants; i++) {
			for (let v = 0; v < unleetedWords[i].length && sentenceVariants.length < maxSentenceVariants; v++) {
				const mixed = words.map((w, idx) => idx === i ? unleetedWords[i][v] : w).join(" ");
				if (!sentenceVariants.includes(mixed)) {
					sentenceVariants.push(mixed);
				}
			}
		}

		return sentenceVariants;
	}

	/**
	 * Main checking logic with optimization layers:
	 * 1. Check original text variants (no unleet)
	 * 2. Generate smart unleet sentence variants and check those with n-grams
	 */
	private async checkAllVariants(sentence: string): Promise<boolean> {
		const debug = process.env.DEBUG_PROFANITY === "true";
		
		if (debug) {
			console.log(`\n[CHECK] Input: "${sentence}"`);
		}

		// Layer 1: Check base variants (fast path - no unleet)
		const baseVariants = this.generateVariants(sentence);
		if (debug) {
			console.log("[LAYER 1] Base variants:", baseVariants);
		}
		
		for (const variant of baseVariants) {
			if (debug) {
				console.log(`  Checking base variant: "${variant}"`);
			}
			if (this.checkText(variant)) {
				return true;
			}
		}

		// Layer 2: Generate unleeted sentence variants (word-by-word to prevent explosion)
		// Then check each variant with n-grams
		for (const baseVariant of baseVariants) {
			const unleetedSentences = this.generateUnleetedSentenceVariants(baseVariant);
			
			if (debug) {
				console.log(`[LAYER 2] Generated ${unleetedSentences.length} unleeted sentences from "${baseVariant}"`);
				unleetedSentences.forEach((s, i) => console.log(`  ${i + 1}. "${s}"`));
			}
			
			for (const unleetedSentence of unleetedSentences) {
				if (debug) {
					console.log(`  Checking unleeted: "${unleetedSentence}"`);
				}
				if (this.checkText(unleetedSentence)) {
					return true;
				}
			}
		}

		if (debug) {
			console.log("[RESULT] No match found\n");
		}

		return false;
	}

	async isStringCached(sentence: string): Promise<boolean | null | Error> {
		try {
			const cachedResult = await this.cache.get(sentence);
			if (cachedResult !== null && cachedResult !== undefined) {
				return cachedResult.toString() === "true";
			}
			return null;
		} catch (error) {
			console.error("Error accessing cache:", error);
			return new Error("Error accessing cache");
		}
	}

	async isStringVulgar(sentence: string): Promise<boolean | Error> {
		// Check if initialization is complete before processing
		if (!this.isInitCompleted()) {
			return new Error("Moderation system is not ready. Initialization not completed.");
		}

		const cacheResult = await this.isStringCached(sentence);
		if (cacheResult instanceof Error) {
			return cacheResult;
		}
		if (cacheResult !== null) {
			console.log("Cache hit for string:", sentence);
			return cacheResult;
		}

		console.log("Cache miss for string:", sentence);
		return await this.isStringInTrie(sentence);
	}

	async isStringInTrie(sentence: string): Promise<boolean | Error> {
		// Check if initialization is complete before processing
		if (!this.isInitCompleted()) {
			return new Error("Moderation system is not ready. Initialization not completed.");
		}

		try {
			const isVulgar = await this.checkAllVariants(sentence);
			await this.cache.set(sentence, isVulgar.toString());
			
			// Debug logging
			if (process.env.DEBUG_PROFANITY === "true") {
				console.log(`[DEBUG] "${sentence}" → ${isVulgar}`);
			}
			
			return isVulgar;
		} catch (error) {
			console.error("Error checking string:", error);
			return new Error("Error checking string");
		}
	}

	// Status methods
	isInitStarted(): boolean {
		return this.initStarted;
	}

	isInitCompleted(): boolean {
		return this.initCompleted;
	}

	getInitFailedCount(): number {
		return this.initFailedCount;
	}

	didLatestRunFail(): boolean {
		return this.latestRunFailed;
	}
}

// Singleton pattern
const trie = new SeshatModel();
export default trie;