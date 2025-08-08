import { useMemo, useRef, useEffect, useState } from "react";
import type { TabEvent } from "../types";
import { formatStringLabel } from "../utils/guitar";

interface TimelineProps {
  events: TabEvent[];
  currentTimeSec: number;
  durationSec: number;
  onSeek?: (seconds: number) => void;
}

// Simple horizontally scrolling lane view. Each string is a row. Notes render as chips with fret numbers.
export default function Timeline({ events, currentTimeSec, durationSec, onSeek }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const byString = useMemo(() => {
    const grouped: Record<number, TabEvent[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const e of events) grouped[e.stringIndex].push(e);
    for (const k of Object.keys(grouped)) grouped[Number(k)].sort((a, b) => a.timeSec - b.timeSec);
    return grouped;
  }, [events]);

  const pxPerSec = 150; // scale
  const playheadX = currentTimeSec * pxPerSec;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const padding = 200;
    if (playheadX > el.scrollLeft + el.clientWidth - padding || playheadX < el.scrollLeft + padding) {
      el.scrollTo({ left: Math.max(0, playheadX - el.clientWidth / 2), behavior: "smooth" });
    }
  }, [playheadX]);

  function secondsFromClientX(clientX: number): number {
    const el = containerRef.current;
    if (!el) return currentTimeSec;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    return Math.max(0, Math.min(durationSec, x / pxPerSec));
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!onSeek) return;
    setIsDragging(true);
    const t = secondsFromClientX(e.clientX);
    onSeek(t);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!onSeek || !isDragging) return;
    const t = secondsFromClientX(e.clientX);
    onSeek(t);
  }

  function onMouseUp() {
    setIsDragging(false);
  }

  return (
    <div className="w-full border rounded bg-white/5">
      <div className="flex justify-between text-xs px-3 py-2 text-white/80">
        <div>Duration: {durationSec.toFixed(2)}s</div>
        <div>Notes: {events.length}</div>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden border-t cursor-col-resize"
        style={{ height: 6 * 48 + 40 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="relative" style={{ width: `${Math.max(durationSec * pxPerSec + 200, 800)}px` }}>
          {/* Lanes */}
          {Array.from({ length: 6 }).map((_, s) => (
            <div key={s} className="absolute left-0 right-0 border-b border-white/10" style={{ top: s * 48 + 20, height: 48 }}>
              <div className="absolute left-0 top-2 text-xs text-white/70 w-10 text-center">{formatStringLabel(s)}</div>
            </div>
          ))}

          {/* Notes */}
          {Object.entries(byString).map(([s, list]) =>
            list.map((e) => {
              const x = e.timeSec * pxPerSec;
              const w = Math.max(22, e.durationSec * pxPerSec);
              const y = Number(s) * 48 + 20 + 6;
              const isActive = currentTimeSec >= e.timeSec && currentTimeSec <= e.timeSec + e.durationSec;
              return (
                <div
                  key={e.id}
                  className={`absolute rounded text-white text-xs flex items-center justify-center shadow ${isActive ? "bg-yellow-500" : "bg-emerald-600"}`}
                  style={{ left: x, top: y, width: w, height: 36 }}
                  title={`String ${formatStringLabel(Number(s))}, fret ${e.fret}`}
                >
                  {e.fret}
                </div>
              );
            })
          )}

          {/* Playhead */}
          <div className={`absolute top-0 bottom-0 ${isDragging ? "w-1" : "w-0.5"} bg-red-500`} style={{ left: playheadX }} />
        </div>
      </div>
    </div>
  );
}


