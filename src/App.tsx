import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProgrammingPage } from './pages/ProgrammingPage';
import { ProductionPage } from './pages/ProductionPage';
import { HistoryPage } from './pages/HistoryPage';
import PlantScreenPage from './pages/PlantScreenPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (currentPage === 'plant-screen') {
    return <PlantScreenPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'programming':
        return <ProgrammingPage />;
      case 'production':
        return <ProductionPage />;
      case 'history':
        return <HistoryPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
