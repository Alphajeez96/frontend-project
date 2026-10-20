import {useRef, useState} from "react";

import {isSortable} from "@dnd-kit/react/sortable";
import {DragOverlay, DragDropProvider} from "@dnd-kit/react";
import {
  Accessibility,
  PointerSensor,
  PointerActivationConstraints,
} from "@dnd-kit/dom";
import {AudioLines} from "lucide-react";
import {useLyricDocument} from "../../hooks/useLyricDocument";
import {
  type Track,
  Toolbar,
  Timeline,
  LyricsPane,
  LyricPreview,
  SegmentInspector,
} from ".";

import styles from "./Editor.module.css";

const dragSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({value: 5}),
    ],
    preventActivation: () => false,
    activatorElements: (source) => (source.element ? [source.element] : []),
  }),
];

type Props = {
  track: Track | null;
  error: string | null;
  onLoadAudio: (file: File) => Promise<void>;
};

export const EditorLayout = ({track, error, onLoadAudio}: Props) => {
  const [zoom, setZoom] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const duration = track?.duration_seconds ?? 0;

  const document = useLyricDocument(track);
  const {selected, selectLine} = document;

  const currentTrack = track ? {...track, lines: document.lines} : null;

  return (
    <DragDropProvider
      sensors={dragSensors}
      plugins={(defaults) =>
        defaults.map((plugin) =>
          plugin === Accessibility
            ? Accessibility.configure({
                screenReaderInstructions: {
                  draggable:
                    "Press Enter to place the selected lyric at the playhead. Use Alt and arrow up or down to reorder. Space controls song playback.",
                },
              })
            : plugin,
        )
      }
      onDragStart={({operation}) => {
        if (operation.source) selectLine(String(operation.source.id));
      }}
      onDragEnd={(event) => {
        const {source, target} = event.operation;
        if (
          event.canceled ||
          !source ||
          !target ||
          target.type !== "lyric" ||
          !isSortable(source)
        )
          return;
        const targetLine = document.lines[source.index];
        if (targetLine && source.initialIndex !== source.index)
          document.moveLine(String(source.id), targetLine.id);
      }}
    >
      <main
        className={`flex flex-col ${styles.layoutFrame}`}
        onKeyDownCapture={(event) => {
          const target = event.target as HTMLElement;
          if (
            event.key !== "Enter" ||
            event.defaultPrevented ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey ||
            event.nativeEvent.isComposing ||
            target.closest("input, textarea, select, [contenteditable=true]") ||
            (target.closest("button, a") &&
              !target.closest("[data-lyric-id]")) ||
            !selected.id ||
            !audioRef.current ||
            !waveformReady
          )
            return;

          event.preventDefault();
          if (event.repeat) return;
          document.placeLine(selected.id, audioRef.current.currentTime, true);
        }}
      >
        <div
          className={`flex items-center justify-between shrink-0 ${styles.layoutCaption}`}
        >
          <span>
            <AudioLines aria-hidden="true" />
            Lyric Alignment Editor
          </span>
        </div>

        <div className={`flex flex-col overflow-hidden ${styles.layoutShell}`}>
          <Toolbar
            track={currentTrack}
            onLoadAudio={onLoadAudio}
            audioRef={audioRef}
            zoom={zoom}
            onZoomChange={setZoom}
            waveformReady={waveformReady}
          />

          <div className={styles.layoutBody}>
            <LyricsPane
              track={currentTrack}
              error={error}
              selectedId={selected.id}
              onSelect={selectLine}
              onAddLyrics={document.addLyrics}
              onMoveBy={document.moveBy}
            />

            <div className={`grid min-w-0 min-h-0 ${styles.layoutWorkspace}`}>
              <LyricPreview
                track={currentTrack}
                selectedId={selected.id}
                audioRef={audioRef}
              />

              <Timeline
                track={currentTrack}
                selectedId={selected.id}
                onSelect={selectLine}
                onTiming={document.setTiming}
                onPlace={document.placeLine}
                audioRef={audioRef}
                zoom={zoom}
                onZoomChange={setZoom}
                onReady={setWaveformReady}
              />
            </div>

            <SegmentInspector
              key={selected.id ?? "empty"}
              selectedLine={selected.line}
              validationError={document.validationError}
              nextLine={selected.nextLine}
              duration={duration}
              occupied={document.lines.flatMap((line) =>
                line.id !== selected.id && line.timing ? [line.timing] : [],
              )}
              onEdit={document.editLine}
              onDelete={document.deleteLine}
              onTiming={document.editTiming}
              onMerge={document.mergeLine}
              onSplit={document.splitLine}
            />
          </div>
        </div>
      </main>
      <DragOverlay className={styles.lyricsDragPreview} dropAnimation={null}>
        {(source) => <span>{source.data.text}</span>}
      </DragOverlay>
    </DragDropProvider>
  );
};
