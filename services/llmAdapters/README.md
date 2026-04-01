# LLM Adapters

This folder uses a provider-agnostic moderation interface.

## Adapter Contract
Each adapter should export:
- `provider`: provider name string (e.g. `openai`)
- `isConfigured()`: returns `true` when required credentials exist
- `classifyContent({ title, description, content })`: returns `{ isSafe, reason }`

## Prompt Management
- Shared prompts live in `prompts/moderationPrompt.js`.
- Keep provider adapters free of inline prompt strings.

## Adding New Providers (e.g. Anthropic, Azure, Vertex)
1. Add a new file in this folder, e.g. `anthropic.js`.
2. Reuse prompt and parse helpers from:
   - `prompts/moderationPrompt.js`
   - `utils/moderationResponse.js`
3. Register it in `index.js`.
4. Set `LLM_PROVIDER=<name>` in environment.

## Safety Defaults
- Conservative moderation mode.
- Input length caps before sending to model.
- Strict JSON parsing and schema validation.
- Non-throwing technical fallback response to avoid crashing moderation workers.
