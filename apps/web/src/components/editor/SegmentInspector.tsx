import {useRef, useState} from "react";

import {
  Merge,
  Clock3,
  Trash2,
  Scissors,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

import {Button} from "../ui/Button";
import {TimingForm} from "./TimingForm";
import {SplitLineForm} from "./SplitLineForm";
import type {LineTiming, LyricLine} from ".";

import styles from "./Editor.module.css";

type Props = {
  selectedLine: LyricLine | undefined;
  nextLine: LyricLine | undefined;
  duration: number;
  validationError: string | null;
  occupied: LineTiming[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onTiming: (id: string, timing: Partial<LineTiming>) => void;
  onMerge: (id: string) => void;
  onSplit: (id: string, first: string, second: string, at?: number) => void;
};

export const SegmentInspector = ({
  selectedLine,
  nextLine,
  duration,
  validationError,
  occupied,
  onEdit,
  onDelete,
  onTiming,
  onMerge,
  onSplit,
}: Props) => {
  const [isSplitting, setIsSplitting] = useState(false);
  const splitButtonRef = useRef<HTMLButtonElement>(null);

  const closeSplit = () => {
    setIsSplitting(false);
    splitButtonRef.current?.focus();
  };

  return (
    <aside
      className={`relative flex flex-col min-w-0 min-h-0 bg-surface overflow-y-auto ${styles.inspectorInspector}`}
      aria-labelledby="segment-heading"
    >
      <div className={`flex items-center gap-2 ${styles.inspectorHeading}`}>
        <SlidersHorizontal aria-hidden="true" />
        <h2 id="segment-heading">Segment</h2>
      </div>

      {isSplitting && selectedLine ? (
        <SplitLineForm
          line={selectedLine}
          onCancel={closeSplit}
          onSplit={(first, second, at) => {
            onSplit(selectedLine.id, first, second, at);
            closeSplit();
          }}
        />
      ) : null}

      <div className={`min-h-0 ${styles.inspectorSelection}`}>
        <label className="sr-only" htmlFor="selected-lyric">
          Selected lyric
        </label>
        <textarea
          id="selected-lyric"
          value={selectedLine?.text ?? ""}
          placeholder="Select a lyric line"
          disabled={!selectedLine || isSplitting}
          onChange={(event) => {
            if (selectedLine) onEdit(selectedLine.id, event.target.value);
          }}
        />
        <span
          className={selectedLine?.timing ? styles.inspectorTimed : undefined}
        >
          {selectedLine?.timing ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <Clock3 aria-hidden="true" />
          )}

          {selectedLine?.timing
            ? "Timed"
            : selectedLine
              ? "Not timed yet"
              : "No line selected"}
        </span>
      </div>

      <TimingForm
        timing={selectedLine?.timing}
        draft={selectedLine?.timingDraft}
        duration={duration}
        occupied={occupied}
        disabled={!selectedLine || isSplitting}
        onChange={(timing) => {
          if (selectedLine) onTiming(selectedLine.id, timing);
        }}
      />

      <div className={`grid gap-2 mt-4.5 pt-4.5 ${styles.inspectorActions}`}>
        <Button
          disabled={!selectedLine || !nextLine || isSplitting}
          title={
            !nextLine
              ? "No following line to merge with"
              : "Join this lyric to the next line"
          }
          onClick={() => {
            if (selectedLine) onMerge(selectedLine.id);
          }}
        >
          <Merge aria-hidden="true" />
          Merge with next
        </Button>

        <Button
          ref={splitButtonRef}
          variant="secondary"
          disabled={!selectedLine || selectedLine.text.trim().length < 2}
          aria-expanded={isSplitting}
          aria-controls={isSplitting ? "split-lyric-form" : undefined}
          onClick={() => setIsSplitting((current) => !current)}
        >
          <Scissors aria-hidden="true" />
          Split
        </Button>

        <Button
          variant="danger"
          className="mt-0.5"
          disabled={!selectedLine || isSplitting}
          onClick={() => {
            if (selectedLine) onDelete(selectedLine.id);
          }}
        >
          <Trash2 aria-hidden="true" />
          Delete line
        </Button>
      </div>

      {validationError ? (
        <p
          className={`text-muted text-[11px] ${styles.inspectorValidation}`}
          role="alert"
        >
          {validationError}
        </p>
      ) : null}
    </aside>
  );
};
