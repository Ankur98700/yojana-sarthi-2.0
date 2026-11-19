import { ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { YojanaSarthiLogo } from './Logo.tsx';

export function Footer() {
  const { navigate } = useApp();

  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 text-left"
            >
              <YojanaSarthiLogo className="w-8 h-8" />
              <span className="font-display text-lg font-bold text-[#123B65]">Yojana Sarthi</span>
            </button>
            <p className="text-sm text-[#667085] leading-relaxed">
              Your Personal Guide to Government Welfare Schemes. Discover. Check Eligibility. Access Benefits.
            </p>
            <p className="text-xs text-[#667085] leading-relaxed pt-1">
              Independent public-benefit guidance platform. Not an official Government of India portal.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-[#172B4D] mb-3.5">Platform</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              {[
                { label: 'Explore Schemes', path: '/explore' },
                { label: 'Check Eligibility', path: '/eligibility' },
                { label: 'Personalized Recommendations', path: '/recommendations' },
                { label: 'Compare Schemes', path: '/compare' },
                { label: 'Yojana Mitra AI', path: '/assistant' },
                { label: 'Citizen Dashboard', path: '/dashboard' },
              ].map((link) => (
                <li key={link.path}>
                  <button
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="hover:text-[#123B65] transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Information & Legal */}
          <div>
            <h3 className="text-sm font-semibold text-[#172B4D] mb-3.5">Trust & Policies</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              {[
                { label: 'About Yojana Sarthi', path: '/about' },
                { label: 'Contact & Feedback', path: '/contact' },
                { label: 'Privacy Policy', path: '/privacy' },
                { label: 'Terms and Conditions', path: '/terms' },
                { label: 'Official Disclaimer', path: '/disclaimer' },
              ].map((link) => (
                <li key={link.path}>
                  <button
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="hover:text-[#123B65] transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Official Government Portals */}
          <div>
            <h3 className="text-sm font-semibold text-[#172B4D] mb-3.5">Official Resources</h3>
            <ul className="space-y-2.5 text-sm text-[#667085]">
              {[
                { label: 'myScheme Portal', href: 'https://www.myscheme.gov.in/' },
                { label: 'National Portal of India', href: 'https://www.india.gov.in/' },
                { label: 'Government Services Portal', href: 'https://services.india.gov.in/' },
                { label: 'Open Government Data (India)', href: 'https://www.data.gov.in/' },
                { label: 'National Scholarship Portal', href: 'https://scholarships.gov.in/' },
              ].map((res) => (
                <li key={res.href}>
                  <a
                    href={res.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#123B65] transition-colors"
                  >
                    <span>{res.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#667085]">
          <p>
            © {new Date().getFullYear()} Yojana Sarthi. Eligibility evaluations are preliminary guidance only; always confirm final eligibility and apply directly on official government websites.
          </p>
          <p className="whitespace-nowrap shrink-0">Built for Indian citizens · English (i18n-ready)</p>
        </div>
      </div>
    </footer>
  );
}
