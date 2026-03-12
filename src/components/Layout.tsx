import { Outlet, NavLink } from 'react-router-dom';
import { Home, Settings } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-4 pb-safe z-50">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`
          }
        >
          <Home size={24} />
          <span className="text-xs font-medium">首页</span>
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`
          }
        >
          <Settings size={24} />
          <span className="text-xs font-medium">设置</span>
        </NavLink>
      </nav>
    </div>
  );
}
