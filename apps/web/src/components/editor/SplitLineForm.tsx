import {useState, type FormEvent} from "react";

import {Scissors} from "lucide-react";
import {Button} from "../ui/Button";
import {splitText, formatTime, parseAudioTime} from "../../utils";
import type {LyricLine} from ".";

import styles from "./Editor.module.css";

type Props = {
  line: LyricLine;
  onSplit: (first: string, second: string, at?: number) => void;
  onCancel: () => void;
};

export const SplitLineForm = ({line, onSplit, onCancel}: Props) => {
  const [initialFirst, initialSecond] = splitText(line.text);
  const [first, setFirst] = useState(initialFirst);
  const [second, setSecond] = useState(initialSecond);
  const [at, setAt] = useState(
    line.timing
      ? formatTime((line.timing.start + line.timing.end) / 2, "milliseconds")
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSplit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!first.trim() || !second.trim()) {
      setError("Both lines need some words.");
      return;
    }
    const boundary = parseAudioTime(at);
    if (
      line.timing &&
      (boundary === null ||
        boundary <= line.timing.start ||
        boundary >= line.timing.end)
    ) {
      setError("Choose a split time inside this line’s start and end.");
      return;
    }
    onSplit(first, second, line.timing ? boundary! : undefined);
  };

  return (
    <form
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      id="split-lyric-form"
      className={`grid gap-3 mt-4.5 bg-raised rounded-panel ${styles.inspectorSplitForm}`}
      aria-label="Split lyric"
      onSubmit={handleSplit}
    >
      <h3>Split this lyric</h3>
      <p>Check the two parts before splitting.</p>
      <label htmlFor="split-first-line">First line</label>
      <textarea
        id="split-first-line"
        value={first}
        onChange={(event) => setFirst(event.target.value)}
        autoFocus
      />
      <label htmlFor="split-second-line">Second line</label>
      <textarea
        id="split-second-line"
        value={second}
        onChange={(event) => setSecond(event.target.value)}
      />

      {line.timing ? (
        <label>
          Split at
          <input
            value={at}
            inputMode="decimal"
            onChange={(event) => setAt(event.target.value)}
          />
        </label>
      ) : null}

      {error ? (
        <p
          className={`text-muted text-[11px] ${styles.inspectorValidation}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" type="submit">
          <Scissors aria-hidden="true" />
          Confirm split
        </Button>

        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
