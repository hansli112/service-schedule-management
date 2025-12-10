import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Settings } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Schedule', label: '服事表', icon: Calendar },
    { name: 'Workers', label: '同工管理', icon: Users },
    { name: 'ServiceSettings', label: '服事設定', icon: Settings },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link key={item.name} to={createPageUrl(item.name)}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'}
                    className={`gap-2 ${isActive ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      
      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
