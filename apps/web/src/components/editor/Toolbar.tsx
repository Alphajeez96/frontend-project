import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefObject,
  type ChangeEvent,
} from "react";

import type {Track} from ".";
import {Button} from "../ui/Button";
import {formatTime} from "../../utils";
import styles from "./Editor.module.css";
import {
  Play,
  Plus,
  Minus,
  Pause,
  Upload,
  Download,
  AudioLines,
} from "lucide-react";

export const Toolbar = ({
  track,
  onLoadAudio,
  audioRef,
  zoom,
  onZoomChange,
  waveformReady,
}: {
  track: Track | null;
  onLoadAudio: (file: File) => Promise<void>;
  audioRef: RefObject<HTMLAudioElement>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  waveformReady: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const [playbackStatus, setPlaybackStatus] = useState<
    "paused" | "starting" | "playing"
  >("paused");

  const isPlaybackActive = playbackStatus !== "paused";

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, [audioRef]);

  const handleTogglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(null);
    if (!audio.paused || playbackStatus === "starting") {
      audio.pause();
      setPlaybackStatus("paused");
      return;
    }
    setPlaybackStatus("starting");
    try {
      await audio.play();
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPlaybackError("Could not play this audio. Try again.");
      }
      setPlaybackStatus("paused");
    }
  }, [audioRef, playbackStatus]);

  const hasTrack = !!track;

  // Spacebar trigger playback
  useEffect(() => {
    const handlePlaybackKey = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !hasTrack
      )
        return;

      event.preventDefault();
      if (event.repeat) return;

      void handleTogglePlayback();
    };

    window.addEventListener("keydown", handlePlaybackKey, true);
    return () => window.removeEventListener("keydown", handlePlaybackKey, true);
  }, [handleTogglePlayback, hasTrack]);

  const handleAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setPlaybackError(null);
    try {
      await onLoadAudio(file);
    } catch (error: unknown) {
      setPlaybackError(
        error instanceof Error ? error.message : "Could not load this file.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <header
      className={`flex items-center flex-wrap gap-6 bg-surface shrink-0 ${styles.toolbarToolbar}`}
    >
      <audio
        ref={audioRef}
        src={track?.audio_url}
        preload="metadata"
        onPlaying={() => setPlaybackStatus("playing")}
        onPause={() => setPlaybackStatus("paused")}
        onEnded={() => setPlaybackStatus("paused")}
        onTimeUpdate={(event) =>
          setCurrentTime(Math.floor(event.currentTarget.currentTime))
        }
        onSeeked={(event) =>
          setCurrentTime(Math.floor(event.currentTarget.currentTime))
        }
        onError={() => {
          setPlaybackStatus("paused");
          setPlaybackError("Could not load this audio.");
        }}
      />

      <div className={`gap-5 min-w-0 ${styles.toolbarTrackGroup}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          aria-label="Audio file"
          className={styles.toolbarFileInput}
          onChange={handleAudioChange}
        />

        <Button
          disabled={isImporting}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {isImporting ? "Loading…" : "Load song"}
        </Button>

        <div className={`gap-3 min-w-0 ${styles.toolbarTrack}`}>
          <AudioLines aria-hidden="true" />
          <div>
            <h1 title={track?.title}>{track?.title ?? "-"}</h1>
            <p aria-label="Total duration">
              {track ? formatTime(track.duration_seconds) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className={`relative gap-3 ${styles.toolbarPlayback}`}>
        <Button
          size="icon"
          variant="primary"
          aria-keyshortcuts="Space"
          aria-busy={playbackStatus === "starting"}
          disabled={!track}
          className={styles.toolbarPlayButton}
          data-playing={isPlaybackActive}
          onClick={() => void handleTogglePlayback()}
          aria-label={isPlaybackActive ? "Pause" : "Play"}
        >
          {isPlaybackActive ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </Button>

        <span className={styles.toolbarTimecode}>
          {formatTime(currentTime)}
        </span>

        {playbackError ? (
          <p className={styles.toolbarError} role="alert">
            {playbackError}
          </p>
        ) : null}
      </div>

      <div className={`gap-4 ml-auto ${styles.toolbarActions}`}>
        <div
          className={`p-0.5 rounded-control bg-canvas ${styles.toolbarZoom}`}
          role="group"
          aria-label="Timeline zoom"
          title="Ctrl/⌘ + mouse wheel over the waveform or segments to zoom"
        >
          <Button
            variant="tertiary"
            size="icon"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={!waveformReady || zoom <= 1}
            onClick={() => onZoomChange(Math.max(1, zoom / 2))}
          >
            <Minus aria-hidden="true" />
          </Button>

          <Button
            variant="tertiary"
            className={styles.toolbarZoomLevel}
            aria-label="Fit timeline to song"
            aria-description={`Current zoom: ${zoom}×`}
            title="Fit the whole song"
            disabled={!waveformReady || zoom === 1}
            onClick={() => onZoomChange(1)}
          >
            {zoom}×
          </Button>

          <Button
            variant="tertiary"
            size="icon"
            aria-label="Zoom in"
            title="Zoom in around the playhead"
            disabled={!waveformReady || zoom >= 16}
            onClick={() => onZoomChange(Math.min(16, zoom * 2))}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>

        <Button disabled>
          <Download aria-hidden="true" />
          Export LRC
        </Button>
      </div>
    </header>
  );
};
