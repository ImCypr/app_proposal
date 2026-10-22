import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar, Sidebar } from '../component';

export const MainLayout: React.FC = () => {
  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar />
        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
