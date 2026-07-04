export interface ApiKeysValidationResult {
  geminiMissing: boolean;
  openaiMissing: boolean;
  anthropicMissing: boolean;
  isValid: boolean;
}

/**
 * Validates whether mandatory API keys are configured either locally in the browser
 * or in the server-side environment variables.
 */
export async function validateApiKeys(): Promise<ApiKeysValidationResult> {
  const localGemini = localStorage.getItem('kostromai44_gemini_api_key');
  const localOpenai = localStorage.getItem('kostromai44_openai_api_key');
  const localAnthropic = localStorage.getItem('kostromai44_anthropic_api_key');

  let geminiConfigured = false;
  let openaiConfigured = false;
  let anthropicConfigured = false;

  try {
    const res = await fetch('/api/config/status');
    if (res.ok) {
      const data = await res.json();
      geminiConfigured = data.geminiConfigured;
      openaiConfigured = data.openaiConfigured;
      anthropicConfigured = data.anthropicConfigured;
    }
  } catch (err) {
    console.warn("Failed to fetch server config status:", err);
  }

  const geminiMissing = !localGemini && !geminiConfigured;
  const openaiMissing = !localOpenai && !openaiConfigured;
  const anthropicMissing = !localAnthropic && !anthropicConfigured;

  return {
    geminiMissing,
    openaiMissing,
    anthropicMissing,
    isValid: !geminiMissing // GEMINI_API_KEY is the primary mandatory key
  };
}
