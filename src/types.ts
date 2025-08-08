export type GuitarStringName = "E2" | "A2" | "D3" | "G3" | "B3" | "E4";

export interface TabEvent {
  id: string;
  timeSec: number;
  durationSec: number;
  midi: number;
  velocity: number; // 0..1
  stringName: GuitarStringName;
  stringIndex: number; // 0 = low E2 (6th), 5 = high E4 (1st)
  fret: number; // 0..24
}

export interface ParsedMidiData {
  durationSec: number;
  bpm: number | null;
  events: TabEvent[];
  tracks?: MidiTrackInfo[];
}

export interface MappingOptions {
  maxFret?: number; // default 12 for beginner friendliness
  tieBreakPreferLowerString?: boolean; // default true
  continuityWeight?: number; // influence to keep close to previous fret
  preferMelodyHighStrings?: boolean; // default true
  openStringBonus?: number; // default 0.5
  fretCostWeight?: number; // default 1.0
  continuityFretWeight?: number; // default 1.0
  continuityStringWeight?: number; // default 1.5
  evaluateOctaveShifts?: boolean; // default true
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTimeSec: number;
}

export interface MidiNoteSimple {
  timeSec: number;
  durationSec: number;
  midi: number;
  velocity: number;
}

export interface MidiTrackInfo {
  id: string;
  name: string | null;
  channel: number | null;
  program: number | null; // GM program 0-127
  isDrum: boolean;
  durationSec: number;
  notes: MidiNoteSimple[];
  stats: {
    noteCount: number;
    avgMidi: number;
    avgVelocity: number;
    avgConcurrency: number; // 1.0 means monophonic; >1 means polyphonic
  };
}


