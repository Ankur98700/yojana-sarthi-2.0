export const SCHEME_CATEGORIES = [
  'Agriculture and Farmers',
  'Education and Scholarships',
  'Women and Child Welfare',
  'Healthcare',
  'Employment',
  'Skill Development',
  'Housing',
  'Financial Assistance',
  'Pension and Social Security',
  'Entrepreneurship',
  'Rural Development',
  'Other Welfare Schemes',
] as const;

export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const OCCUPATION_OPTIONS = [
  'Farmer / Cultivator',
  'Agricultural Labourer',
  'Student',
  'Salaried Employee',
  'Self-Employed / Business',
  'Artisan / Weaver',
  'Daily Wage / Unorganized Worker',
  'Homemaker',
  'Retired / Senior Citizen',
  'Unemployed',
  'Other',
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed (Formal)',
  'Part-Time / Informal',
  'Self-Employed',
  'Unemployed',
  'Student',
  'Retired',
  'Not in Labour Force',
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  'No Formal Education',
  'Primary (Up to Class 8)',
  'Secondary (Class 9-10)',
  'Higher Secondary (Class 11-12)',
  'Diploma / ITI',
  'Undergraduate',
  'Postgraduate',
  'Doctorate / Professional',
] as const;

export interface UserProfile {
  name?: string;
  age?: number | null;
  gender?: 'Female' | 'Male' | 'Other' | 'Prefer not to say' | '';
  state?: string;
  district?: string;
  residenceType?: 'Rural' | 'Urban' | '';
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced' | '';
  annualIncome?: number | null;
  occupation?: string;
  employmentStatus?: string;
  isBpl?: boolean | null;
  educationLevel?: string;
  isStudent?: boolean | null;
  institutionType?: 'Government' | 'Government-Aided' | 'Private' | '';
  familySize?: number | null;
  dependentsCount?: number | null;
  childrenCount?: number | null;
  isFarmer?: boolean | null;
  landholdingHectares?: number | null;
  hasDisability?: boolean | null;
  ownsPuccaHouse?: boolean | null;
  hasGirlChild?: boolean | null;
  isPregnantOrLactating?: boolean | null;
  isBusinessOwner?: boolean | null;
  preferredCategories?: string[];
}

export type RuleOperator =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'boolean_true'
  | 'boolean_false';

export interface EligibilityRuleRecord {
  id: number;
  schemeId: number;
  ruleKey: string;
  operator: RuleOperator;
  expectedValue: unknown;
  logicalGroup: string; // 'AND' or 'OR:<groupName>'
  isMandatory: boolean;
  isVerifiedRule: boolean;
  label: string;
  explanationPass: string;
  explanationFail: string;
  explanationMissing: string;
  source: string;
}

export interface SchemeRecord {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  objective: string;
  category: string;
  governmentLevel: 'Central' | 'State';
  department: string;
  stateCoverage: string[];
  targetBeneficiaries: string;
  benefits: string[];
  mainBenefit: string;
  documentsRequired: string[];
  applicationSteps: string[];
  applicationMethod: 'Online' | 'Offline' | 'Both Online & Offline';
  officialApplicationUrl: string;
  officialSourceUrl: string;
  verificationStatus: 'Verified' | 'Unverified';
  lastVerifiedDate: string;
  tags: string[];
  rules?: EligibilityRuleRecord[];
}

export type ConditionEvalStatus = 'PASS' | 'FAIL' | 'MISSING' | 'NEEDS_VERIFICATION';

export interface ConditionEvaluation {
  ruleId: number;
  ruleKey: string;
  requirement: string;
  userValue: string;
  result: ConditionEvalStatus;
  explanation: string;
  source: string;
  logicalGroup: string;
  isVerifiedRule: boolean;
}

export type EligibilityOutcome = 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';

export interface SchemeEligibilityEvaluation {
  schemeId: number;
  slug: string;
  schemeName: string;
  category: string;
  governmentLevel: 'Central' | 'State';
  department: string;
  stateCoverage: string[];
  mainBenefit: string;
  officialApplicationUrl: string;
  officialSourceUrl: string;
  verificationStatus: 'Verified' | 'Unverified';
  lastVerifiedDate: string;
  documentsRequired: string[];
  status: EligibilityOutcome;
  summaryExplanation: string;
  satisfiedConditions: ConditionEvaluation[];
  failedConditions: ConditionEvaluation[];
  missingConditions: ConditionEvaluation[];
  verificationNotes: ConditionEvaluation[];
}

export interface EligibilityCheckResponse {
  checkId?: number;
  evaluatedAt: string;
  summary: {
    totalSchemesEvaluated: number;
    eligibleCount: number;
    potentiallyEligibleCount: number;
    notEligibleCount: number;
  };
  results: SchemeEligibilityEvaluation[];
}

export interface RecommendationItem extends SchemeEligibilityEvaluation {
  priorityTier: 1 | 2;
  recommendationReason: string;
  matchedHighlights: string[];
}

export interface ChatSourceRef {
  schemeId: number;
  slug: string;
  schemeName: string;
  officialSourceUrl: string;
  officialApplicationUrl: string;
  verificationStatus: string;
}

export interface ChatMessageRecord {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSourceRef[];
  mode?: 'gemini' | 'database_fallback';
  notice?: string;
  createdAt: string;
}

export interface AuthUserRecord {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'citizen' | 'admin';
  profile: UserProfile;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: number;
  details: string;
  createdAt: string;
}
