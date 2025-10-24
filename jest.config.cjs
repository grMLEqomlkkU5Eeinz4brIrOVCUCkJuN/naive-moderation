module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: [
		"**/__tests__/**/*.ts",
		"**/?(*.)+(spec|test).ts"
	],
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.d.ts",
		"!src/index.ts"
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	testTimeout: 10000,
	moduleFileExtensions: ["ts", "js", "json"],
	verbose: true,
	transformIgnorePatterns: [
		"node_modules/(?!(seshat-trie|@cityssm/unleet|diskycache)/)"
	]
};
