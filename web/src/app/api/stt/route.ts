import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { requireElevenLabsKey } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = requireElevenLabsKey();
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return Response.json({ error: "audio file is required" }, { status: 400 });
    }

    const client = new ElevenLabsClient({ apiKey });
    const transcription = await client.speechToText.convert({
      file,
      modelId: "scribe_v2",
      languageCode: "eng",
      tagAudioEvents: false,
      diarize: false,
    });

    const text =
      typeof transcription === "object" &&
      transcription &&
      "text" in transcription
        ? String((transcription as { text?: string }).text || "")
        : "";

    if (!text.trim()) {
      return Response.json(
        { error: "No speech detected in the recording." },
        { status: 422 },
      );
    }

    return Response.json({ text: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STT failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
