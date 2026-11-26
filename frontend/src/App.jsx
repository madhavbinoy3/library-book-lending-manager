import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { api } from './api/client';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import AddBookModal from './components/AddBookModal';
import Toast from './components/Toast';
import DashboardPage from './pages/DashboardPage';
import BookDetailsPage from './pages/BookDetailsPage';

const DEFAULT_STATS = {
  totalTitles: 0,
  totalCopies: 0,
  copiesIssued: 0,
  overdueLoans: 0,
  totalFineCollected: 0,
};

export default function App() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch {
      // Keep previous stats on transient error
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleMutationSuccess = useCallback(() => {
    fetchStats();
    setRefreshSignal((s) => s + 1);
  }, [fetchStats]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar onOpenAddBook={() => setIsAddBookOpen(true)} />

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <StatsBar stats={stats} loading={statsLoading} />

          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  refreshSignal={refreshSignal}
                  onMutationSuccess={handleMutationSuccess}
                  onOpenAddBook={() => setIsAddBookOpen(true)}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/books/:id"
              element={
                <BookDetailsPage
                  onMutationSuccess={handleMutationSuccess}
                  showToast={showToast}
                />
              }
            />
          </Routes>
        </main>

        <AddBookModal
          isOpen={isAddBookOpen}
          onClose={() => setIsAddBookOpen(false)}
          onSuccess={(_, message) => {
            showToast(message || 'Book added successfully', 'success');
            handleMutationSuccess();
          }}
        />

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </BrowserRouter>
  );
}
