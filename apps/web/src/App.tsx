import {useEffect, useState} from "react";

import {api, ApiError} from "./api";
import {readAudioFile} from "./utils";
import type {Track} from "./components/editor";
import {EditorLayout} from "./components/editor/EditorLayout";

export default function App() {
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioUrl = track?.audio_url;

  useEffect(() => {
    if (!audioUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (audioUrl) return;

    let live = true;

    api<Track>("/api/v1/track")
      .then((sample) => {
        if (live) setTrack((current) => current ?? sample);
      })
      .catch((error: unknown) => {
        if (!live) return;

        setError(
          error instanceof ApiError
            ? `${error.message} ${JSON.stringify(error.body)}`
            : String(error),
        );
      });

    return () => {
      live = false;
    };
  }, [audioUrl]);

  const handleLoadAudio = async (file: File) => {
    const next = await readAudioFile(file);
    if (!next) return;

    setError(null);
    setTrack(next);
  };

  return (
    <EditorLayout
      key={audioUrl ?? "empty"}
      track={track}
      error={error}
      onLoadAudio={handleLoadAudio}
    />
  );
}
