import {useEffect, useRef, type KeyboardEvent} from "react";
import {useSortable} from "@dnd-kit/react/sortable";
import {Clock3, GripVertical} from "lucide-react";
import {Button} from "../ui/Button";
import type {LyricLine} from ".";
import {formatTime} from "../../utils";

import styles from "./Editor.module.css";

type Props = {
  line: LyricLine;
  position: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMoveBy: (id: string, direction: -1 | 1) => void;
};

export const LyricRow = ({
  line,
  position,
  isSelected,
  onSelect,
  onMoveBy,
}: Props) => {
  const rowRef = useRef<HTMLLIElement>(null);
  const lineRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({block: "nearest"});
  }, [isSelected, position]);

  const {isDragSource, isDropTarget} = useSortable({
    id: line.id,
    index: position - 1,
    group: "lyrics",
    type: "lyric",
    accept: "lyric",
    data: {text: line.text},
    element: rowRef,
    handle: lineRef,
  });

  const handleReorderKey = (event: KeyboardEvent<HTMLLIElement>) => {
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    )
      return;

    event.preventDefault();
    onSelect(line.id);
    onMoveBy(line.id, event.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <li
      ref={rowRef}
      className={styles.lyricsRowCard}
      data-selected={isSelected}
      data-dragging={isDragSource}
      data-drop-target={isDropTarget}
      onKeyDown={handleReorderKey}
    >
      <Button
        variant="tertiary"
        size="icon"
        tabIndex={-1}
        className={styles.lyricsHandle}
        aria-label={`Move line ${position}`}
        title="Drag to reorder or place on the waveform or segment lane."
        onClick={() => {
          onSelect(line.id);
          lineRef.current?.focus();
        }}
      >
        <GripVertical aria-hidden="true" />
      </Button>

      <Button
        ref={lineRef}
        variant="tertiary"
        className={styles.lyricsRow}
        aria-label={`Line ${position}: ${line.text}`}
        aria-pressed={isSelected}
        title="Drag to reorder or place on the waveform or segment lane. Option/Alt + arrow up or down reorders this line."
        onClick={() => {
          onSelect(line.id);
          lineRef.current?.focus();
        }}
      >
        <span className={styles.lyricsLineText}>
          {line.text || "Empty lyric line"}
        </span>

        {line.timing ? (
          <span className="mt-0.5 text-focus text-[11px] tabular-nums">
            {formatTime(line.timing.start)}
          </span>
        ) : (
          <Clock3 className={styles.lyricsUntimedIcon} aria-hidden="true" />
        )}

        <span className="sr-only">
          {line.timing
            ? `Timed from ${formatTime(line.timing.start)} to ${formatTime(line.timing.end)}`
            : "Untimed"}
        </span>
      </Button>
    </li>
  );
};
