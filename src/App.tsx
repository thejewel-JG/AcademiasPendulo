import React, { useState, useEffect } from 'react';
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

function MainAppContent() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCampusOpen, setIsCampusOpen] = useState<boolean>(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [isWorkWithUsOpen, setIsWorkWithUsOpen] = useState<boolean>(false);

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
          {currentView === 'profesor-dashboard' && <CampusTeacherDashboard />}
          {currentView === 'admin-panel' && <CampusAdminPanel />}
          {currentView === 'admin-solicitudes' && <CampusAdminRequests />}
          {currentView === 'admin-usuarios' && <CampusUserManagement />}
          {currentView === 'admin-correo' && <CampusAdminInbox />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 selection:bg-red-100 selection:text-red-900">
      {/* Navigation Header */}
      <Navbar
        onOpenCampus={() => navigateTo('login')}
        onSelectCourse={(course) => setSelectedCourse(course)}
        onOpenConsultation={() => setIsConsultationOpen(true)}
        onOpenWorkWithUs={() => setIsWorkWithUsOpen(true)}
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
        />
      )}

      {isCampusOpen && (
        <CampusVirtualModal onClose={() => setIsCampusOpen(false)} />
      )}

      {isConsultationOpen && (
        <ConsultationModal onClose={() => setIsConsultationOpen(false)} />
      )}

      {isWorkWithUsOpen && (
        <WorkWithUsModal onClose={() => setIsWorkWithUsOpen(false)} />
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
