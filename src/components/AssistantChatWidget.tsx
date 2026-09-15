import React, { useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Phone,
  RotateCcw
} from 'lucide-react';
import { COURSES, CENTER_INFO } from '../data/coursesData';
import { Course } from '../types';

interface AssistantChatWidgetProps {
  onSelectCourse: (course: Course) => void;
}

export const AssistantChatWidget: React.FC<AssistantChatWidgetProps> = ({ onSelectCourse }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedEducation, setSelectedEducation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [recommendedCourse, setRecommendedCourse] = useState<Course | null>(null);

  const resetQuiz = () => {
    setStep(1);
    setSelectedArea('');
    setSelectedEducation('');
    setSelectedStatus('');
    setRecommendedCourse(null);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    setStep(2);
  };

  const handleEducationSelect = (edu: string) => {
    setSelectedEducation(edu);
    setStep(3);
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    
    // Determine recommendation
    let match = COURSES.find(c => c.categoryId === selectedArea);
    if (!match) match = COURSES[0];

    // If no studies, recommend level 1 if available
    if (selectedEducation === 'sin-estudios') {
      const l1 = COURSES.find(c => c.categoryId === selectedArea && c.level === 'Nivel 1');
      if (l1) match = l1;
    } else if (selectedEducation === 'bachiller') {
      const l3 = COURSES.find(c => c.categoryId === selectedArea && c.level === 'Nivel 3');
      if (l3) match = l3;
    }

    setRecommendedCourse(match);
    setStep(4);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40" id="assistant-chat-widget">
      
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[520px] animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm">Asistente de Admisiones</h4>
                <p className="text-[10px] text-red-400 font-medium">Academias Péndulo · En línea</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={resetQuiz} 
                title="Reiniciar cuestionario"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            
            {/* Intro greeting */}
            <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-xs text-gray-700 leading-relaxed">
              ¡Hola! Soy el orientador de Academias Péndulo. En <strong>3 preguntas rápidas</strong> te digo qué curso oficial se adapta a tu perfil y si puedes cursarlo <strong>100% subvencionado</strong> por el SAE.
            </div>

            {/* STEP 1: Area */}
            {step === 1 && (
              <div className="space-y-2 animate-in fade-in">
                <p className="font-bold text-gray-800 text-xs">
                  1. ¿Qué especialidad te interesa más?
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button onClick={() => handleAreaSelect('automocion')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    🚗 Automoción y Mecánica Electrónica
                  </button>
                  <button onClick={() => handleAreaSelect('climatizacion')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    ❄️ Climatización y Frío Industrial
                  </button>
                  <button onClick={() => handleAreaSelect('soldadura')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    🔥 Soldadura TIG, MIG-MAG y Tubería
                  </button>
                  <button onClick={() => handleAreaSelect('seguridad')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    🦺 Seguridad Laboral PRL y Maquinaria
                  </button>
                  <button onClick={() => handleAreaSelect('administracion')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    💼 Gestión Administrativa y Logística
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Education */}
            {step === 2 && (
              <div className="space-y-2 animate-in fade-in">
                <p className="font-bold text-gray-800 text-xs">
                  2. ¿Cuál es tu nivel máximo de estudios finalizado?
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button onClick={() => handleEducationSelect('sin-estudios')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    Sin titulación académica previa (Acceso a Nivel 1)
                  </button>
                  <button onClick={() => handleEducationSelect('eso')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    Graduado en ESO / EGB / FPB (Acceso a Nivel 2)
                  </button>
                  <button onClick={() => handleEducationSelect('bachiller')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    Bachillerato / Grado Medio / Grado Superior (Nivel 3)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Status */}
            {step === 3 && (
              <div className="space-y-2 animate-in fade-in">
                <p className="font-bold text-gray-800 text-xs">
                  3. ¿Cuál es tu situación laboral actual?
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button onClick={() => handleStatusSelect('desempleado')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    En desempleo (Inscrito en el SAE)
                  </button>
                  <button onClick={() => handleStatusSelect('trabajador')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    Trabajador por cuenta ajena (Régimen General)
                  </button>
                  <button onClick={() => handleStatusSelect('autonomo')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800 transition-colors">
                    Autónomo
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: RECOMMENDATION */}
            {step === 4 && recommendedCourse && (
              <div className="space-y-3 animate-in zoom-in-95">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ¡Tu Curso Ideal! (100% Gratuito)
                  </span>
                  <h5 className="font-bold text-xs text-gray-900 leading-snug">
                    [{recommendedCourse.code}] {recommendedCourse.title}
                  </h5>
                  <p className="text-[11px] text-gray-600">
                    {recommendedCourse.totalHours} horas ({recommendedCourse.practiceHours}h de prácticas en empresas de Almería).
                  </p>
                  <p className="text-[11px] text-red-700 font-semibold pt-1">
                    Próximo inicio: {recommendedCourse.nextCall}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      onSelectCourse(recommendedCourse);
                      setIsOpen(false);
                    }}
                    className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Ver Ficha y Reservar Plaza Oficial</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <a
                    href="https://wa.me/34950252525?text=Hola,%20he%20visto%20en%20la%20web%20el%20curso%20oficial%20y%20quiero%20información%20de%20matrícula"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Hablar por WhatsApp con Secretaría</span>
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* Footer of chat */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span>Sede Carrera Doctoral 26, Almería</span>
            <a href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`} className="text-red-600 font-bold hover:underline">
              {CENTER_INFO.phone}
            </a>
          </div>

        </div>
      )}

      {/* Floating Trigger Buttons */}
      <div className="flex items-center gap-2">
        {/* WhatsApp Direct */}
        <a
          href="https://wa.me/34950252525?text=Hola,%20solicito%20información%20sobre%20los%20cursos%20homologados%20en%20Almería"
          target="_blank"
          rel="noopener noreferrer"
          id="btn-whatsapp-floating"
          className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 transition-all"
          title="Contactar por WhatsApp con Secretaría"
          aria-label="Abrir WhatsApp"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.122.554 4.114 1.521 5.845l-1.521 5.555 5.702-1.496c1.677.915 3.597 1.432 5.637 1.432 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>

        {/* Main Assistant Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          id="btn-open-assistant"
          className="px-4 py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-gray-900/30 hover:scale-105 transition-all cursor-pointer border border-gray-700 glow-pulse"
          aria-label="Abrir Asistente de Admisiones"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-red-400" />
            <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <span className="hidden sm:inline">¿Qué curso elegir?</span>
        </button>
      </div>

    </div>
  );
};
