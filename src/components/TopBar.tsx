import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import React from 'react';

interface TopBarProps {
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export function TopBar({ userName = 'User', userRole = 'Staff', onLogout }: TopBarProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients, appointments, documents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-cyan-500 text-white text-xs rounded-full">
            3
          </Badge>
        </button>

        <div className="relative flex items-center gap-3 pl-4 border-l border-slate-200">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 hover:bg-slate-50 rounded-xl p-2 transition-colors"
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" />
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-sm text-slate-900">{userName}</span>
              <span className="text-xs text-slate-500">{userRole}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showDropdown && onLogout && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}