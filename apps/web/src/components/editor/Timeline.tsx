import {useEffect, useRef, useState, type RefObject, type PointerEvent, type UIEvent, type KeyboardEvent} from "react";

import {
  useDroppable,
  useDragDropMonitor,
  type DragMoveEvent,
} from "@dnd-kit/react";

import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import {Layers2} from "lucide-react";

import {Button} from "../ui/Button";
import {formatTime, timingBounds} from "../../utils";
import type {LineTiming, Track} from ".";

import styles from "./Editor.module.css";

type Props = {
  selectedId: string | null;
  track: Track | null;
  onSelect: (id: string) => void;
  onTiming: (id: string, timing: LineTiming) => void;
  onPlace: (id: string, position: number) => void;
  audioRef: RefObject<HTMLAudioElement>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReady: (ready: boolean) => void;
};

export const Timeline = ({
  selectedId,
  track,
  onSelect,
  onTiming,
  onPlace,
  audioRef,
  zoom,
  onZoomChange,
  onReady,
}: Props) => {
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [waveformStatus, setWaveformStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [retry, setRetry] = useState(0);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const audioUrl = track?.audio_url;
  const zoomAnchorRef = useRef<{time: number; x: number} | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport || waveformStatus !== "ready") return;

    let wheelDelta = 0;
    let lastWheelTime = 0;

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !event.deltaY) return;

      const waveform = waveSurferRef.current;
      if (!waveform) return;

      event.preventDefault();
      if (event.timeStamp - lastWheelTime > 200) wheelDelta = 0;
      lastWheelTime = event.timeStamp;
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientHeight
            : 1);
      if (Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0;
      wheelDelta += delta;
      if (Math.abs(wheelDelta) < 40) return;

      const next = Math.max(
        1,
        Math.min(16, zoomRef.current * (wheelDelta < 0 ? 2 : 0.5)),
      );
      wheelDelta = 0;
      if (next === zoomRef.current) return;

      const x = Math.max(
        0,
        Math.min(
          viewport.clientWidth,
          event.clientX - viewport.getBoundingClientRect().left,
        ),
      );
      const width = waveform.getWrapper().scrollWidth;
      zoomAnchorRef.current = {
        time: ((waveform.getScroll() + x) / width) * waveform.getDuration(),
        x,
      };
      zoomRef.current = next;
      onZoomChange(next);
    };

    viewport.addEventListener("wheel", handleWheel, {passive: false});
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [waveformStatus, onZoomChange]);

  useEffect(() => {
    const container = waveformRef.current;
    const media = audioRef.current;
    if (!container || !media || !audioUrl) return;

    setWaveformStatus("loading");
    onReady(false);
    const colors = getComputedStyle(container);
    const waveform = WaveSurfer.create({
      container,
      media,
      url: audioUrl,
      height: "auto",
      waveColor: colors.getPropertyValue("--color-subtle").trim(),
      progressColor: colors.getPropertyValue("--color-accent").trim(),
      cursorColor: colors.getPropertyValue("--color-text").trim(),
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      dragToSeek: true,
      hideScrollbar: true,
      plugins: rulerRef.current
        ? [
            TimelinePlugin.create({
              container: rulerRef.current,
              height: 28,
              secondaryLabelOpacity: 0.75,
              formatTimeCallback: (seconds) => {
                const duration = media.duration;
                const width =
                  waveSurferRef.current?.getWrapper().scrollWidth ??
                  container.clientWidth;
                return seconds > 0 &&
                  ((duration - seconds) / duration) * width < 100
                  ? ""
                  : formatTime(seconds);
              },
              style: {
                fontSize: "11px",
                color: colors.getPropertyValue("--color-muted").trim(),
              },
            }),
          ]
        : [],
    });
    waveSurferRef.current = waveform;

    const syncTimeline = () => {
      const width = waveform.getWrapper().scrollWidth || container.clientWidth;
      const offset = waveform.getScroll();
      if (scrollContentRef.current && scrollRef.current) {
        scrollContentRef.current.style.width = `${width}px`;
        scrollContentRef.current.style.setProperty(
          "--timeline-viewport-width",
          `${scrollRef.current.clientWidth}px`,
        );
        if (Math.abs(scrollRef.current.scrollLeft - offset) > 0.5)
          scrollRef.current.scrollLeft = offset;
      }
      if (rulerRef.current) {
        rulerRef.current.style.width = `${width}px`;
        rulerRef.current.style.transform = `translateX(${-offset}px)`;
      }
    };

    const unsubscribeScroll = waveform.on("scroll", syncTimeline);
    const unsubscribeRedraw = waveform.on("redraw", syncTimeline);
    const unsubscribeReady = waveform.on("ready", () => {
      setWaveformStatus("ready");
      onReady(true);
      syncTimeline();
    });
    const unsubscribeError = waveform.on("error", (error) => {
      if (error.name !== "AbortError") {
        setWaveformStatus("error");
        onReady(false);
      }
    });
    return () => {
      waveSurferRef.current = null;
      unsubscribeScroll();
      unsubscribeRedraw();
      unsubscribeReady();
      unsubscribeError();
      waveform.destroy();
    };
  }, [audioUrl, audioRef, retry, onReady]);

  useEffect(() => {
    const waveform = waveSurferRef.current;
    const container = waveformRef.current;
    const viewport = scrollRef.current;
    if (
      !waveform ||
      !container ||
      !viewport ||
      waveformStatus !== "ready" ||
      !waveform.getDecodedData()
    )
      return;

    const applyZoom = () => {
      const width = viewport.clientWidth;
      const duration = waveform.getDuration();
      if (!width || !duration || !waveform.getDecodedData()) return;

      scrollContentRef.current?.style.setProperty(
        "--timeline-viewport-width",
        `${width}px`,
      );
      const anchor = zoomAnchorRef.current;
      zoomAnchorRef.current = null;
      waveform.zoom((width / duration) * zoom);
      const fullWidth = waveform.getWrapper().scrollWidth;
      waveform.setScroll(
        Math.max(
          0,
          ((anchor?.time ?? waveform.getCurrentTime()) / duration) * fullWidth -
            (anchor?.x ?? width / 2),
        ),
      );
    };

    applyZoom();
    let previousWidth = viewport.clientWidth;
    const observer = new ResizeObserver(() => {
      if (viewport.clientWidth === previousWidth) return;

      previousWidth = viewport.clientWidth;
      applyZoom();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [zoom, waveformStatus]);

  const dragRef = useRef<{x: number; width: number; timing: LineTiming} | null>(
    null,
  );
  const moveRef = useRef<{x: number; width: number; timing: LineTiming} | null>(
    null,
  );
  const timed = track?.lines.filter((line) => line.timing) ?? [];
  const duration = track?.duration_seconds ?? 0;

  const occupiedTimings = (id: string) =>
    timed.flatMap((line) =>
      line.id !== id && line.timing ? [line.timing] : [],
    );

  const dropTime = (clientX: number) => {
    const bounds = laneRef.current?.getBoundingClientRect();
    if (!bounds?.width || duration <= 0) return null;

    return Math.max(
      0,
      Math.min(duration, ((clientX - bounds.left) / bounds.width) * duration),
    );
  };

  const {isDropTarget} = useDroppable({
    id: "lyric-timeline",
    type: "timeline",
    accept: "lyric",
    element: scrollRef,
    disabled: duration <= 0,
  });

  const updateDropPosition = ({operation}: DragMoveEvent) => {
    setDropPosition(
      operation.target?.id === "lyric-timeline"
        ? dropTime(operation.position.current.x)
        : null,
    );
  };

  useDragDropMonitor({
    onDragMove: updateDropPosition,
    onDragOver: updateDropPosition,
    onDragEnd: (event) => {
      setDropPosition(null);
      const {source, target, position} = event.operation;
      if (event.canceled || !source || target?.id !== "lyric-timeline") return;
      const time = dropTime(position.current.x);
      if (time !== null) onPlace(String(source.id), time);
    },
  });

  const move = (id: string, timing: LineTiming, offset: number) => {
    const length = timing.end - timing.start;
    const bounds = timingBounds(timing, occupiedTimings(id), duration);
    const start = Math.max(
      bounds.start,
      Math.min(bounds.end - length, timing.start + offset),
    );
    onTiming(id, {start, end: Math.min(bounds.end, start + length)});
  };

  const trim = (
    id: string,
    timing: LineTiming,
    edge: "start" | "end",
    position: number,
  ) => {
    const minimumLength = Math.min(0.001, timing.end - timing.start);
    const bounds = timingBounds(timing, occupiedTimings(id), duration);
    const next =
      edge === "start"
        ? {
            ...timing,
            start: Math.max(
              bounds.start,
              Math.min(position, timing.end - minimumLength),
            ),
          }
        : {
            ...timing,
            end: Math.min(
              bounds.end,
              Math.max(position, timing.start + minimumLength),
            ),
          };
    onTiming(id, next);
  };

  const beginTrim = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
    timing: LineTiming,
  ) => {
    if (event.button !== 0) return;

    const width = laneRef.current?.getBoundingClientRect().width ?? 0;
    if (!width) return;

    dragRef.current = {x: event.clientX, width, timing};
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(id);
  };

  const handleTimelineScroll = (event: UIEvent<HTMLDivElement>) => {
    const waveform = waveSurferRef.current;
    const offset = event.currentTarget.scrollLeft;
    if (waveform && Math.abs(waveform.getScroll() - offset) > 0.5)
      waveform.setScroll(offset);
  };

  const handleWaveformKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const media = audioRef.current;
    if (!media || !duration) return;

    let position = media.currentTime;
    if (event.key === "ArrowLeft") position -= 5;
    else if (event.key === "ArrowRight") position += 5;
    else if (event.key === "Home") position = 0;
    else if (event.key === "End") position = duration;
    else return;
    event.preventDefault();
    media.currentTime = Math.max(0, Math.min(duration, position));
  };

  const handleTrimMove = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
    edge: "start" | "end",
  ) => {
    const drag = dragRef.current;
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId))
      return;

    trim(
      id,
      drag.timing,
      edge,
      drag.timing[edge] + ((event.clientX - drag.x) / drag.width) * duration,
    );
  };

  const handleTrimEnd = (event: PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleTrimKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
    timing: LineTiming,
    edge: "start" | "end",
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    onSelect(id);
    trim(
      id,
      timing,
      edge,
      timing[edge] +
        (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01),
    );
  };

  const handleSegmentMoveStart = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
    timing: LineTiming,
  ) => {
    if (event.button !== 0) return;

    const width = laneRef.current?.getBoundingClientRect().width ?? 0;
    if (!width) return;

    moveRef.current = {
      x: event.clientX,
      width,
      timing,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    onSelect(id);
  };

  const handleSegmentMove = (
    event: PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const drag = moveRef.current;
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId))
      return;

    move(id, drag.timing, ((event.clientX - drag.x) / drag.width) * duration);
  };

  const handleSegmentMoveEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSegmentMoveKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
    timing: LineTiming,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    move(
      id,
      timing,
      (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01),
    );
  };

  const handleTrimCaptureLost = () => {
    dragRef.current = null;
  };

  const handleSegmentCaptureLost = (event: PointerEvent<HTMLButtonElement>) => {
    moveRef.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  const handleRetry = () => setRetry((count) => count + 1);

  return (
    <section className={`flex flex-col min-w-0 min-h-0`} aria-label="Timeline">
      <div
        className={`min-w-0 shrink-0 overflow-hidden text-muted tabular-nums ${styles.timelineRuler}`}
        aria-label="Time ruler"
      >
        <div ref={rulerRef}>
          {duration > 0 ? (
            <span
              className={styles.timelineEnd}
              aria-label={`Song ends at ${formatTime(duration)}`}
            >
              {formatTime(duration)}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={`min-w-0 flex flex-1 mt-3 rounded-panel bg-canvas overflow-hidden ${styles.timelineCanvas}`}
      >
        <div
          ref={scrollRef}
          className={`flex-1 min-w-0 min-h-0 overflow-x-auto overflow-y-hidden ${styles.timelineScrollViewport}`}
          onScroll={handleTimelineScroll}
        >
          <div
            ref={scrollContentRef}
            className={`relative w-full h-full grid ${styles.timelineScrollContent}`}
            data-drop-target={isDropTarget}
          >
            <div
              className={`relative min-w-0 min-h-0 overflow-hidden ${styles.timelineWaveform}`}
            >
              <div
                ref={waveformRef}
                className={`absolute inset-0 ${styles.timelineWaveformHost}`}
                role="region"
                aria-label="Audio waveform"
                aria-busy={!!audioUrl && waveformStatus === "loading"}
                tabIndex={audioUrl && waveformStatus === "ready" ? 0 : -1}
                title="Drop a lyric to place it. Click or drag to seek. Ctrl/⌘ + wheel to zoom."
                onKeyDown={handleWaveformKey}
              />

              {!audioUrl || waveformStatus !== "ready" ? (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-canvas text-muted text-[11px]">
                  {waveformStatus === "error" ? (
                    <>
                      <span role="alert">Couldn’t draw the waveform.</span>
                      <Button variant="tertiary" onClick={handleRetry}>
                        Retry
                      </Button>
                    </>
                  ) : (
                    <span role="status">
                      {audioUrl
                        ? "Loading waveform…"
                        : "Load a song to see its waveform."}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div
              className={`min-w-0 relative overflow-hidden bg-surface ${styles.timelineLaneViewport}`}
              role="region"
              aria-label="Segment lane"
              tabIndex={duration > 0 ? 0 : -1}
              title="Drop a lyric to place it."
            >
              <div
                ref={laneRef}
                className={`h-full w-full bg-surface relative overflow-hidden ${styles.timelineSegments}`}
              >
                {!timed.length ? (
                  <div className="flex items-center justify-center gap-2 h-full">
                    <Layers2 aria-hidden="true" />
                    <span>Drag a lyric here</span>
                  </div>
                ) : null}

                {duration > 0
                  ? timed.map((line) => {
                      const timing = line.timing!;

                      return (
                        <div
                          key={line.id}
                          className={styles.timelineSegment}
                          data-selected={selectedId === line.id}
                          style={{
                            left: `${(timing.start / duration) * 100}%`,
                            width: `${((timing.end - timing.start) / duration) * 100}%`,
                          }}
                          role="group"
                          aria-label={`Timed lyric: ${line.text}`}
                        >
                          {(["start", "end"] as const).map((edge) => (
                            <button
                              key={edge}
                              type="button"
                              className={styles.timelineTrimHandle}
                              data-edge={edge}
                              aria-label={`Trim ${edge}: ${line.text}`}
                              title={`Drag to trim ${edge}. Arrow keys adjust 10ms; Shift adjusts 100ms.`}
                              onPointerDown={(event) =>
                                beginTrim(event, line.id, timing)
                              }
                              onPointerMove={(event) =>
                                handleTrimMove(event, line.id, edge)
                              }
                              onLostPointerCapture={handleTrimCaptureLost}
                              onPointerUp={handleTrimEnd}
                              onKeyDown={(event) =>
                                handleTrimKey(event, line.id, timing, edge)
                              }
                            >
                              <span aria-hidden="true" />
                            </button>
                          ))}

                          <Button
                            variant="tertiary"
                            className={styles.timelineSegmentLabel}
                            aria-label={`Select segment: ${line.text}`}
                            aria-pressed={selectedId === line.id}
                            title="Drag to move. Drag either edge to trim. Arrow keys move 10ms; Shift moves 100ms."
                            onPointerDown={(event) =>
                              handleSegmentMoveStart(event, line.id, timing)
                            }
                            onPointerMove={(event) =>
                              handleSegmentMove(event, line.id)
                            }
                            onLostPointerCapture={handleSegmentCaptureLost}
                            onPointerUp={handleSegmentMoveEnd}
                            onKeyDown={(event) =>
                              handleSegmentMoveKey(event, line.id, timing)
                            }
                            onClick={() => onSelect(line.id)}
                          >
                            <span>{line.text}</span>
                          </Button>
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>

            {dropPosition !== null && duration > 0 ? (
              <div
                className={styles.timelineDropMarker}
                data-align-end={dropPosition > duration * 0.85}
                style={{left: `${(dropPosition / duration) * 100}%`}}
                aria-hidden="true"
              >
                <span>{formatTime(dropPosition, "milliseconds")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2 text-muted text-[11px]">
        <span>
          {timed.length} {timed.length === 1 ? "segment" : "segments"}
        </span>
      </div>
    </section>
  );
};
