import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import Upload from "./components/Upload";
import Timeline from "./components/Timeline";
import Controls from "./components/Controls";
import TrackPicker from "./components/TrackPicker";
import { parseMidiFile } from "./utils/midi";
import { parseMidiFileDetailed } from "./utils/midi";
import { mapMidiToTabs } from "./utils/guitar";
import type { ParsedMidiData, TabEvent, MidiTrackInfo } from "./types";
import { createPlaybackEngine } from "./audio/playback";
import type { PlaybackEngine } from "./audio/playback";

function App() {
  const [parsed, setParsed] = useState<ParsedMidiData | null>(null);
  const [mapped, setMapped] = useState<TabEvent[]>([]);
  const [tracks, setTracks] = useState<MidiTrackInfo[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const engineRef = useRef<PlaybackEngine | null>(null);

  const isReady = !!parsed && mapped.length > 0;
  const durationSec = parsed?.durationSec ?? 0;

  const onFile = useCallback(async (file: File) => {
    const dataBasic = await parseMidiFile(file);
    const dataDetailed = await parseMidiFileDetailed(file);
    setTracks(dataDetailed.tracks.filter((t) => !t.isDrum && t.stats.noteCount > 0));
    setSelectedTrackId(null);

    // Fallback: map the combined events initially (may be busy); better after selection
    const fallbackMapped = mapMidiToTabs(dataBasic.events, { maxFret: 12, continuityWeight: 0.5 });
    setParsed({ ...dataBasic, tracks: dataDetailed.tracks });
    setMapped(fallbackMapped);
    setCurrentTimeSec(0);
    setIsPlaying(false);
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.dispose();
      engineRef.current = null;
    }
    engineRef.current = await createPlaybackEngine(fallbackMapped, (t) => setCurrentTimeSec(t));
  }, []);

  const handlePlay = useCallback(async () => {
    if (!engineRef.current || !parsed) return;
    await engineRef.current.start(currentTimeSec, playbackRate);
    setIsPlaying(true);
  }, [currentTimeSec, playbackRate, parsed]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    setCurrentTimeSec(0);
    setIsPlaying(false);
  }, []);

  const handleTrackSelect = useCallback(async (trackId: string) => {
    if (!parsed || !parsed.tracks) return;
    const tr = parsed.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    setSelectedTrackId(trackId);
    const events: TabEvent[] = tr.notes.map((n, idx) => ({
      id: `${idx}`,
      timeSec: n.timeSec,
      durationSec: n.durationSec,
      midi: n.midi,
      velocity: n.velocity,
      stringName: "E2",
      stringIndex: 0,
      fret: 0,
    }));
    const mappedEvents = mapMidiToTabs(events, {
      maxFret: 12,
      continuityWeight: 0.7,
      preferMelodyHighStrings: true,
      openStringBonus: 0.6,
      fretCostWeight: 1.0,
      continuityFretWeight: 1.0,
      continuityStringWeight: 1.6,
      evaluateOctaveShifts: true,
    });
    setMapped(mappedEvents);
    setCurrentTimeSec(0);
    setIsPlaying(false);
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.dispose();
      engineRef.current = null;
    }
    engineRef.current = await createPlaybackEngine(mappedEvents, (t) => setCurrentTimeSec(t));
  }, [parsed]);

  const handleTrackPreview = useCallback(async (trackId: string) => {
    if (!parsed || !parsed.tracks) return;
    const tr = parsed.tracks.find((t) => t.id === trackId);
    if (!tr || !engineRef.current) return;
    await engineRef.current.previewSequence(tr.notes);
  }, [parsed]);

  // Keep engine rate in sync
  useEffect(() => {
    if (engineRef.current) engineRef.current.setRate(playbackRate);
  }, [playbackRate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container-wide mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>MIDI to Guitar Tabs</h1>
          <p className="text-white/70 mt-1">Turn any MIDI into beginner-friendly fingerpicking tabs with synced playback.</p>
        </div>

        <div className="mb-6">
          <Upload onFile={onFile} />
        </div>

        {tracks.length > 0 && (
          <TrackPicker
            tracks={tracks}
            selectedId={selectedTrackId}
            onSelect={handleTrackSelect}
            onPreview={handleTrackPreview}
            onStopPreview={() => engineRef.current?.stop()}
          />
        )}

        <div className="flex items-center justify-between mb-4">
          <Controls
            isReady={isReady}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            playbackRate={playbackRate}
            setPlaybackRate={setPlaybackRate}
          />
          <div className="text-sm text-white/70">{isReady ? `${durationSec.toFixed(2)}s` : "No file loaded"}</div>
        </div>

        {isReady && (
          <Timeline
            events={mapped}
            currentTimeSec={currentTimeSec}
            durationSec={durationSec}
            onSeek={(t) => {
              if (!isPlaying) {
                setCurrentTimeSec(t);
                engineRef.current?.seekTo(t);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
