# Project notes

## Approach

The overarching idea was to build an intuitive system: load audio, add lyrics, place each line, then adjust its timing while listening.

The supplied wireframe served as the base. I moved the lyric preview above the timeline, keeping the lyrics on the left and timing controls on the right. The aim was a familiar editing workspace, with the preview above the area where changes are made.

## What is included

- Load the supplied sample or choose a local audio file. 
- Paste lyrics, with each non-empty line becoming a separate item.  Add, edit, reorder, split, merge and delete lines.
- Drag a lyric onto the waveform or segment lane to place it. Move the segment or trim either edge, then use the inspector for exact start and end values.
- Prevent overlapping timings, negative starts and timings beyond the track. 
- Zoom with the controls or Ctrl/Command plus the mouse wheel.
- Follow the timed lyrics in the preview.

## Technical choices

Alongside the existing React, TypeScript and Vite boilerplate, I added:

- **Tailwind CSS**, with CSS Modules for component-specific styles. Shared CSS tokens define colours, focus states, borders, corner sizes and motion values.
- **WaveSurfer**, to draw the audio waveform and time ruler. Lyric segments remain React elements so their editing and timing rules stay within the editor.
- **dnd-kit**, for dragging lyric lines, reordering them and placing them on the timeline. Segment movement and trimming use Pointer Events.
- **date-fns**, for time-formatting calculations.
- **Lucide React**, for  interface icons.
- **Motion**, for transition.

## What I left out

- **Undo and redo.** Edits cannot be stepped back through a history.
- **Export.** LRC and project-file export are not included; the export control is disabled.
- **Multiple segment selection.** A verse cannot be selected and shifted as one group. Corrections are made one segment at a time.
- **Full keyboard coverage.** I included Space to play or pause, lyric reordering, seeking and small timing adjustments, but not every editing action has a keyboard path.
- **Preview-to-card navigation.** A nice-to-have I considered was clicking a line in the lyric preview to highlight its matching card in the lyrics panel. This would make it easier to find and edit the line being reviewed. It is not included in this version.

## AI assistance

I used AI assistance for the time-formatting and parsing helpers, the code that reads local audio duration, and shared CSS tokens. The work record also includes assistance with waveform integration. The choices and trade-offs are recorded in decisions.md.
