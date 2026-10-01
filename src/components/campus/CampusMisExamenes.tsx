import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  ClipboardCheck, CheckCircle2, XCircle, Clock, AlertCircle,
  PlayCircle, BookOpen, Award, ChevronRight, RefreshCw
} from 'lucide-react';

interface Exam {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  nota_minima_aprobado: number;
  puntuacion_maxima: number;
  duracion_minutos: number | null;
  intentos_permitidos: number;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  estado: string;
  especialidad_nombre: string;
  num_preguntas: number;
}

interface ExamResult {
  examen_id: string;
  nota: number;
  aprobado: number;
  intento: number;
  finalizado_en: string;
  examen_titulo: string;
  nota_minima_aprobado: number;
}

interface ActiveExam {
  exam: Exam;
  questions: any[];
  current_attempt: number;
}

export const CampusMisExamenes: React.FC = () => {
  const { currentUser, activeEnrollmentData } = useCampus();

  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/academic/exams${activeEnrollmentData?.grupo_id ? `?group_id=${activeEnrollmentData.grupo_id}` : ''}`).then(r => r.ok ? r.json() : { exams: [] }),
      fetch('/api/academic/my-results').then(r => r.ok ? r.json() : { results: [] })
    ]).then(([exData, resData]) => {
      setExams(exData.exams || []);
      setResults(resData.results || []);
    }).catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Timer for active exam
  useEffect(() => {
    if (!activeExam) return;
    const interval = setInterval(() => setTimer(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [activeExam, startTime]);

  const getResultForExam = (examId: string) => results.find(r => r.examen_id === examId);

  const handleStartExam = async (exam: Exam) => {
    try {
      const res = await fetch(`/api/academic/exams/${exam.id}/take`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'No se puede iniciar el examen.');
        return;
      }
      const data = await res.json();
      setActiveExam(data);
      setAnswers({});
      setExamResult(null);
      setStartTime(Date.now());
      setTimer(0);
    } catch (err) {
      alert('Error al cargar el examen.');
    }
  };

  const handleSubmitExam = async () => {
    if (!activeExam || !activeEnrollmentData) return;
    if (Object.keys(answers).length < activeExam.questions.length) {
      const unanswered = activeExam.questions.length - Object.keys(answers).length;
      if (!confirm(`Tienes ${unanswered} pregunta(s) sin responder. ¿Quieres enviar igualmente?`)) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/academic/exams/${activeExam.exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respuestas: answers,
          matricula_id: activeEnrollmentData.matricula_id,
          tiempo_empleado_segundos: timer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setExamResult(data);
        // refresh results
        fetch('/api/academic/my-results').then(r => r.ok ? r.json() : { results: [] }).then(d => setResults(d.results || []));
      } else {
        alert(data.error || 'Error al enviar el examen.');
      }
    } catch (err) {
      alert('Error de conexión al enviar el examen.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="p-8 text-center text-gray-500 font-semibold flex items-center justify-center gap-2">
      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      Cargando exámenes...
    </div>
  );

  // EXAM RESULT SCREEN
  if (examResult) {
    const aprobado = examResult.aprobado;
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg ${aprobado ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {aprobado ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">{aprobado ? '¡Aprobado!' : 'No aprobado'}</h2>
            <p className="text-gray-500 text-sm mt-1">{activeExam?.exam.titulo}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-600">Nota obtenida</span>
              <span className={`text-xl font-black ${aprobado ? 'text-emerald-700' : 'text-rose-700'}`}>{examResult.nota?.toFixed(2)} / 10</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Puntos</span>
              <span>{examResult.puntos_obtenidos?.toFixed(1)} / {examResult.puntos_maximos}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tiempo empleado</span>
              <span>{formatTimer(timer)}</span>
            </div>
          </div>
          <button
            onClick={() => { setActiveExam(null); setExamResult(null); }}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-sm rounded-xl transition-all"
          >
            Volver a Mis Exámenes
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE EXAM SCREEN
  if (activeExam) {
    const exam = activeExam.exam;
    const questions = activeExam.questions;
    const answered = Object.keys(answers).length;

    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Exam Header */}
        <div className="bg-gray-900 text-white p-4 rounded-2xl flex justify-between items-center sticky top-0 z-10 shadow-xl">
          <div>
            <h2 className="font-black text-base">{exam.titulo}</h2>
            <p className="text-xs text-gray-400">{answered}/{questions.length} respondidas</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 px-3 py-1.5 rounded-xl text-sm font-mono font-bold text-amber-400">
              ⏱ {formatTimer(timer)}
            </div>
            <button
              onClick={handleSubmitExam}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all"
            >
              {submitting ? 'Enviando...' : 'Enviar Examen'}
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const opciones = typeof q.opciones === 'string' ? JSON.parse(q.opciones) : (q.opciones || []);
            return (
              <div key={q.id} className={`bg-white rounded-2xl border p-5 space-y-3 transition-all ${answers[q.id] ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                  <p className="font-semibold text-sm text-gray-900 flex-1">{q.enunciado}</p>
                </div>

                {q.tipo === 'VERDADERO_FALSO' ? (
                  <div className="flex gap-3 pl-10">
                    {['Verdadero', 'Falso'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt === 'Verdadero' ? 'true' : 'false' }))}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${answers[q.id] === (opt === 'Verdadero' ? 'true' : 'false') ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.tipo === 'TEXTO_LIBRE' ? (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full ml-10 px-3 py-2 text-xs border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500"
                  />
                ) : (
                  <div className="space-y-2 pl-10">
                    {opciones.map((opt: string, oi: number) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: String(oi) }))}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium rounded-xl border transition-all ${answers[q.id] === String(oi) ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'}`}
                      >
                        <span className="font-black mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmitExam}
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all"
        >
          {submitting ? 'Enviando...' : `✅ Enviar Examen (${answered}/${questions.length} respondidas)`}
        </button>
      </div>
    );
  }

  // EXAM LIST SCREEN
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 rounded-2xl shadow-xl">
        <h1 className="text-xl font-black flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-red-400" />
          Mis Exámenes y Evaluaciones
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Exámenes disponibles, intentos realizados y resultados obtenidos.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-black text-gray-900">{exams.length}</div>
          <div className="text-[11px] text-gray-500 font-bold">Disponibles</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-emerald-700">{results.filter(r => r.aprobado).length}</div>
          <div className="text-[11px] text-emerald-600 font-bold">Aprobados</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-rose-700">{results.filter(r => !r.aprobado).length}</div>
          <div className="text-[11px] text-rose-600 font-bold">No aprobados</div>
        </div>
      </div>

      {/* Exam cards */}
      {exams.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-200" />
          <p className="font-bold text-gray-600">No hay exámenes disponibles</p>
          <p className="text-xs">Tu profesor publicará los exámenes cuando estén listos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exams.map(exam => {
            const result = getResultForExam(exam.id);
            const isCompleted = !!result;

            return (
              <div key={exam.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${exam.tipo === 'FINAL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {exam.tipo}
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 mt-1">{exam.titulo}</h3>
                    <p className="text-[11px] text-gray-500">{exam.especialidad_nombre}</p>
                  </div>
                  {isCompleted && (
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${result.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {result.nota?.toFixed(1)} / 10
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-gray-500 space-y-0.5">
                  <p>📋 {exam.num_preguntas} preguntas · Nota mín: {exam.nota_minima_aprobado}/10</p>
                  {exam.duracion_minutos && <p>⏱ {exam.duracion_minutos} minutos máximo</p>}
                  {exam.fecha_cierre && <p>📅 Cierra: {new Date(exam.fecha_cierre).toLocaleDateString('es-ES')}</p>}
                </div>

                {isCompleted ? (
                  <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${result.aprobado ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {result.aprobado ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                    <span>{result.aprobado ? 'Aprobado' : 'No aprobado'} — Intento {result.intento}/{exam.intentos_permitidos}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartExam(exam)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Iniciar Examen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
