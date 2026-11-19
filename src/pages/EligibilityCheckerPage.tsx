import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  MessageSquareText,
  RotateCcw,
  Scale,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
  type EligibilityCheckResponse,
  type EligibilityOutcome,
  type SchemeEligibilityEvaluation,
  type UserProfile,
} from '../types/index.ts';

const STEPS = [
  { id: 1, title: 'Personal Information', subtitle: 'Age, state, and residence' },
  { id: 2, title: 'Financial Information', subtitle: 'Annual income & BPL status' },
  { id: 3, title: 'Employment & Education', subtitle: 'Work, student & farmer status' },
  { id: 4, title: 'Household Information', subtitle: 'Family size & housing' },
  { id: 5, title: 'Additional Questions', subtitle: 'Scheme-specific criteria' },
];

function BoolChoice({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: boolean | null | undefined;
  onChange: (val: boolean | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[#172B4D]">{label}</p>
      {helper && <p className="text-xs text-[#667085] mt-0.5">{helper}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {[
          { label: 'Yes', val: true },
          { label: 'No', val: false },
          { label: 'Prefer not to answer', val: null },
        ].map((opt) => {
          const active = value === opt.val || (opt.val === null && value === undefined);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.val)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                active
                  ? 'bg-[#123B65] text-white border-[#123B65]'
                  : 'bg-white text-[#475467] border-slate-300 hover:border-[#123B65]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EligibilityCheckerPage() {
  const {
    navigate,
    dbUser,
    activeProfile,
    setActiveProfile,
    latestEligibilityResult,
    setLatestEligibilityResult,
    savedSchemeIds,
    toggleSaveScheme,
    compareIds,
    toggleCompareScheme,
    askAssistant,
    refreshUser,
    notify,
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<UserProfile>(() => ({
    age: activeProfile.age ?? null,
    gender: activeProfile.gender ?? '',
    state: activeProfile.state ?? '',
    district: activeProfile.district ?? '',
    residenceType: activeProfile.residenceType ?? '',
    annualIncome: activeProfile.annualIncome ?? null,
    isBpl: activeProfile.isBpl ?? null,
    occupation: activeProfile.occupation ?? '',
    employmentStatus: activeProfile.employmentStatus ?? '',
    educationLevel: activeProfile.educationLevel ?? '',
    isStudent: activeProfile.isStudent ?? null,
    isFarmer: activeProfile.isFarmer ?? null,
    familySize: activeProfile.familySize ?? null,
    dependentsCount: activeProfile.dependentsCount ?? null,
    childrenCount: activeProfile.childrenCount ?? null,
    ownsPuccaHouse: activeProfile.ownsPuccaHouse ?? null,
    landholdingHectares: activeProfile.landholdingHectares ?? null,
    hasDisability: activeProfile.hasDisability ?? null,
    hasGirlChild: activeProfile.hasGirlChild ?? null,
    isPregnantOrLactating: activeProfile.isPregnantOrLactating ?? null,
    isBusinessOwner: activeProfile.isBusinessOwner ?? null,
  }));

  const [saveToProfile, setSaveToProfile] = useState(Boolean(dbUser));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(Boolean(latestEligibilityResult));
  const [statusFilter, setStatusFilter] = useState<'ALL' | EligibilityOutcome>('ALL');
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const updateField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setActiveProfile(next);
      return next;
    });
  };

  // Determine which contextual questions in Step 5 apply to THIS user
  const showFarmerLandQuestion =
    form.isFarmer === true || form.occupation === 'Farmer / Cultivator';
  const showMaternityQuestion =
    form.gender === 'Female' && (form.age === null || form.age === undefined || (form.age >= 18 && form.age <= 50));
  const showGirlChildQuestion =
    form.childrenCount === null || form.childrenCount === undefined || form.childrenCount > 0;
  const showBusinessQuestion =
    form.occupation === 'Self-Employed / Business' ||
    form.occupation === 'Artisan / Weaver' ||
    form.occupation === 'Unemployed' ||
    form.occupation === 'Homemaker' ||
    !form.occupation;

  const runEligibilityCheck = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const cleanProfile: UserProfile = { ...form };
      setActiveProfile(cleanProfile);

      const response = await apiRequest<EligibilityCheckResponse>('/api/eligibility/check', {
        method: 'POST',
        body: {
          profile: cleanProfile,
          saveToProfile: Boolean(dbUser && saveToProfile),
        },
      });

      setLatestEligibilityResult(response);
      setShowResults(true);
      setStatusFilter('ALL');
      // Automatically expand the first 2 matching results for immediate clarity
      setExpandedIds(response.results.slice(0, 2).map((r) => r.schemeId));
      if (dbUser && saveToProfile) {
        void refreshUser();
      }
      notify('Eligibility evaluation completed using verified scheme rules.', 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate eligibility.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    const empty: UserProfile = {};
    setForm(empty);
    setActiveProfile(empty);
    setLatestEligibilityResult(null);
    setShowResults(false);
    setStep(1);
    setError(null);
  };

  const toggleExpand = (schemeId: number) => {
    setExpandedIds((prev) =>
      prev.includes(schemeId) ? prev.filter((id) => id !== schemeId) : [...prev, schemeId]
    );
  };

  const filteredResults = useMemo(() => {
    if (!latestEligibilityResult) return [];
    if (statusFilter === 'ALL') return latestEligibilityResult.results;
    return latestEligibilityResult.results.filter((r) => r.status === statusFilter);
  }, [latestEligibilityResult, statusFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Rule-Based Eligibility Engine</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Check Your Government Scheme Eligibility
          </h1>
          <p className="text-sm text-[#475467] mt-1.5 max-w-2xl">
            Every requirement is checked strictly against structured backend rules. Missing details are never assumed to pass, and no Aadhaar or bank numbers are required.
          </p>
        </div>

        {showResults && (
          <button
            type="button"
            onClick={() => setShowResults(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#123B65] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Edit My Answers</span>
          </button>
        )}
      </div>

      {/* QUESTIONNAIRE MODE */}
      {!showResults && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Progress Header */}
          <div className="bg-[#F5F7FA] border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between text-xs text-[#667085] mb-2.5">
              <span className="font-semibold text-[#123B65] tabular-nums">
                Step {step} of {STEPS.length}: {STEPS[step - 1].title}
              </span>
              <span className="tabular-nums">{Math.round((step / STEPS.length) * 100)}% complete</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#123B65] transition-all duration-200"
                style={{ width: `${(step / STEPS.length) * 100}%` }}
              />
            </div>

            <div className="hidden md:grid grid-cols-5 gap-2 mt-4">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    step === s.id
                      ? 'bg-white text-[#123B65] font-semibold border border-slate-200'
                      : s.id < step
                      ? 'text-[#138A55] font-medium hover:bg-white/60'
                      : 'text-[#667085] hover:bg-white/60'
                  }`}
                >
                  <span className="tabular-nums">{s.id}.</span> {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Step Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-800">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                    Step 1 — Personal Information
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Used to evaluate age limits, Central/State residency, and rural/urban eligibility.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="elig-age" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Age (in years)
                    </label>
                    <input
                      id="elig-age"
                      type="number"
                      min={0}
                      max={120}
                      value={form.age ?? ''}
                      onChange={(e) =>
                        updateField('age', e.target.value === '' ? null : Number(e.target.value))
                      }
                      placeholder="e.g. 24"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>

                  <div>
                    <label htmlFor="elig-gender" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Gender <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                    </label>
                    <select
                      id="elig-gender"
                      value={form.gender ?? ''}
                      onChange={(e) =>
                        updateField('gender', e.target.value as UserProfile['gender'])
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select gender (optional)</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="elig-state" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      State / Union Territory
                    </label>
                    <select
                      id="elig-state"
                      value={form.state ?? ''}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select your State / UT</option>
                      {INDIAN_STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="elig-district" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      District <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                    </label>
                    <input
                      id="elig-district"
                      type="text"
                      value={form.district ?? ''}
                      onChange={(e) => updateField('district', e.target.value)}
                      placeholder="e.g. Lucknow, Pune, Chennai"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-[#172B4D] mb-2">Area of Residence</p>
                  <div className="flex flex-wrap gap-2.5">
                    {(['Rural', 'Urban'] as const).map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => updateField('residenceType', area)}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                          form.residenceType === area
                            ? 'bg-[#123B65] text-white border-[#123B65]'
                            : 'bg-white text-[#475467] border-slate-300 hover:border-[#123B65]'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                    Step 2 — Financial Information
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Many scholarships, housing grants, and healthcare schemes have official annual family income thresholds.
                  </p>
                </div>

                <div className="max-w-md">
                  <label htmlFor="elig-income" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                    Annual Family Income (in ₹ INR)
                  </label>
                  <input
                    id="elig-income"
                    type="number"
                    min={0}
                    step={5000}
                    value={form.annualIncome ?? ''}
                    onChange={(e) =>
                      updateField(
                        'annualIncome',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 240000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                  {typeof form.annualIncome === 'number' && !Number.isNaN(form.annualIncome) && (
                    <p className="text-xs text-[#123B65] mt-1.5 tabular-nums">
                      Entered: ₹{form.annualIncome.toLocaleString('en-IN')} per year
                    </p>
                  )}
                </div>

                <BoolChoice
                  label="Does your household hold a Below Poverty Line (BPL) / Antyodaya card?"
                  helper="Optional. Required for NSAP old-age/disability pensions and priority health schemes."
                  value={form.isBpl}
                  onChange={(val) => updateField('isBpl', val)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                    Step 3 — Employment and Education
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Helps identify scholarships, skill training, agricultural, artisan, and entrepreneurship benefits.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="elig-occupation" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Primary Occupation
                    </label>
                    <select
                      id="elig-occupation"
                      value={form.occupation ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateField('occupation', val);
                        if (val === 'Student') updateField('isStudent', true);
                        if (val === 'Farmer / Cultivator') updateField('isFarmer', true);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select occupation</option>
                      {OCCUPATION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="elig-emp-status" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Employment Status
                    </label>
                    <select
                      id="elig-emp-status"
                      value={form.employmentStatus ?? ''}
                      onChange={(e) => updateField('employmentStatus', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select employment status</option>
                      {EMPLOYMENT_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="elig-edu" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Current / Highest Education Level
                    </label>
                    <select
                      id="elig-edu"
                      value={form.educationLevel ?? ''}
                      onChange={(e) => updateField('educationLevel', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select education level</option>
                      {EDUCATION_LEVEL_OPTIONS.map((ed) => (
                        <option key={ed} value={ed}>
                          {ed}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <BoolChoice
                    label="Are you currently enrolled as a Student?"
                    value={form.isStudent}
                    onChange={(val) => updateField('isStudent', val)}
                  />
                  <BoolChoice
                    label="Are you a Farmer / belong to a farming household?"
                    value={form.isFarmer}
                    onChange={(val) => updateField('isFarmer', val)}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                    Step 4 — Household Information
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Determines housing assistance and family welfare eligibility.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="elig-family" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Family Size <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                    </label>
                    <input
                      id="elig-family"
                      type="number"
                      min={1}
                      max={30}
                      value={form.familySize ?? ''}
                      onChange={(e) =>
                        updateField(
                          'familySize',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 4"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="elig-dependents" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Number of Dependents <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                    </label>
                    <input
                      id="elig-dependents"
                      type="number"
                      min={0}
                      max={25}
                      value={form.dependentsCount ?? ''}
                      onChange={(e) =>
                        updateField(
                          'dependentsCount',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 2"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="elig-children" className="block text-sm font-medium text-[#172B4D] mb-1.5">
                      Number of Children <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                    </label>
                    <input
                      id="elig-children"
                      type="number"
                      min={0}
                      max={15}
                      value={form.childrenCount ?? ''}
                      onChange={(e) =>
                        updateField(
                          'childrenCount',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="e.g. 1"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                    />
                  </div>
                </div>

                <BoolChoice
                  label="Does your family already own a pucca (permanent) house anywhere in India?"
                  helper="Required to evaluate PMAY-Gramin and PMAY-Urban housing assistance."
                  value={form.ownsPuccaHouse}
                  onChange={(val) => updateField('ownsPuccaHouse', val)}
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                    Step 5 — Relevant Scheme-Specific Questions
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Showing only follow-up questions relevant to your earlier answers. All fields here are optional.
                  </p>
                </div>

                <div className="space-y-5">
                  {showFarmerLandQuestion && (
                    <div className="max-w-md">
                      <label htmlFor="elig-land" className="block text-sm font-medium text-[#172B4D] mb-1">
                        Cultivable Landholding Owned (in Hectares)
                      </label>
                      <p className="text-xs text-[#667085] mb-1.5">
                        Required for PM-KISAN eligibility. Enter 0 if you are a landless agricultural worker.
                      </p>
                      <input
                        id="elig-land"
                        type="number"
                        min={0}
                        step={0.1}
                        value={form.landholdingHectares ?? ''}
                        onChange={(e) =>
                          updateField(
                            'landholdingHectares',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        placeholder="e.g. 1.5"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg tabular-nums"
                      />
                    </div>
                  )}

                  {showGirlChildQuestion && (
                    <BoolChoice
                      label="Does your household have a girl child (for Sukanya Samriddhi / State girl-child schemes)?"
                      value={form.hasGirlChild}
                      onChange={(val) => updateField('hasGirlChild', val)}
                    />
                  )}

                  {showMaternityQuestion && (
                    <BoolChoice
                      label="Are you currently pregnant or a lactating mother (for PMMVY maternity benefit)?"
                      value={form.isPregnantOrLactating}
                      onChange={(val) => updateField('isPregnantOrLactating', val)}
                    />
                  )}

                  {showBusinessQuestion && (
                    <BoolChoice
                      label="Do you currently run or plan to start a small non-farm business / micro-enterprise?"
                      helper="Relevant for Pradhan Mantri MUDRA Yojana (PMMY) collateral-free credit."
                      value={form.isBusinessOwner}
                      onChange={(val) => updateField('isBusinessOwner', val)}
                    />
                  )}

                  <BoolChoice
                    label="Does a certified disability-related eligibility apply to you (80%+ or multiple disability)?"
                    helper="Optional. Used only to check Indira Gandhi National Disability Pension Scheme (IGNDPS)."
                    value={form.hasDisability}
                    onChange={(val) => updateField('hasDisability', val)}
                  />
                </div>

                {dbUser && (
                  <label className="flex items-center gap-2.5 pt-4 border-t border-slate-100 text-sm text-[#172B4D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#123B65]"
                    />
                    <span>Save these answers to my Yojana Sarthi citizen profile</span>
                  </label>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#172B4D] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#667085] hover:text-[#172B4D]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Form</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void runEligibilityCheck()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#138A55] hover:bg-[#0F7347] rounded-lg disabled:opacity-60"
                  >
                    <span>{submitting ? 'Evaluating Rules...' : 'Check My Eligibility'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DASHBOARD MODE */}
      {showResults && latestEligibilityResult && (
        <div className="space-y-6">
          {/* Calculated Real Summary Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-[#138A55] mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Eligible Schemes</span>
              </div>
              <p className="font-display text-3xl font-bold text-[#172B4D] tabular-nums">
                {latestEligibilityResult.summary.eligibleCount}
              </p>
              <p className="text-xs text-[#667085] mt-1">
                All verified mandatory criteria satisfied
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-[#B45309] mb-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Potentially Eligible</span>
              </div>
              <p className="font-display text-3xl font-bold text-[#172B4D] tabular-nums">
                {latestEligibilityResult.summary.potentiallyEligibleCount}
              </p>
              <p className="text-xs text-[#667085] mt-1">
                Missing details or official portal check needed
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-rose-700 mb-1.5">
                <XCircle className="w-4 h-4" />
                <span>Requirements Not Met</span>
              </div>
              <p className="font-display text-3xl font-bold text-[#172B4D] tabular-nums">
                {latestEligibilityResult.summary.notEligibleCount}
              </p>
              <p className="text-xs text-[#667085] mt-1">
                One or more verified mandatory criteria not met
              </p>
            </div>
          </div>

          {/* Disclaimer notice */}
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#475467]">
            <p>
              Evaluated <span className="font-semibold tabular-nums">{latestEligibilityResult.summary.totalSchemesEvaluated}</span> schemes from our database. Preliminary results do not guarantee official government approval.
            </p>
            <button
              type="button"
              onClick={() => navigate('/recommendations')}
              className="text-[#123B65] font-semibold hover:underline whitespace-nowrap"
            >
              View Ranked Recommendations →
            </button>
          </div>

          {/* Interactive Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
            {(
              [
                { id: 'ALL', label: `All (${latestEligibilityResult.summary.totalSchemesEvaluated})` },
                { id: 'ELIGIBLE', label: `Eligible (${latestEligibilityResult.summary.eligibleCount})` },
                {
                  id: 'POTENTIALLY_ELIGIBLE',
                  label: `Potentially Eligible (${latestEligibilityResult.summary.potentiallyEligibleCount})`,
                },
                {
                  id: 'NOT_ELIGIBLE',
                  label: `Not Eligible (${latestEligibilityResult.summary.notEligibleCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#123B65] shadow-xs'
                    : 'text-[#475467] hover:text-[#172B4D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Detailed Scheme Results List */}
          <div className="space-y-4">
            {filteredResults.map((res: SchemeEligibilityEvaluation) => {
              const isExpanded = expandedIds.includes(res.schemeId);
              const isSaved = savedSchemeIds.includes(res.schemeId);
              const isComparing = compareIds.includes(res.schemeId);

              return (
                <article
                  key={res.schemeId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] mb-1.5">
                          <span className="font-medium text-[#123B65]">{res.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{res.governmentLevel} Government</span>
                          <span aria-hidden="true">·</span>
                          <span>{res.stateCoverage.join(', ')}</span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-[#172B4D]">
                          <button
                            type="button"
                            onClick={() => navigate(`/schemes/${res.slug}`)}
                            className="text-left hover:text-[#123B65]"
                          >
                            {res.schemeName}
                          </button>
                        </h3>
                      </div>

                      {/* Explicit Status Icon + Text (Never hue alone) */}
                      <div className="shrink-0">
                        {res.status === 'ELIGIBLE' && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#138A55]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Eligible</span>
                          </span>
                        )}
                        {res.status === 'POTENTIALLY_ELIGIBLE' && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B45309]">
                            <AlertCircle className="w-4 h-4" />
                            <span>Potentially Eligible</span>
                          </span>
                        )}
                        {res.status === 'NOT_ELIGIBLE' && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                            <XCircle className="w-4 h-4" />
                            <span>Not Eligible</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-[#172B4D] mt-2.5">
                      Benefit: <span className="font-normal text-[#475467]">{res.mainBenefit}</span>
                    </p>
                    <p className="text-sm text-[#475467] leading-relaxed mt-2">
                      {res.summaryExplanation}
                    </p>

                    {/* Action Footer */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(res.schemeId)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B65] hover:underline"
                      >
                        <span>
                          {isExpanded ? 'Hide Condition Breakdown & Documents' : 'View Condition Breakdown & Documents'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            askAssistant(
                              `Why was I marked "${res.status.replace('_', ' ')}" for ${res.schemeName}, and what steps or documents do I need next?`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#123B65] bg-[#F5F7FA] hover:bg-slate-200/70 rounded-lg"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                          <span>Ask Why</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCompareScheme(res.schemeId, res.schemeName)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
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
                          onClick={() => void toggleSaveScheme(res.schemeId, res.schemeName)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
                            isSaved
                              ? 'bg-[#138A55]/10 text-[#138A55] border-[#138A55]/30'
                              : 'bg-white text-[#475467] border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>

                        <a
                          href={res.officialApplicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Rule-by-Rule Breakdown */}
                  {isExpanded && (
                    <div className="bg-[#F5F7FA] border-t border-slate-200 px-6 py-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Satisfied Conditions */}
                        <div>
                          <h4 className="text-xs font-semibold text-[#138A55] mb-2">
                            Conditions Satisfied ({res.satisfiedConditions.length})
                          </h4>
                          {res.satisfiedConditions.length === 0 ? (
                            <p className="text-xs text-[#667085]">None confirmed yet.</p>
                          ) : (
                            <ul className="space-y-2">
                              {res.satisfiedConditions.map((c) => (
                                <li key={c.ruleId} className="text-xs text-[#172B4D] flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#138A55] shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-medium">{c.requirement}</span>
                                    <span className="text-[#667085]"> — Your value: {c.userValue}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Not Satisfied / Missing / Verification */}
                        <div className="space-y-4">
                          {res.failedConditions.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-rose-700 mb-2">
                                Conditions Not Satisfied ({res.failedConditions.length})
                              </h4>
                              <ul className="space-y-2">
                                {res.failedConditions.map((c) => (
                                  <li key={c.ruleId} className="text-xs text-[#172B4D] flex items-start gap-2">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-medium">{c.requirement}</span>
                                      <p className="text-[#667085] mt-0.5">
                                        Your value: {c.userValue}. {c.explanation}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {res.missingConditions.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-[#B45309] mb-2">
                                Missing Information ({res.missingConditions.length})
                              </h4>
                              <ul className="space-y-2">
                                {res.missingConditions.map((c) => (
                                  <li key={c.ruleId} className="text-xs text-[#172B4D] flex items-start gap-2">
                                    <HelpCircle className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-medium">{c.requirement}</span>
                                      <p className="text-[#667085] mt-0.5">{c.explanation}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {res.verificationNotes.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-[#123B65] mb-2">
                                Requires Official Portal Verification ({res.verificationNotes.length})
                              </h4>
                              <ul className="space-y-2">
                                {res.verificationNotes.map((c) => (
                                  <li key={c.ruleId} className="text-xs text-[#172B4D] flex items-start gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-[#123B65] shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-medium">{c.requirement}</span>
                                      <p className="text-[#667085] mt-0.5">{c.explanation}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Required Documents */}
                      <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-semibold text-[#172B4D] mb-2">
                          Required Documents
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#475467]">
                          {res.documentsRequired.map((doc, i) => (
                            <span key={i}>· {doc}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
