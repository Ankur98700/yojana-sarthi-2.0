import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { SCHEME_CATEGORIES, type RecommendationItem } from '../types/index.ts';

export function RecommendationsPage() {
  const {
    navigate,
    activeProfile,
    setActiveProfile,
    dbUser,
    savedSchemeIds,
    toggleSaveScheme,
    compareIds,
    toggleCompareScheme,
  } = useApp();

  const [preferred, setPreferred] = useState<string[]>(
    activeProfile.preferredCategories ?? dbUser?.profile.preferredCategories ?? []
  );
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveProfile = {
    ...(dbUser?.profile ?? {}),
    ...activeProfile,
    preferredCategories: preferred,
  };

  const hasProfileDetails = Boolean(
    effectiveProfile.age !== undefined && effectiveProfile.age !== null ||
      effectiveProfile.state ||
      effectiveProfile.annualIncome !== undefined && effectiveProfile.annualIncome !== null ||
      effectiveProfile.occupation ||
      effectiveProfile.residenceType
  );

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{
        recommendations: RecommendationItem[];
      }>('/api/recommendations', {
        method: 'POST',
        body: {
          profile: {
            ...(dbUser?.profile ?? {}),
            ...activeProfile,
            preferredCategories: preferred,
          },
        },
      });
      setRecommendations(data.recommendations);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [activeProfile, dbUser?.profile, preferred]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const toggleCategoryPref = (cat: string) => {
    const next = preferred.includes(cat)
      ? preferred.filter((c) => c !== cat)
      : [...preferred, cat];
    setPreferred(next);
    setActiveProfile({ ...activeProfile, preferredCategories: next });
  };

  const tier1 = recommendations.filter((r) => r.priorityTier === 1);
  const tier2 = recommendations.filter((r) => r.priorityTier === 2);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">
            Explainable Rule-Based Ranking
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Personalized Scheme Recommendations
          </h1>
          <p className="text-sm text-[#475467] mt-1.5 max-w-2xl">
            Prioritizes schemes where your details satisfy verified eligibility criteria, followed by relevant schemes that need a few more details or official portal confirmation. Irrelevant ineligible schemes are excluded.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/eligibility')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{hasProfileDetails ? 'Update My Eligibility Answers' : 'Enter My Details First'}</span>
        </button>
      </div>

      {/* Category Preference Filter Bar (Interactive Buttons) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[#172B4D]">
            Prioritize Specific Welfare Areas (Optional)
          </h2>
          {preferred.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPreferred([]);
                setActiveProfile({ ...activeProfile, preferredCategories: [] });
              }}
              className="text-xs font-medium text-[#123B65] hover:underline"
            >
              Clear preferences
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SCHEME_CATEGORIES.map((cat) => {
            const active = preferred.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategoryPref(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  active
                    ? 'bg-[#123B65] text-white border-[#123B65]'
                    : 'bg-[#F5F7FA] text-[#475467] border-slate-200 hover:border-[#123B65]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {!hasProfileDetails && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-8">
          <h2 className="font-display text-lg font-semibold text-[#172B4D]">
            Complete a quick eligibility check for accurate recommendations
          </h2>
          <p className="text-sm text-[#667085] mt-1.5 max-w-xl mx-auto">
            We do not have your age, state, income, or occupation yet. Share a few basic details so our rule engine can identify schemes tailored to you and explain why each one matches.
          </p>
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
          >
            <span>Start 2-Minute Eligibility Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm text-rose-800 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : hasProfileDetails && recommendations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-[#172B4D]">
            No direct recommendations matched your current profile
          </h2>
          <p className="text-sm text-[#667085] mt-1.5 max-w-lg mx-auto">
            Try updating optional fields in the Eligibility Checker or browsing all Central and State schemes in the Explorer.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
            >
              Update Answers
            </button>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="px-4 py-2 text-sm font-semibold text-[#123B65] bg-white border border-slate-300 rounded-lg"
            >
              Explore All Schemes
            </button>
          </div>
        </div>
      ) : (
        hasProfileDetails && (
          <div className="space-y-10">
            {/* Tier 1: Eligible */}
            {tier1.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#172B4D] tabular-nums">
                    Top Recommended — Eligible Schemes ({tier1.length})
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    All verified mandatory requirements match your provided profile details.
                  </p>
                </div>
                <div className="space-y-4">
                  {tier1.map((rec) => (
                    <RecommendationCard
                      key={rec.schemeId}
                      item={rec}
                      isSaved={savedSchemeIds.includes(rec.schemeId)}
                      isComparing={compareIds.includes(rec.schemeId)}
                      onView={() => navigate(`/schemes/${rec.slug}`)}
                      onSave={() => void toggleSaveScheme(rec.schemeId, rec.schemeName)}
                      onCompare={() => toggleCompareScheme(rec.schemeId, rec.schemeName)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Tier 2: Potentially Eligible */}
            {tier2.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#172B4D] tabular-nums">
                    Worth Checking — Potentially Eligible Schemes ({tier2.length})
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Relevant to your profile, pending missing details or official portal confirmation.
                  </p>
                </div>
                <div className="space-y-4">
                  {tier2.map((rec) => (
                    <RecommendationCard
                      key={rec.schemeId}
                      item={rec}
                      isSaved={savedSchemeIds.includes(rec.schemeId)}
                      isComparing={compareIds.includes(rec.schemeId)}
                      onView={() => navigate(`/schemes/${rec.slug}`)}
                      onSave={() => void toggleSaveScheme(rec.schemeId, rec.schemeName)}
                      onCompare={() => toggleCompareScheme(rec.schemeId, rec.schemeName)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}
    </div>
  );
}

function RecommendationCard({
  item,
  isSaved,
  isComparing,
  onView,
  onSave,
  onCompare,
}: {
  item: RecommendationItem;
  isSaved: boolean;
  isComparing: boolean;
  onView: () => void;
  onSave: () => void;
  onCompare: () => void;
}) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] mb-1.5">
            <span className="font-medium text-[#123B65]">{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{item.governmentLevel} Government</span>
            <span aria-hidden="true">·</span>
            <span>{item.stateCoverage.join(', ')}</span>
          </div>
          <h3 className="font-display text-lg font-semibold text-[#172B4D]">
            <button type="button" onClick={onView} className="text-left hover:text-[#123B65]">
              {item.schemeName}
            </button>
          </h3>
        </div>

        <div className="shrink-0">
          {item.status === 'ELIGIBLE' ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#138A55]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Eligible</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B45309]">
              <AlertCircle className="w-4 h-4" />
              <span>Potentially Eligible</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-[#172B4D] mt-2.5">
        Main Benefit: <span className="font-normal text-[#475467]">{item.mainBenefit}</span>
      </p>

      <div className="mt-3 bg-[#F5F7FA] border border-slate-200 rounded-lg p-3.5">
        <p className="text-xs font-semibold text-[#123B65] mb-1">Why This Scheme Is Recommended</p>
        <p className="text-sm text-[#475467] leading-relaxed">{item.recommendationReason}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2C4D]"
        >
          <span>View Full Details &amp; Documents</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCompare}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border ${
              isComparing
                ? 'bg-[#123B65] text-white border-[#123B65]'
                : 'bg-white text-[#475467] border-slate-200 hover:border-slate-300'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isComparing ? 'Comparing' : 'Compare'}</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border ${
              isSaved
                ? 'bg-[#138A55]/10 text-[#138A55] border-[#138A55]/30'
                : 'bg-white text-[#475467] border-slate-200 hover:border-slate-300'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <a
            href={item.officialApplicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#138A55] hover:bg-[#0F7347] rounded-lg"
          >
            <span>Official Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
