/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HealSpaceProvider, useHealSpace } from './context/HealSpaceContext';
import { AuthViews } from './components/AuthViews';
import { MahasiswaDashboard } from './components/MahasiswaDashboard';
import { KonselorDashboard } from './components/KonselorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { UserRole } from './types/healspace';

const HealSpaceShell: React.FC = () => {
  const { currentUser } = useHealSpace();

  return (
    <div className="min-h-screen">
      {!currentUser && <AuthViews />}
      {currentUser?.peran === UserRole.MAHASISWA && <MahasiswaDashboard />}
      {currentUser?.peran === UserRole.KONSELOR && <KonselorDashboard />}
      {currentUser?.peran === UserRole.ADMIN && <AdminDashboard />}
    </div>
  );
};

export default function App() {
  return (
    <HealSpaceProvider>
      <HealSpaceShell />
    </HealSpaceProvider>
  );
}
