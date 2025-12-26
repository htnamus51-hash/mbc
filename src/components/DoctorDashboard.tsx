import { useState } from 'react';
import { DoctorSidebar } from './DoctorSidebar';
import { TopBar } from './TopBar';
import { DoctorHome } from './DoctorHome';
import { DoctorMyClients } from './DoctorMyClients';
import { DoctorAppointments } from './DoctorAppointments';
import { DoctorForms } from './DoctorForms';
import { MessagingPage } from './MessagingPage';
import { DoctorSettings } from './DoctorSettings';

interface DoctorDashboardProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function DoctorDashboard({ userName, userEmail, onLogout }: DoctorDashboardProps) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DoctorHome userName={userName} />;
      case 'my-clients':
        return <DoctorMyClients />;
      case 'appointments':
        return <DoctorAppointments userName={userName} />;
      case 'forms':
        return <DoctorForms />;
      case 'messaging':
        return <MessagingPage userEmail={userEmail} userRole="doctor" />;
      // telehealth removed - calls are available via Messaging
      case 'settings':
        return <DoctorSettings />;
      default:
        return <DoctorHome />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <DoctorSidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={userName} userRole="Therapist" onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
