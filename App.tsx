
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { Reports } from './components/Reports';
import { AiAssistant } from './components/AiAssistant';
import { Settings } from './components/Settings';
import { Goals } from './components/Goals';
import { Auth } from './components/Auth';

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
