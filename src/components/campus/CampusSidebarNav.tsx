import React, { useState } from 'react';
import { useCampus } from '../../context/CampusContext';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileText,
  Bell,
  User,
  LogOut,
  Shield,
  GraduationCap,
  Users,
  FolderTree,
  Menu,
  X,
  ExternalLink,
  Mail,
  Sun,
  Moon,
} from 'lucide-react';
import { CampusView } from '../../types/campus';

export const CampusSidebarNav: React.FC = () => {
  const { currentUser, currentView, navigateTo, logout, campusTheme, toggleCampusTheme } = useCampus();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (!currentUser) return null;

  const role = currentUser.role;

  // Student Nav Items
  const studentNavItems = [
    { view: 'dashboard' as CampusView, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'cursos' as CampusView, label: 'Mis Cursos', icon: BookOpen },
    { view: 'dudas' as CampusView, label: 'Dudas al Profesor', icon: HelpCircle },
    { view: 'secretaria' as CampusView, label: 'Secretaría Online', icon: FileText },
    { view: 'avisos' as CampusView, label: 'Avisos y Noticias', icon: Bell },
    { view: 'perfil' as CampusView, label: 'Mi Perfil', icon: User },
  ];

  // Teacher Nav Items
  const teacherNavItems = [
    { view: 'profesor-dashboard' as CampusView, label: 'Panel Profesor', icon: GraduationCap },
    { view: 'cursos' as CampusView, label: 'Cursos Asignados', icon: BookOpen },
    { view: 'dudas' as CampusView, label: 'Consultas Alumnos', icon: HelpCircle },
    { view: 'avisos' as CampusView, label: 'Avisos del Curso', icon: Bell },
    { view: 'perfil' as CampusView, label: 'Mi Perfil', icon: User },
  ];

  // Admin Nav Items
  const adminNavItems = [
    { view: 'admin-panel' as CampusView, label: 'Panel Global Admin', icon: Shield },
    { view: 'admin-solicitudes' as CampusView, label: 'Solicitudes y Leads', icon: FileText },
    { view: 'admin-usuarios' as CampusView, label: 'Usuarios e Invitaciones', icon: Users },
    { view: 'admin-correo' as CampusView, label: 'Bandeja de Correo', icon: Mail },
    { view: 'cursos' as CampusView, label: 'Gestión Cursos', icon: BookOpen },
    { view: 'dudas' as CampusView, label: 'Supervisión Dudas', icon: HelpCircle },
    { view: 'secretaria' as CampusView, label: 'Gestión Secretaría', icon: FileText },
    { view: 'avisos' as CampusView, label: 'Gestión Avisos', icon: Bell },
    { view: 'perfil' as CampusView, label: 'Mi Perfil', icon: User },
  ];

  const navItems = role === 'ADMINISTRACION' ? adminNavItems : role === 'PROFESOR' ? teacherNavItems : studentNavItems;

  const handleItemClick = (view: CampusView) => {
    navigateTo(view);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Header Top Bar */}
      <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg border border-zinc-800"
            aria-label="Abrir menú campus"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <div className="text-sm font-extrabold text-white tracking-wider font-heading">CAMPUS VIRTUAL</div>
            <div className="text-[10px] text-zinc-400">PÉNDULO • {currentUser.nombre}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleCampusTheme}
            className="p-2 text-amber-400 hover:bg-zinc-900 rounded-lg border border-zinc-800 transition-colors"
            title={campusTheme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {campusTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={logout}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg border border-zinc-800 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800 shrink-0 min-h-screen sticky top-0 h-screen">
        {/* Brand Top Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-white uppercase font-heading">
                CAMPUS VIRTUAL
              </div>
              <div className="text-[11px] text-zinc-400 font-medium">Academias Péndulo</div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCampusTheme}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 hover:scale-105 transition-all shadow"
            title={campusTheme === 'dark' ? 'Cambiar a Modo Día (Claro)' : 'Cambiar a Modo Noche (Oscuro)'}
          >
            {campusTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-red-400 shrink-0">
              {currentUser.nombre.charAt(0)}
              {currentUser.apellidos.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.nombre} {currentUser.apellidos}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleItemClick(item.view)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-950/40 border border-red-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions & Theme Selector */}
        <div className="p-3 border-t border-zinc-800/80 space-y-1">
          <button
            onClick={toggleCampusTheme}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              {campusTheme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-zinc-800 font-extrabold text-zinc-400">
              {campusTheme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '';
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new Event('popstate'));
            }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Web Comercial
            </span>
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-zinc-950 border-r border-zinc-800 h-full flex flex-col z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="font-extrabold text-sm text-white font-heading">CAMPUS VIRTUAL</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 text-red-400 flex items-center justify-center font-bold text-xs">
                {currentUser.nombre.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{currentUser.nombre}</div>
                <div className="text-[10px] text-zinc-400 uppercase">{currentUser.role}</div>
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleItemClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
