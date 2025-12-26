import { Home, Users, Calendar, FileText, DollarSign, MessageSquare, Video, BarChart3, Settings, Notebook } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: Notebook },
    { id: 'forms', label: 'Forms & Assessments', icon: FileText },
    { id: 'billing', label: 'Billing & Invoices', icon: DollarSign },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
            <span className="text-white">M</span>
          </div>
          <div>
            <div className="text-slate-900">MBC Therapy</div>
            <div className="text-xs text-slate-500">Therapist Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4">
          <div className="text-sm text-slate-900">Need Help?</div>
          <p className="text-xs text-slate-600 mt-1">Visit our support center</p>
          <button className="mt-3 w-full px-3 py-2 bg-white rounded-lg text-xs text-cyan-700 hover:bg-cyan-50 transition-colors">
            Get Support
          </button>
        </div>
      </div>
    </div>
  );
}
