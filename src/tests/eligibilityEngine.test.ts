import assert from 'node:assert/strict';
import { INITIAL_SCHEMES } from '../db/seedData.ts';
import { evaluateAllSchemes, evaluateSchemeEligibility } from '../server/eligibilityEngine.ts';
import { generatePersonalizedRecommendations } from '../server/recommendationEngine.ts';
import type { SchemeRecord } from '../types/index.ts';

// Convert seed data to SchemeRecord shape with synthetic IDs for deterministic unit testing
const testSchemes: SchemeRecord[] = INITIAL_SCHEMES.map((s, idx) => ({
  id: idx + 1,
  slug: s.slug,
  name: s.name,
  shortDescription: s.shortDescription,
  overview: s.overview,
  objective: s.objective,
  category: s.category,
  governmentLevel: s.governmentLevel,
  department: s.department,
  stateCoverage: s.stateCoverage,
  targetBeneficiaries: s.targetBeneficiaries,
  benefits: s.benefits,
  mainBenefit: s.mainBenefit,
  documentsRequired: s.documentsRequired,
  applicationSteps: s.applicationSteps,
  applicationMethod: s.applicationMethod,
  officialApplicationUrl: s.officialApplicationUrl,
  officialSourceUrl: s.officialSourceUrl,
  verificationStatus: s.verificationStatus,
  lastVerifiedDate: s.lastVerifiedDate,
  tags: s.tags,
  rules: s.rules.map((r, rIdx) => ({
    ...r,
    id: (idx + 1) * 100 + rIdx,
    schemeId: idx + 1,
  })),
}));

const bySlug = (slug: string) => {
  const found = testSchemes.find((s) => s.slug === slug);
  assert.ok(found, `Scheme ${slug} must exist in seed dataset`);
  return found;
};

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

// 1. Fully eligible user (Farmer + Landholding + Adult)
test('1. Fully eligible landholding farmer qualifies for PM-KISAN & MGNREGA', () => {
  const pmKisan = evaluateSchemeEligibility(bySlug('pm-kisan-samman-nidhi'), {
    age: 35,
    isFarmer: true,
    landholdingHectares: 1.5,
    residenceType: 'Rural',
  });
  assert.equal(pmKisan.status, 'ELIGIBLE');
  assert.equal(pmKisan.satisfiedConditions.length, 3);
  assert.equal(pmKisan.missingConditions.length, 0);
  assert.equal(pmKisan.failedConditions.length, 0);

  const mgnrega = evaluateSchemeEligibility(bySlug('mgnrega'), {
    age: 35,
    residenceType: 'Rural',
  });
  assert.equal(mgnrega.status, 'ELIGIBLE');
});

// 2. Ineligible user (Urban resident for MGNREGA, high income for CSSS)
test('2. Ineligible users are marked NOT_ELIGIBLE with explicit failed reasons', () => {
  const mgnrega = evaluateSchemeEligibility(bySlug('mgnrega'), {
    age: 30,
    residenceType: 'Urban',
  });
  assert.equal(mgnrega.status, 'NOT_ELIGIBLE');
  assert.equal(mgnrega.failedConditions.length, 1);
  assert.equal(mgnrega.failedConditions[0].ruleKey, 'residenceType');

  const csss = evaluateSchemeEligibility(bySlug('pm-usp-central-sector-scholarship'), {
    age: 20,
    isStudent: true,
    educationLevel: 'Undergraduate',
    annualIncome: 900000,
  });
  assert.equal(csss.status, 'NOT_ELIGIBLE');
  assert.ok(csss.failedConditions.some((c) => c.ruleKey === 'annualIncome'));
});

// 3. Missing information NEVER treated as a pass
test('3. Missing annual income marks student POTENTIALLY_ELIGIBLE (never ELIGIBLE)', () => {
  const csss = evaluateSchemeEligibility(bySlug('pm-usp-central-sector-scholarship'), {
    age: 20,
    isStudent: true,
    educationLevel: 'Undergraduate',
    // annualIncome intentionally omitted
  });
  assert.equal(csss.status, 'POTENTIALLY_ELIGIBLE');
  assert.equal(csss.satisfiedConditions.length, 3);
  assert.equal(csss.missingConditions.length, 1);
  assert.equal(csss.missingConditions[0].ruleKey, 'annualIncome');
});

// 4. Exact age boundary tests (inclusive gte/lte & exclusive lt)
test('4. Exact age boundaries (17/18/40/41 for APY; 59/60 for IGNOAPS)', () => {
  const apy = bySlug('atal-pension-yojana');
  assert.equal(
    evaluateSchemeEligibility(apy, { age: 17, annualIncome: 300000 }).status,
    'NOT_ELIGIBLE'
  );
  // Note: APY has an unverified income-tax indicator rule, so 18 & 40 should be POTENTIALLY_ELIGIBLE (not failed!)
  assert.equal(
    evaluateSchemeEligibility(apy, { age: 18, annualIncome: 300000 }).status,
    'POTENTIALLY_ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(apy, { age: 40, annualIncome: 300000 }).status,
    'POTENTIALLY_ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(apy, { age: 41, annualIncome: 300000 }).status,
    'NOT_ELIGIBLE'
  );

  const ignoaps = bySlug('indira-gandhi-national-old-age-pension');
  assert.equal(
    evaluateSchemeEligibility(ignoaps, { age: 59, isBpl: true }).status,
    'NOT_ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(ignoaps, { age: 60, isBpl: true }).status,
    'ELIGIBLE'
  );
});

