import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw, Scale, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { SchemeCard } from '../components/SchemeCard.tsx';
import {
  EDUCATION_LEVEL_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
  SCHEME_CATEGORIES,
  type SchemeRecord,
} from '../types/index.ts';

export function ExploreSchemesPage() {
  const { navigate, compareIds } = useApp();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [state, setState] = useState('All');
  const [occupation, setOccupation] = useState('all');
  const [education, setEducation] = useState('all');
  const [beneficiary, setBeneficiary] = useState('all');
  const [maxIncome, setMaxIncome] = useState('');
  const [age, setAge] = useState('');
  const [sort, setSort] = useState('alphabetical');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'All') params.set('category', category);
    if (level !== 'All') params.set('level', level);
    if (state !== 'All') params.set('state', state);
    if (occupation !== 'all') params.set('occupation', occupation);
    if (education !== 'all') params.set('education', education);
    if (beneficiary !== 'all') params.set('beneficiary', beneficiary);
    if (maxIncome.trim()) params.set('maxIncome', maxIncome.trim());
    if (age.trim()) params.set('age', age.trim());
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '9');

    setLoading(true);
    setError(null);

    apiRequest<{
      items: SchemeRecord[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/api/schemes?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setSchemes(res.items);
        setPagination(res.pagination);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load schemes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, category, level, state, occupation, education, beneficiary, maxIncome, age, sort, page]);

  const resetFilters = () => {
    setQuery('');
    setCategory('All');
    setLevel('All');
    setState('All');
    setOccupation('all');
    setEducation('all');
    setBeneficiary('all');
    setMaxIncome('');
    setAge('');
    setSort('alphabetical');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Government Scheme Explorer</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Explore Central &amp; State Welfare Schemes
          </h1>
          <p className="text-sm text-[#475467] mt-1.5 max-w-2xl">
            Search verified Indian government schemes by keyword, ministry, beneficiary group, state, age, or income eligibility.
          </p>
        </div>

        {compareIds.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/compare')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg whitespace-nowrap shrink-0"
          >
            <Scale className="w-4 h-4" />
            <span>Compare Selected ({compareIds.length}/3)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Primary Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <label htmlFor="scheme-search" className="sr-only">
              Search schemes
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="scheme-search"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search scheme name, benefit, department, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-[#123B65] focus:ring-2 focus:ring-[#123B65]/15"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="filter-category" className="sr-only">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Categories</option>
              {SCHEME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-level" className="sr-only">
              Government Level
            </label>
            <select
              id="filter-level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">Central &amp; State</option>
              <option value="Central">Central Government</option>
              <option value="State">State Government</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-state" className="sr-only">
              State
            </label>
            <select
              id="filter-state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All States / UTs</option>
              {INDIAN_STATES_AND_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle Advanced Filters + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B65] hover:text-[#0D2C4D]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Eligibility Filters' : 'More Filters (Age, Income, Occupation, Education)'}</span>
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#667085] hover:text-[#172B4D]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <label htmlFor="sort-schemes" className="font-medium">
              Sort by:
            </label>
            <select
              id="sort-schemes"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-[#172B4D]"
            >
              <option value="alphabetical">Alphabetical (A–Z)</option>
              <option value="verified">Recently Verified</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label htmlFor="filter-age" className="block text-xs font-medium text-[#475467] mb-1">
                Age (Years)
              </label>
              <input
                id="filter-age"
                type="number"
                min={0}
                max={110}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 24"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="filter-income" className="block text-xs font-medium text-[#475467] mb-1">
                Annual Income (₹)
              </label>
              <input
                id="filter-income"
                type="number"
                min={0}
                step={10000}
                value={maxIncome}
                onChange={(e) => {
                  setMaxIncome(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 250000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="filter-occ" className="block text-xs font-medium text-[#475467] mb-1">
                Occupation
              </label>
              <select
                id="filter-occ"
                value={occupation}
                onChange={(e) => {
                  setOccupation(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Any Occupation</option>
                {OCCUPATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-edu" className="block text-xs font-medium text-[#475467] mb-1">
                Education Level
              </label>
              <select
                id="filter-edu"
                value={education}
                onChange={(e) => {
                  setEducation(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Any Education</option>
                {EDUCATION_LEVEL_OPTIONS.map((ed) => (
                  <option key={ed} value={ed}>
                    {ed}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-beneficiary" className="block text-xs font-medium text-[#475467] mb-1">
                Beneficiary Group
              </label>
              <select
                id="filter-beneficiary"
                value={beneficiary}
                onChange={(e) => {
                  setBeneficiary(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Citizens</option>
                <option value="student">Students</option>
                <option value="farmer">Farmers</option>
                <option value="women">Women &amp; Girl Child</option>
                <option value="senior">Senior Citizens</option>
                <option value="rural">Rural Households</option>
                <option value="bpl">BPL Households</option>
                <option value="disability">Persons with Disabilities</option>
                <option value="entrepreneur">Entrepreneurs &amp; Artisans</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Count Bar */}
      <div className="flex items-center justify-between text-xs text-[#667085] mb-4">
        <p className="tabular-nums">
          Showing <span className="font-semibold text-[#172B4D]">{schemes.length}</span> of{' '}
          <span className="font-semibold text-[#172B4D]">{pagination.total}</span> matching schemes
        </p>
        <p>Need tailored results?{' '}
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="text-[#123B65] font-semibold hover:underline"
          >
            Run the full Eligibility Checker
          </button>
        </p>
      </div>

      {/* Results Grid */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm text-rose-800 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-[#172B4D]">
            No schemes match your current filters
          </h2>
          <p className="text-sm text-[#667085] mt-1.5 max-w-md mx-auto">
            Try clearing one or more filters or broadening your search keyword to see all available Central and State schemes.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 px-4 py-2 text-sm font-semibold text-white bg-[#123B65] rounded-lg hover:bg-[#0D2C4D]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:border-[#123B65]"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-[#475467] tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:border-[#123B65]"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
