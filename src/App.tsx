import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { requestNotificationPermission, isNotificationSupported } from './utils/notifications';
import GlobalIncomingCall from './components/GlobalIncomingCall';

// Register service worker for handling notification clicks (if supported)
function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/service-worker.js')
    .then((reg) => {
      console.log('[App] Service worker registered:', reg.scope);
    })
    .catch((err) => {
      console.warn('[App] Service worker registration failed:', err);
    });

  // Listen for messages from the service worker and re-dispatch as a DOM event
  try {
    navigator.serviceWorker.addEventListener('message', (ev) => {
      try {
        const data = ev.data;
        if (data && data.type === 'open_conversation' && data.conversationId) {
          window.dispatchEvent(
            new CustomEvent('mbc_open_conversation', { detail: { conversationId: data.conversationId } })
          );
        }
      } catch (e) {
        /* ignore */
      }
    });
  } catch (e) {
    /* ignore */
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from sessionStorage on mount ONLY (per-tab session)
  useEffect(() => {
    console.log("[App] Initializing from sessionStorage (per-tab)...");
    const email = sessionStorage.getItem('userEmail');
    const role = sessionStorage.getItem('userRole') as 'admin' | 'doctor' | null;
    const name = sessionStorage.getItem('userName');

    console.log("[App] sessionStorage values:", { email, role, name });

    if (email && role && name) {
      console.log("[App] Restoring session:", { email, role, name });
      setIsAuthenticated(true);
      setUserEmail(email);
      setUserRole(role);
      setUserName(name);
    } else {
      console.log("[App] No session found in sessionStorage");
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  }, []); // Only run once on mount

  // Request notification permission when a user session is established
  useEffect(() => {
    if (!userEmail) return;
    if (!isNotificationSupported()) return;
    let mounted = true;
    (async () => {
      try {
        const perm = await requestNotificationPermission();
        if (mounted) {
          console.log('[App] Notification permission:', perm);
        }
      } catch (e) {
        console.warn('[App] Notification permission request failed', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userEmail]);

  // Register the service worker once (if supported)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isNotificationSupported()) return;
    registerServiceWorker();
  }, []);

  const handleLogin = (role: 'admin' | 'doctor', name: string, email: string) => {
    console.log("[App] handleLogin called:", { role, name, email });
    setIsAuthenticated(true);
    setUserRole(role);
    setUserName(name);
    setUserEmail(email);
  };

  const handleLogout = () => {
    console.log("[App] handleLogout called");
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    // explicitly disconnect shared socket (if any) to avoid stale connections
    try {
      const w = window as any;
      if (w && w.__mbc_socket) {
        console.log('[App] Disconnecting global socket on logout');
        try {
          w.__mbc_socket.disconnect();
        } catch (err) {
          console.warn('[App] Error disconnecting socket', err);
        }
      }
    } catch (e) {
      /* ignore */
    }
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    setUserEmail('');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (userRole === 'admin') {
    return (
      <>
        <GlobalIncomingCall userEmail={userEmail} />
        <AdminDashboard userName={userName} userEmail={userEmail} onLogout={handleLogout} />
      </>
    );
  }

  if (userRole === 'doctor') {
    return (
      <>
        <GlobalIncomingCall userEmail={userEmail} />
        <DoctorDashboard userName={userName} userEmail={userEmail} onLogout={handleLogout} />
      </>
    );
  }

  return null;
}
