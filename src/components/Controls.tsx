import type { Dispatch, SetStateAction } from "react";

interface ControlsProps {
  isReady: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  playbackRate: number;
  setPlaybackRate: Dispatch<SetStateAction<number>>;
}

export default function Controls({
  isReady,
  isPlaying,
  onPlay,
  onPause,
  onStop,
  playbackRate,
  setPlaybackRate,
}: ControlsProps) {
  return (
    <div className="flex items-center gap-2 glass-card px-3 py-2">
      <button disabled={!isReady || isPlaying} onClick={onPlay} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-40">
        Play
      </button>
      <button disabled={!isReady || !isPlaying} onClick={onPause} className="px-3 py-2 rounded bg-amber-500 text-white disabled:opacity-40">
        Pause
      </button>
      <button disabled={!isReady} onClick={onStop} className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-40">
        Stop
      </button>

      <div className="ml-4 flex items-center gap-2">
        <label className="text-sm text-white/80">Speed</label>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={playbackRate}
          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
        />
        <span className="w-10 text-right text-sm">{playbackRate.toFixed(2)}x</span>
      </div>
    </div>
  );
}


