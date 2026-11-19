import { Bookmark, Scale, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { SchemeRecord } from '../types/index.ts';

interface SchemeCardProps {
  scheme: SchemeRecord;
}

export function SchemeCard({ scheme }: SchemeCardProps) {
  const { navigate, savedSchemeIds, toggleSaveScheme, compareIds, toggleCompareScheme } = useApp();
  const isSaved = savedSchemeIds.includes(scheme.id);
  const isComparing = compareIds.includes(scheme.id);

  const stateLabel =
    scheme.stateCoverage.includes('All India') || scheme.governmentLevel === 'Central'
      ? 'Central Government'
      : `${scheme.stateCoverage.join(', ')} State`;

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors duration-150">
      <div>
        {/* Clean unboxed inline metadata — zero pill clutter */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] mb-2.5">
          <span className="font-medium text-[#123B65]">{scheme.category}</span>
          <span aria-hidden="true">·</span>
          <span>{stateLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            {scheme.verificationStatus === 'Verified' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#138A55]" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#F39C35]" aria-hidden="true" />
            )}
            <span>{scheme.verificationStatus}</span>
          </span>
        </div>

        <h3 className="font-display text-lg font-semibold text-[#172B4D] leading-snug mb-2">
          <button
            type="button"
            onClick={() => navigate(`/schemes/${scheme.slug}`)}
            className="text-left hover:text-[#123B65] transition-colors"
          >
            {scheme.name}
          </button>
        </h3>

        <p className="text-sm text-[#475467] leading-relaxed line-clamp-3 mb-4">
          {scheme.shortDescription}
        </p>

        <div className="border-t border-slate-100 pt-3.5 space-y-2 text-sm">
          <div>
            <span className="text-xs font-medium text-[#667085] block">Main Benefit</span>
            <p className="text-[#172B4D] font-medium leading-snug mt-0.5">{scheme.mainBenefit}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-[#667085] block">Target Beneficiaries</span>
            <p className="text-[#475467] text-xs leading-relaxed line-clamp-2 mt-0.5">
              {scheme.targetBeneficiaries}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/schemes/${scheme.slug}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#123B65] hover:text-[#0D2C4D] transition-colors whitespace-nowrap shrink-0"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleCompareScheme(scheme.id, scheme.name)}
            aria-label={isComparing ? 'Remove from comparison' : 'Add to comparison'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              isComparing
                ? 'bg-[#123B65] text-white border-[#123B65]'
                : 'bg-white text-[#475467] border-slate-200 hover:border-slate-300 hover:text-[#123B65]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isComparing ? 'Comparing' : 'Compare'}</span>
          </button>

          <button
            type="button"
            onClick={() => void toggleSaveScheme(scheme.id, scheme.name)}
            aria-label={isSaved ? 'Remove saved scheme' : 'Save scheme'}
            className={`p-2 rounded-lg border transition-colors ${
              isSaved
                ? 'bg-[#138A55]/10 text-[#138A55] border-[#138A55]/30'
                : 'bg-white text-[#667085] border-slate-200 hover:border-slate-300 hover:text-[#123B65]'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
