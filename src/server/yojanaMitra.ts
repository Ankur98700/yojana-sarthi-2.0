import { GoogleGenAI } from '@google/genai';
import { evaluateAllSchemes } from './eligibilityEngine.ts';
import type { ChatSourceRef, SchemeRecord, UserProfile } from '../types/index.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'for', 'in', 'to', 'of', 'and', 'or', 'on', 'with', 'how',
  'what', 'which', 'can', 'do', 'does', 'my', 'me', 'am', 'an', 'be', 'by', 'at',
  'from', 'this', 'that', 'about', 'schemes', 'scheme', 'government', 'india', 'indian',
]);

export function retrieveRelevantSchemes(
  query: string,
  allSchemes: SchemeRecord[],
  profile?: UserProfile
): SchemeRecord[] {
  const tokens = tokenize(query).filter((t) => !STOP_WORDS.has(t));
  const queryLower = query.toLowerCase();

  const scored = allSchemes.map((scheme) => {
    let score = 0;
    const haystack = [
      scheme.name,
      scheme.shortDescription,
      scheme.overview,
      scheme.category,
      scheme.department,
      scheme.targetBeneficiaries,
      scheme.mainBenefit,
      scheme.stateCoverage.join(' '),
      scheme.tags.join(' '),
      scheme.benefits.join(' '),
      scheme.documentsRequired.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    for (const token of tokens) {
      if (scheme.name.toLowerCase().includes(token)) score += 10;
      if (scheme.category.toLowerCase().includes(token)) score += 7;
      if (scheme.tags.some((t) => t.toLowerCase().includes(token))) score += 6;
      if (scheme.stateCoverage.some((s) => s.toLowerCase().includes(token))) score += 12;
      if (haystack.includes(token)) score += 3;
    }

    // Synonym/intent boosts grounded strictly to scheme metadata
    if (queryLower.includes('student') || queryLower.includes('college') || queryLower.includes('scholarship')) {
      if (scheme.category === 'Education and Scholarships') score += 12;
    }
    if (queryLower.includes('farmer') || queryLower.includes('kisan') || queryLower.includes('agriculture')) {
      if (scheme.category === 'Agriculture and Farmers') score += 12;
    }
    if (queryLower.includes('house') || queryLower.includes('housing') || queryLower.includes('awas')) {
      if (scheme.category === 'Housing') score += 12;
    }
    if (queryLower.includes('women') || queryLower.includes('girl') || queryLower.includes('pregnant') || queryLower.includes('mother')) {
      if (scheme.category === 'Women and Child Welfare' || scheme.tags.includes('women entrepreneur')) score += 10;
    }
    if (queryLower.includes('business') || queryLower.includes('entrepreneur') || queryLower.includes('loan') || queryLower.includes('mudra')) {
      if (scheme.category === 'Entrepreneurship' || scheme.slug === 'pm-vishwakarma-yojana') score += 12;
    }
    if (queryLower.includes('health') || queryLower.includes('hospital') || queryLower.includes('medical')) {
      if (scheme.category === 'Healthcare') score += 12;
    }
    if (queryLower.includes('pension') || queryLower.includes('senior') || queryLower.includes('old age')) {
      if (scheme.category === 'Pension and Social Security') score += 12;
    }
    if (queryLower.includes('skill') || queryLower.includes('training') || queryLower.includes('job')) {
      if (scheme.category === 'Skill Development' || scheme.category === 'Employment') score += 10;
    }

    if (profile?.state && scheme.stateCoverage.some((s) => s.toLowerCase() === profile.state?.toLowerCase())) {
      score += 5;
    }

    return { scheme, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatched = scored.filter((s) => s.score > 0).slice(0, 5).map((s) => s.scheme);
  return topMatched.length > 0 ? topMatched : allSchemes.slice(0, 5);
}

function buildDatabaseFallbackReply(
  query: string,
  relevantSchemes: SchemeRecord[],
  profile?: UserProfile
): string {
  const lines: string[] = [];
  const lower = query.toLowerCase();

  if (lower.includes('potentially eligible')) {
    lines.push(
      'A scheme is marked **Potentially Eligible** when your provided details match some criteria, but either (1) one or more required details (such as annual family income, BPL status, or landholding) were not provided, or (2) final verification on an official government database (such as SECC-2011 or Ration Card records) is required.'
    );
    lines.push('');
  }

  if (relevantSchemes.length > 0) {
    lines.push('Here are the closest verified government schemes in the Yojana Sarthi database matching your question:');
    lines.push('');
    for (const s of relevantSchemes.slice(0, 4)) {
      lines.push(`**${s.name}** (${s.governmentLevel} · ${s.category})`);
      lines.push(`- Benefit: ${s.mainBenefit}`);
      lines.push(`- Who can apply: ${s.targetBeneficiaries}`);
      lines.push(`- Key documents: ${s.documentsRequired.slice(0, 3).join(', ')}`);
      lines.push(`- Official portal: ${s.officialApplicationUrl}`);
      lines.push('');
    }
  } else {
    lines.push(
      'I could not find a direct match in our current verified database. Try using the **Explore Schemes** page or **Check Eligibility** questionnaire to evaluate all Central and State schemes.'
    );
  }

  if (profile && Object.keys(profile).length > 0) {
    const evalSummary = evaluateAllSchemes(relevantSchemes, profile);
    lines.push(
      `Based on your shared profile, among these matched schemes: ${evalSummary.summary.eligibleCount} Eligible, ${evalSummary.summary.potentiallyEligibleCount} Potentially Eligible, and ${evalSummary.summary.notEligibleCount} Not Eligible.`
    );
  }

  lines.push(
    'Note: Yojana Sarthi provides informational eligibility guidance only and never submits government applications on your behalf.'
  );
  return lines.join('\n');
}

export async function generateYojanaMitraResponse(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  allSchemes: SchemeRecord[];
  userProfile?: UserProfile;
  useUserProfile: boolean;
}): Promise<{
  reply: string;
  sources: ChatSourceRef[];
  mode: 'gemini' | 'database_fallback';
  notice?: string;
}> {
  const { message, history, allSchemes, userProfile, useUserProfile } = params;
  const activeProfile = useUserProfile ? userProfile : undefined;
  const relevantSchemes = retrieveRelevantSchemes(message, allSchemes, activeProfile);

  const sources: ChatSourceRef[] = relevantSchemes.map((s) => ({
    schemeId: s.id,
    slug: s.slug,
    schemeName: s.name,
    officialSourceUrl: s.officialSourceUrl,
    officialApplicationUrl: s.officialApplicationUrl,
    verificationStatus: s.verificationStatus,
  }));

  const ai = getGeminiClient();
  if (!ai) {
    return {
      reply: buildDatabaseFallbackReply(message, relevantSchemes, activeProfile),
      sources,
      mode: 'database_fallback',
      notice:
        'Yojana Mitra AI model is currently unavailable because GEMINI_API_KEY is not configured. Showing verified scheme records retrieved directly from the Yojana Sarthi database.',
    };
  }

  // Build grounded scheme knowledge context from PostgreSQL records
  const schemeContext = relevantSchemes
    .map((s, idx) => {
      const ruleSummary = (s.rules ?? [])
        .map(
          (r) =>
            `  - [${r.logicalGroup}] ${r.label} (verified: ${r.isVerifiedRule ? 'Yes' : 'Requires Official Verification'})`
        )
        .join('\n');
      return [
        `[${idx + 1}] ${s.name}`,
        `Category: ${s.category} | Level: ${s.governmentLevel} | States: ${s.stateCoverage.join(', ')}`,
        `Department: ${s.department}`,
        `Verification: ${s.verificationStatus} (Last verified: ${s.lastVerifiedDate})`,
        `Main Benefit: ${s.mainBenefit}`,
        `Benefits: ${s.benefits.join(' ; ')}`,
        `Target Beneficiaries: ${s.targetBeneficiaries}`,
        `Eligibility Rules:\n${ruleSummary || '  - Verify directly on official portal'}`,
        `Required Documents: ${s.documentsRequired.join(', ')}`,
        `Application Method: ${s.applicationMethod}`,
        `Application Steps: ${s.applicationSteps.join(' -> ')}`,
        `Official Application URL: ${s.officialApplicationUrl}`,
        `Official Source URL: ${s.officialSourceUrl}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  let profileContext = 'The user has not shared personal profile details for this message.';
  if (activeProfile && Object.keys(activeProfile).length > 0) {
    const evalResult = evaluateAllSchemes(allSchemes, activeProfile);
    const eligibleNames = evalResult.results
      .filter((r) => r.status === 'ELIGIBLE')
      .map((r) => r.schemeName);
    const potentialDetails = evalResult.results
      .filter((r) => r.status === 'POTENTIALLY_ELIGIBLE')
      .slice(0, 6)
      .map(
        (r) =>
          `${r.schemeName} (Missing: ${
            r.missingConditions.map((m) => m.requirement).join(', ') || 'Official portal verification'
          })`
      );

    profileContext = [
      'Authorized Citizen Profile (shared by user consent):',
      JSON.stringify(activeProfile),
      `Current Rule-Engine Evaluation Summary: ${evalResult.summary.eligibleCount} Eligible, ${evalResult.summary.potentiallyEligibleCount} Potentially Eligible, ${evalResult.summary.notEligibleCount} Not Eligible.`,
      eligibleNames.length > 0 ? `Eligible Schemes: ${eligibleNames.join('; ')}` : 'Eligible Schemes: None confirmed yet.',
      potentialDetails.length > 0
        ? `Potentially Eligible Schemes: ${potentialDetails.join(' | ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const systemInstruction = `You are Yojana Mitra, the helpful citizen-focused Indian Government Scheme Guide for the Yojana Sarthi platform.

STRICT GROUNDING & ACCURACY RULES:
1. Answer using ONLY the verified scheme records provided below from the Yojana Sarthi database.
2. NEVER fabricate scheme names, benefit amounts, income ceilings, age limits, required documents, deadlines, or government URLs.
3. If the user asks about a scheme or state program not present in the provided database records, state clearly that it is not yet in the verified Yojana Sarthi database and direct them to check https://www.myscheme.gov.in/ or https://www.india.gov.in/.
4. Always include official source/application URLs from the provided records when recommending or explaining a scheme.
5. Clearly explain Indian government terms (such as DBT, BPL, EWS, LIG, SECC-2011, e-KYC, NSP) in simple everyday English.
6. Communicate uncertainty honestly: distinguish between preliminary rule-based eligibility and official government verification/approval.
7. NEVER claim that Yojana Sarthi has submitted a government application or approved a benefit.
8. If helpful, ask 1–2 concise follow-up questions (like state, age, student/farmer status, or annual family income — NEVER Aadhaar or bank account numbers) to help narrow down schemes.
9. Keep responses clear, structured with short bullet points, and easy for a first-time internet user to read (under ~320 words unless more detail is explicitly requested).

VERIFIED DATABASE SCHEMES RETRIEVED FOR THIS QUERY:
${schemeContext}

${profileContext}`;

  const conversationLines = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Citizen' : 'Yojana Mitra'}: ${m.content}`)
    .join('\n\n');

  const prompt = conversationLines
    ? `Recent Conversation:\n${conversationLines}\n\nLatest Citizen Question:\n${message}`
    : message;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response received from Gemini model.');
    }

    return {
      reply: text,
      sources,
      mode: 'gemini',
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Upstream AI service error';
    console.error('Yojana Mitra Gemini error:', error);
    return {
      reply: buildDatabaseFallbackReply(message, relevantSchemes, activeProfile),
      sources,
      mode: 'database_fallback',
      notice: `Yojana Mitra AI model could not be reached (${errMsg}). Displaying verified matching schemes directly from the Yojana Sarthi database.`,
    };
  }
}
