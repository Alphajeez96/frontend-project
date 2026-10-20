export type Track = {
  title: string;
  artist: string;
  duration_seconds: number;
  lines: { id: string; index: number; text: string }[];
};

type Props = { track: Track | null; error: string | null };

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function Toolbar({ track }: { track: Track | null }) {
  return (
    <header className="editor-toolbar">
      <div className="track-controls">
        <button disabled>Load song</button>
        <div className="track-details">
          <h1>{track?.title ?? 'Lyric alignment'}</h1>
          <p>{track?.artist ?? 'No track loaded'}</p>
        </div>
        <span className="track-duration">{track ? formatTime(track.duration_seconds) : '—'}</span>
        <div className="playback-controls">
          <button className="play-button" aria-label="Play" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" /></svg>
          </button>
          <span className="timecode">0:00.000</span>
        </div>
      </div>
      <div className="toolbar-actions">
        <div className="zoom-controls" role="group" aria-label="Timeline zoom">
          <span>Zoom</span>
          <button aria-label="Zoom out" disabled>−</button>
          <button aria-label="Zoom in" disabled>+</button>
        </div>
        <button disabled>Export LRC</button>
      </div>
    </header>
  );
}

function LyricsPane({ track, error }: Props) {
  return (
    <section className="lyrics-pane" aria-labelledby="lyrics-heading">
      <h2 id="lyrics-heading">Lyrics</h2>
      <label className="sr-only" htmlFor="lyrics-input">Full lyrics</label>
      <textarea id="lyrics-input" placeholder="Paste full lyrics…" disabled />
      <div className="lyrics-actions">
        <button disabled>Add all lines</button>
        <button disabled>+ Add line</button>
      </div>
      <div className="pane-summary">
        <h3>Lines <span>{track?.lines.length ?? 0}</span></h3>
        <span>0 placed</span>
      </div>
      <div className="lyrics-scroll">
        {error ? <p role="alert">Could not load the sample track.</p> : null}
        {!track && !error ? <p role="status">Loading sample lyrics…</p> : null}
        <ol className="lyric-list">
          {track?.lines.map((line) => (
            <li key={line.id}>
              <span className="line-grip" aria-hidden="true">⠿</span>
              <span>{line.text}</span>
              <span className="untimed-mark" aria-label="Untimed">—</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="pane-hint">Lyric lines</p>
    </section>
  );
}

function LyricPreview({ track }: { track: Track | null }) {
  const lines = track?.lines.slice(0, 3) ?? [];
  return (
    <section className="lyric-preview" aria-labelledby="preview-heading">
      <h2 id="preview-heading">Lyric preview</h2>
      <div className="preview-lines">
        {lines.length ? lines.map((line) => <p key={line.id}>{line.text}</p>) : <p>Lyrics will appear here</p>}
      </div>
    </section>
  );
}

function Timeline({ track }: { track: Track | null }) {
  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="timeline-heading">
        <h2 id="timeline-heading">Timeline</h2>
        <span>{track ? formatTime(track.duration_seconds) : '—'}</span>
      </div>
      <div className="time-ruler" aria-label="Time ruler">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index}>{track ? formatTime(track.duration_seconds * index / 5) : '—'}</span>
        ))}
      </div>
      <div className="timeline-canvas">
        <div className="waveform-placeholder"><span>Waveform</span></div>
        <div className="segment-placeholder"><span>Segment lane</span></div>
      </div>
    </section>
  );
}

function SegmentInspector() {
  return (
    <aside className="inspector" aria-labelledby="segment-heading">
      <h2 id="segment-heading">Segment</h2>
      <p className="inspector-selection">No line selected</p>
      <fieldset className="timing-fields" disabled>
        <legend className="sr-only">Segment timing</legend>
        <label>Start <input placeholder="0:00.000" /></label>
        <label>End <input placeholder="0:00.000" /></label>
        <label>Duration <output>—</output></label>
      </fieldset>
      <div className="segment-actions">
        <button disabled>Merge with next</button>
        <button disabled>Split</button>
        <button disabled>Delete</button>
      </div>
      <p className="pane-hint">Selected line details</p>
    </aside>
  );
}

export function EditorLayout({ track, error }: Props) {
  return (
    <main className="app-frame">
      <div className="workspace-caption"><span>Lyric / Sync</span><span>Layout preview</span></div>
      <div className="editor-shell">
        <Toolbar track={track} />
        <div className="editor-body">
          <LyricsPane track={track} error={error} />
          <div className="editor-workspace">
            <LyricPreview track={track} />
            <Timeline track={track} />
          </div>
          <SegmentInspector />
        </div>
      </div>
    </main>
  );
}
