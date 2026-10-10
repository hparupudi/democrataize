const PLACEHOLDERS = new Set([
  "",
  "changeme",
  "placeholder",
  "YOUR_GEMINI_API_KEY",
  "YOUR_TIGERDATA_DATABASE_URL",
  "YOUR_ELEVENLABS_API_KEY",
  "DEMO_KEY",
  "xi-api-key",
]);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || PLACEHOLDERS.has(value)) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy web/.env.local.example to web/.env.local and provide a real value. ` +
        `This app does not run API features without credentials.`,
    );
  }
  return value;
}

export function requireGeminiKey(): string {
  return requireEnv("GEMINI_API_KEY");
}

export function requireTigerDataUrl(): string {
  return requireEnv("TIGERDATA_DATABASE_URL");
}

export function requireElevenLabsKey(): string {
  return requireEnv("ELEVENLABS_API_KEY");
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function elevenLabsVoiceId(): string {
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!voice) {
    throw new Error(
      "Missing required environment variable ELEVENLABS_VOICE_ID. " +
        "Provide a real ElevenLabs voice id.",
    );
  }
  return voice;
}
