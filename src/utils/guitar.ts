import type { MappingOptions, TabEvent, GuitarStringName } from "../types";

// Standard tuning MIDI numbers for open strings (low to high): E2 A2 D3 G3 B3 E4
// MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const STRING_OPEN_MIDI: Array<{ name: GuitarStringName; midi: number }> = [
  { name: "E2", midi: 40 },
  { name: "A2", midi: 45 },
  { name: "D3", midi: 50 },
  { name: "G3", midi: 55 },
  { name: "B3", midi: 59 },
  { name: "E4", midi: 64 },
];

const DEFAULT_MAPPING: Required<MappingOptions> = {
  maxFret: 12,
  tieBreakPreferLowerString: true,
  continuityWeight: 0.4,
  preferMelodyHighStrings: true,
  openStringBonus: 0.5,
  fretCostWeight: 1.0,
  continuityFretWeight: 1.0,
  continuityStringWeight: 1.5,
  evaluateOctaveShifts: true,
};

export interface StringFretChoice {
  stringIndex: number;
  stringName: GuitarStringName;
  fret: number;
}

function findPlayablePositions(midiNumber: number, maxFret: number): StringFretChoice[] {
  const choices: StringFretChoice[] = [];
  for (let s = 0; s < STRING_OPEN_MIDI.length; s += 1) {
    const openMidi = STRING_OPEN_MIDI[s].midi;
    const fret = midiNumber - openMidi;
    if (fret >= 0 && fret <= maxFret) {
      choices.push({ stringIndex: s, stringName: STRING_OPEN_MIDI[s].name, fret });
    }
  }
  return choices;
}

function scoreChoice(
  choice: StringFretChoice,
  previous: StringFretChoice | null,
  options: Required<MappingOptions>
): number {
  // Lower score is better
  let score = 0;

  // Prefer lower frets (beginner-friendly)
  score += options.fretCostWeight * choice.fret; // linear cost for fret number

  // Tie-breaker: prefer lower strings (bass to treble)
  if (options.tieBreakPreferLowerString) {
    score += choice.stringIndex * 0.1;
  }

  // Melody bias: prefer higher strings (treble) for melody leads
  if (options.preferMelodyHighStrings) {
    const highness = (5 - choice.stringIndex) / 5; // 0..1 where 1 is highest string
    score += (1 - highness) * 0.6; // small encouragement toward higher strings
  }

  // Open string bonus
  if (choice.fret === 0) {
    score -= options.openStringBonus;
  }

  // Continuity: keep close to previous fret and string
  if (previous) {
    const fretDelta = Math.abs(choice.fret - previous.fret);
    const stringDelta = Math.abs(choice.stringIndex - previous.stringIndex);
    score += options.continuityWeight * (
      options.continuityFretWeight * fretDelta +
      options.continuityStringWeight * stringDelta
    );
  }

  return score;
}

function buildChoicesForMidi(midiNumber: number, options: Required<MappingOptions>): StringFretChoice[] {
  // Generate choices at original pitch and optionally +/- 12 semitones (octave shifts)
  const candidates: StringFretChoice[] = [];
  const midiCandidates = options.evaluateOctaveShifts ? [midiNumber, midiNumber + 12, midiNumber - 12] : [midiNumber];
  for (const m of midiCandidates) {
    const choices = findPlayablePositions(m, Math.max(24, options.maxFret));
    for (const c of choices) {
      if (c.fret <= options.maxFret + 2) {
        // allow a small tolerance above maxFret for better continuity, will be penalized by fret cost
        candidates.push(c);
      }
    }
  }
  // Deduplicate same string/fret pairs
  const key = (c: StringFretChoice) => `${c.stringIndex}:${c.fret}`;
  const map = new Map<string, StringFretChoice>();
  for (const c of candidates) map.set(key(c), c);
  return Array.from(map.values());
}

export function mapMidiToTabs(events: TabEvent[], opts?: MappingOptions): TabEvent[] {
  const options: Required<MappingOptions> = { ...DEFAULT_MAPPING, ...(opts || {}) };

  // Dynamic programming for smooth fingering sequence
  const n = events.length;
  const choicesPerNote: StringFretChoice[][] = events.map((e) => buildChoicesForMidi(e.midi, options));
  const dp: number[][] = choicesPerNote.map((choices) => choices.map(() => Infinity));
  const prevIdx: number[][] = choicesPerNote.map((choices) => choices.map(() => -1));

  // Initialize first note
  const firstLen = choicesPerNote[0] ? choicesPerNote[0].length : 0;
  for (let j = 0; j < firstLen; j += 1) {
    const choice = choicesPerNote[0][j];
    dp[0][j] = scoreChoice(choice, null, options);
  }

  // Transition
  for (let i = 1; i < n; i += 1) {
    for (let j = 0; j < choicesPerNote[i].length; j += 1) {
      const choice = choicesPerNote[i][j];
      let best = Infinity;
      let bestK = -1;
      for (let k = 0; k < choicesPerNote[i - 1].length; k += 1) {
        const prevChoice = choicesPerNote[i - 1][k];
        const cost = dp[i - 1][k] + scoreChoice(choice, prevChoice, options);
        if (cost < best) {
          best = cost;
          bestK = k;
        }
      }
      dp[i][j] = best;
      prevIdx[i][j] = bestK;
    }
  }

  // Backtrack best path
  let endJ = 0;
  if (n > 0) {
    let best = dp[n - 1][0];
    endJ = 0;
    for (let j = 1; j < dp[n - 1].length; j += 1) {
      if (dp[n - 1][j] < best) {
        best = dp[n - 1][j];
        endJ = j;
      }
    }
  }

  const result: TabEvent[] = events.map((e) => ({ ...e }));
  let j = endJ;
  for (let i = n - 1; i >= 0; i -= 1) {
    const choice = choicesPerNote[i][j] || { stringIndex: 0, stringName: "E2" as const, fret: 0 };
    result[i].stringIndex = choice.stringIndex;
    result[i].stringName = choice.stringName;
    result[i].fret = choice.fret;
    j = prevIdx[i][j] >= 0 ? prevIdx[i][j] : 0;
  }

  return result;
}

export function formatStringLabel(stringIndex: number): string {
  // 0..5 -> 6..1
  return `${6 - stringIndex}`;
}


