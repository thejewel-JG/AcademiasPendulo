export interface AcademicLevelOption {
  value: string;
  label: string;
}

export const ACADEMIC_LEVELS: AcademicLevelOption[] = [
  { value: 'sin_estudios', label: 'Sin estudios finalizados.' },
  { value: 'primaria', label: 'Educación Primaria.' },
  { value: 'eso', label: 'Educación Secundaria Obligatoria (ESO).' },
  { value: 'bachillerato', label: 'Bachillerato.' },
  { value: 'fp_basica', label: 'Formación Profesional Básica.' },
  { value: 'fp_grado_medio', label: 'Formación Profesional de Grado Medio.' },
  { value: 'fp_grado_superior', label: 'Formación Profesional de Grado Superior.' },
  { value: 'grado_universitario', label: 'Grado universitario o equivalente.' },
  { value: 'master_posgrado', label: 'Máster o estudios de posgrado.' },
  { value: 'doctorado', label: 'Doctorado.' },
  { value: 'otros', label: 'Otros estudios.' },
];

export function getAcademicLevelLabel(value?: string | null): string {
  if (!value) return 'No especificado';
  const match = ACADEMIC_LEVELS.find((l) => l.value === value);
  if (match) return match.label;
  return value;
}
