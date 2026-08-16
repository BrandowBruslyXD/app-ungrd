// Reproductor de notas de voz estilo WhatsApp para la vista previa del editor:
// botón redondo de play/pausa, barra de progreso arrastrable y tiempo mm:ss.
import { useEffect, useRef, useState } from 'react';

function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ src, verified }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  // Sincroniza el <audio> oculto con el estado del reproductor.
  useEffect(() => {
    // Al cambiar la fuente (p.ej. de blob local a copia del servidor) se
    // resetea el estado: evita quedar "reproduciendo" un audio pausado.
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setCurrent(t);
  };

  const pct = duration ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="flex w-52 items-center gap-2">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#00a884] text-white shadow-sm hover:bg-[#029276]"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          onChange={seek}
          aria-label="Posición de reproducción"
          className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[#00a884]"
          style={{ background: `linear-gradient(to right, #00a884 ${pct}%, #cbd5e1 ${pct}%)` }}
        />
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
          <span>{fmtTime(current)} / {fmtTime(duration)}</span>
          {verified && <span title="Copia recibida y guardada en el servidor">✓ recibido</span>}
        </div>
      </div>
    </div>
  );
}
