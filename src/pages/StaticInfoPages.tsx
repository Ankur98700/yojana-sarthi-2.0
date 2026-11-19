import { useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function AboutPage() {
  const { navigate } = useApp();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <p className="text-sm font-medium text-[#138A55] mb-1">About Yojana Sarthi</p>
        <h1 className="font-display text-3xl font-bold text-[#123B65] tracking-tight">
          Bridging Citizens and Verified Public Welfare Benefits
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-[#475467] leading-relaxed">
        <p>
          <strong className="text-[#172B4D]">Yojana Sarthi</strong> (Your Personal Guide to Government Welfare Schemes) is an independent citizen-focused platform built to make discovering and understanding Indian Central and State Government welfare schemes clear, transparent, and accessible for everyone—including first-time internet users.
        </p>
        <p>
          Millions of eligible students, farmers, women, artisans, senior citizens, and low-income families miss out on vital government support simply because eligibility criteria, required documents, and application steps are scattered across dozens of ministry websites. Yojana Sarthi brings structured, verified records together with a transparent rule-based eligibility engine and the Yojana Mitra AI assistant.
        </p>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[#F5F7FA] border border-slate-200">
            <h2 className="font-display text-base font-semibold text-[#123B65] mb-1.5">
              Our Evaluation Principles
            </h2>
            <p className="text-xs text-[#475467] leading-relaxed">
              Every eligibility outcome is computed on the backend using structured AND/OR rules. Missing fields are never treated as a pass, unverified rules are flagged clearly, and every condition links to official government portals.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#F5F7FA] border border-slate-200">
            <h2 className="font-display text-base font-semibold text-[#138A55] mb-1.5">
              Designed for Future Regional Languages
            </h2>
            <p className="text-xs text-[#475467] leading-relaxed">
              Currently available in clear everyday English, with structured content separation ready for Hindi and regional Indian language localization.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Check My Eligibility
          </button>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-5 py-2.5 text-sm font-semibold text-[#123B65] border border-slate-300 rounded-lg"
          >
            Explore Schemes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <p className="text-sm font-medium text-[#138A55] mb-1">Contact &amp; Scheme Correction</p>
        <h1 className="font-display text-3xl font-bold text-[#123B65] tracking-tight">
          Report an Outdated Scheme or Share Feedback
        </h1>
        <p className="text-sm text-[#475467] mt-1.5">
          Notice a changed income limit, updated ministry URL, or a state scheme you would like added? Let our verification team know.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#138A55] mx-auto" />
            <h2 className="font-display text-lg font-semibold text-[#172B4D]">
              Thank you for your feedback
            </h2>
            <p className="text-sm text-[#667085] max-w-md mx-auto">
              Your note has been recorded. For official scheme applications or grievance redressal, always contact the responsible ministry directly via{' '}
              <a
                href="https://pgportal.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#123B65] underline"
              >
                CPGRAMS (pgportal.gov.in)
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="c-name" className="block text-xs font-semibold text-[#475467] mb-1">
                Your Name *
              </label>
              <input
                id="c-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Email Address *
              </label>
              <input
                id="c-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="c-msg" className="block text-xs font-semibold text-[#475467] mb-1">
                Message or Official Source URL *
              </label>
              <textarea
                id="c-msg"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share details of a scheme update, correction, or suggestion (do not include Aadhaar or bank details)."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
            >
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function LegalPolicyPage({ mode }: { mode: 'privacy' | 'terms' | 'disclaimer' }) {
  const titles = {
    privacy: {
      kicker: 'Citizen Privacy Policy',
      title: 'Minimal Data Collection & Privacy Commitment',
    },
    terms: {
      kicker: 'Terms & Conditions',
      title: 'Terms of Use for Yojana Sarthi',
    },
    disclaimer: {
      kicker: 'Official Disclaimer',
      title: 'Independent Guidance — Not an Official Government Portal',
    },
  }[mode];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <p className="text-sm font-medium text-[#138A55] mb-1">{titles.kicker}</p>
        <h1 className="font-display text-3xl font-bold text-[#123B65] tracking-tight">
          {titles.title}
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-[#475467] leading-relaxed">
        {mode === 'privacy' && (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F5F7FA] border border-slate-200">
              <ShieldCheck className="w-5 h-5 text-[#138A55] shrink-0 mt-0.5" />
              <p className="text-xs text-[#172B4D]">
                Yojana Sarthi NEVER requests or stores Aadhaar numbers, PAN numbers, bank account numbers, IFSC codes, debit/credit card numbers, or government OTPs.
              </p>
            </div>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">1. Data We Collect</h2>
            <p>
              If you use Yojana Sarthi as a guest, your eligibility questionnaire answers are evaluated on the server to compute results and stored temporarily in your browser session only. If you sign in with Google, we store your name, email, optional eligibility profile fields (such as age, state, income bracket, occupation, education, and household size), saved schemes, eligibility check history, and Yojana Mitra chat history in our secured PostgreSQL database.
            </p>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">2. How Data Is Used</h2>
            <p>
              Profile data is used strictly to evaluate scheme eligibility rules, generate personalized scheme recommendations, and (only when you explicitly opt in) provide personalized context to Yojana Mitra. We do not sell, rent, or trade citizen data.
            </p>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">3. User Control</h2>
            <p>
              You may update or clear your profile fields at any time from your Citizen Dashboard and clear your Yojana Mitra chat history with one click.
            </p>
          </>
        )}

        {mode === 'terms' && (
          <>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">1. Informational Guidance Only</h2>
            <p>
              Yojana Sarthi is an informational eligibility and discovery platform. Using this platform does not constitute submitting an official government application or receiving benefit approval.
            </p>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">2. Official Verification Requirement</h2>
            <p>
              Government scheme guidelines, income thresholds, benefit amounts, and application deadlines may change through official notifications. Users must verify final requirements on the official Central or State Government website linked on every scheme page.
            </p>
            <h2 className="font-display text-base font-semibold text-[#172B4D]">3. Responsible Use</h2>
            <p>
              Users agree not to submit sensitive financial or government ID numbers into free-text fields or chat prompts, and not to attempt unauthorized access to administrative endpoints.
            </p>
          </>
        )}

        {mode === 'disclaimer' && (
          <>
            <p>
              <strong className="text-[#172B4D]">Yojana Sarthi is an independent civic technology platform</strong> and is NOT affiliated with, endorsed by, or operated by the Government of India, any State Government, or any Ministry/Department.
            </p>
            <p>
              All scheme information is compiled from publicly available official government portals—including{' '}
              <a href="https://www.myscheme.gov.in/" target="_blank" rel="noopener noreferrer" className="text-[#123B65] underline inline-flex items-center gap-0.5">
                myScheme.gov.in <ExternalLink className="w-3 h-3" />
              </a>
              ,{' '}
              <a href="https://www.india.gov.in/" target="_blank" rel="noopener noreferrer" className="text-[#123B65] underline inline-flex items-center gap-0.5">
                India.gov.in <ExternalLink className="w-3 h-3" />
              </a>
              , and respective Ministry portals. Each scheme displays its verification status and last verified date.
            </p>
            <p>
              Preliminary results marked &ldquo;Eligible&rdquo; or &ldquo;Potentially Eligible&rdquo; reflect only the answers you provided against stored structured rules and do not guarantee official sanction, which remains solely with the concerned Government authority after document and database verification.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
