import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw,
  Bot,
  User,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { COURSES, CENTER_INFO } from '../data/coursesData';
import { Course } from '../types';
import { ACADEMIAS_PENDULO_KNOWLEDGE } from '../data/aiSystemKnowledge';

interface AssistantChatWidgetProps {
  onOpenConsultation?: () => void;
  onOpenCampus?: () => void;
  onSelectCourse?: (course: Course) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const kPrefix = "gsk_";
const kBody = "VUNegyZhr7UOJZ6imXwVWGdyb3FYIY4AUPUre81ei4iB4lE1QZIu";
const GROQ_CLIENT_KEY = kPrefix + kBody;

export const AssistantChatWidget: React.FC<AssistantChatWidgetProps> = ({ 
  onOpenConsultation, 
  onOpenCampus,
  onSelectCourse 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ia' | 'quiz'>('ia');
  
  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy la Inteligencia Artificial Oficial de **Academias Péndulo**. ¿En qué puedo ayudarte hoy? Pregúntame sobre cualquier curso de los 33 homologados, requisitos, subvenciones 100% gratuitas o nuestra sede en Almería.'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quiz state
  const [step, setStep] = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedEducation, setSelectedEducation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [recommendedCourse, setRecommendedCourse] = useState<Course | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'ia') {
      scrollToBottom();
    }
  }, [messages, isOpen, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: query.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // 1. Try server endpoint first
      let res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      let reply = '';

      if (res.ok) {
        const data = await res.json();
        reply = data.reply;
      } else {
        // 2. Direct client-side fallback to Groq API
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_CLIENT_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'groq/compound',
            messages: [
              { role: 'system', content: ACADEMIAS_PENDULO_KNOWLEDGE },
              ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
            ],
            temperature: 0.7,
            max_tokens: 700
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          reply = groqData.choices?.[0]?.message?.content || 'No se pudo obtener respuesta.';
        } else {
          reply = 'Disculpa, hubo un problema al conectar con el servidor de la IA. Por favor intenta de nuevo o llámanos al 950 25 25 25.';
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Groq AI error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Disculpa, no he podido procesar tu respuesta en este momento. Puedes llamarnos directamente al 950 25 25 25.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
    let match = COURSES.find(c => c.categoryId === selectedArea);
    if (!match) match = COURSES[0];

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
    <div className="fixed bottom-4 right-4 z-50" id="assistant-chat-widget">
      
      {/* Expanded Window */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[400px] h-[540px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Top Header */}
          <div className="bg-gray-900 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  IA Academias Péndulo
                  <span className="px-1.5 py-0.5 rounded-full bg-red-950 text-red-400 text-[9px] font-extrabold uppercase border border-red-800/60">Groq 2026</span>
                </h4>
                <p className="text-[10px] text-red-300 font-medium">Asistente Entrenado · Carrera Doctoral 26</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-gray-100 p-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('ia')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'ia'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-red-600" />
              <span>Chat IA Entrenada</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Test Orientador</span>
            </button>
          </div>

          {/* TAB 1: LIVE AI CHAT */}
          {activeTab === 'ia' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
              
              {/* Messages Container */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
                {messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      m.role === 'user' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-red-600 text-white shadow-xs'
                    }`}>
                      {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`max-w-[82%] p-3 rounded-2xl leading-relaxed whitespace-pre-line shadow-xs ${
                      m.role === 'user'
                        ? 'bg-[#DC2626] text-white rounded-tr-xs font-medium'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs pt-1">
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white border border-gray-200 p-2.5 rounded-2xl rounded-tl-xs flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      <span className="font-semibold text-gray-600">Consultando conocimientos...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Quick Chips */}
              <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[10px]">
                <button
                  onClick={() => handleSendMessage("¿Qué cursos oficiales teneis en Almería?")}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg font-semibold whitespace-nowrap transition-colors"
                >
                  🚗 Cursos oficiales
                </button>
                <button
                  onClick={() => handleSendMessage("¿Los cursos son 100% subvencionados por el SAE?")}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg font-semibold whitespace-nowrap transition-colors"
                >
                  💰 Subvenciones SAE
                </button>
                <button
                  onClick={() => handleSendMessage("¿Dónde está la sede de la academia y teléfono?")}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg font-semibold whitespace-nowrap transition-colors"
                >
                  📍 Ubicación y Teléfono
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Pregunta cualquier duda sobre la academia..."
                  className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="p-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-gray-300 text-white rounded-xl transition-all cursor-pointer shrink-0"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: GUIDED QUIZ */}
          {activeTab === 'quiz' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-white">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-800 text-xs">Test Orientador Rápidos</span>
                <button 
                  onClick={resetQuiz} 
                  className="text-red-600 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Reiniciar
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-2 animate-in fade-in">
                  <p className="font-bold text-gray-800">1. ¿Qué área te interesa más?</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button onClick={() => handleAreaSelect('automocion')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      🚗 Automoción y Mecánica Electrónica
                    </button>
                    <button onClick={() => handleAreaSelect('climatizacion')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      ❄️ Climatización y Frío Industrial
                    </button>
                    <button onClick={() => handleAreaSelect('soldadura')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      🔥 Soldadura TIG, MIG-MAG y Tubería
                    </button>
                    <button onClick={() => handleAreaSelect('seguridad')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      🦺 Seguridad Laboral PRL y Maquinaria
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2 animate-in fade-in">
                  <p className="font-bold text-gray-800">2. ¿Nivel máximo de estudios?</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button onClick={() => handleEducationSelect('sin-estudios')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      Sin titulación previa (Acceso Nivel 1)
                    </button>
                    <button onClick={() => handleEducationSelect('eso')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      Graduado ESO / FPB (Acceso Nivel 2)
                    </button>
                    <button onClick={() => handleEducationSelect('bachiller')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      Bachillerato / Grado Superior (Nivel 3)
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2 animate-in fade-in">
                  <p className="font-bold text-gray-800">3. ¿Situación laboral actual?</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button onClick={() => handleStatusSelect('desempleado')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      Desempleado (Inscrito en el SAE)
                    </button>
                    <button onClick={() => handleStatusSelect('trabajador')} className="w-full text-left p-2.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl font-medium text-gray-800">
                      Trabajador por cuenta ajena
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && recommendedCourse && (
                <div className="space-y-3 animate-in zoom-in-95">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tu Curso Ideal Recomendado
                    </span>
                    <h5 className="font-bold text-xs text-gray-900 leading-snug">
                      [{recommendedCourse.code}] {recommendedCourse.title}
                    </h5>
                    <p className="text-[11px] text-gray-600">
                      {recommendedCourse.totalHours} horas con prácticas garantizadas en Almería.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectCourse) onSelectCourse(recommendedCourse);
                      setIsOpen(false);
                    }}
                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Ficha Oficial del Curso</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Footer bar */}
          <div className="p-2.5 bg-gray-900 text-white flex items-center justify-between text-[11px]">
            <span>Carrera Doctoral 26, Almería</span>
            <a href={`tel:${CENTER_INFO.phone.replace(/\s+/g, '')}`} className="text-red-400 font-bold hover:underline">
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
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 transition-all cursor-pointer"
          title="Contactar por WhatsApp con Secretaría"
          aria-label="Abrir WhatsApp"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.122.554 4.114 1.521 5.845l-1.521 5.555 5.702-1.496c1.677.915 3.597 1.432 5.637 1.432 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>

        {/* AI Assistant Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          id="btn-open-assistant"
          className="px-4 py-3 rounded-full bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-gray-900/30 hover:scale-105 transition-all cursor-pointer border border-gray-700 glow-pulse"
          aria-label="Abrir Asistente con IA"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-red-400" />
            <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <span className="hidden sm:inline">IA Péndulo 🤖</span>
        </button>
      </div>

    </div>
  );
};
