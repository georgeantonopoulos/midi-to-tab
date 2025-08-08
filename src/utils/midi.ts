import { Midi } from "@tonejs/midi";
import type { ParsedMidiData, MidiTrackInfo, MidiNoteSimple } from "../types";

export async function parseMidiFile(file: File): Promise<ParsedMidiData> {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  // Concatenate all track notes into a single, sorted list
  const notes = midi.tracks.flatMap((t) => t.notes);
  notes.sort((a, b) => a.time - b.time);

  const durationSec = midi.duration || (notes.length ? notes[notes.length - 1].time + notes[notes.length - 1].duration : 0);

  // Try to extract bpm if present
  const tempoEvent = midi.header.tempos?.[0];
  const bpm = tempoEvent?.bpm ?? null;

  return {
    durationSec,
    bpm,
    events: notes.map((n, idx) => ({
      id: `${idx}`,
      timeSec: n.time,
      durationSec: n.duration,
      midi: n.midi,
      velocity: n.velocity,
      // placeholders, will be filled by mapping stage
      stringName: "E2",
      stringIndex: 0,
      fret: 0,
    })),
  };
}

function computeAvgConcurrency(notes: MidiNoteSimple[]): number {
  if (notes.length === 0) return 0;
  // Sweep line over start/end times
  const edges: Array<{ t: number; delta: number }> = [];
  for (const n of notes) {
    edges.push({ t: n.timeSec, delta: +1 });
    edges.push({ t: n.timeSec + n.durationSec, delta: -1 });
  }
  edges.sort((a, b) => a.t - b.t || a.delta - b.delta);
  let active = 0;
  let lastT = edges[0].t;
  let weightedSum = 0;
  let total = 0;
  for (const e of edges) {
    const dt = Math.max(0, e.t - lastT);
    if (dt > 0) {
      weightedSum += active * dt;
      total += dt;
      lastT = e.t;
    } else {
      lastT = e.t;
    }
    active += e.delta;
  }
  if (total === 0) return 1;
  return weightedSum / total;
}

export async function parseMidiFileDetailed(file: File): Promise<{ durationSec: number; bpm: number | null; tracks: MidiTrackInfo[]; }>{
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const tempoEvent = midi.header.tempos?.[0];
  const bpm = tempoEvent?.bpm ?? null;

  const tracks: MidiTrackInfo[] = midi.tracks.map((t, idx) => {
    const notes: MidiNoteSimple[] = t.notes.map((n) => ({
      timeSec: n.time,
      durationSec: n.duration,
      midi: n.midi,
      velocity: n.velocity,
    }));
    notes.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = t.duration || (notes.length ? notes[notes.length - 1].timeSec + notes[notes.length - 1].durationSec : 0);
    const avgMidi = notes.length ? notes.reduce((s, n) => s + n.midi, 0) / notes.length : 0;
    const avgVelocity = notes.length ? notes.reduce((s, n) => s + n.velocity, 0) / notes.length : 0;
    const avgConcurrency = computeAvgConcurrency(notes);
    const program = t.instrument.number ?? null;
    const isDrum = !!t.instrument.percussion;
    const name = t.name || t.instrument.name || null;
    return {
      id: `${idx}`,
      name,
      channel: t.channel ?? null,
      program,
      isDrum,
      durationSec,
      notes,
      stats: {
        noteCount: notes.length,
        avgMidi,
        avgVelocity,
        avgConcurrency,
      },
    };
  });

  const durationSec = midi.duration || Math.max(0, ...tracks.map((tr) => tr.durationSec));
  return { durationSec, bpm, tracks };
}


