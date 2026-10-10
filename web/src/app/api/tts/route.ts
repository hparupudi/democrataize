import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { elevenLabsVoiceId, requireElevenLabsKey } from "@/lib/env";

export const runtime = "nodejs";

async function streamToBuffer(
  stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
): Promise<Buffer> {
  if (Symbol.asyncIterator in Object(stream)) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    const apiKey = requireElevenLabsKey();
    const voiceId = elevenLabsVoiceId();
    const body = await request.json();
    const text = String(body?.text || "").trim();
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const client = new ElevenLabsClient({ apiKey });
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    const buffer = await streamToBuffer(
      audioStream as ReadableStream<Uint8Array>,
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
