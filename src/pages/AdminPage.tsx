import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import {
  SCHEME_CATEGORIES,
  type AuditLogRecord,
  type RuleOperator,
  type SchemeRecord,
} from '../types/index.ts';

interface EditableRule {
  ruleKey: string;
  operator: RuleOperator;
  expectedValueText: string;
  logicalGroup: string;
  isMandatory: boolean;
  isVerifiedRule: boolean;
  label: string;
  explanationPass: string;
  explanationFail: string;
  explanationMissing: string;
  source: string;
}

const RULE_KEYS = [
  'age',
  'annualIncome',
  'state',
  'gender',
  'residenceType',
  'occupation',
  'employmentStatus',
  'educationLevel',
  'isStudent',
  'isFarmer',
  'isBpl',
  'landholdingHectares',
  'ownsPuccaHouse',
  'hasGirlChild',
  'isPregnantOrLactating',
  'isBusinessOwner',
  'hasDisability',
];

const OPERATORS: RuleOperator[] = [
  'gte',
  'lte',
  'gt',
  'lt',
  'eq',
  'neq',
  'in',
  'not_in',
  'boolean_true',
  'boolean_false',
];

function parseExpectedValue(operator: RuleOperator, raw: string): unknown {
  if (operator === 'boolean_true') return true;
  if (operator === 'boolean_false') return false;
  if (operator === 'gte' || operator === 'lte' || operator === 'gt' || operator === 'lt') {
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }
  if (operator === 'in' || operator === 'not_in') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return raw.trim();
}

function serializeExpectedValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return String(val ?? '');
}

