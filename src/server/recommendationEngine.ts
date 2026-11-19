import { evaluateAllSchemes } from './eligibilityEngine.ts';
import type {
  RecommendationItem,
  SchemeRecord,
  UserProfile,
} from '../types/index.ts';

function computeRelevancePriority(
  item: ReturnType<typeof evaluateAllSchemes>['results'][number],
  profile: UserProfile
): number {
  let rank = 0;

  // Priority 1: Eligible strongly outranks Potentially Eligible
  if (item.status === 'ELIGIBLE') {
    rank += 1000;
  } else if (item.status === 'POTENTIALLY_ELIGIBLE') {
    rank += 500;
  }

  // State-specific schemes matching the user's exact state get a strong relevance boost
  if (
    item.governmentLevel === 'State' &&
    profile.state &&
    item.stateCoverage.some((st) => st.toLowerCase() === profile.state?.toLowerCase())
  ) {
    rank += 120;
  }

  // Preferred category match
  if (
    Array.isArray(profile.preferredCategories) &&
    profile.preferredCategories.includes(item.category)
  ) {
    rank += 80;
  }

  // Specificity: more satisfied mandatory conditions and fewer missing conditions
  rank += item.satisfiedConditions.length * 25;
  rank -= item.missingConditions.length * 20;

  // Direct profile-to-category alignment
  if (profile.isFarmer && item.category === 'Agriculture and Farmers') rank += 60;
  if (profile.isStudent && item.category === 'Education and Scholarships') rank += 60;
  if (profile.gender === 'Female' && item.category === 'Women and Child Welfare') rank += 45;
  if (typeof profile.age === 'number' && profile.age >= 60 && item.category === 'Pension and Social Security') rank += 60;
  if (profile.isBusinessOwner && item.category === 'Entrepreneurship') rank += 50;
  if (profile.ownsPuccaHouse === false && item.category === 'Housing') rank += 55;
  if (profile.hasDisability && item.category === 'Financial Assistance') rank += 60;

  return rank;
}

function buildRecommendationReason(
  item: ReturnType<typeof evaluateAllSchemes>['results'][number],
  profile: UserProfile
): { reason: string; highlights: string[] } {
  const highlights: string[] = [];

  for (const cond of item.satisfiedConditions) {
    if (cond.ruleKey === 'state') highlights.push(`State match (${cond.userValue})`);
    else if (cond.ruleKey === 'age') highlights.push(`Age (${cond.userValue})`);
    else if (cond.ruleKey === 'annualIncome') highlights.push(`Income (${cond.userValue})`);
    else if (cond.ruleKey === 'educationLevel') highlights.push(`Education (${cond.userValue})`);
    else if (cond.ruleKey === 'isStudent') highlights.push('Student status');
    else if (cond.ruleKey === 'isFarmer') highlights.push('Farmer household');
    else if (cond.ruleKey === 'residenceType') highlights.push(`${cond.userValue} residence`);
    else if (cond.ruleKey === 'isBpl') highlights.push('BPL priority status');
    else if (cond.ruleKey === 'gender') highlights.push(`Gender (${cond.userValue})`);
    else if (cond.ruleKey === 'occupation') highlights.push(`Occupation (${cond.userValue})`);
    else if (cond.ruleKey === 'hasGirlChild') highlights.push('Girl child in household');
    else if (cond.ruleKey === 'ownsPuccaHouse') highlights.push('No pucca house owned');
    else if (cond.ruleKey === 'hasDisability') highlights.push('Disability support category');
    else highlights.push(cond.requirement);
  }

  if (
    Array.isArray(profile.preferredCategories) &&
    profile.preferredCategories.includes(item.category)
  ) {
    highlights.push(`Preferred category: ${item.category}`);
  }

  const matchedSummary =
    highlights.length > 0
      ? highlights.slice(0, 3).join(', ')
      : 'your general profile category';

  if (item.status === 'ELIGIBLE') {
    return {
      reason: `Recommended because your ${matchedSummary} satisfy all verified eligibility conditions for this ${item.governmentLevel.toLowerCase()} scheme.`,
      highlights,
    };
  }

  if (item.missingConditions.length > 0) {
    const missingText = item.missingConditions
      .slice(0, 2)
      .map((m) => m.requirement.toLowerCase())
      .join(' and ');
    return {
      reason: `Recommended because your ${matchedSummary} align with this scheme's target beneficiaries. Provide details for ${missingText} to confirm full eligibility.`,
      highlights,
    };
  }

  return {
    reason: `Recommended because your ${matchedSummary} align with this scheme's preliminary criteria. Official verification on the government portal is required to confirm final eligibility.`,
    highlights,
  };
}

export function generatePersonalizedRecommendations(
  schemesList: SchemeRecord[],
  profile: UserProfile
): RecommendationItem[] {
  const evaluation = evaluateAllSchemes(schemesList, profile);

  // Exclude NOT_ELIGIBLE schemes from the main recommendation list
  const candidates = evaluation.results.filter((item) => {
    if (item.status === 'ELIGIBLE') return true;
    if (item.status === 'POTENTIALLY_ELIGIBLE') {
      // Include potentially eligible schemes that have at least one matched condition OR matching preferred category
      const hasMatched = item.satisfiedConditions.length > 0 || item.verificationNotes.length > 0;
      const isPreferred =
        Array.isArray(profile.preferredCategories) &&
        profile.preferredCategories.includes(item.category);
      return hasMatched || isPreferred;
    }
    return false;
  });

  const ranked = candidates
    .map((item) => ({
      item,
      priority: computeRelevancePriority(item, profile),
    }))
    .sort((a, b) => b.priority - a.priority);

  return ranked.map(({ item }) => {
    const { reason, highlights } = buildRecommendationReason(item, profile);
    return {
      ...item,
      priorityTier: item.status === 'ELIGIBLE' ? 1 : 2,
      recommendationReason: reason,
      matchedHighlights: highlights,
    };
  });
}
