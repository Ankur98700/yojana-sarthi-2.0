import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import {
  clearChatHistoryForUser,
  createSchemeWithRules,
  deleteSchemeById,
  getAllSchemesWithRules,
  getChatHistoryForUser,
  getEligibilityHistoryForUser,
  getRecentAuditLogs,
  getSavedSchemesForUser,
  getSchemeBySlugOrId,
  getSchemesByIds,
  saveChatMessage,
  saveEligibilityCheck,
  saveSchemeForUser,
  unsaveSchemeForUser,
  updateSchemeWithRules,
  updateUserProfile,
} from './src/db/repository.ts';
import { evaluateAllSchemes, evaluateSchemeEligibility } from './src/server/eligibilityEngine.ts';
import { generatePersonalizedRecommendations } from './src/server/recommendationEngine.ts';
import { generateYojanaMitraResponse } from './src/server/yojanaMitra.ts';
import { optionalAuth, requireAdmin, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import type { UserProfile } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profileSchema = z.object({
  name: z.string().max(120).optional(),
  age: z.number().min(0).max(120).nullable().optional(),
  gender: z.enum(['Female', 'Male', 'Other', 'Prefer not to say', '']).optional(),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  residenceType: z.enum(['Rural', 'Urban', '']).optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Widowed', 'Divorced', '']).optional(),
  annualIncome: z.number().min(0).max(100000000).nullable().optional(),
  occupation: z.string().max(100).optional(),
  employmentStatus: z.string().max(100).optional(),
  isBpl: z.boolean().nullable().optional(),
  educationLevel: z.string().max(100).optional(),
  isStudent: z.boolean().nullable().optional(),
  institutionType: z.enum(['Government', 'Government-Aided', 'Private', '']).optional(),
  familySize: z.number().int().min(1).max(40).nullable().optional(),
  dependentsCount: z.number().int().min(0).max(30).nullable().optional(),
  childrenCount: z.number().int().min(0).max(20).nullable().optional(),
  isFarmer: z.boolean().nullable().optional(),
  landholdingHectares: z.number().min(0).max(10000).nullable().optional(),
  hasDisability: z.boolean().nullable().optional(),
  ownsPuccaHouse: z.boolean().nullable().optional(),
  hasGirlChild: z.boolean().nullable().optional(),
  isPregnantOrLactating: z.boolean().nullable().optional(),
  isBusinessOwner: z.boolean().nullable().optional(),
  preferredCategories: z.array(z.string().max(80)).max(12).optional(),
});

const ruleInputSchema = z.object({
  ruleKey: z.string().min(1).max(80),
  operator: z.enum([
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
  ]),
  expectedValue: z.unknown(),
  logicalGroup: z.string().min(1).max(60).default('AND'),
  isMandatory: z.boolean().default(true),
  isVerifiedRule: z.boolean().default(true),
  label: z.string().min(3).max(300),
  explanationPass: z.string().min(3).max(500),
  explanationFail: z.string().min(3).max(500),
  explanationMissing: z.string().min(3).max(500),
  source: z.string().url(),
});

const schemeInputSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, and hyphens only'),
  name: z.string().min(3).max(220),
  shortDescription: z.string().min(10).max(400),
  overview: z.string().min(10).max(3000),
  objective: z.string().min(10).max(1500),
  category: z.string().min(2).max(100),
  governmentLevel: z.enum(['Central', 'State']),
  department: z.string().min(2).max(220),
  stateCoverage: z.array(z.string().min(2).max(80)).min(1),
  targetBeneficiaries: z.string().min(5).max(1000),
  benefits: z.array(z.string().min(2).max(500)).min(1),
  mainBenefit: z.string().min(3).max(250),
  documentsRequired: z.array(z.string().min(2).max(300)).min(1),
  applicationSteps: z.array(z.string().min(2).max(500)).min(1),
  applicationMethod: z.enum(['Online', 'Offline', 'Both Online & Offline']),
  officialApplicationUrl: z.string().url(),
  officialSourceUrl: z.string().url(),
  verificationStatus: z.enum(['Verified', 'Unverified']),
  lastVerifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format'),
  tags: z.array(z.string().max(60)).default([]),
  rules: z.array(ruleInputSchema).optional(),
});

