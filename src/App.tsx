import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, Download } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CredibilitySection } from './components/CredibilitySection';
import { SpecialtiesGrid } from './components/SpecialtiesGrid';
import { CertificatesGuide } from './components/CertificatesGuide';
import { WorkshopsGallery } from './components/WorkshopsGallery';
import { CompaniesAndTestimonials } from './components/CompaniesAndTestimonials';
import { WorkWithUsSection } from './components/WorkWithUsSection';
import { WorkWithUsModal } from './components/WorkWithUsModal';
import { ContactAndMapSection } from './components/ContactAndMapSection';
import { Footer } from './components/Footer';
import { CourseDetailModal } from './components/CourseDetailModal';
import { CampusVirtualModal } from './components/CampusVirtualModal';
import { ConsultationModal } from './components/ConsultationModal';
import { EmploymentPoolModal } from './components/EmploymentPoolModal';
import { InscriptionRequestFormModal } from './components/InscriptionRequestFormModal';
import { AssistantChatWidget } from './components/AssistantChatWidget';
import { COURSES } from './data/coursesData';
import { Course } from './types';

import { CampusProvider, useCampus } from './context/CampusContext';

// Campus Virtual Views
import { CampusLogin } from './components/campus/CampusLogin';
import { CampusSidebarNav } from './components/campus/CampusSidebarNav';
import { CampusStudentDashboard } from './components/campus/CampusStudentDashboard';
import { CampusMyCourses } from './components/campus/CampusMyCourses';
import { CampusCourseDetail } from './components/campus/CampusCourseDetail';
import { CampusDoubts } from './components/campus/CampusDoubts';
import { CampusSecretary } from './components/campus/CampusSecretary';
import { CampusAnnouncements } from './components/campus/CampusAnnouncements';
import { CampusProfile } from './components/campus/CampusProfile';
import { CampusTeacherDashboard } from './components/campus/CampusTeacherDashboard';
import { CampusAdminPanel } from './components/campus/CampusAdminPanel';
import { CampusAdminRequests } from './components/campus/CampusAdminRequests';
import { CampusUserManagement } from './components/campus/CampusUserManagement';
import { CampusAdminInbox } from './components/campus/CampusAdminInbox';
import { CampusForcedPasswordChangeModal } from './components/campus/CampusForcedPasswordChangeModal';
import { CampusAccountActivation } from './components/campus/CampusAccountActivation';
import { CampusMisExamenes } from './components/campus/CampusMisExamenes';
import { CampusProfesorAsistencia } from './components/campus/CampusProfesorAsistencia';
import { CampusProfesorAlumnos } from './components/campus/CampusProfesorAlumnos';

