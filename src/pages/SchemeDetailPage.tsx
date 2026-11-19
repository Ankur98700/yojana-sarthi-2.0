import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  MessageSquareText,
  Scale,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import type { SchemeEligibilityEvaluation, SchemeRecord } from '../types/index.ts';

interface SchemeDetailPageProps {
  slug: string;
}

export function SchemeDetailPage({ slug }: SchemeDetailPageProps) {
  const {
    navigate,
    savedSchemeIds,
    toggleSaveScheme,
    compareIds,
    toggleCompareScheme,
    recordSchemeView,
    latestEligibilityResult,
    askAssistant,
  } = useApp();

  const [scheme, setScheme] = useState<SchemeRecord | null>(null);
  const [serverEvaluation, setServerEvaluation] = useState<SchemeEligibilityEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiRequest<{ scheme: SchemeRecord; evaluation: SchemeEligibilityEvaluation | null }>(
      `/api/schemes/${encodeURIComponent(slug)}`
    )
      .then((res) => {
        if (!active) return;
        setScheme(res.scheme);
        setServerEvaluation(res.evaluation);
        recordSchemeView({
          id: res.scheme.id,
          slug: res.scheme.slug,
          name: res.scheme.name,
          category: res.scheme.category,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load scheme details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, recordSchemeView]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-3/4 bg-slate-200 rounded" />
        <div className="h-40 w-full bg-white border border-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#172B4D]">Scheme Not Found</h1>
        <p className="text-sm text-[#667085] mt-2">{error || 'The requested scheme could not be located.'}</p>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
        >
          Return to Scheme Explorer
        </button>
      </div>
    );
  }

  const isSaved = savedSchemeIds.includes(scheme.id);
  const isComparing = compareIds.includes(scheme.id);

  // Use either latest eligibility check result or server-evaluated saved profile result
  const activeEval =
    latestEligibilityResult?.results.find((r) => r.schemeId === scheme.id) ?? serverEvaluation;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => navigate('/explore')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475467] hover:text-[#123B65] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore Schemes</span>
      </button>

      {/* Top Summary Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#667085] mb-3">
          <span className="font-semibold text-[#123B65]">{scheme.category}</span>
          <span aria-hidden="true">·</span>
          <span>{scheme.governmentLevel} Government Scheme</span>
          <span aria-hidden="true">·</span>
          <span>Coverage: {scheme.stateCoverage.join(', ')}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            {scheme.verificationStatus === 'Verified' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#138A55]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#F39C35]" />
            )}
            <span>
              {scheme.verificationStatus} (Last verified {scheme.lastVerifiedDate})
            </span>
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight leading-snug mb-3">
          {scheme.name}
        </h1>
        <p className="text-sm text-[#667085] mb-5">{scheme.department}</p>

        <div className="bg-[#F5F7FA] border border-slate-200 rounded-lg p-4 mb-6">
          <span className="text-xs font-medium text-[#667085] block mb-1">Key Benefit</span>
          <p className="text-base font-semibold text-[#172B4D]">{scheme.mainBenefit}</p>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg whitespace-nowrap"
          >
            <span>Check My Eligibility</span>
          </button>

          <a
            href={scheme.officialApplicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#138A55] hover:bg-[#0F7347] rounded-lg whitespace-nowrap"
          >
            <span>Visit Official Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => void toggleSaveScheme(scheme.id, scheme.name)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border whitespace-nowrap ${
              isSaved
                ? 'bg-[#138A55]/10 text-[#138A55] border-[#138A55]/30'
                : 'bg-white text-[#172B4D] border-slate-300 hover:border-[#123B65]'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Saved' : 'Save Scheme'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCompareScheme(scheme.id, scheme.name)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border whitespace-nowrap ${
              isComparing
                ? 'bg-[#123B65] text-white border-[#123B65]'
                : 'bg-white text-[#172B4D] border-slate-300 hover:border-[#123B65]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{isComparing ? 'In Comparison' : 'Compare Scheme'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              askAssistant(`Explain the eligibility rules, required documents, and application process for ${scheme.name}.`)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#123B65] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg whitespace-nowrap"
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Ask Yojana Mitra</span>
          </button>
        </div>
      </div>

      {/* Personalized Eligibility Snapshot if available */}
      {activeEval && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-lg font-semibold text-[#172B4D]">
              Your Preliminary Eligibility Status
            </h2>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              {activeEval.status === 'ELIGIBLE' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#138A55]" />
                  <span className="text-[#138A55]">Eligible</span>
                </>
              )}
              {activeEval.status === 'POTENTIALLY_ELIGIBLE' && (
                <>
                  <AlertCircle className="w-4 h-4 text-[#D97706]" />
                  <span className="text-[#B45309]">Potentially Eligible</span>
                </>
              )}
              {activeEval.status === 'NOT_ELIGIBLE' && (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">Requirements Not Met</span>
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-[#475467] leading-relaxed">{activeEval.summaryExplanation}</p>
        </div>
      )}

      {/* Main Content 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Overview & Objective */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#172B4D] mb-2">Overview</h2>
              <p className="text-sm text-[#475467] leading-relaxed">{scheme.overview}</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-display text-base font-semibold text-[#172B4D] mb-1.5">
                Objective
              </h3>
              <p className="text-sm text-[#475467] leading-relaxed">{scheme.objective}</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-display text-base font-semibold text-[#172B4D] mb-1.5">
                Target Beneficiaries
              </h3>
              <p className="text-sm text-[#475467] leading-relaxed">{scheme.targetBeneficiaries}</p>
            </div>
          </section>

          {/* Benefits */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#172B4D] mb-3.5">
              Scheme Benefits
            </h2>
            <ul className="space-y-2.5">
              {scheme.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#475467]">
                  <CheckCircle2 className="w-4 h-4 text-[#138A55] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Structured Eligibility Conditions */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#172B4D] mb-1">
              Eligibility Conditions
            </h2>
            <p className="text-xs text-[#667085] mb-4">
              Rules stored in our eligibility engine with official reference links.
            </p>

            {scheme.rules && scheme.rules.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {scheme.rules.map((rule) => (
                  <div key={rule.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#172B4D]">{rule.label}</p>
                      <p className="text-xs text-[#667085]">
                        Condition Type: {rule.logicalGroup === 'AND' ? 'Mandatory requirement' : 'Alternative qualification pathway (OR)'}{' '}
                        · {rule.isVerifiedRule ? 'Verified rule' : 'Requires official portal confirmation'}
                      </p>
                    </div>
                    <a
                      href={rule.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#123B65] hover:underline shrink-0"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#667085]">
                Verify complete eligibility rules on the official portal.
              </p>
            )}
          </section>

          {/* Application Process */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                Application Process
              </h2>
              <span className="text-xs font-medium text-[#123B65]">
                Mode: {scheme.applicationMethod}
              </span>
            </div>
            <ol className="space-y-3.5">
              {scheme.applicationSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-[#475467]">
                  <span className="font-mono text-xs font-semibold text-[#123B65] bg-[#F5F7FA] border border-slate-200 rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar: Required Documents + Official Sources */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3.5">
              <FileText className="w-4 h-4 text-[#123B65]" />
              <h2 className="font-display text-base font-semibold text-[#172B4D]">
                Required Documents
              </h2>
            </div>
            <ul className="space-y-2.5 text-sm text-[#475467]">
              {scheme.documentsRequired.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#123B65] font-bold">·</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#172B4D]">
              Official Links &amp; Verification
            </h2>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[#667085]">Government Level</dt>
                <dd className="font-medium text-[#172B4D] mt-0.5">
                  {scheme.governmentLevel} Government ({scheme.stateCoverage.join(', ')})
                </dd>
              </div>
              <div>
                <dt className="text-[#667085]">Application Method</dt>
                <dd className="font-medium text-[#172B4D] mt-0.5">{scheme.applicationMethod}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Verification Status</dt>
                <dd className="font-medium text-[#172B4D] mt-0.5">
                  {scheme.verificationStatus} · Verified on{' '}
                  <span className="tabular-nums">{scheme.lastVerifiedDate}</span>
                </dd>
              </div>
            </dl>

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <a
                href={scheme.officialApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
              >
                <span>Official Application Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={scheme.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#123B65] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg"
              >
                <span>Official Source Reference</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="pt-2 flex items-start gap-2 text-xs text-[#667085]">
              <HelpCircle className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
              <p className="leading-relaxed">
                Yojana Sarthi does not submit applications. Always complete registration directly on the official government portal above.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
