import type {
  ConditionEvaluation,
  ConditionEvalStatus,
  EligibilityCheckResponse,
  EligibilityOutcome,
  EligibilityRuleRecord,
  SchemeEligibilityEvaluation,
  SchemeRecord,
  UserProfile,
} from '../types/index.ts';

function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function formatCurrencyINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatUserProfileValue(ruleKey: string, value: unknown): string {
  if (isMissingValue(value)) return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (ruleKey === 'annualIncome') return formatCurrencyINR(value);
    if (ruleKey === 'age') return `${value} years`;
    if (ruleKey === 'landholdingHectares') return `${value} hectares`;
    return String(value);
  }
  return String(value);
}

function getProfileField(profile: UserProfile, ruleKey: string): unknown {
  const raw = (profile as Record<string, unknown>)[ruleKey];
  if (raw !== undefined && raw !== null && raw !== '') {
    return raw;
  }

  // Derive safe equivalents without fabricating missing data
  if (ruleKey === 'isStudent' && profile.occupation === 'Student') {
    return true;
  }
  if (ruleKey === 'isFarmer' && profile.occupation === 'Farmer / Cultivator') {
    return true;
  }
  return undefined;
}

export function evaluateSingleRule(
  rule: EligibilityRuleRecord,
  profile: UserProfile
): ConditionEvaluation {
  const rawVal = getProfileField(profile, rule.ruleKey);
  const formattedVal = formatUserProfileValue(rule.ruleKey, rawVal);

  if (isMissingValue(rawVal)) {
    return {
      ruleId: rule.id,
      ruleKey: rule.ruleKey,
      requirement: rule.label,
      userValue: 'Not provided',
      result: 'MISSING',
      explanation: rule.explanationMissing,
      source: rule.source,
      logicalGroup: rule.logicalGroup,
      isVerifiedRule: rule.isVerifiedRule,
    };
  }

  let matched = false;
  const expected = rule.expectedValue;

  switch (rule.operator) {
    case 'gte':
      matched = typeof rawVal === 'number' && typeof expected === 'number' && rawVal >= expected;
      break;
    case 'lte':
      matched = typeof rawVal === 'number' && typeof expected === 'number' && rawVal <= expected;
      break;
    case 'gt':
      matched = typeof rawVal === 'number' && typeof expected === 'number' && rawVal > expected;
      break;
    case 'lt':
      matched = typeof rawVal === 'number' && typeof expected === 'number' && rawVal < expected;
      break;
    case 'eq':
      matched = String(rawVal).trim().toLowerCase() === String(expected).trim().toLowerCase();
      break;
    case 'neq':
      matched = String(rawVal).trim().toLowerCase() !== String(expected).trim().toLowerCase();
      break;
    case 'in':
      matched =
        Array.isArray(expected) &&
        expected.some((item) => String(item).trim().toLowerCase() === String(rawVal).trim().toLowerCase());
      break;
    case 'not_in':
      matched =
        Array.isArray(expected) &&
        !expected.some((item) => String(item).trim().toLowerCase() === String(rawVal).trim().toLowerCase());
      break;
    case 'boolean_true':
      matched = rawVal === true;
      break;
    case 'boolean_false':
      matched = rawVal === false;
      break;
    default:
      matched = false;
  }

  let result: ConditionEvalStatus;
  let explanation: string;

  if (!rule.isVerifiedRule) {
    // Unverified rules NEVER produce definitive pass or fail verdicts on their own
    result = 'NEEDS_VERIFICATION';
    explanation = matched
      ? `${rule.explanationPass} (Requires official portal verification.)`
      : `${rule.explanationFail} (Official verification on the government portal is required.)`;
  } else {
    result = matched ? 'PASS' : 'FAIL';
    explanation = matched ? rule.explanationPass : rule.explanationFail;
  }

  return {
    ruleId: rule.id,
    ruleKey: rule.ruleKey,
    requirement: rule.label,
    userValue: formattedVal,
    result,
    explanation,
    source: rule.source,
    logicalGroup: rule.logicalGroup,
    isVerifiedRule: rule.isVerifiedRule,
  };
}

