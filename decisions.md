# Decisions

## Direction

I set the workspace layout, visual direction and main editing rules. The supplied wireframe was the starting point, with the lyric preview moved above the timeline to keep a familiar editing-app structure. I chose the dark theme, orange accent, Inter, Lucide icons, WaveSurfer, date-fns and Tailwind with CSS Modules.

I also defined non-overlapping segments, automatic updates from the timing fields and a preview that keeps lyric context visible between timed lines.

## AI-assisted work

AI helped with time-formatting and parsing utilities, reading local audio duration and defining shared CSS tokens. It also contributed implementation and revisions across waveform, lyric editing,and timing validation.The points below record the main choices made within that work.

- **Time values:** keep seconds internally to match the browser audio element and WaveSurfer. Display minutes and seconds for playback, with milliseconds in the timing fields. Keep total minutes for recordings longer than an hour. Any future API save needs one conversion to integer milliseconds.
- **Audio duration:** read local-file duration from browser media metadata, handle unreadable files and release temporary object URLs. Use the supplied duration for the sample track. Local audio plays without an upload.
- **CSS tokens:** define shared colours, focus states, borders, corner sizes and motion values around the set visual direction.
- **One playback clock:** pass the same audio element to playback controls, WaveSurfer and the preview, avoiding separate positions that could drift apart.
- **Timing fields:** apply valid edits after a 500-millisecond pause, on leaving the form or on Enter.
- **Merge and split:** combine the outer bounds of two timed lines if the result does not overlap another segment. Leave the result untimed if either source is untimed. Suggest midpoint text and timing boundaries for a split, with confirmation before applying it.