function MainAppContent() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCampusOpen, setIsCampusOpen] = useState<boolean>(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [isWorkWithUsOpen, setIsWorkWithUsOpen] = useState<boolean>(false);
  const [isEmploymentPoolOpen, setIsEmploymentPoolOpen] = useState<boolean>(false);
  const [isInscriptionModalOpen, setIsInscriptionModalOpen] = useState<boolean>(false);
  const [inscriptionCourseTitle, setInscriptionCourseTitle] = useState<string>('');
  const [inscriptionCourseId, setInscriptionCourseId] = useState<string>('');
  const [successInscriptionAlert, setSuccessInscriptionAlert] = useState<{ requestNumber: string; courseName: string } | null>(null);

  const { isCampusRoute, currentUser, currentView, navigateTo, campusTheme } = useCampus();

  const handleSelectCourseById = (courseId: string) => {
    const course = COURSES.find((c) => c.id === courseId);
    if (course) {
      setSelectedCourse(course);
    }
  };

  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      if (path === '/solicitud-inscripcion') {
        setIsInscriptionModalOpen(true);
      }
      if (path.startsWith('/campus') || path.startsWith('/admin') || path.startsWith('/profesor')) {
        if (path === '/campus/login') {
          navigateTo('login');
        } else if (path === '/campus/cursos') {
          navigateTo('cursos');
        } else if (path === '/campus/dudas') {
          navigateTo('dudas');
        } else if (path === '/campus/secretaria') {
          navigateTo('secretaria');
        } else if (path === '/campus/avisos') {
          navigateTo('avisos');
        } else if (path === '/campus/perfil') {
          navigateTo('perfil');
        } else if (path === '/admin/solicitudes' || path === '/campus/admin/solicitudes') {
          navigateTo('admin-solicitudes');
        } else if (path === '/admin/usuarios') {
          navigateTo('admin-usuarios');
        } else if (path === '/admin/correo') {
          navigateTo('admin-correo');
        } else if (path === '/admin') {
          navigateTo('admin-panel');
        } else if (path === '/profesor') {
          navigateTo('profesor-dashboard');
        } else {
          navigateTo(
            currentUser
              ? currentUser.role === 'ADMINISTRACION'
                ? 'admin-panel'
                : currentUser.role === 'PROFESOR'
                ? 'profesor-dashboard'
                : 'dashboard'
              : 'login'
          );
        }
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  if (window.location.pathname === '/activar-cuenta') {
    return <CampusAccountActivation />;
  }

  if (isCampusRoute) {
    if (!currentUser || currentView === 'login') {
      return (
        <div className={campusTheme === 'light' ? 'campus-theme-light' : ''}>
          <CampusLogin />
        </div>
      );
    }

    return (
      <div
        className={`min-h-screen ${
          campusTheme === 'light'
            ? 'bg-slate-100 text-slate-900 campus-theme-light'
            : 'bg-zinc-950 text-white'
        } flex flex-col lg:flex-row font-sans transition-colors duration-200`}
      >
        <CampusSidebarNav />
        <div className={`flex-1 ${campusTheme === 'light' ? 'bg-slate-100' : 'bg-zinc-950'} overflow-y-auto`}>
          {currentView === 'dashboard' && <CampusStudentDashboard />}
          {currentView === 'cursos' && <CampusMyCourses />}
          {currentView === 'curso-detalle' && <CampusCourseDetail />}
          {currentView === 'dudas' && <CampusDoubts />}
          {currentView === 'secretaria' && <CampusSecretary />}
          {currentView === 'avisos' && <CampusAnnouncements />}
          {currentView === 'perfil' && <CampusProfile />}
          {currentView === 'mis-examenes' && <CampusMisExamenes />}
          {currentView === 'profesor-dashboard' && <CampusTeacherDashboard />}
          {currentView === 'profesor-asistencia' && <CampusProfesorAsistencia />}
          {currentView === 'profesor-alumnos' && <CampusProfesorAlumnos />}
          {currentView === 'admin-panel' && <CampusAdminPanel />}
          {currentView === 'admin-solicitudes' && <CampusAdminRequests />}
          {currentView === 'admin-usuarios' && <CampusUserManagement />}
          {currentView === 'admin-correo' && <CampusAdminInbox />}
        </div>
        <CampusForcedPasswordChangeModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 selection:bg-red-100 selection:text-red-900">
      {/* Navigation Header */}
      <Navbar
        onOpenCampus={() => navigateTo('login')}
        onSelectCourse={(course) => setSelectedCourse(course)}
        onOpenConsultation={() => setIsInscriptionModalOpen(true)}
        onOpenWorkWithUs={() => setIsWorkWithUsOpen(true)}
        onOpenEmploymentPool={() => setIsEmploymentPoolOpen(true)}
        onOpenInscriptionModal={() => setIsInscriptionModalOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero Section with dynamic floating form */}
        <HeroSection
          onOpenConsultation={() => setIsConsultationOpen(true)}
          onSelectCourseById={handleSelectCourseById}
          onOpenWorkWithUs={() => setIsWorkWithUsOpen(true)}
        />

        {/* 2. Credibility Counters & Official Certifications */}
        <CredibilitySection />

        {/* 3. Grid of Specialties & Accordion Courses */}
        <SpecialtiesGrid
          onSelectCourse={(course) => setSelectedCourse(course)}
          onOpenConsultation={() => setIsConsultationOpen(true)}
          onOpenInscription={(course) => {
            setInscriptionCourseTitle(course.title);
            setInscriptionCourseId(course.id || course.code);
            setIsInscriptionModalOpen(true);
          }}
        />

        {/* 4. Official Certificates Guide with Tabs & Levels */}
        <CertificatesGuide
          onOpenConsultation={() => setIsConsultationOpen(true)}
        />

        {/* 5. Homologated Workshops & Equipment Gallery */}
        <WorkshopsGallery />

        {/* 6. Graduate Stories & FUNDAE Business Section */}
        <CompaniesAndTestimonials />

        {/* 7. Work With Us Banner */}
        <WorkWithUsSection
          onOpenWorkWithUs={() => setIsWorkWithUsOpen(true)}
        />

        {/* 8. Contact Form, Campus Location Map, and Direct Info */}
        <ContactAndMapSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenCampus={() => navigateTo('login')}
        onOpenConsultation={() => setIsConsultationOpen(true)}
        onOpenEmploymentPool={() => setIsEmploymentPoolOpen(true)}
        onOpenWorkWithUs={() => setIsWorkWithUsOpen(true)}
      />

      {/* Floating Action Button */}
      <AssistantChatWidget
        onOpenConsultation={() => setIsConsultationOpen(true)}
        onOpenCampus={() => navigateTo('login')}
      />

      {/* Modals */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onOpenConsultation={() => setIsConsultationOpen(true)}
          onOpenInscription={(course) => {
            setInscriptionCourseTitle(course.title);
            setInscriptionCourseId(course.id || course.code);
            setIsInscriptionModalOpen(true);
          }}
        />
      )}

      {isCampusOpen && (
        <CampusVirtualModal onClose={() => setIsCampusOpen(false)} />
      )}

      {isConsultationOpen && (
        <ConsultationModal onClose={() => setIsConsultationOpen(false)} />
      )}

      {isWorkWithUsOpen && (
        <WorkWithUsModal isOpen={isWorkWithUsOpen} onClose={() => setIsWorkWithUsOpen(false)} />
      )}

      {isEmploymentPoolOpen && (
        <EmploymentPoolModal isOpen={isEmploymentPoolOpen} onClose={() => setIsEmploymentPoolOpen(false)} />
      )}

      {isInscriptionModalOpen && (
        <InscriptionRequestFormModal
          isOpen={isInscriptionModalOpen}
          onClose={() => setIsInscriptionModalOpen(false)}
          preselectedCourseName={inscriptionCourseTitle}
          preselectedCourseId={inscriptionCourseId}
          onSuccess={(reqNum, cName) => {
            setSuccessInscriptionAlert({ requestNumber: reqNum, courseName: cName });
          }}
        />
      )}

      {/* Floating Success Notification Banner on Web Return */}
      {successInscriptionAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-gray-950 text-white rounded-2xl shadow-2xl border-2 border-emerald-500/60 p-5 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  ¡Solicitud Enviada con Éxito!
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">
                  N.º Oficial: <span className="font-mono text-red-400 font-bold">{successInscriptionAlert.requestNumber}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessInscriptionAlert(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-3">
            Hemos registrado tu solicitud para <strong>{successInscriptionAlert.courseName}</strong> y enviado la copia PDF oficial a tu correo electrónico y a Secretaría.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href={`/api/public/inscriptions/${successInscriptionAlert.requestNumber}/pdf`}
              download={`Solicitud_Inscripcion_${successInscriptionAlert.requestNumber}.pdf`}
              className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Copia en PDF</span>
            </a>
            <button
              type="button"
              onClick={() => setSuccessInscriptionAlert(null)}
              className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CampusProvider>
      <MainAppContent />
    </CampusProvider>
  );
}
