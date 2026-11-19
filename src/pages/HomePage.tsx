import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileCheck2,
  MessageSquareText,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { SchemeCard } from '../components/SchemeCard.tsx';
import type { SchemeRecord } from '../types/index.ts';

const HERO_IMG = '/src/assets/images/hero_yojana_sarthi_1795065396368.jpg';
const RURAL_IMG = '/src/assets/images/citizens_rural_welfare_1795065400220.jpg';
const EDU_IMG = '/src/assets/images/citizens_education_hub_1795065399575.jpg';

export function HomePage() {
  const { navigate } = useApp();
  const [popularSchemes, setPopularSchemes] = useState<SchemeRecord[]>([]);
  const [totalSchemes, setTotalSchemes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ items: SchemeRecord[]; pagination: { total: number } }>('/api/schemes?limit=6&sort=verified')
      .then((data) => {
        if (!active) return;
        setPopularSchemes(data.items);
        setTotalSchemes(data.pagination.total);
      })
      .catch(() => {
        // handled cleanly with empty state
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const features = [
    {
      title: 'Smart Eligibility Checker',
      description:
        'Step through a plain-English questionnaire covering personal, financial, education, and household criteria. Every rule evaluates transparently on the backend.',
      icon: SlidersHorizontal,
      actionLabel: 'Start Eligibility Check',
      path: '/eligibility',
      span: 'lg:col-span-2',
    },
    {
      title: 'AI-Powered Scheme Assistant',
      description:
        'Ask Yojana Mitra questions in everyday English and receive grounded answers backed by official ministry and myScheme sources.',
      icon: MessageSquareText,
      actionLabel: 'Open Yojana Mitra',
      path: '/assistant',
      span: 'lg:col-span-1',
    },
    {
      title: 'Government Scheme Explorer',
      description:
        'Search Central and State schemes by keyword, state coverage, category, age bracket, income threshold, and beneficiary group.',
      icon: Compass,
      actionLabel: 'Browse All Schemes',
      path: '/explore',
      span: 'lg:col-span-1',
    },
    {
      title: 'Personalized Recommendations',
      description:
        'See eligible and potentially eligible schemes ranked by real rule matches—never arbitrary black-box scores—with clear explanations.',
      icon: CheckCircle2,
      actionLabel: 'View Recommendations',
      path: '/recommendations',
      span: 'lg:col-span-1',
    },
    {
      title: 'Scheme Comparison',
      description:
        'Compare up to three schemes side by side across benefits, age and income limits, required documents, and application methods.',
      icon: Scale,
      actionLabel: 'Compare Schemes',
      path: '/compare',
      span: 'lg:col-span-1',
    },
    {
      title: 'Document Checklist',
      description:
        'Track every document needed across your saved and eligible welfare schemes in your citizen dashboard before visiting an official portal.',
      icon: ClipboardList,
      actionLabel: 'Open Dashboard',
      path: '/dashboard',
      span: 'lg:col-span-3',
    },
  ];

  return (
    <div className="bg-[#F5F7FA]">
      {/* HERO SECTION */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-medium text-[#138A55] mb-3">
                Your Personal Guide to Government Welfare Schemes · India
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[3rem] font-bold text-[#123B65] tracking-tight leading-[1.12] mb-5 max-w-xl"
                style={{ textWrap: 'balance' }}
              >
                Find Government Schemes You&apos;re Eligible For.
              </h1>
              <p className="text-base sm:text-lg text-[#475467] leading-relaxed max-w-xl mb-8">
                Discover welfare schemes, check your eligibility, and access benefits designed for you and your family. Transparent rules, verified official portals, and zero Aadhaar or bank account collection.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => navigate('/eligibility')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Check My Eligibility</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/explore')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#123B65] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Explore Government Schemes</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#667085]">
                <span>Central &amp; State Schemes</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {totalSchemes > 0 ? `${totalSchemes} Verified Records in Database` : 'Verified Government Sources'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Guest Check Available</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-stretch">
              <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#F5F7FA] min-h-[260px] lg:min-h-[380px] flex items-center justify-center">
                {!heroImgFailed ? (
                  <img
                    src={HERO_IMG}
                    alt="Indian citizens including a student, farmer, woman entrepreneur, and senior citizen walking along a clear civic pathway toward modern public service centers"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-10 text-center space-y-2">
                    <ShieldCheck className="w-12 h-12 text-[#123B65] mx-auto" />
                    <p className="font-display font-semibold text-[#123B65]">Yojana Sarthi</p>
                    <p className="text-sm text-[#667085]">Discover. Check Eligibility. Access Benefits.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-medium text-[#138A55] mb-2">How Yojana Sarthi Works</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
            Three transparent steps from profile to official benefits
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Tell Us About Yourself',
              body: 'Answer a few simple questions about your age, state, family income, occupation, and household circumstances. No Aadhaar or bank numbers are ever requested.',
            },
            {
              step: '02',
              title: 'Discover Relevant Schemes',
              body: 'Our backend rule engine evaluates every mandatory requirement against verified Central and State scheme conditions—explaining every pass, fail, or missing detail.',
            },
            {
              step: '03',
              title: 'Access Government Benefits',
              body: 'Review eligible benefits, assemble your required documents checklist, compare options side by side, and proceed directly to official government portals.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-sm font-semibold text-[#123B65] tabular-nums">
                    {item.step}.
                  </span>
                  <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#172B4D] mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm text-[#475467] leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MAIN FEATURES — ASYMMETRIC BENTO GRID */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-[#123B65] mb-2">Built for Every Citizen</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Everything you need to understand and verify scheme eligibility
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`${feat.span} bg-[#F5F7FA] border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#123B65] mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#172B4D] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-[#475467] leading-relaxed mb-5">
                      {feat.description}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(feat.path)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2C4D]"
                    >
                      <span>{feat.actionLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR VERIFIED SCHEMES FROM DATABASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-medium text-[#138A55] mb-2">Verified Scheme Directory</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
              Popular Government Welfare Schemes
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2C4D] whitespace-nowrap shrink-0"
          >
            <span>Explore all {totalSchemes || ''} schemes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-6 h-64 animate-pulse"
              >
                <div className="h-3 w-40 bg-slate-200 rounded mb-4" />
                <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                <div className="h-3 w-5/6 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        )}
      </section>

      {/* TRUST & TRANSPARENCY SECTION */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-[#138A55] mb-2">Trust &amp; Transparency</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight">
                  Verified sources, explicit rules, and citizen-first privacy
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#475467] leading-relaxed">
                Yojana Sarthi is designed as an honest guidance tool. We never invent scheme benefits, assume you qualify when details are missing, or collect sensitive identifiers like Aadhaar or bank account numbers.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    icon: FileCheck2,
                    title: 'Direct Official Portal Links',
                    desc: 'Every scheme record links to myScheme, India.gov.in, or the responsible Central/State Ministry portal alongside its last verified date.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Strict Rule-Based Transparency',
                    desc: 'Missing fields never count as a pass. Whenever a scheme relies on SECC-2011, ration card lists, or income-tax status, we explicitly flag it for official verification.',
                  },
                  {
                    icon: CheckCircle2,
                    title: 'Minimal Data Collection',
                    desc: 'Check eligibility as a guest without creating an account, or sign in with Google to sync saved schemes and document checklists securely.',
                  },
                ].map((point) => {
                  const Icon = point.icon;
                  return (
                    <div key={point.title} className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-[#F5F7FA] border border-slate-200 flex items-center justify-center text-[#123B65] shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#172B4D]">{point.title}</h3>
                        <p className="text-sm text-[#667085] leading-relaxed mt-0.5">
                          {point.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#F5F7FA]">
                <img
                  src={RURAL_IMG}
                  alt="Indian farmer checking agricultural scheme records on a mobile phone beside green fields"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover"
                />
                <div className="p-4 bg-white">
                  <p className="text-xs font-medium text-[#123B65]">Rural &amp; Agricultural Access</p>
                  <p className="text-xs text-[#667085] mt-1">
                    Covering PM-KISAN, PMAY-G, MGNREGA, and NSAP social security schemes.
                  </p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#F5F7FA]">
                <img
                  src={EDU_IMG}
                  alt="Indian college students and women entrepreneurs reviewing scholarship and enterprise documents together"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover"
                />
                <div className="p-4 bg-white">
                  <p className="text-xs font-medium text-[#138A55]">Education, Skills &amp; Women</p>
                  <p className="text-xs text-[#667085] mt-1">
                    Covering NSP scholarships, PMKVY 4.0, PMMY MUDRA, and state girl-child schemes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="bg-[#123B65] rounded-2xl px-6 py-12 sm:px-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#F39C35] mb-2">Start in under 2 minutes</p>
            <h2
              className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug"
              style={{ textWrap: 'balance' }}
            >
              Your Next Government Benefit Could Be Just a Few Clicks Away.
            </h2>
            <p className="text-sm sm:text-base text-slate-200 mt-2.5 leading-relaxed">
              Answer simple questions about your household and receive an instant, explainable eligibility report across Central and State schemes.
            </p>
          </div>
          <div className="shrink-0 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#123B65] bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Find My Schemes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
