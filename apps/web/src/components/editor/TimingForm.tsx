import {useCallback, useEffect, useRef, useState} from "react";

import {formatTime, parseAudioTime, timingDraftError} from "../../utils";
import type {LineTiming} from ".";

import styles from "./Editor.module.css";

type Props = {
  timing: LineTiming | undefined;
  draft: Partial<LineTiming> | undefined;
  duration: number;
  occupied: LineTiming[];
  disabled: boolean;
  onChange: (draft: Partial<LineTiming>) => void;
};

export const TimingForm = ({
  timing,
  draft,
  duration,
  occupied,
  disabled,
  onChange,
}: Props) => {
  const value = draft ?? timing;
  const [start, setStart] = useState(
    value?.start === undefined ? "" : formatTime(value.start, "milliseconds"),
  );
  const [end, setEnd] = useState(
    value?.end === undefined ? "" : formatTime(value.end, "milliseconds"),
  );
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const syncText = (text: string, seconds: number | undefined) => {
      if (
        (parseAudioTime(text) ?? undefined) === seconds ||
        (seconds !== undefined &&
          parseAudioTime(text) === Math.round(seconds * 1000) / 1000)
      )
        return text;

      return seconds === undefined ? "" : formatTime(seconds, "milliseconds");
    };

    setStart((text) => syncText(text, value?.start));
    setEnd((text) => syncText(text, value?.end));
    dirtyRef.current = false;
    setError(null);
  }, [value?.start, value?.end]);

  const parsedStart = parseAudioTime(start);
  const parsedEnd = parseAudioTime(end);
  const difference =
    parsedStart !== null && parsedEnd !== null && parsedEnd > parsedStart
      ? parsedEnd - parsedStart
      : null;

  const recordTiming = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (!dirtyRef.current || disabled) return;

    dirtyRef.current = false;
    if (
      (start.trim() && parsedStart === null) ||
      (end.trim() && parsedEnd === null)
    ) {
      setError("Use a time like 0:12.500.");
      return;
    }

    const nextStart =
      value?.start !== undefined &&
      parsedStart === Math.round(value.start * 1000) / 1000
        ? value.start
        : parsedStart;
    const nextEnd =
      value?.end !== undefined &&
      parsedEnd === Math.round(value.end * 1000) / 1000
        ? value.end
        : parsedEnd;
    const next = {start: nextStart ?? undefined, end: nextEnd ?? undefined};
    const message = timingDraftError(next, duration, occupied);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onChange(next);
  }, [
    start,
    end,
    parsedStart,
    parsedEnd,
    value?.start,
    value?.end,
    duration,
    occupied,
    disabled,
    onChange,
  ]);

  useEffect(() => {
    if (!dirtyRef.current || disabled) return;

    const timeout = window.setTimeout(recordTiming, 500);
    timeoutRef.current = timeout;
    return () => window.clearTimeout(timeout);
  }, [recordTiming, disabled]);

  return (
    <form
      className="grid gap-3"
      aria-label="Line timing"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          recordTiming();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        recordTiming();
      }}
    >
      <fieldset
        className={`grid gap-2.5 m-0 p-0 border-0 ${styles.inspectorFields}`}
        disabled={disabled}
      >
        <legend className="sr-only">Segment timing</legend>
        <label>
          Start{" "}
          <input
            inputMode="decimal"
            value={start}
            placeholder="0:00.000"
            aria-invalid={!!error}
            aria-describedby={error ? "timing-error" : undefined}
            onChange={(event) => {
              dirtyRef.current = true;
              setStart(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label>
          End{" "}
          <input
            inputMode="decimal"
            value={end}
            placeholder="0:00.000"
            aria-invalid={!!error}
            aria-describedby={error ? "timing-error" : undefined}
            onChange={(event) => {
              dirtyRef.current = true;
              setEnd(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label>
          Duration{" "}
          <output>
            {difference === null ? "—" : formatTime(difference, "milliseconds")}
          </output>
        </label>
      </fieldset>

      {error ? (
        <p
          className={`text-muted text-[11px] ${styles.inspectorValidation}`}
          id="timing-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
};
