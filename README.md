# WARNING

This repository may contain examples of offensive or inappropriate language (including slurs and profanities) strictly for the purposes of testing content moderation systems, toxicity classifiers, or other machine learning models intended to detect and mitigate harmful language.

I do not condone or endorse the use of any slurs, hate speech, or offensive content.
Their presence in the dataset is solely to reflect real-world inputs that these systems may encounter and are included for testing and research purposes only.

All slurs and offensive terms have been either obfuscated (e.g., "n 1 g g 4") or sanitized where possible to reduce harm while maintaining testing integrity.

If you encounter content that you believe could be handled more responsibly or should be removed, please open an issue or contact the maintainer directly.

## Context
I was making a simple word validator and was also procrastinating and I realized that on a game server I was on, it had relatively poor moderation. Somehow it became this and I got some feedback from friends

## API Endpoints

- POST `/api/words/validate` — Single message validation
- POST `/api/words/validate-batch` — Batch message validation

## Adjustable variables (via environment variables)

These variables are read at runtime. Defaults are shown in parentheses.

- `PORT` (3001): Port the HTTP server listens on. Defined in `src/index.ts`.
- `REQUEST_LIMIT` ("10mb"): Body size limit for JSON and URL-encoded parsers. Defined in `src/index.ts`.
- `SLUR_FILE_BUFFER_BYTES` (16777216): Buffer size used when initializing the trie from `slurs.txt`. Defined in `src/index.ts`.
- `MAX_UNLEET_VARIANTS` (5): Max number of unleet variants to check per base variant. Defined in `src/models/moderation.ts`.
- `MAX_NGRAM_SIZE` (3): Max n-gram size used when scanning tokens. Defined in `src/models/moderation.ts`.
- `maxStringLength` (1000): Maximum length for a single `message`. Defined in `src/middlewares/validation/messages.ts`.
- `minBatchSize` (1): Minimum number of items allowed in `messages` for batch validation. Defined in `src/middlewares/validation/messages.ts`.
- `maxBatchSize` (100): Maximum number of items allowed in `messages` for batch validation. Defined in `src/middlewares/validation/messages.ts`.

Notes:
- Batch API accepts either strings or objects with a `message` field:
  - `{ "messages": ["hello", { "message": "world" }] }`

## Data file format requirement

- The `slurs.txt` file must be encoded as **UTF-8 without BOM**. Files with a BOM or other encodings may cause incorrect parsing or unexpected characters in the trie and will not be accepted.
- The file should contain one term per line. Blank lines are ignored.

## Moderation strategy and best practices

- Numbers in phrases should be spelled out in `slurs.txt`:
  - Example: "2 girls 1 cup" often appears with digits. Tokenization plus n-grams means partial matches like "2girls1" may be picked up, while "two girls one cup" may not match unless present in the list. To be robust, include the phrase with words: "two girls one cup".
- Small-length leetspeak is handled automatically:
  - Example: `b1tch` is captured from `bitch`. The checker generates limited unleet variants, so you usually do not need to list short leet variations explicitly.
- Include canonical, space-normalized entries:
  - The system lowercases and trims input and collapses spaced-out characters (e.g., `b i t c h` → `bitch`). Provide clean canonical entries in `slurs.txt`.
- Multi-word phrases and n-grams:
  - Up to `MAX_NGRAM_SIZE` tokens are matched together (default 3). If you need detection across two or three words (e.g., "son of", "piece of crap"), include them as multi-word entries in `slurs.txt`. For longer phrases, increase `MAX_NGRAM_SIZE` judiciously or rely on key multi-word chunks.
- Avoid overlisting noisy variants:
  - Prefer the normalized, canonical forms. The checker covers case-insensitivity, simple spacing obfuscation, and limited unleet mapping.
- Review false positives/negatives regularly:
  - If a harmful phrase is slipping through, add the canonical version to `slurs.txt`. If benign content is flagged, consider removing or refining overly broad entries.

## Healthcheck

- GET `/health` — Returns `200 OK` if the service is up.

