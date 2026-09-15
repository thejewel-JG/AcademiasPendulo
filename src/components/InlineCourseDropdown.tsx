import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import { COURSES } from '../data/coursesData';

interface InlineCourseDropdownProps {
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
}

export const InlineCourseDropdown: React.FC<InlineCourseDropdownProps> = ({
  selectedCourseId,
  onSelectCourse
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCourse = COURSES.find(c => c.id === selectedCourseId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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
    <div className="relative w-full" ref={dropdownRef}>
      {/* Selector Trigger Button - Exact Width of Parent Container */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-white rounded-xl border text-left flex items-center justify-between text-xs sm:text-sm font-medium transition-all outline-none shadow-xs min-h-[52px] ${
          isOpen ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-300 hover:border-gray-400'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="truncate pr-2">
          {selectedCourse ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                {selectedCourse.code}
              </span>
              <span className="text-gray-900 font-bold truncate">{selectedCourse.title}</span>
            </div>
          ) : (
            <span className="text-gray-400">-- Selecciona una especialidad (33 disponibles) --</span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
      </button>

      {/* Inline Dropdown Panel - Positioned Absolute Directly Below Trigger Button */}
      {isOpen && (
        <div 
          className="absolute top-[calc(100%+8px)] left-0 right-0 w-full z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in duration-150 max-h-[380px] max-md:max-h-[min(55vh,420px)] flex flex-col"
          style={{ width: '100%', maxWidth: '100%' }}
        >
          {/* Sticky Search Header */}
          <div className="p-3 bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código (ej: ADAS, híbrido, TMVG)..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          </div>

          {/* Compact Course List Options with Internal Scroll */}
          <div className="overflow-y-auto p-2 space-y-1 divide-y divide-gray-100 flex-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
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
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start justify-between gap-2.5 pt-2.5 ${
                      isSelected 
                        ? 'bg-red-50 border border-red-200 text-red-950 font-semibold' 
                        : 'hover:bg-gray-50 text-gray-800 border border-transparent'
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden pr-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                          {course.code}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                          {course.totalHours}h · {course.isSubsidized ? 'Subvencionado' : 'Oficial'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 leading-snug break-words">
                        {course.title}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Accessible native select fallback for screen readers & HTML forms */}
      <select
        id="direct-course-select"
        value={selectedCourseId}
        onChange={(e) => onSelectCourse(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      >
        <option value="">-- Selecciona una especialidad (33 disponibles) --</option>
        {COURSES.map(c => (
          <option key={c.id} value={c.id}>
            [{c.code}] {c.title} ({c.totalHours}h)
          </option>
        ))}
      </select>
    </div>
  );
};
