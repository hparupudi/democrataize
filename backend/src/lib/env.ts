const PLACEHOLDERS = new Set([
  "",
  "changeme",
  "placeholder",
  "YOUR_GEMINI_API_KEY",
  "YOUR_TIGERDATA_DATABASE_URL",
  "DEMO_KEY",
]);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || PLACEHOLDERS.has(value)) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy backend/.env.local.example to backend/.env.local and provide a real value. ` +
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

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}
