import { useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import type { SchemeRecord } from '../types/index.ts';

function extractAgeSummary(scheme: SchemeRecord): string {
  const ageRules = (scheme.rules ?? []).filter((r) => r.ruleKey === 'age');
  if (ageRules.length === 0) return 'No strict age cap specified';
  return ageRules.map((r) => r.label).join('; ');
}

function extractIncomeSummary(scheme: SchemeRecord): string {
  const incRules = (scheme.rules ?? []).filter(
    (r) => r.ruleKey === 'annualIncome' || r.ruleKey === 'isBpl'
  );
  if (incRules.length === 0) return 'No income ceiling specified';
  return incRules.map((r) => r.label).join('; ');
}

export function CompareSchemesPage() {
  const { compareIds, toggleCompareScheme, removeCompareScheme, clearCompare, navigate } = useApp();
  const [allSchemes, setAllSchemes] = useState<SchemeRecord[]>([]);
  const [selectedSchemes, setSelectedSchemes] = useState<SchemeRecord[]>([]);
  const [pickerId, setPickerId] = useState<string>('');
  const [highlightDiff, setHighlightDiff] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ items: SchemeRecord[] }>('/api/schemes?limit=50')
      .then((res) => setAllSchemes(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (compareIds.length === 0) {
      setSelectedSchemes([]);
      return;
    }
    apiRequest<{ schemes: SchemeRecord[] }>('/api/schemes/compare', {
      method: 'POST',
      body: { ids: compareIds },
    })
      .then((res) => setSelectedSchemes(res.schemes))
      .catch(() => {});
  }, [compareIds]);

  const availableToAdd = allSchemes.filter((s) => !compareIds.includes(s.id));

  const handleAdd = () => {
    const id = Number(pickerId);
    if (!id) return;
    const found = allSchemes.find((s) => s.id === id);
    toggleCompareScheme(id, found?.name);
    setPickerId('');
  };

  const rows: Array<{
    label: string;
    getValue: (s: SchemeRecord) => string;
    render?: (s: SchemeRecord) => React.ReactNode;
  }> = [
    {
      label: 'Government Department',
      getValue: (s) => s.department,
    },
    {
      label: 'Level & Coverage',
      getValue: (s) => `${s.governmentLevel} (${s.stateCoverage.join(', ')})`,
    },
    {
      label: 'Target Beneficiaries',
      getValue: (s) => s.targetBeneficiaries,
    },
    {
      label: 'Eligibility Requirements',
      getValue: (s) => (s.rules ?? []).map((r) => r.label).join(' | '),
      render: (s) => (
        <ul className="space-y-1.5 text-xs text-[#475467]">
          {(s.rules ?? []).map((r) => (
            <li key={r.id}>· {r.label}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Age Restrictions',
      getValue: (s) => extractAgeSummary(s),
    },
    {
      label: 'Income / BPL Requirements',
      getValue: (s) => extractIncomeSummary(s),
    },
    {
      label: 'Benefits',
      getValue: (s) => s.benefits.join(' | '),
      render: (s) => (
        <ul className="space-y-1.5 text-xs text-[#172B4D]">
          {s.benefits.map((b, i) => (
            <li key={i}>· {b}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Required Documents',
      getValue: (s) => s.documentsRequired.join(', '),
      render: (s) => (
        <ul className="space-y-1 text-xs text-[#475467]">
          {s.documentsRequired.map((d, i) => (
            <li key={i}>· {d}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Application Method',
      getValue: (s) => s.applicationMethod,
    },
    {
      label: 'Official Application URL',
      getValue: (s) => s.officialApplicationUrl,
      render: (s) => (
        <a
          href={s.officialApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B65] hover:underline break-all"
        >
          <span>{s.officialApplicationUrl}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Side-by-Side Comparison</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Compare Government Welfare Schemes
          </h1>
          <p className="text-sm text-[#475467] mt-1.5">
            Select up to 3 schemes to compare eligibility conditions, benefits, required documents, and application methods side by side.
          </p>
        </div>

        {selectedSchemes.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#172B4D] cursor-pointer">
              <input
                type="checkbox"
                checked={highlightDiff}
                onChange={(e) => setHighlightDiff(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#123B65]"
              />
              <span>Highlight differences</span>
            </label>
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* Scheme Picker Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <label htmlFor="compare-picker" className="sr-only">
            Add a scheme to compare
          </label>
          <select
            id="compare-picker"
            value={pickerId}
            disabled={compareIds.length >= 3 || loading}
            onChange={(e) => setPickerId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-50"
          >
            <option value="">
              {compareIds.length >= 3
                ? 'Maximum of 3 schemes selected (remove one to switch)'
                : `Select a scheme to add (${compareIds.length}/3 selected)...`}
            </option>
            {availableToAdd.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.governmentLevel} · {s.category})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!pickerId || compareIds.length >= 3}
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg disabled:opacity-40 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Comparison</span>
        </button>
      </div>

      {/* Empty State */}
      {selectedSchemes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-[#172B4D]">
            No schemes selected for comparison yet
          </h2>
          <p className="text-sm text-[#667085] mt-1.5 max-w-md mx-auto">
            Use the selector above or click &ldquo;Compare&rdquo; on any scheme card in the Explorer to compare up to three schemes side by side.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {allSchemes.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleCompareScheme(s.id, s.name)}
                className="px-3.5 py-2 text-xs font-medium text-[#123B65] bg-[#F5F7FA] border border-slate-200 hover:border-[#123B65] rounded-lg"
              >
                + {s.name.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F5F7FA]">
                <th className="p-4 text-xs font-semibold text-[#667085] w-48 align-top">
                  Comparison Field
                </th>
                {selectedSchemes.map((s) => (
                  <th key={s.id} className="p-4 align-top min-w-[230px] border-l border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#138A55] mb-1">{s.category}</p>
                        <button
                          type="button"
                          onClick={() => navigate(`/schemes/${s.slug}`)}
                          className="font-display text-sm font-bold text-[#123B65] hover:underline text-left leading-snug"
                        >
                          {s.name}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompareScheme(s.id)}
                        aria-label={`Remove ${s.name} from comparison`}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => {
                const values = selectedSchemes.map((s) => row.getValue(s));
                const isDifferent =
                  selectedSchemes.length > 1 && new Set(values).size > 1;
                const rowBg =
                  highlightDiff && isDifferent ? 'bg-[#F39C35]/[0.06]' : 'bg-white';

                return (
                  <tr key={row.label} className={rowBg}>
                    <td className="p-4 text-xs font-semibold text-[#172B4D] align-top">
                      <div>{row.label}</div>
                      {highlightDiff && isDifferent && (
                        <span className="text-[11px] font-medium text-[#B45309] block mt-0.5">
                          Differs across schemes
                        </span>
                      )}
                    </td>
                    {selectedSchemes.map((s) => (
                      <td
                        key={s.id}
                        className="p-4 text-xs text-[#475467] leading-relaxed align-top border-l border-slate-200"
                      >
                        {row.render ? row.render(s) : row.getValue(s)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
