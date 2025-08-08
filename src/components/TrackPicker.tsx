import type { MidiTrackInfo } from "../types";

interface TrackPickerProps {
  tracks: MidiTrackInfo[];
  selectedId: string | null;
  onSelect: (trackId: string) => void;
  onPreview: (trackId: string) => void;
  onStopPreview: () => void;
}

export default function TrackPicker({ tracks, selectedId, onSelect, onPreview, onStopPreview }: TrackPickerProps) {
  if (!tracks.length) return null;
  return (
    <div className="mb-6 glass-card p-4">
      <div className="mb-3 text-white/90 panel-title">Pick the melody track</div>
      <div className="grid gap-2">
        {tracks.map((t) => (
          <div key={t.id} className={`flex items-center justify-between rounded border px-3 py-2 ${selectedId === t.id ? "border-emerald-500 bg-emerald-500/10" : "border-white/10"}`}>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t.name || `Track ${t.id}`} {t.isDrum ? "(Drums)" : ""}</span>
              <span className="text-xs text-white/60">notes: {t.stats.noteCount} • avg pitch: {t.stats.avgMidi.toFixed(1)} • polyphony: {t.stats.avgConcurrency.toFixed(2)} • program: {t.program ?? "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded text-xs bg-gray-700" onClick={() => onPreview(t.id)}>Preview</button>
              <button className="px-2 py-1 rounded text-xs bg-gray-700" onClick={onStopPreview}>Stop</button>
              <button className="px-2 py-1 rounded text-xs bg-blue-600" onClick={() => onSelect(t.id)}>Select</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