// 5. Exact income boundary tests (lte 450000 vs 450001; exclusive lt 800000)
test('5. Exact income boundaries (inclusive 450000 on CSSS; exclusive < 800000 on PMMVY)', () => {
  const csss = bySlug('pm-usp-central-sector-scholarship');
  assert.equal(
    evaluateSchemeEligibility(csss, {
      age: 19,
      isStudent: true,
      educationLevel: 'Undergraduate',
      annualIncome: 450000,
    }).status,
    'ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(csss, {
      age: 19,
      isStudent: true,
      educationLevel: 'Undergraduate',
      annualIncome: 450001,
    }).status,
    'NOT_ELIGIBLE'
  );

  const pmmvy = bySlug('pradhan-mantri-matru-vandana-yojana');
  assert.equal(
    evaluateSchemeEligibility(pmmvy, {
      gender: 'Female',
      age: 24,
      isPregnantOrLactating: true,
      annualIncome: 799999,
    }).status,
    'ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(pmmvy, {
      gender: 'Female',
      age: 24,
      isPregnantOrLactating: true,
      annualIncome: 800000,
    }).status,
    'NOT_ELIGIBLE'
  );
});

// 6. State-specific restrictions
test('6. State-specific schemes match residents and exclude other states', () => {
  const upKanya = bySlug('up-mukhyamantri-kanya-sumangala-yojana');
  assert.equal(
    evaluateSchemeEligibility(upKanya, {
      state: 'Uttar Pradesh',
      annualIncome: 250000,
      hasGirlChild: true,
    }).status,
    'ELIGIBLE'
  );
  assert.equal(
    evaluateSchemeEligibility(upKanya, {
      state: 'Karnataka',
      annualIncome: 250000,
      hasGirlChild: true,
    }).status,
    'NOT_ELIGIBLE'
  );

  const tnPudhumai = bySlug('tamil-nadu-pudhumai-penn-scheme');
  assert.equal(
    evaluateSchemeEligibility(tnPudhumai, {
      state: 'Tamil Nadu',
      gender: 'Female',
      isStudent: true,
      educationLevel: 'Undergraduate',
    }).status,
    'ELIGIBLE'
  );
});

// 7. OR logical grouping + Unverified scheme safeguard + Recommendations exclusion
test('7. OR logical groups, Unverified safeguard, and Recommendation ranking', () => {
  // Senior citizen 72+ without BPL still qualifies for AB-PMJAY via OR:vulnerability branch!
  const pmjay = bySlug('ayushman-bharat-pmjay');
  const seniorEval = evaluateSchemeEligibility(pmjay, {
    age: 72,
    isBpl: false,
    annualIncome: 500000,
  });
  assert.equal(seniorEval.status, 'ELIGIBLE');

  // Unverified scheme record must NEVER return ELIGIBLE even if all rules pass
  const unverifiedClone: SchemeRecord = {
    ...bySlug('mgnrega'),
    verificationStatus: 'Unverified',
  };
  const unverifiedEval = evaluateSchemeEligibility(unverifiedClone, {
    age: 28,
    residenceType: 'Rural',
  });
  assert.equal(unverifiedEval.status, 'POTENTIALLY_ELIGIBLE');

  // Recommendations must rank ELIGIBLE first and exclude NOT_ELIGIBLE
  const fullEval = evaluateAllSchemes(testSchemes, {
    age: 20,
    gender: 'Female',
    state: 'Tamil Nadu',
    residenceType: 'Urban',
    annualIncome: 280000,
    isStudent: true,
    educationLevel: 'Undergraduate',
    ownsPuccaHouse: false,
  });
  const recs = generatePersonalizedRecommendations(testSchemes, {
    age: 20,
    gender: 'Female',
    state: 'Tamil Nadu',
    residenceType: 'Urban',
    annualIncome: 280000,
    isStudent: true,
    educationLevel: 'Undergraduate',
    ownsPuccaHouse: false,
  });

  assert.ok(fullEval.summary.eligibleCount >= 3, 'Should find at least 3 eligible schemes for TN female UG student');
  assert.ok(recs.every((r) => r.status !== 'NOT_ELIGIBLE'), 'Recommendations must exclude NOT_ELIGIBLE');
  assert.equal(recs[0].status, 'ELIGIBLE', 'Top recommendation must be Tier 1 ELIGIBLE');
  assert.equal(recs[0].slug, 'tamil-nadu-pudhumai-penn-scheme', 'State-matching eligible scheme should rank highest');
});

console.log(`\nAll ${passed} Yojana Sarthi eligibility & recommendation engine tests passed!`);
