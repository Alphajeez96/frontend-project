import {useEffect, useRef, useState, useLayoutEffect, type RefObject} from "react";

import {
  m,
  animate,
  domAnimation,
  LazyMotion,
  useMotionValue,
} from "motion/react";

import type {Track} from ".";
import {ScanText} from "lucide-react";
import styles from "./Editor.module.css";

type Props = {
  track: Track | null;
  selectedId: string | null;
  audioRef: RefObject<HTMLAudioElement>;
};

export const LyricPreview = ({track, selectedId, audioRef}: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const positionedRef = useRef(false);
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
  useLayoutEffect(() => {
    const element = trackRef.current;
    if (!element || !current) return;

    let animation: ReturnType<typeof animate> | undefined;
    const centerLine = () => {
      const row = element.children[currentIndex] as HTMLElement | undefined;
      if (!row) return;
      const target = -(row.offsetTop + row.offsetHeight / 2);
      animation?.stop();
      if (!positionedRef.current) {
        offset.set(target);
        positionedRef.current = true;
      } else {
        animation = animate(offset, target, {
          duration: 0.3,
          ease: [0.455, 0.03, 0.515, 0.955],
        });
      }
    };

    centerLine();
    const observer = new ResizeObserver(centerLine);
    observer.observe(element);
    return () => {
      animation?.stop();
      observer.disconnect();
    };
  }, [currentIndex, current, lines, offset]);

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

      <LazyMotion features={domAnimation}>
        <div
          className={`relative flex flex-col justify-center flex-1 min-h-0 overflow-hidden text-center ${styles.previewLines}`}
        >
          {current ? (
            <m.div
              ref={trackRef}
              className="absolute inset-x-0 top-1/2 flex flex-col gap-6"
              style={{y: offset}}
            >
              {lines?.map((line, index) => (
                <m.p
                  key={line.id}
                  className={styles.previewCurrent}
                  data-active={
                    index === currentIndex &&
                    (!hasTimings || playback.activeIndex >= 0)
                  }
                  aria-current={index === currentIndex ? "true" : undefined}
                  animate={{
                    opacity: index === currentIndex ? 1 : 0.5,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.455, 0.03, 0.515, 0.955],
                  }}
                >
                  {line.text}
                </m.p>
              ))}
            </m.div>
          ) : (
            <p className="text-muted text-[18px]">Lyrics will appear here</p>
          )}
        </div>
      </LazyMotion>
    </section>
  );
};
