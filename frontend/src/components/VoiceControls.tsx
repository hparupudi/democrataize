"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";

type Props = {
  speakText: string;
  onTranscript: (text: string) => void;
};

async function playTts(text: string) {
  const resp = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Text-to-speech failed");
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  await new Promise<void>((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
  });
}

export function VoiceControls({ speakText, onTranscript }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  async function handleSpeak() {
    setError(null);
    setSpeaking(true);
    try {
      await playTts(speakText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not speak");
    } finally {
      setSpeaking(false);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "answer.webm");
          const resp = await fetch("/api/stt", { method: "POST", body: form });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Transcription failed");
          onTranscript(data.text);
          // Speak back the transcribed answer
          await playTts(`You said: ${data.text}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setBusy(false);
          setRecording(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access is required to record an answer.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
          onClick={handleSpeak}
          disabled={speaking || busy || recording}
        >
          {speaking ? <Loader2 className="spin" size={18} /> : <Volume2 size={18} />}
          Read aloud
        </button>
        {!recording ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
            onClick={startRecording}
            disabled={busy || speaking}
          >
            {busy ? <Loader2 className="spin" size={18} /> : <Mic size={18} />}
            Speak answer
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white"
            onClick={stopRecording}
          >
            <Square size={16} />
            Stop
          </button>
        )}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export { playTts };
