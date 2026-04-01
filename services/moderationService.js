const {
  getAdapter,
  listSupportedProviders,
  resolveProviderName,
} = require('./llmAdapters');
const { technicalFailure } = require('./llmAdapters/utils/moderationResponse');

/**
 * Checks blog content for safety (adult/spam/scam/gibberish).
 * This service is provider-agnostic and uses the configured adapter.
 *
 * @param {string} title
 * @param {string} description
 * @param {string} content
 * @returns {Promise<{isSafe: boolean, reason: string}>}
 */
async function checkBlogContent(title, description, content) {
  const providerName = resolveProviderName();
  const adapter = getAdapter(providerName);

  if (!adapter) {
    const supported = listSupportedProviders().join(', ');
    console.error(
      `❌ Unsupported LLM provider "${providerName}". Supported providers: ${supported}`
    );
    return technicalFailure('BLG_PROVIDER_UNSUPPORTED');
  }

  try {
    return await adapter.classifyContent({ title, description, content });
  } catch (error) {
    console.error(`❌ Moderation adapter "${providerName}" failed:`, error?.message || error);
    return technicalFailure('BLG_PROVIDER_RUNTIME');
  }
}

module.exports = {
  checkBlogContent,
};
