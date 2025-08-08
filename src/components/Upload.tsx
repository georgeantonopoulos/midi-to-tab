interface UploadProps {
  onFile: (file: File) => void;
}

export default function Upload({ onFile }: UploadProps) {
  return (
    <label className="block glass-card p-6 text-center cursor-pointer hover:shadow-lg transition">
      <div className="text-white/90 panel-title mb-1">Upload a MIDI</div>
      <div className="text-white/60 text-sm">Drag & drop or click to browse</div>
      <input
        type="file"
        accept=".mid,.midi,audio/midi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}


