import {useState} from "react";

import type {Track, LineTiming, LyricLine} from "../components/editor";
import {timingError, timingDraftError} from "../utils";

const withOrder = (lines: LyricLine[]) =>
  lines.map((line, index) => ({...line, index}));

type DocumentState = {
  lines: LyricLine[];
  selected: {id: string | null};
  validationError: string | null;
};

const initialDocument = (track: Track | null): DocumentState => ({
  lines: track?.lines ?? [],
  selected: {id: track?.lines[0]?.id ?? null},
  validationError: null,
});

export const useLyricDocument = (track: Track | null) => {
  const [document, setDocument] = useState(() => initialDocument(track));
  const duration = track?.duration_seconds ?? 0;

  const updateLine = (
    id: string,
    update: (
      current: DocumentState,
      line: LyricLine,
      index: number,
    ) => DocumentState,
  ) => {
    setDocument((current) => {
      const index = current.lines.findIndex((line) => line.id === id);
      return index < 0 ? current : update(current, current.lines[index], index);
    });
  };

  const occupiedTimings = (lines: LyricLine[], id: string) =>
    lines.flatMap((line) =>
      line.id !== id && line.timing ? [line.timing] : [],
    );

  const selectLine = (id: string | null) => {
    setDocument((current) => ({
      ...current,
      selected: {id},
      validationError: null,
    }));
  };

  const addLyrics = (text: string) => {
    const added = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({id: crypto.randomUUID(), index: 0, text}));
    if (!added.length) return;

    setDocument((current) => ({
      ...current,
      lines: withOrder([...current.lines, ...added]),
      selected: {id: added[0].id},
      validationError: null,
    }));
  };

  const editLine = (id: string, text: string) => {
    updateLine(id, (current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === id ? {...line, text} : line,
      ),
      validationError: null,
    }));
  };

  const deleteLine = (id: string) => {
    updateLine(id, (current, _line, index) => {
      const lines = withOrder(current.lines.filter((line) => line.id !== id));

      return {
        ...current,
        lines,
        selected: {
          id:
            current.selected.id === id
              ? (lines[Math.min(index, lines.length - 1)]?.id ?? null)
              : current.selected.id,
        },
        validationError: null,
      };
    });
  };

  const reorderLine = (current: DocumentState, index: number, to: number) => {
    if (to < 0 || to >= current.lines.length || to === index) return current;

    const lines = [...current.lines];
    const [line] = lines.splice(index, 1);
    lines.splice(to, 0, line);

    return {...current, lines: withOrder(lines), validationError: null};
  };

  const moveLine = (id: string, targetId: string) => {
    updateLine(id, (current, _line, index) =>
      reorderLine(
        current,
        index,
        current.lines.findIndex((line) => line.id === targetId),
      ),
    );
  };

  const moveBy = (id: string, direction: -1 | 1) => {
    updateLine(id, (current, _line, index) =>
      reorderLine(current, index, index + direction),
    );
  };

  const setTiming = (id: string, timing: LineTiming) => {
    updateLine(id, (current, line) => {
      const error = timingError(
        timing,
        duration,
        occupiedTimings(current.lines, id),
      );
      if (error) return {...current, validationError: error};

      if (
        !current.validationError &&
        !line.timingDraft &&
        line.timing?.start === timing.start &&
        line.timing.end === timing.end
      )
        return current;

      return {
        ...current,
        lines: current.lines.map((item) =>
          item.id === id ? {...item, timing, timingDraft: undefined} : item,
        ),
        validationError: null,
      };
    });
  };

  const placeLine = (id: string, position: number) => {
    if (duration <= 0) return;

    updateLine(id, (current, line) => {
      const occupied = occupiedTimings(current.lines, id);
      const length = line.timing
        ? line.timing.end - line.timing.start
        : Math.min(3, duration);
      const start = Math.max(
        0,
        Math.min(
          position,
          duration - (line.timing ? length : Math.min(0.001, duration)),
        ),
      );
      const nextStart = occupied
        .filter((other) => other.start > start)
        .reduce((end, other) => Math.min(end, other.start), duration);
      const timing = {
        start,
        end: line.timing ? start + length : Math.min(nextStart, start + length),
      };
      const error = timingError(timing, duration, occupied);
      if (error) return {...current, validationError: error};

      return {
        ...current,
        lines: current.lines.map((item) =>
          item.id === id ? {...item, timing, timingDraft: undefined} : item,
        ),
        selected: {id},
        validationError: null,
      };
    });
  };

  const editTiming = (id: string, draft: Partial<LineTiming>) => {
    updateLine(id, (current) => {
      const error = timingDraftError(
        draft,
        duration,
        occupiedTimings(current.lines, id),
      );
      if (error) return {...current, validationError: error};

      const {start, end} = draft;

      return {
        ...current,
        lines: current.lines.map((line) => {
          if (line.id !== id) return line;

          return start !== undefined && end !== undefined
            ? {...line, timing: {start, end}, timingDraft: undefined}
            : {...line, timingDraft: draft};
        }),
        validationError: null,
      };
    });
  };

  const mergeLine = (id: string) => {
    updateLine(id, (current, line, index) => {
      const next = current.lines[index + 1];
      if (!next) return current;

      const timing =
        line.timing && next.timing
          ? {
              start: Math.min(line.timing.start, next.timing.start),
              end: Math.max(line.timing.end, next.timing.end),
            }
          : undefined;
      if (timing) {
        const occupied = current.lines.flatMap((item) =>
          item.id !== id && item.id !== next.id && item.timing
            ? [item.timing]
            : [],
        );
        if (timingError(timing, duration, occupied))
          return {
            ...current,
            validationError:
              "Merging these lines would overlap another segment.",
          };
      }
      const merged = {
        ...line,
        text: [line.text.trim(), next.text.trim()].filter(Boolean).join(" "),
        timing,
        timingDraft: undefined,
      };
      const lines = [...current.lines];
      lines.splice(index, 2, merged);

      return {
        ...current,
        lines: withOrder(lines),
        selected: {id},
        validationError: null,
      };
    });
  };

  const splitLine = (
    id: string,
    firstText: string,
    secondText: string,
    at?: number,
  ) => {
    const first = firstText.trim();
    const second = secondText.trim();
    if (!first || !second) return;

    const newId = crypto.randomUUID();
    updateLine(id, (current, line, index) => {
      if (
        line.timing &&
        (at === undefined ||
          !Number.isFinite(at) ||
          at <= line.timing.start ||
          at >= line.timing.end)
      )
        return current;

      const left = {
        ...line,
        text: first,
        timingDraft: undefined,
        timing: line.timing ? {start: line.timing.start, end: at!} : undefined,
      };
      const right = {
        id: newId,
        index: index + 1,
        text: second,
        timing: line.timing ? {start: at!, end: line.timing.end} : undefined,
      };
      const lines = [...current.lines];
      lines.splice(index, 1, left, right);

      return {
        ...current,
        lines: withOrder(lines),
        selected: {id},
        validationError: null,
      };
    });
  };

  const selectedIndex = document.lines.findIndex(
    (line) => line.id === document.selected.id,
  );

  return {
    ...document,
    selected: {
      ...document.selected,
      line: selectedIndex >= 0 ? document.lines[selectedIndex] : undefined,
      nextLine:
        selectedIndex >= 0 ? document.lines[selectedIndex + 1] : undefined,
    },
    moveBy,
    editLine,
    moveLine,
    addLyrics,
    setTiming,
    placeLine,
    mergeLine,
    splitLine,
    selectLine,
    deleteLine,
    editTiming,
  };
};
