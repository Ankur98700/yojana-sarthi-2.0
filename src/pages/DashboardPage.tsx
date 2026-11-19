import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  History,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDIAN_STATES_AND_UTS,
  OCCUPATION_OPTIONS,
  type EligibilityCheckResponse,
  type RecommendationItem,
  type SchemeRecord,
  type UserProfile,
} from '../types/index.ts';

interface DashboardPayload {
  profileCompletion: {
    percentage: number;
    completedFields: number;
    totalFields: number;
    missingKeyFields: string[];
  };
  savedSchemes: SchemeRecord[];
  eligibilityHistory: Array<{
    id: number;
    summary: {
      totalSchemesEvaluated: number;
      eligibleCount: number;
      potentiallyEligibleCount: number;
      notEligibleCount: number;
    };
    evaluatedAt: string;
  }>;
  latestEvaluation: EligibilityCheckResponse | null;
  recommendations: RecommendationItem[];
  documentChecklist: Array<{ document: string; schemes: string[] }>;
}

export function DashboardPage() {
  const {
    dbUser,
    authLoading,
    signInWithGoogle,
    navigate,
    recentlyViewed,
    toggleSaveScheme,
    refreshUser,
    setActiveProfile,
    notify,
  } = useApp();

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'saved' | 'documents' | 'history'>('overview');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [profileDraft, setProfileDraft] = useState<UserProfile>({});
  const [nameDraft, setNameDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!dbUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<DashboardPayload>('/api/dashboard');
      setData(res);
      setProfileDraft(dbUser.profile ?? {});
      setNameDraft(dbUser.name ?? '');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [dbUser, notify]);

  useEffect(() => {
    if (!authLoading) {
      void loadDashboard();
    }
  }, [authLoading, loadDashboard]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: {
          name: nameDraft,
          profile: profileDraft,
        },
      });
      setActiveProfile(profileDraft);
      await refreshUser();
      await loadDashboard();
      notify('Your citizen profile has been saved securely.', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm text-[#667085]">
        Loading account...
      </div>
    );
  }

  if (!dbUser) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#123B65]/10 text-[#123B65] flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#123B65]">
            Sign in to your Citizen Dashboard
          </h1>
          <p className="text-sm text-[#475467] leading-relaxed">
            Save your personal eligibility profile, bookmark schemes, track eligibility check history, and manage your document checklist securely. You can still check eligibility as a guest without signing in.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
            >
              Sign In / Register with Google
            </button>
            <button
              type="button"
              onClick={() => navigate('/eligibility')}
              className="px-6 py-3 text-sm font-semibold text-[#123B65] bg-white border border-slate-300 hover:border-[#123B65] rounded-lg"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eligibleSchemes =
    data?.latestEvaluation?.results.filter((r) => r.status === 'ELIGIBLE') ?? [];
  const potentialSchemes =
    data?.latestEvaluation?.results.filter((r) => r.status === 'POTENTIALLY_ELIGIBLE') ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Citizen Dashboard</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Welcome, {dbUser.name || dbUser.email}
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            {dbUser.email} · {dbUser.role === 'admin' ? 'Administrator Account' : 'Citizen Account'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {dbUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#138A55] bg-white border border-[#138A55]/40 hover:bg-[#138A55]/5 rounded-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg"
          >
            <span>Run New Eligibility Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit mb-8">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'profile', label: 'My Profile' },
            { id: 'saved', label: `Saved Schemes (${data?.savedSchemes.length ?? 0})` },
            { id: 'documents', label: `Document Checklist (${data?.documentChecklist.length ?? 0})` },
            { id: 'history', label: `Eligibility History (${data?.eligibilityHistory.length ?? 0})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums ${
              activeTab === tab.id
                ? 'bg-white text-[#123B65] shadow-xs'
                : 'text-[#475467] hover:text-[#172B4D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Real Metrics Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-[#667085]">Profile Completion</p>
                  <p className="font-display text-2xl font-bold text-[#123B65] mt-1 tabular-nums">
                    {data.profileCompletion.percentage}%
                  </p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-[#123B65]"
                      style={{ width: `${data.profileCompletion.percentage}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-medium text-[#123B65] hover:underline mt-2 inline-block"
                  >
                    {data.profileCompletion.percentage < 100 ? 'Complete profile →' : 'Edit profile →'}
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#138A55]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Eligible Schemes</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#172B4D] mt-1 tabular-nums">
                    {eligibleSchemes.length}
                  </p>
                  <p className="text-xs text-[#667085] mt-1">Based on your saved profile</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
                    <AlertCircle className="w-4 h-4" />
                    <span>Potentially Eligible</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#172B4D] mt-1 tabular-nums">
                    {potentialSchemes.length}
                  </p>
                  <p className="text-xs text-[#667085] mt-1">Needs missing info or verification</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#123B65]">
                    <Bookmark className="w-4 h-4" />
                    <span>Saved Schemes</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-[#172B4D] mt-1 tabular-nums">
                    {data.savedSchemes.length}
                  </p>
                  <p className="text-xs text-[#667085] mt-1">Synced to your account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Recommended & Eligible Schemes */}
                <div className="lg:col-span-8 space-y-6">
                  <section className="bg-white border border-slate-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                        Recommended for Your Profile
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigate('/recommendations')}
                        className="text-xs font-semibold text-[#123B65] hover:underline"
                      >
                        View all →
                      </button>
                    </div>

                    {data.recommendations.length === 0 ? (
                      <div className="py-6 text-center space-y-3">
                        <p className="text-sm text-[#667085]">
                          Complete your citizen profile or run an eligibility check to see personalized recommendations here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                        >
                          Fill My Profile
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {data.recommendations.slice(0, 5).map((rec) => (
                          <div key={rec.schemeId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="text-xs text-[#667085] flex items-center gap-2">
                                <span className="font-medium text-[#123B65]">{rec.category}</span>
                                <span>·</span>
                                <span className={rec.status === 'ELIGIBLE' ? 'text-[#138A55] font-semibold' : 'text-[#B45309] font-semibold'}>
                                  {rec.status === 'ELIGIBLE' ? 'Eligible' : 'Potentially Eligible'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/schemes/${rec.slug}`)}
                                className="font-display text-sm font-semibold text-[#172B4D] hover:text-[#123B65] text-left mt-0.5"
                              >
                                {rec.schemeName}
                              </button>
                              <p className="text-xs text-[#667085] mt-0.5">{rec.recommendationReason}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/schemes/${rec.slug}`)}
                              className="text-xs font-semibold text-[#123B65] hover:underline whitespace-nowrap shrink-0"
                            >
                              View Details →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right: Recently Viewed & Quick Checklist */}
                <div className="lg:col-span-4 space-y-6">
                  <section className="bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="font-display text-base font-semibold text-[#172B4D] mb-3">
                      Recently Viewed Schemes
                    </h2>
                    {recentlyViewed.length === 0 ? (
                      <p className="text-xs text-[#667085]">
                        Schemes you inspect in the Explorer will appear here for quick return.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {recentlyViewed.map((item) => (
                          <li key={item.id} className="text-sm">
                            <button
                              type="button"
                              onClick={() => navigate(`/schemes/${item.slug}`)}
                              className="text-left text-[#123B65] font-medium hover:underline block"
                            >
                              {item.name}
                            </button>
                            <span className="text-xs text-[#667085]">{item.category}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="bg-white border border-slate-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-display text-base font-semibold text-[#172B4D]">
                        Document Readiness
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('documents')}
                        className="text-xs font-semibold text-[#123B65] hover:underline"
                      >
                        Full list
                      </button>
                    </div>
                    {data.documentChecklist.length === 0 ? (
                      <p className="text-xs text-[#667085]">
                        Save schemes or complete your profile to automatically build your document checklist.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-xs text-[#475467]">
                        {data.documentChecklist.slice(0, 5).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <ClipboardCheck className="w-3.5 h-3.5 text-[#138A55] shrink-0 mt-0.5" />
                            <span>{item.document}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE EDITOR TAB */}
          {activeTab === 'profile' && (
            <form
              onSubmit={(e) => void handleSaveProfile(e)}
              className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 max-w-4xl"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-[#172B4D]">
                  Citizen Eligibility Profile
                </h2>
                <p className="text-xs text-[#667085] mt-1">
                  Only information relevant to government scheme eligibility is stored. Never enter Aadhaar numbers, bank account numbers, or passwords here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={profileDraft.age ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        age: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Gender (Optional)
                  </label>
                  <select
                    value={profileDraft.gender ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        gender: e.target.value as UserProfile['gender'],
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">State / UT</label>
                  <select
                    value={profileDraft.state ?? ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, state: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES_AND_UTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    District (Optional)
                  </label>
                  <input
                    type="text"
                    value={profileDraft.district ?? ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, district: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Rural or Urban Residence
                  </label>
                  <select
                    value={profileDraft.residenceType ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        residenceType: e.target.value as UserProfile['residenceType'],
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select residence</option>
                    <option value="Rural">Rural</option>
                    <option value="Urban">Urban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Annual Family Income (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={profileDraft.annualIncome ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        annualIncome: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Occupation</label>
                  <select
                    value={profileDraft.occupation ?? ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, occupation: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
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
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Employment Status
                  </label>
                  <select
                    value={profileDraft.employmentStatus ?? ''}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, employmentStatus: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select status</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Education Level
                  </label>
                  <select
                    value={profileDraft.educationLevel ?? ''}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, educationLevel: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select education</option>
                    {EDUCATION_LEVEL_OPTIONS.map((ed) => (
                      <option key={ed} value={ed}>
                        {ed}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Family Size (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={profileDraft.familySize ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        familySize: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Landholding in Hectares (If Farmer, Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={profileDraft.landholdingHectares ?? ''}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        landholdingHectares: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {/* Relevant Boolean Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                {(
                  [
                    { key: 'isStudent', label: 'Currently a Student' },
                    { key: 'isFarmer', label: 'Farmer / Farming Household' },
                    { key: 'isBpl', label: 'BPL / Antyodaya Card Holder' },
                    { key: 'ownsPuccaHouse', label: 'Already Owns a Pucca House' },
                    { key: 'hasGirlChild', label: 'Girl Child in Household' },
                    { key: 'isBusinessOwner', label: 'Small Business / Aspiring Entrepreneur' },
                    { key: 'hasDisability', label: 'Disability-Related Eligibility (80%+)' },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F5F7FA] border border-slate-200 text-xs font-medium text-[#172B4D] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={profileDraft[item.key] === true}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, [item.key]: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-[#123B65]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving Profile...' : 'Save Citizen Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SAVED SCHEMES TAB */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {data.savedSchemes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <p className="text-sm text-[#667085]">You haven&apos;t saved any schemes yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/explore')}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                  >
                    Explore Schemes
                  </button>
                </div>
              ) : (
                data.savedSchemes.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#667085]">
                        <span className="font-medium text-[#123B65]">{s.category}</span> · {s.governmentLevel} Government
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/schemes/${s.slug}`)}
                        className="font-display text-base font-semibold text-[#172B4D] hover:text-[#123B65] text-left mt-0.5"
                      >
                        {s.name}
                      </button>
                      <p className="text-xs text-[#475467] mt-1">{s.mainBenefit}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={s.officialApplicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleSaveScheme(s.id, s.name);
                          await loadDashboard();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DOCUMENT CHECKLIST TAB */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-lg font-semibold text-[#172B4D] mb-1">
                Personalized Document Checklist
              </h2>
              <p className="text-xs text-[#667085] mb-5">
                Compiled automatically from your eligible and saved schemes so you can prepare paperwork before visiting official portals.
              </p>

              {data.documentChecklist.length === 0 ? (
                <p className="text-sm text-[#667085] py-6">
                  Save schemes or complete your eligibility profile to generate your required document checklist.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.documentChecklist.map((item) => {
                    const checked = Boolean(checkedDocs[item.document]);
                    return (
                      <label
                        key={item.document}
                        className="py-3.5 flex items-start gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setCheckedDocs((prev) => ({
                              ...prev,
                              [item.document]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#138A55]"
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              checked ? 'line-through text-[#667085]' : 'text-[#172B4D]'
                            }`}
                          >
                            {item.document}
                          </p>
                          <p className="text-xs text-[#667085] mt-0.5">
                            Needed for: {item.schemes.join(', ')}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ELIGIBILITY HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-[#123B65]" />
                <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                  Recent Eligibility Checks
                </h2>
              </div>

              {data.eligibilityHistory.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[#667085]">
                    No saved eligibility checks yet. Run the Eligibility Checker while signed in to record history here.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/eligibility')}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#123B65] rounded-lg"
                  >
                    Run Eligibility Check
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-[#667085]">
                        <th className="py-2.5 pr-4">Date &amp; Time</th>
                        <th className="py-2.5 px-4 text-right">Evaluated</th>
                        <th className="py-2.5 px-4 text-right">Eligible</th>
                        <th className="py-2.5 px-4 text-right">Potentially Eligible</th>
                        <th className="py-2.5 pl-4 text-right">Not Eligible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {data.eligibilityHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="py-3 pr-4 text-xs text-[#172B4D]">
                            {new Date(h.evaluatedAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-[#475467]">
                            {h.summary.totalSchemesEvaluated}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-semibold text-[#138A55]">
                            {h.summary.eligibleCount}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-semibold text-[#B45309]">
                            {h.summary.potentiallyEligibleCount}
                          </td>
                          <td className="py-3 pl-4 text-right text-xs text-rose-700">
                            {h.summary.notEligibleCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
