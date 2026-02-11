const openaiAdapter = require('./openai');
const groqAdapter = require('./groq');
const geminiAdapter = require('./googleGemini');

const adapterRegistry = {
  openai: openaiAdapter,
  groq: groqAdapter,
  gemini: geminiAdapter,
};

function resolveProviderName() {
  return String(process.env.LLM_PROVIDER || 'openai').trim().toLowerCase();
}

function getAdapter(providerName = resolveProviderName()) {
  return adapterRegistry[providerName] || null;
}

function listSupportedProviders() {
  return Object.keys(adapterRegistry);
}

module.exports = {
  getAdapter,
  listSupportedProviders,
  resolveProviderName,
};
