
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TransactionList } from './components/TransactionList.tsx';
import { Reports } from './components/Reports.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { Settings } from './components/Settings.tsx';
import { Goals } from './components/Goals.tsx';
import { Auth } from './components/Auth.tsx';

const MainApp: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <TransactionList />;
      case 'reports': return <Reports />;
      case 'goals': return <Goals />;
      case 'ai': return <AiAssistant />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
