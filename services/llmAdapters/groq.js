const OpenAI = require('openai');
const { buildModerationMessages } = require('./prompts/moderationPrompt');
const {
  parseModerationResponse,
  prepareModerationPayload,
  technicalFailure,
} = require('./utils/moderationResponse');

let groqClient;

function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.LLM_API_KEY || '';
}

function getGroqClient() {
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: getGroqKey(),
      baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      timeout: Number(process.env.LLM_TIMEOUT_MS || 20000),
      maxRetries: Number(process.env.LLM_MAX_RETRIES || 1),
    });
  }
  return groqClient;
}

async function classifyContent({ title, description, content }) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    return technicalFailure('BLG_GROQ_KEY');
  }

  const payload = prepareModerationPayload({ title, description, content });
  const model = process.env.GROQ_MODEL || process.env.LLM_MODEL || 'llama-3.1-8b-instant';

  try {
    const response = await getGroqClient().chat.completions.create({
      model,
      messages: buildModerationMessages(payload),
      temperature: 0,
      max_tokens: 180,
    });

    const text = response?.choices?.[0]?.message?.content || '';
    return parseModerationResponse(text, 'BLG_GROQ_PARSE');
  } catch (error) {
    console.error('❌ Groq moderation error:', error?.message || error);
    return technicalFailure('BLG_GROQ_CALL');
  }
}

module.exports = {
  provider: 'groq',
  classifyContent,
  isConfigured: () => Boolean(getGroqKey()),
};
