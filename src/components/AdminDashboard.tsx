import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardHome } from './DashboardHome';
import { ClientsPage } from './ClientsPage';
import { AppointmentsPage } from './AppointmentsPage';
import { FormsPage } from './FormsPage';
import { BillingPage } from './BillingPage';
import { MessagingPage } from './MessagingPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';
import { ClientProfile } from './ClientProfile';
import { NotesPage } from './NotesPage';

interface AdminDashboardProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function AdminDashboard({ userName, userEmail, onLogout }: AdminDashboardProps) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | number | undefined>(undefined);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome userName={userName} />;
      case 'clients':
        return <ClientsPage />;
      case 'client-profile':
        return <ClientProfile clientId={selectedClientId} onBack={() => setCurrentPage('clients')} />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'forms':
        return <FormsPage />;
      case 'billing':
        return <BillingPage />;
      case 'messaging':
        return <MessagingPage userEmail={userEmail} userRole="admin" />;
      // telehealth removed: use messaging/appointments for audio/video calls
      case 'reports':
        return <ReportsPage />;
      case 'notes':
        return <NotesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardHome />;
    }
  };

  // Listen for navigation events to open client profile
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      const id = ev?.detail?.id;
      if (id !== undefined) {
        setSelectedClientId(id);
        setCurrentPage('client-profile');
      }
    };
    window.addEventListener('navigate:client:profile', handler as EventListener);
    return () => window.removeEventListener('navigate:client:profile', handler as EventListener);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={userName} userRole="Admin" onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
