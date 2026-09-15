import React, { useState } from 'react';
import { Search, X, Check, BookOpen } from 'lucide-react';
import { COURSES } from '../data/coursesData';

interface CourseBottomSheetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
}

export const CourseBottomSheetSelector: React.FC<CourseBottomSheetSelectorProps> = ({
  isOpen,
  onClose,
  selectedCourseId,
  onSelectCourse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = COURSES.filter(course => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      course.title.toLowerCase().includes(q) ||
      course.code.toLowerCase().includes(q) ||
      course.categoryName.toLowerCase().includes(q) ||
      course.shortDescription.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop overlay touch close */}
      <div className="flex-1 w-full" onClick={onClose} />

      {/* Bottom Sheet Modal Container */}
      <div className="bg-white rounded-t-3xl max-h-[85vh] w-full flex flex-col shadow-2xl overflow-hidden border-t border-gray-200 animate-slideUp">
        
        {/* Drag handle & Header */}
        <div className="pt-3 pb-3 px-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-lg text-gray-900">Selecciona una Especialidad</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cerrar selector"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar 'híbrido', 'ADAS', 'moto', 'TMVG'..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-red-500 font-medium"
              autoFocus
            />
          </div>
        </div>

        {/* Course List Options */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1 divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No se encontraron especialidades para "{searchQuery}"
            </div>
          ) : (
            filtered.map((course) => {
              const isSelected = selectedCourseId === course.id;

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => {
                    onSelectCourse(course.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 min-h-[64px] ${
                    isSelected 
                      ? 'bg-red-50/90 border-2 border-red-500 text-red-950 font-semibold' 
                      : 'hover:bg-gray-50 text-gray-800 border border-gray-100'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                        {course.code}
                      </span>
                      <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                        {course.totalHours}h · {course.isSubsidized ? 'Subvencionado' : 'Oficial'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug break-words">
                      {course.title}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Safe area padding for iPhones */}
        <div className="pb-safe bg-white" />
      </div>
    </div>
  );
};
