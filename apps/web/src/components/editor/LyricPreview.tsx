import {useEffect, useState, type RefObject} from "react";

import type {Track} from ".";
import {ScanText} from "lucide-react";
import styles from "./Editor.module.css";

type Props = {
  track: Track | null;
  selectedId: string | null;
  audioRef: RefObject<HTMLAudioElement>;
};

export const LyricPreview = ({track, selectedId, audioRef}: Props) => {
  const [playback, setPlayback] = useState({activeIndex: -1, contextIndex: 0});
  const lines = track?.lines;
  const hasTimings = lines?.some((line) => line.timing);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let frame = 0;

    const update = () => {
      const time = audio.currentTime;
      let index = -1;
      let preceding = -1;
      let upcoming = -1;

      lines?.forEach((line, candidate) => {
        if (!line.timing) return;

        if (
          line.timing.start <= time &&
          (preceding < 0 || line.timing.start > lines[preceding].timing!.start)
        )
          preceding = candidate;
        if (
          line.timing.start > time &&
          (upcoming < 0 || line.timing.start < lines[upcoming].timing!.start)
        )
          upcoming = candidate;
        if (
          time >= line.timing.start &&
          time < line.timing.end &&
          (index < 0 || line.timing.start > lines[index].timing!.start)
        )
          index = candidate;
      });
      const contextIndex =
        index >= 0 ? index : preceding >= 0 ? preceding : Math.max(0, upcoming);
      setPlayback((current) =>
        current.activeIndex === index && current.contextIndex === contextIndex
          ? current
          : {activeIndex: index, contextIndex},
      );
    };

    const tick = () => {
      update();
      if (!audio.paused && !audio.ended) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      tick();
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      update();
    };

    update();
    if (!audio.paused) start();
    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("seeking", update);
    audio.addEventListener("seeked", update);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("seeking", update);
      audio.removeEventListener("seeked", update);
    };
  }, [audioRef, lines]);

  const selectedIndex =
    track?.lines.findIndex((line) => line.id === selectedId) ?? -1;
  const currentIndex = hasTimings
    ? playback.contextIndex
    : Math.max(0, selectedIndex);
  const current = track?.lines[currentIndex];
  const previous = track?.lines[currentIndex - 1];
  const next = track?.lines[currentIndex + 1];

  return (
    <section
      className={`flex flex-col min-h-0 overflow-hidden bg-canvas rounded-panel ${styles.previewPreview}`}
      aria-labelledby="preview-heading"
    >
      <div
        className={`flex items-center justify-between flex-wrap gap-2.5 text-muted text-[11px] ${styles.previewHeading}`}
      >
        <h2 id="preview-heading">
          <ScanText aria-hidden="true" />
          Lyric preview
        </h2>
      </div>

      <div
        className={`flex flex-col justify-center flex-1 gap-3 min-h-0 overflow-y-auto text-center ${styles.previewLines}`}
      >
        {current ? (
          <>
            <p className={styles.previewContext} aria-hidden={!previous}>
              {previous?.text ?? "\u00a0"}
            </p>
            <p
              className={styles.previewCurrent}
              data-active={!hasTimings || playback.activeIndex >= 0}
              aria-current={
                hasTimings && playback.activeIndex >= 0 ? "true" : undefined
              }
            >
              {current.text}
            </p>
            <p className={styles.previewContext} aria-hidden={!next}>
              {next?.text ?? "\u00a0"}
            </p>
          </>
        ) : (
          <p className="text-muted text-[18px]">Lyrics will appear here</p>
        )}
      </div>
    </section>
  );
};