export function AdminPage() {
  const { dbUser, authLoading, signInWithGoogle, notify } = useApp();
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schemes' | 'audit'>('schemes');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scheme Form Fields
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [overview, setOverview] = useState('');
  const [objective, setObjective] = useState('');
  const [category, setCategory] = useState<string>(SCHEME_CATEGORIES[0]);
  const [governmentLevel, setGovernmentLevel] = useState<'Central' | 'State'>('Central');
  const [department, setDepartment] = useState('');
  const [stateCoverageText, setStateCoverageText] = useState('All India');
  const [targetBeneficiaries, setTargetBeneficiaries] = useState('');
  const [mainBenefit, setMainBenefit] = useState('');
  const [benefitsText, setBenefitsText] = useState('');
  const [documentsText, setDocumentsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [applicationMethod, setApplicationMethod] = useState<'Online' | 'Offline' | 'Both Online & Offline'>('Online');
  const [officialApplicationUrl, setOfficialApplicationUrl] = useState('https://www.myscheme.gov.in/');
  const [officialSourceUrl, setOfficialSourceUrl] = useState('https://www.myscheme.gov.in/');
  const [verificationStatus, setVerificationStatus] = useState<'Verified' | 'Unverified'>('Unverified');
  const [lastVerifiedDate, setLastVerifiedDate] = useState(new Date().toISOString().slice(0, 10));
  const [tagsText, setTagsText] = useState('');
  const [rules, setRules] = useState<EditableRule[]>([]);

  const loadAdminData = useCallback(async () => {
    if (!dbUser || dbUser.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [schemeRes, logRes] = await Promise.all([
        apiRequest<{ schemes: SchemeRecord[] }>('/api/admin/schemes'),
        apiRequest<{ logs: AuditLogRecord[] }>('/api/admin/audit-logs'),
      ]);
      setSchemes(schemeRes.schemes);
      setAuditLogs(logRes.logs);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Unable to load admin records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [dbUser, notify]);

  useEffect(() => {
    if (!authLoading) {
      void loadAdminData();
    }
  }, [authLoading, loadAdminData]);

  const openCreateForm = () => {
    setEditingId(null);
    setSlug('');
    setName('');
    setShortDescription('');
    setOverview('');
    setObjective('');
    setCategory(SCHEME_CATEGORIES[0]);
    setGovernmentLevel('Central');
    setDepartment('');
    setStateCoverageText('All India');
    setTargetBeneficiaries('');
    setMainBenefit('');
    setBenefitsText('');
    setDocumentsText('');
    setStepsText('');
    setApplicationMethod('Online');
    setOfficialApplicationUrl('https://www.myscheme.gov.in/');
    setOfficialSourceUrl('https://www.myscheme.gov.in/');
    setVerificationStatus('Unverified');
    setLastVerifiedDate(new Date().toISOString().slice(0, 10));
    setTagsText('');
    setRules([]);
    setFormError(null);
    setShowModal(true);
  };

  const openEditForm = (s: SchemeRecord) => {
    setEditingId(s.id);
    setSlug(s.slug);
    setName(s.name);
    setShortDescription(s.shortDescription);
    setOverview(s.overview);
    setObjective(s.objective);
    setCategory(s.category);
    setGovernmentLevel(s.governmentLevel);
    setDepartment(s.department);
    setStateCoverageText(s.stateCoverage.join(', '));
    setTargetBeneficiaries(s.targetBeneficiaries);
    setMainBenefit(s.mainBenefit);
    setBenefitsText(s.benefits.join('\n'));
    setDocumentsText(s.documentsRequired.join('\n'));
    setStepsText(s.applicationSteps.join('\n'));
    setApplicationMethod(s.applicationMethod);
    setOfficialApplicationUrl(s.officialApplicationUrl);
    setOfficialSourceUrl(s.officialSourceUrl);
    setVerificationStatus(s.verificationStatus);
    setLastVerifiedDate(s.lastVerifiedDate);
    setTagsText(s.tags.join(', '));
    setRules(
      (s.rules ?? []).map((r) => ({
        ruleKey: r.ruleKey,
        operator: r.operator,
        expectedValueText: serializeExpectedValue(r.expectedValue),
        logicalGroup: r.logicalGroup,
        isMandatory: r.isMandatory,
        isVerifiedRule: r.isVerifiedRule,
        label: r.label,
        explanationPass: r.explanationPass,
        explanationFail: r.explanationFail,
        explanationMissing: r.explanationMissing,
        source: r.source,
      }))
    );
    setFormError(null);
    setShowModal(true);
  };

  const addEmptyRule = () => {
    setRules((prev) => [
      ...prev,
      {
        ruleKey: 'age',
        operator: 'gte',
        expectedValueText: '18',
        logicalGroup: 'AND',
        isMandatory: true,
        isVerifiedRule: true,
        label: 'Applicant must be at least 18 years old',
        explanationPass: 'Your age satisfies the minimum age requirement.',
        explanationFail: 'Your age does not meet the minimum requirement.',
        explanationMissing: 'Please provide your age to evaluate this requirement.',
        source: officialSourceUrl || 'https://www.myscheme.gov.in/',
      },
    ]);
  };

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      slug: slug.trim().toLowerCase(),
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      overview: overview.trim(),
      objective: objective.trim(),
      category,
      governmentLevel,
      department: department.trim(),
      stateCoverage: stateCoverageText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      targetBeneficiaries: targetBeneficiaries.trim(),
      mainBenefit: mainBenefit.trim(),
      benefits: benefitsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      documentsRequired: documentsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      applicationSteps: stepsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      applicationMethod,
      officialApplicationUrl: officialApplicationUrl.trim(),
      officialSourceUrl: officialSourceUrl.trim(),
      verificationStatus,
      lastVerifiedDate,
      tags: tagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      rules: rules.map((r) => ({
        ruleKey: r.ruleKey,
        operator: r.operator,
        expectedValue: parseExpectedValue(r.operator, r.expectedValueText),
        logicalGroup: r.logicalGroup.trim() || 'AND',
        isMandatory: r.isMandatory,
        isVerifiedRule: r.isVerifiedRule,
        label: r.label.trim(),
        explanationPass: r.explanationPass.trim(),
        explanationFail: r.explanationFail.trim(),
        explanationMissing: r.explanationMissing.trim(),
        source: r.source.trim(),
      })),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/admin/schemes/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
        notify('Scheme record updated and audit log recorded.', 'success');
      } else {
        await apiRequest('/api/admin/schemes', {
          method: 'POST',
          body: payload,
        });
        notify('New scheme record created in Cloud SQL.', 'success');
      }
      setShowModal(false);
      await loadAdminData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Validation failed while saving scheme.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerify = async (s: SchemeRecord) => {
    const nextStatus = s.verificationStatus === 'Verified' ? 'Unverified' : 'Verified';
    const today = new Date().toISOString().slice(0, 10);
    try {
      await apiRequest(`/api/admin/schemes/${s.id}`, {
        method: 'PUT',
        body: {
          verificationStatus: nextStatus,
          lastVerifiedDate: today,
        },
      });
      notify(`Marked "${s.name}" as ${nextStatus}.`, 'success');
      await loadAdminData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to update verification status.', 'error');
    }
  };

  const handleDeleteScheme = async (s: SchemeRecord) => {
    try {
      await apiRequest(`/api/admin/schemes/${s.id}`, { method: 'DELETE' });
      notify(`Deleted "${s.name}" from database.`, 'info');
      await loadAdminData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to delete scheme.', 'error');
    }
  };

  if (authLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-[#667085]">Checking authorization...</div>;
  }

  if (!dbUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4">
          <ShieldAlert className="w-10 h-10 text-[#123B65] mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#123B65]">Admin Sign-In Required</h1>
          <p className="text-sm text-[#667085]">
            Sign in with an authorized administrator Google account to manage scheme records and eligibility rules.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] rounded-lg"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  if (dbUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#172B4D]">
            Administrator Access Restricted
          </h1>
          <p className="text-sm text-[#667085]">
            Your account ({dbUser.email}) currently has a standard Citizen role. All admin scheme management endpoints are strictly protected on the backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Backend-Protected Admin Console</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Scheme &amp; Rule Verification Management
          </h1>
          <p className="text-sm text-[#475467] mt-1">
            Add, edit, verify, or audit government scheme records and structured eligibility rules in PostgreSQL.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Scheme</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit mb-6">
        <button
          type="button"
          onClick={() => setTab('schemes')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md ${
            tab === 'schemes' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
          }`}
        >
          Schemes ({schemes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md ${
            tab === 'audit' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
          }`}
        >
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : tab === 'schemes' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F5F7FA] text-xs text-[#667085]">
                <th className="p-4 font-semibold">Scheme Name</th>
                <th className="p-4 font-semibold">Category &amp; Level</th>
                <th className="p-4 font-semibold text-right">Rules</th>
                <th className="p-4 font-semibold">Verification</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemes.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="p-4">
                    <p className="font-semibold text-[#172B4D]">{s.name}</p>
                    <p className="text-xs text-[#667085] mt-0.5">{s.department}</p>
                  </td>
                  <td className="p-4 text-xs text-[#475467]">
                    <p className="font-medium text-[#123B65]">{s.category}</p>
                    <p className="mt-0.5">
                      {s.governmentLevel} · {s.stateCoverage.join(', ')}
                    </p>
                  </td>
                  <td className="p-4 text-right font-mono text-xs tabular-nums text-[#172B4D]">
                    {s.rules?.length ?? 0}
                  </td>
                  <td className="p-4 text-xs">
                    <button
                      type="button"
                      onClick={() => void handleToggleVerify(s)}
                      className="inline-flex items-center gap-1.5 font-medium hover:underline"
                    >
                      {s.verificationStatus === 'Verified' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#138A55]" />
                          <span className="text-[#138A55]">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />
                          <span className="text-[#B45309]">Unverified</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-[#667085] mt-0.5 tabular-nums">
                      {s.lastVerifiedDate}
                    </p>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#123B65] border border-slate-200 hover:border-[#123B65] rounded-lg"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteScheme(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#667085]">
              No administrative modifications logged yet. Every create, update, verification change, or deletion is automatically recorded here.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F5F7FA] text-[#667085]">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3.5 tabular-nums text-[#667085] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-[#172B4D] font-medium">{log.adminEmail}</td>
                    <td className="p-3.5 font-mono text-[#123B65]">{log.action}</td>
                    <td className="p-3.5 text-[#475467]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl my-4 overflow-hidden">
            <div className="px-6 py-4 bg-[#F5F7FA] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#123B65]" />
                <h2 className="font-display text-lg font-bold text-[#123B65]">
                  {editingId ? 'Edit Government Scheme & Rules' : 'Add New Government Scheme'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveScheme(e)} className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Scheme Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingId) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">URL Slug *</label>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. pm-kisan-samman-nidhi"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {SCHEME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Government Level *</label>
                  <select
                    value={governmentLevel}
                    onChange={(e) => setGovernmentLevel(e.target.value as 'Central' | 'State')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Central">Central</option>
                    <option value="State">State</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Department / Ministry *</label>
                  <input
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    State Coverage (comma-separated) *
                  </label>
                  <input
                    required
                    value={stateCoverageText}
                    onChange={(e) => setStateCoverageText(e.target.value)}
                    placeholder="All India or Uttar Pradesh"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Verification Status *</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value as 'Verified' | 'Unverified')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Last Verified Date *</label>
                  <input
                    required
                    type="date"
                    value={lastVerifiedDate}
                    onChange={(e) => setLastVerifiedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475467] mb-1">Short Description *</label>
                <input
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Main Benefit Summary *</label>
                  <input
                    required
                    value={mainBenefit}
                    onChange={(e) => setMainBenefit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Application Method *</label>
                  <select
                    value={applicationMethod}
                    onChange={(e) =>
                      setApplicationMethod(
                        e.target.value as 'Online' | 'Offline' | 'Both Online & Offline'
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Both Online & Offline">Both Online &amp; Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475467] mb-1">Overview *</label>
                <textarea
                  required
                  rows={2}
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Objective *</label>
                  <textarea
                    required
                    rows={2}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Target Beneficiaries *</label>
                  <textarea
                    required
                    rows={2}
                    value={targetBeneficiaries}
                    onChange={(e) => setTargetBeneficiaries(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Benefits (one per line) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Required Documents (one per line) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={documentsText}
                    onChange={(e) => setDocumentsText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">
                    Application Steps (one per line) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={stepsText}
                    onChange={(e) => setStepsText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Official Application URL *</label>
                  <input
                    required
                    type="url"
                    value={officialApplicationUrl}
                    onChange={(e) => setOfficialApplicationUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Official Source URL *</label>
                  <input
                    required
                    type="url"
                    value={officialSourceUrl}
                    onChange={(e) => setOfficialSourceUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475467] mb-1">Keywords / Tags</label>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="scholarship, youth, college"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Structured Eligibility Rules Builder */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#172B4D]">
                      Structured Eligibility Rules ({rules.length})
                    </h3>
                    <p className="text-xs text-[#667085]">
                      Use &ldquo;AND&rdquo; for mandatory rules, or &ldquo;OR:group_name&rdquo; for alternative qualification pathways.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEmptyRule}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#123B65] border border-[#123B65] rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>

                {rules.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#F5F7FA] border border-slate-200 rounded-lg space-y-3"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <select
                        value={r.ruleKey}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, ruleKey: e.target.value };
                          setRules(next);
                        }}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        {RULE_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>

                      <select
                        value={r.operator}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, operator: e.target.value as RuleOperator };
                          setRules(next);
                        }}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>

                      <input
                        value={r.expectedValueText}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, expectedValueText: e.target.value };
                          setRules(next);
                        }}
                        placeholder="Expected value"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />

                      <input
                        value={r.logicalGroup}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, logicalGroup: e.target.value };
                          setRules(next);
                        }}
                        placeholder="AND or OR:group"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1 text-[11px] text-[#172B4D]">
                          <input
                            type="checkbox"
                            checked={r.isVerifiedRule}
                            onChange={(e) => {
                              const next = [...rules];
                              next[idx] = { ...r, isVerifiedRule: e.target.checked };
                              setRules(next);
                            }}
                          />
                          <span>Verified</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          aria-label="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        value={r.label}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, label: e.target.value };
                          setRules(next);
                        }}
                        placeholder="Human-readable requirement label"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="url"
                        value={r.source}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...r, source: e.target.value };
                          setRules(next);
                        }}
                        placeholder="Official rule source URL"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[#475467] border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