function calculateProfileCompletion(profile: UserProfile): {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingKeyFields: string[];
} {
  const checks: Array<{ key: keyof UserProfile; label: string }> = [
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'state', label: 'State' },
    { key: 'residenceType', label: 'Rural/Urban Residence' },
    { key: 'annualIncome', label: 'Annual Family Income' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'employmentStatus', label: 'Employment Status' },
    { key: 'educationLevel', label: 'Education Level' },
    { key: 'familySize', label: 'Family Size' },
    { key: 'ownsPuccaHouse', label: 'Housing Status' },
  ];

  let completed = 0;
  const missing: string[] = [];

  for (const item of checks) {
    const val = profile[item.key];
    if (val !== undefined && val !== null && val !== '') {
      completed++;
    } else {
      missing.push(item.label);
    }
  }

  return {
    percentage: Math.round((completed / checks.length) * 100),
    completedFields: completed,
    totalFields: checks.length,
    missingKeyFields: missing,
  };
}

export async function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health route
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'yojana-sarthi' });
  });

  // ── PUBLIC SCHEMES EXPLORER ────────────────────────────────────────────────
  app.get('/api/schemes', async (req, res) => {
    try {
      const allSchemes = await getAllSchemesWithRules();
      const q = String(req.query.q ?? '').trim().toLowerCase();
      const category = String(req.query.category ?? '').trim();
      const level = String(req.query.level ?? '').trim();
      const state = String(req.query.state ?? '').trim();
      const occupation = String(req.query.occupation ?? '').trim().toLowerCase();
      const education = String(req.query.education ?? '').trim().toLowerCase();
      const beneficiary = String(req.query.beneficiary ?? '').trim().toLowerCase();
      const maxIncomeParam = req.query.maxIncome ? Number(req.query.maxIncome) : null;
      const ageParam = req.query.age ? Number(req.query.age) : null;
      const sort = String(req.query.sort ?? 'alphabetical');
      const page = Math.max(1, Number(req.query.page ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 12) || 12));

      let filtered = allSchemes;

      if (q) {
        filtered = filtered.filter((s) => {
          const text = [
            s.name,
            s.shortDescription,
            s.overview,
            s.category,
            s.department,
            s.targetBeneficiaries,
            s.mainBenefit,
            s.benefits.join(' '),
            s.tags.join(' '),
            s.stateCoverage.join(' '),
          ]
            .join(' ')
            .toLowerCase();
          return text.includes(q);
        });
      }

      if (category && category !== 'All') {
        filtered = filtered.filter((s) => s.category === category);
      }

      if (level && level !== 'All') {
        filtered = filtered.filter((s) => s.governmentLevel === level);
      }

      if (state && state !== 'All') {
        filtered = filtered.filter(
          (s) =>
            s.stateCoverage.includes('All India') ||
            s.stateCoverage.some((st) => st.toLowerCase() === state.toLowerCase())
        );
      }

      if (occupation && occupation !== 'all') {
        filtered = filtered.filter((s) => {
          const combined = `${s.targetBeneficiaries} ${s.tags.join(' ')} ${s.category}`.toLowerCase();
          if (occupation.includes('farmer')) return combined.includes('farmer') || combined.includes('agriculture') || combined.includes('rural');
          if (occupation.includes('student')) return combined.includes('student') || combined.includes('scholarship') || combined.includes('skill');
          if (occupation.includes('artisan')) return combined.includes('artisan') || combined.includes('craft') || combined.includes('mudra');
          if (occupation.includes('business') || occupation.includes('self-employed')) return combined.includes('business') || combined.includes('entrepreneur') || combined.includes('mudra') || combined.includes('skill');
          return combined.includes(occupation);
        });
      }

      if (education && education !== 'all') {
        filtered = filtered.filter((s) => {
          const rules = s.rules ?? [];
          const eduRule = rules.find((r) => r.ruleKey === 'educationLevel');
          if (!eduRule) return true;
          if (Array.isArray(eduRule.expectedValue)) {
            return eduRule.expectedValue.some((v) => String(v).toLowerCase() === education);
          }
          return true;
        });
      }

      if (beneficiary && beneficiary !== 'all') {
        filtered = filtered.filter((s) => {
          const text = `${s.targetBeneficiaries} ${s.tags.join(' ')} ${s.category}`.toLowerCase();
          return text.includes(beneficiary);
        });
      }

      if (maxIncomeParam !== null && !Number.isNaN(maxIncomeParam)) {
        filtered = filtered.filter((s) => {
          const incomeRules = (s.rules ?? []).filter((r) => r.ruleKey === 'annualIncome');
          if (incomeRules.length === 0) return true;
          return incomeRules.some((r) => {
            const threshold = Number(r.expectedValue);
            return Number.isNaN(threshold) || maxIncomeParam <= threshold;
          });
        });
      }

      if (ageParam !== null && !Number.isNaN(ageParam)) {
        filtered = filtered.filter((s) => {
          const ageRules = (s.rules ?? []).filter((r) => r.ruleKey === 'age' && r.logicalGroup === 'AND');
          for (const r of ageRules) {
            const expected = Number(r.expectedValue);
            if (r.operator === 'gte' && ageParam < expected) return false;
            if (r.operator === 'lte' && ageParam > expected) return false;
            if (r.operator === 'gt' && ageParam <= expected) return false;
            if (r.operator === 'lt' && ageParam >= expected) return false;
          }
          return true;
        });
      }

      if (sort === 'verified') {
        filtered = [...filtered].sort((a, b) => b.lastVerifiedDate.localeCompare(a.lastVerifiedDate));
      } else if (sort === 'category') {
        filtered = [...filtered].sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        );
      } else {
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const offset = (page - 1) * limit;
      const items = filtered.slice(offset, offset + limit);

      res.json({
        items,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch schemes';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/schemes/:identifier', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const scheme = await getSchemeBySlugOrId(String(req.params.identifier));
      if (!scheme) {
        return res.status(404).json({ error: 'Scheme not found.' });
      }
      let evaluation = null;
      if (req.dbUser?.profile && Object.keys(req.dbUser.profile).length > 1) {
        evaluation = evaluateSchemeEligibility(scheme, req.dbUser.profile);
      }
      res.json({ scheme, evaluation });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load scheme details';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/schemes/compare', async (req, res) => {
    try {
      const parsed = z.object({ ids: z.array(z.number().int().positive()).min(1).max(3) }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Please select between 1 and 3 valid scheme IDs to compare.' });
      }
      const list = await getSchemesByIds(parsed.data.ids);
      const byId = new Map(list.map((s) => [s.id, s]));
      const ordered = parsed.data.ids.map((id) => byId.get(id)).filter(Boolean);
      res.json({ schemes: ordered });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to compare schemes';
      res.status(500).json({ error: msg });
    }
  });

  // ── ELIGIBILITY ENGINE & RECOMMENDATIONS ───────────────────────────────────
  app.post('/api/eligibility/check', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = z
        .object({
          profile: profileSchema,
          saveToProfile: z.boolean().optional(),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Please check your input values and try again.',
          details: parsed.error.flatten(),
        });
      }

      const profile = parsed.data.profile as UserProfile;
      const allSchemes = await getAllSchemesWithRules();
      const response = evaluateAllSchemes(allSchemes, profile);

      if (req.dbUser) {
        const checkId = await saveEligibilityCheck(
          req.dbUser.id,
          profile,
          response.summary,
          response.results
        );
        response.checkId = checkId;

        if (parsed.data.saveToProfile) {
          const mergedProfile: UserProfile = {
            ...req.dbUser.profile,
            ...profile,
          };
          await updateUserProfile(req.dbUser.id, profile.name, mergedProfile);
        }
      }

      res.json(response);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Eligibility evaluation failed';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/recommendations', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = z.object({ profile: profileSchema.optional() }).safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid profile parameters for recommendations.' });
      }
      const profile: UserProfile =
        parsed.data.profile && Object.keys(parsed.data.profile).length > 0
          ? (parsed.data.profile as UserProfile)
          : (req.dbUser?.profile ?? {});

      const allSchemes = await getAllSchemesWithRules();
      const recommendations = generatePersonalizedRecommendations(allSchemes, profile);

      res.json({
        profileUsed: profile,
        totalRecommendations: recommendations.length,
        recommendations,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate recommendations';
      res.status(500).json({ error: msg });
    }
  });

  // ── YOJANA MITRA AI ASSISTANT ──────────────────────────────────────────────
  app.post('/api/assistant/chat', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = z
        .object({
          message: z.string().min(1).max(1200),
          history: z
            .array(
              z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().max(4000),
              })
            )
            .max(20)
            .default([]),
          useUserProfile: z.boolean().default(false),
          guestProfile: profileSchema.optional(),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: 'Please enter a valid question for Yojana Mitra.' });
      }

      const allSchemes = await getAllSchemesWithRules();
      const effectiveProfile = parsed.data.useUserProfile
        ? req.dbUser?.profile ?? (parsed.data.guestProfile as UserProfile | undefined)
        : undefined;

      const aiResult = await generateYojanaMitraResponse({
        message: parsed.data.message.trim(),
        history: parsed.data.history,
        allSchemes,
        userProfile: effectiveProfile,
        useUserProfile: parsed.data.useUserProfile,
      });

      if (req.dbUser) {
        await saveChatMessage(req.dbUser.id, 'user', parsed.data.message.trim(), []);
        await saveChatMessage(req.dbUser.id, 'assistant', aiResult.reply, aiResult.sources);
      }

      res.json({
        reply: aiResult.reply,
        sources: aiResult.sources,
        mode: aiResult.mode,
        notice: aiResult.notice,
        createdAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Yojana Mitra encountered an error';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/assistant/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const messages = await getChatHistoryForUser(req.dbUser!.id);
      res.json({ messages });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load chat history';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/assistant/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      await clearChatHistoryForUser(req.dbUser!.id);
      res.json({ ok: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to clear chat history';
      res.status(500).json({ error: msg });
    }
  });

  // ── AUTHENTICATED CITIZEN ROUTES ───────────────────────────────────────────
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({
      user: req.dbUser,
      profileCompletion: calculateProfileCompletion(req.dbUser!.profile),
    });
  });

  app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = z
        .object({
          name: z.string().max(120).optional(),
          profile: profileSchema,
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid profile details.',
          details: parsed.error.flatten(),
        });
      }

      const updatedUser = await updateUserProfile(
        req.dbUser!.id,
        parsed.data.name,
        parsed.data.profile as UserProfile
      );

      res.json({
        user: updatedUser,
        profileCompletion: calculateProfileCompletion(updatedUser.profile),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update profile';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/saved-schemes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await getSavedSchemesForUser(req.dbUser!.id);
      res.json({ schemes: saved });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch saved schemes';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/saved-schemes/:schemeId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const schemeId = Number(req.params.schemeId);
      if (!Number.isInteger(schemeId) || schemeId <= 0) {
        return res.status(400).json({ error: 'Invalid scheme ID.' });
      }
      await saveSchemeForUser(req.dbUser!.id, schemeId);
      res.json({ saved: true, schemeId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save scheme';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/saved-schemes/:schemeId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const schemeId = Number(req.params.schemeId);
      if (!Number.isInteger(schemeId) || schemeId <= 0) {
        return res.status(400).json({ error: 'Invalid scheme ID.' });
      }
      await unsaveSchemeForUser(req.dbUser!.id, schemeId);
      res.json({ saved: false, schemeId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to remove saved scheme';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/eligibility/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const history = await getEligibilityHistoryForUser(req.dbUser!.id);
      res.json({ history });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch eligibility history';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const [allSchemes, savedList, history] = await Promise.all([
        getAllSchemesWithRules(),
        getSavedSchemesForUser(user.id),
        getEligibilityHistoryForUser(user.id),
      ]);

      const completion = calculateProfileCompletion(user.profile);
      const hasProfileData = completion.completedFields > 0;
      const evaluation = hasProfileData ? evaluateAllSchemes(allSchemes, user.profile) : null;
      const recommendations = hasProfileData
        ? generatePersonalizedRecommendations(allSchemes, user.profile)
        : [];

      // Aggregate real document checklist across Eligible + Saved schemes
      const docMap = new Map<string, { document: string; schemes: string[] }>();
      const relevantForDocs = [
        ...savedList.map((s) => ({ name: s.name, docs: s.documentsRequired })),
        ...(evaluation?.results
          .filter((r) => r.status === 'ELIGIBLE')
          .map((r) => ({ name: r.schemeName, docs: r.documentsRequired })) ?? []),
      ];

      for (const entry of relevantForDocs) {
        for (const doc of entry.docs) {
          const normalized = doc.trim();
          const key = normalized.toLowerCase();
          const existing = docMap.get(key);
          if (existing) {
            if (!existing.schemes.includes(entry.name)) {
              existing.schemes.push(entry.name);
            }
          } else {
            docMap.set(key, { document: normalized, schemes: [entry.name] });
          }
        }
      }

      res.json({
        user,
        profileCompletion: completion,
        savedSchemes: savedList,
        eligibilityHistory: history,
        latestEvaluation: evaluation,
        recommendations: recommendations.slice(0, 8),
        documentChecklist: Array.from(docMap.values()),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load dashboard';
      res.status(500).json({ error: msg });
    }
  });

  // ── ADMIN ROUTES (BACKEND RBAC PROTECTED) ──────────────────────────────────
  app.get('/api/admin/schemes', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const list = await getAllSchemesWithRules();
      res.json({ schemes: list });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch schemes for admin';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/admin/schemes', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const parsed = schemeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed. Please check all required fields and URLs.',
          details: parsed.error.flatten(),
        });
      }
      const { rules, ...schemeData } = parsed.data;
      const created = await createSchemeWithRules(schemeData, rules ?? [], req.dbUser!);
      res.status(201).json({ scheme: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create scheme';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/admin/schemes/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const schemeId = Number(req.params.id);
      if (!Number.isInteger(schemeId) || schemeId <= 0) {
        return res.status(400).json({ error: 'Invalid scheme ID.' });
      }
      const parsed = schemeInputSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed for scheme update.',
          details: parsed.error.flatten(),
        });
      }
      const { rules, ...schemeData } = parsed.data;
      const updated = await updateSchemeWithRules(schemeId, schemeData, rules, req.dbUser!);
      if (!updated) {
        return res.status(404).json({ error: 'Scheme not found.' });
      }
      res.json({ scheme: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update scheme';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/admin/schemes/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const schemeId = Number(req.params.id);
      if (!Number.isInteger(schemeId) || schemeId <= 0) {
        return res.status(400).json({ error: 'Invalid scheme ID.' });
      }
      const deleted = await deleteSchemeById(schemeId, req.dbUser!);
      if (!deleted) {
        return res.status(404).json({ error: 'Scheme not found.' });
      }
      res.json({ deleted: true, id: schemeId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete scheme';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/admin/audit-logs', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const logs = await getRecentAuditLogs();
      res.json({ logs });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
      res.status(500).json({ error: msg });
    }
  });

  // ── VITE / STATIC FRONTEND SERVING ─────────────────────────────────────────
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const PORT = Number(process.env.PORT ?? 3000);

createApp()
  .then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Yojana Sarthi server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start Yojana Sarthi server:', err);
    process.exit(1);
  });
