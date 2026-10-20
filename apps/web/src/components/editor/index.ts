export {Toolbar} from "./Toolbar";
export {Timeline} from "./Timeline";
export {LyricsPane} from "./LyricsPane";
export {LyricPreview} from "./LyricPreview";
export {SegmentInspector} from "./SegmentInspector";

export type LineTiming = {start: number; end: number};
export type LyricLine = {
  id: string;
  text: string;
  index: number;
  timing?: LineTiming;
  timingDraft?: Partial<LineTiming>;
};
export type Track = {
  title: string;
  audio_url: string;
  lines: LyricLine[];
  duration_seconds: number;
};
