import React, { useState, useEffect, useRef } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  ClipboardList, CheckCircle2, XCircle, AlertCircle, Clock,
  RefreshCw, Users, Calendar, ChevronDown, Save
} from 'lucide-react';

interface GroupStudent {
  alumno_id: string;
  matricula_id: string;
  nombre: string;
  apellidos: string;
  email: string;
}

interface AttendanceRecord {
  alumno_id: string;
  matricula_id: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'RETRASO';
  justificacion: string;
}

export const CampusProfesorAsistencia: React.FC = () => {
  const { currentUser, activeEnrollmentData } = useCampus();

  const [groupId, setGroupId] = useState<string>('');
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);

  // Load teacher's groups
  useEffect(() => {
    fetch('/api/academic/groups')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const groups = Array.isArray(data) ? data : [];
        setAllGroups(groups);
        if (groups.length > 0) setGroupId(groups[0].id);
      })
      .catch(e => console.warn('Groups fetch error:', e));
  }, []);

  // Load students of selected group
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    fetch(`/api/academic/groups/${groupId}/students`)
      .then(r => r.ok ? r.json() : { students: [] })
      .then(data => {
        const studs: GroupStudent[] = data.students || [];
        setStudents(studs);
        // Initialize records
        const init: Record<string, AttendanceRecord> = {};
        studs.forEach(s => {
          init[s.alumno_id] = { alumno_id: s.alumno_id, matricula_id: s.matricula_id, estado: 'PRESENTE', justificacion: '' };
        });
        setRecords(init);
      })
      .catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, [groupId]);

  // Load existing attendance for this group + date
  useEffect(() => {
    if (!groupId || !fecha) return;
    fetch(`/api/academic/groups/${groupId}/attendance?fecha=${fecha}`)
      .then(r => r.ok ? r.json() : { attendance: [] })
      .then(data => {
        const att: any[] = data.attendance || [];
        setExistingAttendance(att);
        if (att.length > 0) {
          setRecords(prev => {
            const updated = { ...prev };
            att.forEach(a => {
              if (updated[a.alumno_id]) {
                updated[a.alumno_id] = { ...updated[a.alumno_id], estado: a.estado, justificacion: a.justificacion || '' };
              }
            });
            return updated;
          });
        }
      })
      .catch(e => console.warn(e));
  }, [groupId, fecha]);

  const setEstado = (alumnoId: string, estado: AttendanceRecord['estado']) => {
    setRecords(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], estado } }));
  };

  const setJustificacion = (alumnoId: string, justificacion: string) => {
    setRecords(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], justificacion } }));
  };

  const handleSave = async () => {
    if (!groupId || !fecha || students.length === 0) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/academic/groups/${groupId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, records: Object.values(records) })
      });
      const data = await res.json();
      if (res.ok) {
        setSavedMsg(`✅ Asistencia del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES')} guardada correctamente.`);
      } else {
        setSavedMsg(`❌ Error: ${data.error || 'No se pudo guardar.'}`);
      }
    } catch (err) {
      setSavedMsg('❌ Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const presentesCount = Object.values(records).filter(r => r.estado === 'PRESENTE' || r.estado === 'RETRASO').length;
  const ausentesCount = Object.values(records).filter(r => r.estado === 'AUSENTE').length;
  const justificadasCount = Object.values(records).filter(r => r.estado === 'JUSTIFICADA').length;

  const estadoBg: Record<string, string> = {
    PRESENTE: 'bg-emerald-50 border-emerald-200',
    AUSENTE: 'bg-rose-50 border-rose-200',
    JUSTIFICADA: 'bg-amber-50 border-amber-200',
    RETRASO: 'bg-blue-50 border-blue-200',
  };

  const estadoBtn: Record<string, string> = {
    PRESENTE: 'bg-emerald-600 text-white',
    AUSENTE: 'bg-rose-600 text-white',
    JUSTIFICADA: 'bg-amber-500 text-white',
    RETRASO: 'bg-blue-600 text-white',
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-red-400" />
            Pase de Lista — Asistencia Diaria
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Registra la asistencia de tus alumnos por día. Obligatorio para cursos subvencionados.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          {students.length} alumnos
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-700 mb-1">Grupo</label>
          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-red-500"
          >
            {allGroups.map(g => (
              <option key={g.id} value={g.id}>{g.nombre} — {g.especialidad_nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Presentes', value: presentesCount, color: 'emerald' },
          { label: 'Ausentes', value: ausentesCount, color: 'rose' },
          { label: 'Justificadas', value: justificadasCount, color: 'amber' },
        ].map(stat => (
          <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-xl p-3 text-center`}>
            <div className={`text-2xl font-black text-${stat.color}-700`}>{stat.value}</div>
            <div className={`text-[11px] font-bold text-${stat.color}-600`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Student list */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 font-semibold text-sm flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          Cargando alumnos...
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-bold">No hay alumnos en este grupo</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {students.map((student, idx) => {
              const rec = records[student.alumno_id] || { estado: 'PRESENTE', justificacion: '' };
              return (
                <div key={student.alumno_id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${estadoBg[rec.estado] || 'bg-white border-transparent'} border-l-4`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-black text-gray-700 shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{student.nombre} {student.apellidos}</p>
                      <p className="text-[11px] text-gray-500">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(['PRESENTE', 'RETRASO', 'JUSTIFICADA', 'AUSENTE'] as AttendanceRecord['estado'][]).map(est => (
                      <button
                        key={est}
                        onClick={() => setEstado(student.alumno_id, est)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${rec.estado === est ? estadoBtn[est] : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                      >
                        {est === 'PRESENTE' ? '✅ Presente' : est === 'RETRASO' ? '⏱ Retraso' : est === 'JUSTIFICADA' ? '📄 Justificada' : '❌ Ausente'}
                      </button>
                    ))}
                  </div>

                  {(rec.estado === 'AUSENTE' || rec.estado === 'JUSTIFICADA') && (
                    <input
                      type="text"
                      value={rec.justificacion}
                      onChange={e => setJustificacion(student.alumno_id, e.target.value)}
                      placeholder="Motivo / justificación..."
                      className="px-2.5 py-1.5 text-[11px] border border-gray-300 rounded-xl w-full sm:w-48 font-medium"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save button */}
      {students.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar Asistencia</>}
          </button>
          {savedMsg && <span className="text-sm font-bold text-gray-700">{savedMsg}</span>}
        </div>
      )}
    </div>
  );
};
