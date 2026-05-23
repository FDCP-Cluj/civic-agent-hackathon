const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function getGeminiApiKey(): string | undefined {
  return GEMINI_API_KEY;
}

export function isApiKeyConfigured(): boolean {
  return typeof GEMINI_API_KEY === "string" && GEMINI_API_KEY.trim().length > 0;
}
