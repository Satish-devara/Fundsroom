import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Inventory } from './components/Inventory';
import { Challans } from './components/Challans';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Sync tab access when user changes (e.g. login/logout or role checking)
  useEffect(() => {
    if (user) {
      // If user has a role that cannot access the current tab, fall back to dashboard
      const canAccessCRM = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user.role);
      const canAccessChallans = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(user.role);

      if (activeTab === 'crm' && !canAccessCRM) {
        setActiveTab('dashboard');
      }
      if (activeTab === 'challans' && !canAccessChallans) {
        setActiveTab('dashboard');
      }
    } else {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#090d16',
        color: '#f3f4f6'
      }}>
        <RefreshCw className="animate-spin" size={40} color="var(--accent-indigo)" />
        <span style={{ marginTop: '16px', color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>
          Initializing FundsRoom Portal...
        </span>
      </div>
    );
  }

  // Guard: Not logged in
  if (!token || !user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="content-area">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'crm' && <Customers />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'challans' && <Challans />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
