import type {LineTiming, Track} from "./components/editor";
import {intervalToDuration, differenceInMinutes} from "date-fns";

export const formatTime = (
  seconds: number,
  precision: "seconds" | "milliseconds" = "seconds",
): string => {
  const milliseconds = Number.isFinite(seconds)
    ? Math.max(
        0,
        precision === "milliseconds"
          ? Math.round(seconds * 1000)
          : Math.floor(seconds) * 1000,
      )
    : 0;
  const duration = intervalToDuration({start: 0, end: milliseconds});
  const minutes = differenceInMinutes(milliseconds, 0);
  const time = `${minutes}:${String(duration.seconds ?? 0).padStart(2, "0")}`;

  return precision === "milliseconds"
    ? `${time}.${String(milliseconds % 1000).padStart(3, "0")}`
    : time;
};

export const parseAudioTime = (value: string): number | null => {
  const text = value.trim();
  if (/^\d+(?:\.\d{1,3})?$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? seconds : null;
  }
  const match = /^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) return null;

  const seconds =
    Number(match[1]) * 60 + Number(match[2]) + Number(`0.${match[3] ?? "0"}`);
  return Number.isFinite(seconds) ? seconds : null;
};

export const timingError = (
  timing: LineTiming,
  duration: number,
  occupied: LineTiming[] = [],
): string | null => {
  if (
    !Number.isFinite(timing.start) ||
    !Number.isFinite(timing.end) ||
    timing.start < 0
  )
    return "Enter valid start and end times.";

  if (timing.end <= timing.start) return "End must be after start.";

  if (timing.end > duration) return "End is past the end of the track.";

  if (
    occupied.some(
      (other) => timing.start < other.end && timing.end > other.start,
    )
  )
    return "This timing overlaps another segment.";

  return null;
};

export const timingBounds = (
  timing: LineTiming,
  occupied: LineTiming[],
  duration: number,
): LineTiming => {
  const bounds = {start: 0, end: duration};
  occupied.forEach((other) => {
    if (other.end <= timing.start)
      bounds.start = Math.max(bounds.start, other.end);
    if (other.start >= timing.end)
      bounds.end = Math.min(bounds.end, other.start);
  });
  return bounds;
};

export const timingDraftError = (
  draft: Partial<LineTiming>,
  duration: number,
  occupied: LineTiming[],
): string | null => {
  if (
    draft.start !== undefined &&
    (!Number.isFinite(draft.start) || draft.start < 0)
  )
    return "Enter a valid start time.";

  if (
    draft.end !== undefined &&
    (!Number.isFinite(draft.end) || draft.end <= 0)
  )
    return "Enter a valid end time.";

  if (draft.start !== undefined && draft.start >= duration)
    return "Start must be before the end of the track.";

  if (draft.end !== undefined && draft.end > duration)
    return "End is past the end of the track.";

  if (draft.start !== undefined && draft.end !== undefined)
    return timingError(
      {start: draft.start, end: draft.end},
      duration,
      occupied,
    );

  return null;
};

export const splitText = (text: string): [string, string] => {
  const clean = text.trim();
  const middle = Math.floor(clean.length / 2);
  const spaces = Array.from(clean.matchAll(/\s+/g), (match) => match.index!);
  const boundary = spaces.length
    ? spaces.reduce((best, at) =>
        Math.abs(at - middle) < Math.abs(best - middle) ? at : best,
      )
    : middle;

  return [clean.slice(0, boundary).trim(), clean.slice(boundary).trim()];
};

export const readAudioFile = async (file: File): Promise<Track | undefined> => {
  if (file.type && !file.type.startsWith("audio/")) return;

  const audioUrl = URL.createObjectURL(file);

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = document.createElement("audio");
      const timeout = window.setTimeout(
        () =>
          finish(new Error("This audio could not be read. Try another file.")),
        10000,
      );

      const finish = (error?: Error) => {
        window.clearTimeout(timeout);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        const duration = audio.duration;
        audio.removeAttribute("src");
        audio.load();
        if (error) reject(error);
        else resolve(duration);
      };

      audio.onloadedmetadata = () =>
        finish(
          Number.isFinite(audio.duration) && audio.duration > 0
            ? undefined
            : new Error("This audio has no readable duration."),
        );
      audio.onerror = () =>
        finish(
          new Error("This audio format could not be played. Try MP3 or WAV."),
        );
      audio.preload = "metadata";
      audio.src = audioUrl;
    });

    return {
      lines: [],
      audio_url: audioUrl,
      duration_seconds: duration,
      title: file.name.replace(/\.[^.]+$/, ""),
    };
  } catch (error) {
    URL.revokeObjectURL(audioUrl);
    throw error;
  }
};
