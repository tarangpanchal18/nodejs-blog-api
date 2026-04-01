const { buildModerationUserPrompt } = require('./prompts/moderationPrompt');
const {
  parseModerationResponse,
  prepareModerationPayload,
  technicalFailure,
} = require('./utils/moderationResponse');

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '';
}

async function fetchJson(url, options) {
  const fetchFn =
    typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : async (...args) => {
          const mod = await import('node-fetch');
          return mod.default(...args);
        };

  return fetchFn(url, options);
}

async function classifyContent({ title, description, content }) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return technicalFailure('BLG_GEMINI_KEY');
  }

  const payload = prepareModerationPayload({ title, description, content });
  const model = process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-1.5-flash';
  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 20000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 180,
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildModerationUserPrompt(payload) }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ Gemini moderation HTTP ${response.status}:`, body);
      return technicalFailure('BLG_GEMINI_HTTP');
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join(' ') || '';

    return parseModerationResponse(text, 'BLG_GEMINI_PARSE');
  } catch (error) {
    console.error('❌ Gemini moderation error:', error?.message || error);
    return technicalFailure('BLG_GEMINI_CALL');
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  provider: 'gemini',
  classifyContent,
  isConfigured: () => Boolean(getGeminiKey()),
};
