"use client";

import * as React from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error";

/**
 * Real microphone recording via getUserMedia + MediaRecorder — entirely
 * client-side, nothing is uploaded anywhere. `analyser` is plain React
 * state (not a ref read during render) — a waveform consumer reads it
 * inside its own effect and polls it on a requestAnimationFrame loop at
 * 60fps, so this hook re-rendering when the analyser changes doesn't cost
 * per-frame re-renders.
 */
export function useAudioRecorder() {
  const [status, setStatus] = React.useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = React.useState(0);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null);

  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function teardownStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyser(null);
  }

  async function start() {
    setError(null);
    setAudioUrl(null);
    setSeconds(0);
    chunksRef.current = [];
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      setAnalyser(analyser);

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("stopped");
      };
      recorderRef.current = recorder;
      recorder.start();

      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was denied or is unavailable. You can upload an audio file instead.");
      setStatus("error");
      teardownStream();
    }
  }

  function stop() {
    stopTimer();
    recorderRef.current?.stop();
    teardownStream();
  }

  function reset() {
    stopTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setSeconds(0);
    setStatus("idle");
    setError(null);
  }

  React.useEffect(() => {
    return () => {
      stopTimer();
      teardownStream();
    };
  }, []);

  return {
    status,
    seconds,
    audioUrl,
    audioBlob,
    error,
    analyser,
    start,
    stop,
    reset,
  };
}
