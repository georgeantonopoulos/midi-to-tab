import * as Tone from "tone";
import type { TabEvent } from "../types";

export interface PlaybackEngine {
  start: (startAtSec?: number, rate?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  dispose: () => void;
  getTimeSec: () => number;
  setRate: (rate: number) => void;
  previewSequence: (notes: Array<{ timeSec: number; durationSec: number; midi: number; velocity: number }>) => Promise<void>;
  seekTo: (seconds: number) => void;
}

export async function createPlaybackEngine(events: TabEvent[], onTick?: (timeSec: number) => void): Promise<PlaybackEngine> {
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({ volume: -8 });

  const schedule = events.map((e) => ({ time: e.timeSec, duration: e.durationSec, midi: e.midi, velocity: e.velocity }));

  const part = new Tone.Part((time, value: any) => {
    const freq = Tone.Frequency(value.midi, "midi").toFrequency();
    synth.triggerAttackRelease(freq, value.duration, time, Math.max(0.1, value.velocity));
  }, schedule).start(0);

  // UI update scheduling using Transport.scheduleRepeat
  let uiRepeatId: number | null = null;
  const scheduleUi = () => {
    if (!onTick) return;
    if (uiRepeatId !== null) return;
    uiRepeatId = Tone.Transport.scheduleRepeat(() => {
      onTick(Tone.Transport.seconds);
    }, 1 / 30); // ~30Hz
  };
  const unscheduleUi = () => {
    if (uiRepeatId !== null) {
      Tone.Transport.clear(uiRepeatId);
      uiRepeatId = null;
    }
  };

  function setRate(_r: number) {
    // Tone v15 does not expose Transport.playbackRate in types; tempo scaling can be simulated via BPM.
    // Leaving hook for future enhancement.
  }

  return {
    start: async (startAtSec = 0, r?: number) => {
      await Tone.start();
      if (typeof r === "number") setRate(r);
      Tone.Transport.seconds = startAtSec;
      part.start(0);
      scheduleUi();
      Tone.Transport.start();
    },
    pause: () => {
      Tone.Transport.pause();
      unscheduleUi();
    },
    stop: () => {
      Tone.Transport.stop();
      Tone.Transport.seconds = 0;
      unscheduleUi();
    },
    dispose: () => {
      part.dispose();
      synth.dispose();
      unscheduleUi();
    },
    getTimeSec: () => Tone.Transport.seconds,
    setRate,
    previewSequence: async (notes) => {
      await Tone.start();
      const now = Tone.now();
      notes.forEach((n) => {
        const freq = Tone.Frequency(n.midi, "midi").toFrequency();
        synth.triggerAttackRelease(freq, Math.max(0.05, n.durationSec), now + n.timeSec, Math.max(0.1, n.velocity));
      });
    },
    seekTo: (seconds: number) => {
      Tone.Transport.seconds = Math.max(0, seconds);
    },
  };
}


