import {useRef, useState, type FormEvent} from "react";

import {
  X,
  Plus,
  ListPlus,
  AlignLeft,
  ListMusic,
  GripVertical,
} from "lucide-react";

import type {Track} from ".";
import {Button} from "../ui/Button";
import {LyricRow} from "./LyricRow";
import styles from "./Editor.module.css";

type Props = {
  track: Track | null;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddLyrics: (text: string) => void;
  onMoveBy: (id: string, direction: -1 | 1) => void;
};

export const LyricsPane = ({
  track,
  error,
  selectedId,
  onSelect,
  onAddLyrics,
  onMoveBy,
}: Props) => {
  const lyricsInputRef = useRef<HTMLTextAreaElement>(null);
  const [lyricsText, setLyricsText] = useState("");
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLine, setNewLine] = useState("");

  const handleAddLyrics = () => {
    if (!lyricsText.trim()) {
      lyricsInputRef.current?.focus();
      return;
    }
    onAddLyrics(lyricsText);
    setLyricsText("");
  };

  const handleAddLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newLine.trim()) return;

    onAddLyrics(newLine);
    setNewLine("");
    setIsAddingLine(false);
  };

  return (
    <section
      className={`relative flex flex-col min-w-0 min-h-0 ${styles.lyricsPane}`}
      aria-labelledby="lyrics-heading"
    >
      <div
        className={`flex items-center gap-2 mb-3.5 px-1 ${styles.lyricsHeading}`}
      >
        <AlignLeft aria-hidden="true" />
        <h2 id="lyrics-heading">Lyrics</h2>
      </div>

      <label className="sr-only" htmlFor="lyrics-input">
        Full lyrics
      </label>
      <textarea
        ref={lyricsInputRef}
        id="lyrics-input"
        placeholder="Paste your lyrics here…"
        value={lyricsText}
        onChange={(event) => setLyricsText(event.target.value)}
      />

      <div className={`grid gap-2 mt-2.5 ${styles.lyricsImportActions}`}>
        <Button variant="primary" disabled={!track} onClick={handleAddLyrics}>
          <ListPlus aria-hidden="true" />
          Add all lines
        </Button>

        <Button disabled={!track} onClick={() => setIsAddingLine(true)}>
          <Plus aria-hidden="true" />
          Add line
        </Button>
      </div>

      {isAddingLine ? (
        <form
          className={`flex flex-wrap gap-1.5 pt-2.5 ${styles.lyricsAddLineForm}`}
          onSubmit={handleAddLine}
        >
          <label className="sr-only" htmlFor="new-line">
            New lyric line
          </label>
          <input
            id="new-line"
            value={newLine}
            placeholder="Write a lyric line…"
            onChange={(event) => setNewLine(event.target.value)}
            autoFocus
          />

          <Button type="submit" variant="primary" disabled={!newLine.trim()}>
            Add
          </Button>

          <Button
            size="icon"
            variant="tertiary"
            aria-label="Cancel new line"
            onClick={() => setIsAddingLine(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </form>
      ) : null}

      <div
        className={`flex items-center justify-between gap-2 text-muted text-[11px] ${styles.lyricsSummary}`}
      >
        <h3>
          Lines <span>{track?.lines.length ?? 0}</span>
        </h3>
        <span>
          {track?.lines.filter((line) => line.timing).length ?? 0} timed
        </span>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto ${styles.lyricsScroll}`}
        data-empty={!!track && !track.lines.length}
      >
        {error ? (
          <p
            className={`text-muted text-[12px] ${styles.lyricsMessage}`}
            role="alert"
          >
            Could not load the sample track.
          </p>
        ) : null}

        {!track && !error ? (
          <p
            className={`text-muted text-[12px] ${styles.lyricsMessage}`}
            role="status"
          >
            Loading sample lyrics…
          </p>
        ) : null}

        {track && !track.lines.length ? (
          <div
            className={`flex flex-col items-center gap-3.5 text-muted text-center text-[12px] ${styles.lyricsEmpty}`}
          >
            <ListMusic aria-hidden="true" />
            <p>Paste lyrics above to start building your sheet.</p>
          </div>
        ) : null}

        {track?.lines.length ? (
          <ol className="grid gap-2 list-none p-0 m-0">
            {track?.lines.map((line, index) => (
              <LyricRow
                key={line.id}
                line={line}
                position={index + 1}
                isSelected={line.id === selectedId}
                onSelect={onSelect}
                onMoveBy={onMoveBy}
              />
            ))}
          </ol>
        ) : null}
      </div>

      {track?.lines.length ? (
        <p
          className={`flex items-center gap-1.5 text-muted text-[11px] ${styles.lyricsHint}`}
        >
          <GripVertical aria-hidden="true" />
          Drag to reorder
        </p>
      ) : null}
    </section>
  );
};
