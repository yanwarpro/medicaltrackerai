import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIChatWidget from '../chat/AIChatWidget';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {/* Global Floating AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}

