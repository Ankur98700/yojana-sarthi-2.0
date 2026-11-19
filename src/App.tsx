import { X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExploreSchemesPage } from './pages/ExploreSchemesPage.tsx';
import { SchemeDetailPage } from './pages/SchemeDetailPage.tsx';
import { EligibilityCheckerPage } from './pages/EligibilityCheckerPage.tsx';
import { RecommendationsPage } from './pages/RecommendationsPage.tsx';
import { CompareSchemesPage } from './pages/CompareSchemesPage.tsx';
import { AssistantPage } from './pages/AssistantPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { AboutPage, ContactPage, LegalPolicyPage } from './pages/StaticInfoPages.tsx';

function AppShell() {
  const { route, toast, dismissToast } = useApp();

  const renderPage = () => {
    if (route === '/' || route === '') return <HomePage />;
    if (route === '/explore') return <ExploreSchemesPage />;
    if (route.startsWith('/schemes/')) {
      const slug = decodeURIComponent(route.slice('/schemes/'.length).split('?')[0]);
      return <SchemeDetailPage slug={slug} />;
    }
    if (route === '/eligibility') return <EligibilityCheckerPage />;
    if (route === '/recommendations') return <RecommendationsPage />;
    if (route === '/compare') return <CompareSchemesPage />;
    if (route === '/assistant') return <AssistantPage />;
    if (route === '/dashboard') return <DashboardPage />;
    if (route === '/admin') return <AdminPage />;
    if (route === '/about') return <AboutPage />;
    if (route === '/contact') return <ContactPage />;
    if (route === '/privacy') return <LegalPolicyPage mode="privacy" />;
    if (route === '/terms') return <LegalPolicyPage mode="terms" />;
    if (route === '/disclaimer') return <LegalPolicyPage mode="disclaimer" />;
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#172B4D]">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />

      {/* Non-blocking Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-[#123B65] text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-sm"
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss message"
            className="text-slate-300 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
