import React, { useState, useEffect } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  Users, BarChart3, BookOpen, Mail, Phone,
  CheckCircle2, Clock, AlertCircle, Search, ChevronRight
} from 'lucide-react';

interface Student {
  alumno_id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  matricula_id: string;
  matricula_estado: string;
  fecha_inicio: string;
  porcentaje_global?: number;
  total_publicados?: number;
  completados?: number;
}

export const CampusProfesorAlumnos: React.FC = () => {
  const { currentUser } = useCampus();

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/academic/groups')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const grps = Array.isArray(data) ? data : [];
        setGroups(grps);
        if (grps.length > 0) setSelectedGroupId(grps[0].id);
      })
      .catch(e => console.warn(e));
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/academic/groups/${selectedGroupId}/students`).then(r => r.ok ? r.json() : { students: [] }),
      fetch('/api/teacher/progress/analytics').then(r => r.ok ? r.json() : [])
    ]).then(([studData, analyticsData]) => {
      setStudents(studData.students || []);
      setAnalytics(Array.isArray(analyticsData) ? analyticsData : []);
    }).catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, [selectedGroupId]);

  const getProgress = (alumnoId: string) => analytics.find(a => a.alumno_id === alumnoId);

  const filtered = students.filter(s =>
    `${s.nombre} ${s.apellidos} ${s.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            Mis Alumnos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Vista completa de alumnos matriculados, progreso y datos de contacto.</p>
        </div>
        {currentGroup && (
          <div className="text-xs font-bold bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 text-gray-300">
            📚 {currentGroup.nombre}
          </div>
        )}
      </div>

      {/* Group selector + search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <select
          value={selectedGroupId}
          onChange={e => setSelectedGroupId(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-red-500"
        >
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.nombre} — {g.especialidad_nombre}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 text-white rounded-xl p-3 text-center">
          <div className="text-2xl font-black">{students.length}</div>
          <div className="text-[11px] text-gray-400 font-bold">Total alumnos</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-emerald-700">
            {analytics.filter(a => (a.porcentaje_global || 0) >= 100).length}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">Completados</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-amber-700">
            {analytics.filter(a => (a.porcentaje_global || 0) > 0 && (a.porcentaje_global || 0) < 100).length}
          </div>
          <div className="text-[11px] text-amber-600 font-bold">En progreso</div>
        </div>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 font-semibold text-sm flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          Cargando alumnos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-bold">No se encontraron alumnos</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-600">
              <tr>
                <th className="p-4">Alumno</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Matrícula</th>
                <th className="p-4 text-center">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => {
                const prog = getProgress(s.alumno_id);
                const pct = prog?.porcentaje_global || 0;
                return (
                  <tr key={s.alumno_id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-black flex items-center justify-center shrink-0">
                          {s.nombre[0]}{s.apellidos[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{s.nombre} {s.apellidos}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <a href={`mailto:${s.email}`} className="text-red-600 font-semibold hover:underline">{s.email}</a>
                      </div>
                      {s.telefono && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{s.telefono}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.matricula_estado === 'ACTIVA' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {s.matricula_estado}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(s.fecha_inicio).toLocaleDateString('es-ES')}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="relative w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                            <circle
                              cx="24" cy="24" r="20" fill="none"
                              stroke={pct >= 100 ? '#059669' : pct > 50 ? '#d97706' : '#dc2626'}
                              strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray={`${pct * 1.257} 125.7`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-gray-900">{Math.round(pct)}%</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{prog?.completados || 0}/{prog?.total_publicados || 0}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