export function evaluateSchemeEligibility(
  scheme: SchemeRecord,
  profile: UserProfile
): SchemeEligibilityEvaluation {
  const rules = scheme.rules ?? [];

  // If a scheme has no structured rules yet or is marked Unverified, do not assert definitive eligibility
  if (rules.length === 0) {
    return {
      schemeId: scheme.id,
      slug: scheme.slug,
      schemeName: scheme.name,
      category: scheme.category,
      governmentLevel: scheme.governmentLevel,
      department: scheme.department,
      stateCoverage: scheme.stateCoverage,
      mainBenefit: scheme.mainBenefit,
      officialApplicationUrl: scheme.officialApplicationUrl,
      officialSourceUrl: scheme.officialSourceUrl,
      verificationStatus: scheme.verificationStatus,
      lastVerifiedDate: scheme.lastVerifiedDate,
      documentsRequired: scheme.documentsRequired,
      status: 'POTENTIALLY_ELIGIBLE',
      summaryExplanation:
        'Detailed structured eligibility rules for this scheme require direct confirmation on the official government website.',
      satisfiedConditions: [],
      failedConditions: [],
      missingConditions: [],
      verificationNotes: [],
    };
  }

  const evaluations = rules.map((r) => ({
    rule: r,
    eval: evaluateSingleRule(r, profile),
  }));

  const andItems = evaluations.filter((item) => item.rule.logicalGroup === 'AND');
  const orGroups = new Map<string, typeof evaluations>();

  for (const item of evaluations) {
    if (item.rule.logicalGroup !== 'AND') {
      const groupList = orGroups.get(item.rule.logicalGroup) ?? [];
      groupList.push(item);
      orGroups.set(item.rule.logicalGroup, groupList);
    }
  }

  const satisfiedConditions: ConditionEvaluation[] = [];
  const failedConditions: ConditionEvaluation[] = [];
  const missingConditions: ConditionEvaluation[] = [];
  const verificationNotes: ConditionEvaluation[] = [];

  let hasHardFailure = false;
  let hasMissingOrUnverified = false;

  // Evaluate AND rules
  for (const { rule, eval: ev } of andItems) {
    if (ev.result === 'PASS') {
      satisfiedConditions.push(ev);
    } else if (ev.result === 'FAIL') {
      failedConditions.push(ev);
      if (rule.isMandatory && rule.isVerifiedRule) {
        hasHardFailure = true;
      }
    } else if (ev.result === 'MISSING') {
      missingConditions.push(ev);
      if (rule.isMandatory) {
        hasMissingOrUnverified = true;
      }
    } else {
      verificationNotes.push(ev);
      if (rule.isMandatory) {
        hasMissingOrUnverified = true;
      }
    }
  }

  // Evaluate OR groups: passes if ANY rule in the group passes
  for (const [, groupItems] of orGroups.entries()) {
    const anyPass = groupItems.some((item) => item.eval.result === 'PASS');
    const anyNeedsVerification = groupItems.some(
      (item) => item.eval.result === 'NEEDS_VERIFICATION'
    );
    const anyMissing = groupItems.some((item) => item.eval.result === 'MISSING');
    const isGroupMandatory = groupItems.some((item) => item.rule.isMandatory);

    if (anyPass) {
      for (const item of groupItems) {
        if (item.eval.result === 'PASS') {
          satisfiedConditions.push(item.eval);
        }
      }
    } else if (anyNeedsVerification || anyMissing) {
      if (isGroupMandatory) {
        hasMissingOrUnverified = true;
      }
      for (const item of groupItems) {
        if (item.eval.result === 'MISSING') {
          missingConditions.push(item.eval);
        } else if (item.eval.result === 'NEEDS_VERIFICATION') {
          verificationNotes.push(item.eval);
        } else if (item.eval.result === 'FAIL') {
          // Keep as informational context only when other OR branches are missing/unverified
          verificationNotes.push({
            ...item.eval,
            result: 'NEEDS_VERIFICATION',
          });
        }
      }
    } else {
      // Every branch in the OR group definitively failed
      if (isGroupMandatory) {
        hasHardFailure = true;
      }
      for (const item of groupItems) {
        failedConditions.push(item.eval);
      }
    }
  }

  // Unverified scheme records never produce definitive ELIGIBLE status
  if (scheme.verificationStatus !== 'Verified') {
    hasMissingOrUnverified = true;
  }

  let status: EligibilityOutcome;
  let summaryExplanation: string;

  if (hasHardFailure) {
    status = 'NOT_ELIGIBLE';
    const firstFail = failedConditions[0];
    summaryExplanation =
      failedConditions.length === 1
        ? `Requirement not met: ${firstFail.explanation}`
        : `${failedConditions.length} mandatory eligibility requirements were not met, starting with: ${firstFail.requirement}.`;
  } else if (hasMissingOrUnverified) {
    status = 'POTENTIALLY_ELIGIBLE';
    if (missingConditions.length > 0 && verificationNotes.length > 0) {
      summaryExplanation = `Your provided details match ${satisfiedConditions.length} requirement(s), but ${missingConditions.length} required detail(s) are missing and official portal verification is needed.`;
    } else if (missingConditions.length > 0) {
      const missingNames = missingConditions.slice(0, 2).map((m) => m.requirement).join('; ');
      summaryExplanation =
        satisfiedConditions.length > 0
          ? `Your provided information matches ${satisfiedConditions.length} condition(s), but additional details are required to confirm full eligibility: ${missingNames}.`
          : `We need additional information before determining eligibility for this scheme: ${missingNames}.`;
    } else if (scheme.verificationStatus !== 'Verified') {
      summaryExplanation =
        'Your details match the recorded criteria, but this scheme record is currently marked Unverified and requires confirmation on the official government website.';
    } else {
      summaryExplanation =
        'Your provided details align with preliminary criteria, but final eligibility depends on official verification (such as SECC-2011, ration card, or income tax records) on the government portal.';
    }
  } else {
    status = 'ELIGIBLE';
    summaryExplanation = `All ${satisfiedConditions.length} verified mandatory criteria are satisfied based on your provided information. Final approval is subject to document verification on the official portal.`;
  }

  return {
    schemeId: scheme.id,
    slug: scheme.slug,
    schemeName: scheme.name,
    category: scheme.category,
    governmentLevel: scheme.governmentLevel,
    department: scheme.department,
    stateCoverage: scheme.stateCoverage,
    mainBenefit: scheme.mainBenefit,
    officialApplicationUrl: scheme.officialApplicationUrl,
    officialSourceUrl: scheme.officialSourceUrl,
    verificationStatus: scheme.verificationStatus,
    lastVerifiedDate: scheme.lastVerifiedDate,
    documentsRequired: scheme.documentsRequired,
    status,
    summaryExplanation,
    satisfiedConditions,
    failedConditions,
    missingConditions,
    verificationNotes,
  };
}

export function evaluateAllSchemes(
  schemesList: SchemeRecord[],
  profile: UserProfile
): EligibilityCheckResponse {
  const results = schemesList.map((scheme) => evaluateSchemeEligibility(scheme, profile));

  const statusOrder: Record<EligibilityOutcome, number> = {
    ELIGIBLE: 0,
    POTENTIALLY_ELIGIBLE: 1,
    NOT_ELIGIBLE: 2,
  };

  results.sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    if (b.satisfiedConditions.length !== a.satisfiedConditions.length) {
      return b.satisfiedConditions.length - a.satisfiedConditions.length;
    }
    return a.schemeName.localeCompare(b.schemeName);
  });

  const eligibleCount = results.filter((r) => r.status === 'ELIGIBLE').length;
  const potentiallyEligibleCount = results.filter((r) => r.status === 'POTENTIALLY_ELIGIBLE').length;
  const notEligibleCount = results.filter((r) => r.status === 'NOT_ELIGIBLE').length;

  return {
    evaluatedAt: new Date().toISOString(),
    summary: {
      totalSchemesEvaluated: results.length,
      eligibleCount,
      potentiallyEligibleCount,
      notEligibleCount,
    },
    results,
  };
}
