import { useState } from 'react';
import { Menu, X, User, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { YojanaSarthiLogo } from './Logo.tsx';

export function Navbar() {
  const {
    route,
    navigate,
    dbUser,
    authLoading,
    signInWithGoogle,
    signOut,
    compareIds,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const primaryLinks = [
    { label: 'Explore Schemes', path: '/explore' },
    { label: 'Recommendations', path: '/recommendations' },
    {
      label: compareIds.length > 0 ? `Compare (${compareIds.length})` : 'Compare',
      path: '/compare',
    },
    { label: 'Yojana Mitra', path: '/assistant' },
    { label: 'About', path: '/about' },
  ];

  const handleLink = (path: string) => {
    navigate(path);
    setMobileOpen(false);
    setAccountOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Clean single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleLink('/')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#123B65] rounded-md py-1"
        >
          <YojanaSarthiLogo className="w-8 h-8 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-[#123B65]">
            Yojana Sarthi
          </span>
        </button>

        {/* Zone 2: Clean single-line desktop navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#475467]"
        >
          {primaryLinks.map((item) => {
            const active =
              route === item.path ||
              (item.path === '/explore' && route.startsWith('/schemes/'));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleLink(item.path)}
                className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors duration-150 ${
                  active
                    ? 'border-[#123B65] text-[#123B65] font-semibold'
                    : 'border-transparent hover:text-[#123B65] hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account access + Primary CTA */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {!authLoading && dbUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-[#172B4D] hover:text-[#123B65] py-2 px-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-7 h-7 rounded-full bg-[#123B65]/10 text-[#123B65] flex items-center justify-center font-semibold text-xs">
                  {(dbUser.name || dbUser.email).charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate">{dbUser.name || 'Account'}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {accountOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50"
                  role="menu"
                >
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-[#172B4D] truncate">
                      {dbUser.name || 'Citizen Account'}
                    </p>
                    <p className="text-xs text-[#667085] truncate">{dbUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLink('/dashboard')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#172B4D] hover:bg-slate-50 text-left"
                  >
                    <User className="w-4 h-4 text-[#123B65]" />
                    My Dashboard & Profile
                  </button>
                  {dbUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleLink('/admin')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#172B4D] hover:bg-slate-50 text-left"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#138A55]" />
                      Admin Scheme Panel
                    </button>
                  )}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        void signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-rose-700 hover:bg-rose-50 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="text-sm font-medium text-[#475467] hover:text-[#123B65] py-2 px-2 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => handleLink('/eligibility')}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Check My Eligibility
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => handleLink('/eligibility')}
            className="px-3 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg whitespace-nowrap shrink-0"
          >
            Check Eligibility
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2.5 rounded-lg text-[#172B4D] hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-1">
          {[
            { label: 'Home', path: '/' },
            { label: 'Explore Schemes', path: '/explore' },
            { label: 'Check Eligibility', path: '/eligibility' },
            { label: 'Recommendations', path: '/recommendations' },
            {
              label: compareIds.length > 0 ? `Compare Schemes (${compareIds.length})` : 'Compare Schemes',
              path: '/compare',
            },
            { label: 'Yojana Mitra AI', path: '/assistant' },
            { label: 'About Us', path: '/about' },
          ].map((item) => {
            const active = route === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleLink(item.path)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-[#123B65]/8 text-[#123B65] font-semibold'
                    : 'text-[#172B4D] hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
            {dbUser ? (
              <>
                <button
                  type="button"
                  onClick={() => handleLink('/dashboard')}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#123B65] hover:bg-slate-50"
                >
                  My Dashboard ({dbUser.name || dbUser.email})
                </button>
                {dbUser.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleLink('/admin')}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#138A55] hover:bg-slate-50"
                  >
                    Admin Scheme Panel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signInWithGoogle();
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-[#123B65] border border-[#123B65] rounded-lg hover:bg-[#123B65]/5"
              >
                Sign In / Register with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
