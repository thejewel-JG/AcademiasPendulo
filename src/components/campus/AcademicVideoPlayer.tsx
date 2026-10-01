import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Pause, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, Clock, CheckSquare, Square } from 'lucide-react';

interface AcademicVideoPlayerProps {
  materialId: string;
  title: string;
  videoUrl?: string;
  provider?: string;
  version?: number;
  onProgressUpdated?: () => void;
}

export const AcademicVideoPlayer: React.FC<AcademicVideoPlayerProps> = ({
  materialId,
  title,
  videoUrl,
  provider = 'DIRECT',
  version = 1,
  onProgressUpdated
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secuencia, setSecuencia] = useState<number>(0);
  const [savedPosition, setSavedPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [uniqueWatchedSec, setUniqueWatchedSec] = useState<number>(0);
  const [estado, setEstado] = useState<'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO'>('NO_INICIADO');
  const [marcadoManual, setMarcadoManual] = useState<boolean>(false);
  const [umbralPct, setUmbralPct] = useState<number>(90);
  
  // UI state
  const [promptResume, setPromptResume] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [trackingStatus, setTrackingStatus] = useState<'ACTIVE' | 'LIMITED' | 'ERROR'>('ACTIVE');
  const [trackingMessage, setTrackingMessage] = useState<string>('Seguimiento de tramos únicos activo');
  
  // Tracking timing references
  const intervalTickRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Helper: Format seconds to MM:SS
  const formatTime = (totalSec: number): string => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Initialize playback session on material open
  useEffect(() => {
    let isSubscribed = true;

    const initSession = async () => {
      try {
        const res = await fetch('/api/progress/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId })
        });

        if (!res.ok) {
          const errData = await res.json();
          setTrackingStatus('LIMITED');
          setTrackingMessage(errData.error || 'Seguimiento no disponible en esta sesión');
          return;
        }

        const data = await res.json();
        if (!isSubscribed) return;

        setSessionId(data.sesion_reproduccion_id);
        setSavedPosition(data.posicion_segundos || 0);
        setDuration(data.duracion_segundos || 0);
        setUniqueWatchedSec(data.tiempo_unico_segundos || 0);
        setEstado(data.estado || 'NO_INICIADO');
        setMarcadoManual(Boolean(data.marcado_manual));
        setUmbralPct(data.umbral_completado_pct || 90);
        setSecuencia(1);

        if (data.prompt_resume && data.posicion_segundos > 5) {
          setPromptResume(true);
        } else {
          setHasStarted(true);
        }

        // Detect embed type support
        if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('vimeo.com'))) {
          setTrackingStatus('LIMITED');
          setTrackingMessage('Vídeo externo embebido: Seguimiento por ticks de tiempo activo. Se recomienda marcar revisión manual.');
        } else {
          setTrackingStatus('ACTIVE');
          setTrackingMessage('Seguimiento automático de intervalos únicos habilitado');
        }

      } catch (err: any) {
        console.error('Error starting video session:', err);
        setTrackingStatus('ERROR');
        setTrackingMessage('No se pudo verificar sesión con el servidor');
      }
    };

    initSession();

    return () => {
      isSubscribed = false;
      if (intervalTickRef.current) clearInterval(intervalTickRef.current);
    };
  }, [materialId]);

  // 2. Periodic Progress Tick function
  const sendTick = async (forcedInterval?: { inicio_seg: number; fin_seg: number }, forcedPos?: number) => {
    if (!sessionId) return;

    const currentPos = forcedPos !== undefined ? forcedPos : (videoRef.current ? Math.floor(videoRef.current.currentTime) : lastPositionRef.current);
    const videoDur = videoRef.current ? Math.floor(videoRef.current.duration) : duration;
    const now = Date.now();
    const elapsedMs = Math.max(1000, now - lastTickTimeRef.current);
    lastTickTimeRef.current = now;

    let intervalToSend = forcedInterval;
    if (!intervalToSend && isPlayingRef.current) {
      const prevPos = lastPositionRef.current;
      if (currentPos > prevPos && (currentPos - prevPos) <= 30) {
        intervalToSend = { inicio_seg: prevPos, fin_seg: currentPos };
      }
    }

    lastPositionRef.current = currentPos;

    try {
      const currentSeq = secuencia;
      setSecuencia((prev) => prev + 1);

      const res = await fetch('/api/progress/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          sesionReproduccionId: sessionId,
          secuencia: currentSeq,
          posicionSegundos: currentPos,
          duracionSegundos: videoDur > 0 ? videoDur : duration,
          intervaloNuevo: intervalToSend,
          playbackRate: videoRef.current ? videoRef.current.playbackRate : 1.0,
          elapsedMs
        })
      });

      const data = await res.json();
      if (data.status === 'OK') {
        setSavedPosition(data.posicion_segundos);
        if (data.duracion_segundos > 0) setDuration(data.duracion_segundos);
        setUniqueWatchedSec(data.tiempo_unico_segundos);
        setEstado(data.estado);
        if (onProgressUpdated) onProgressUpdated();
      }
    } catch (err) {
      console.warn('[VIDEO TRACKING] Tick failed:', err);
    }
  };

  // Set up 12-second periodic tick interval while active
  useEffect(() => {
    if (!sessionId) return;

    intervalTickRef.current = setInterval(() => {
      sendTick();
    }, 12000);

    return () => {
      if (intervalTickRef.current) clearInterval(intervalTickRef.current);
    };
  }, [sessionId, secuencia]);

  // Page unload / exit last tick attempt
  useEffect(() => {
    const handleUnload = () => {
      if (!sessionId) return;
      const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : lastPositionRef.current;
      const payload = JSON.stringify({
        materialId,
        sesionReproduccionId: sessionId,
        secuencia: secuencia + 10,
        posicionSegundos: pos,
        duracionSegundos: duration,
        playbackRate: 1.0,
        elapsedMs: 10000
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/progress/tick', blob);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sessionId, materialId, secuencia, duration]);

  // Resume Action Handlers
  const handleResumeClick = () => {
    setPromptResume(false);
    setHasStarted(true);
    if (videoRef.current && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleStartOverClick = () => {
    setPromptResume(false);
    setHasStarted(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // Toggle Manual Completion ("Marcar como revisado")
  const handleToggleManual = async () => {
    const nextVal = !marcadoManual;
    setMarcadoManual(nextVal);
    try {
      const res = await fetch('/api/progress/manual-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, marcadoManual: nextVal })
      });
      const data = await res.json();
      if (data.status === 'OK') {
        setEstado(data.estado);
        if (onProgressUpdated) onProgressUpdated();
      }
    } catch (err) {
      console.error('Error toggling manual completion:', err);
    }
  };

  // Native Video Handlers
  const handleVideoPlay = () => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    lastTickTimeRef.current = Date.now();
    if (videoRef.current) {
      lastPositionRef.current = Math.floor(videoRef.current.currentTime);
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    sendTick();
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    const dur = videoRef.current ? Math.floor(videoRef.current.duration) : duration;
    sendTick(undefined, dur);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(Math.floor(videoRef.current.duration));
      if (promptResume && savedPosition > 0) {
        // Wait for resume prompt choice
      }
    }
  };

  // Calculate percentage of unique watched time
  const effectiveDur = duration > 0 ? duration : 1;
  const uniquePct = Math.min(100, Math.round((uniqueWatchedSec / effectiveDur) * 100));

  // Determine if video is an HTML5 video stream/file vs iframe
  const isDirectVideo = videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.m3u8'));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4">
      {/* Player Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-sm font-bold text-white truncate">{title}</h3>
          <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
            v{version}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              estado === 'COMPLETADO'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : estado === 'EN_PROGRESO'
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            {estado === 'COMPLETADO' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {estado === 'EN_PROGRESO' && <Clock className="w-3.5 h-3.5" />}
            {estado === 'NO_INICIADO' && <PlayCircle className="w-3.5 h-3.5" />}
            <span>{estado === 'COMPLETADO' ? 'Completado' : estado === 'EN_PROGRESO' ? 'En Progreso' : 'No Iniciado'}</span>
          </span>

          <span className="text-xs font-bold text-zinc-300">
            {uniquePct}% tiempo único visto ({formatTime(uniqueWatchedSec)} / {formatTime(duration)})
          </span>
        </div>
      </div>

      {/* Resume Prompt Modal Banner */}
      {promptResume && (
        <div className="bg-gradient-to-r from-red-950/80 via-zinc-900 to-zinc-900 border border-red-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl">
          <div className="space-y-1">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-500" /> Posición guardada detectada
            </div>
            <p className="text-xs text-zinc-300">
              ¿Quieres continuar la reproducción desde el minuto <strong className="text-white">{formatTime(savedPosition)}</strong>?
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResumeClick}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" /> Continuar desde {formatTime(savedPosition)}
            </button>
            <button
              onClick={handleStartOverClick}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Empezar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
        {isDirectVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onEnded={handleVideoEnded}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full"
          />
        ) : (
          <iframe
            src={videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Unique Interval Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-400">
          <span>Tiempo único reproducido (Umbral de completado: {umbralPct}%)</span>
          <span className="text-white font-mono">{uniquePct}% / 100%</span>
        </div>
        <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800 relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              uniquePct >= umbralPct ? 'bg-emerald-500' : 'bg-red-600'
            }`}
            style={{ width: `${uniquePct}%` }}
          />
        </div>
      </div>

      {/* Controls & Legal / Academic Disclaimers Row */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {trackingStatus === 'ACTIVE' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-zinc-400 text-[11px]">{trackingMessage}</span>
        </div>

        {/* Manual Completion Declaration Checkbox */}
        <button
          onClick={handleToggleManual}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
            marcadoManual
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
        >
          {marcadoManual ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-zinc-500" />}
          <span>Marcar como revisado (Declaración de alumno)</span>
        </button>
      </div>

      {/* Compliance Notice */}
      <div className="text-[10px] text-zinc-500 leading-tight space-y-0.5 border-t border-zinc-800/60 pt-2">
        <p>
          * <strong>Criterio de tiempo único:</strong> Se registran e integran únicamente los intervalos reproducidos sin contar repeticiones. Saltar directamente al final no marca la lección como completada si no se alcanza el {umbralPct}% de tiempo único visto.
        </p>
        <p>
          * <strong>Aviso legal:</strong> Estas métricas son únicamente de carácter orientativo pedagógico y no constituyen prueba de atención o presencia física oficial.
        </p>
      </div>
    </div>
  );
};
