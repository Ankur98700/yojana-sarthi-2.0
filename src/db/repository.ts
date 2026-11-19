import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  chatMessages,
  eligibilityChecks,
  eligibilityRules,
  savedSchemes,
  schemes,
  users,
} from './schema.ts';
import { INITIAL_SCHEMES } from './seedData.ts';
import type {
  AuditLogRecord,
  AuthUserRecord,
  ChatMessageRecord,
  ChatSourceRef,
  EligibilityRuleRecord,
  RuleOperator,
  SchemeRecord,
  UserProfile,
} from '../types/index.ts';

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  'ankursharmacool1989@gmail.com',
  ...(process.env.ADMIN_EMAILS?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? []),
]);

let seedPromise: Promise<void> | null = null;

export async function ensureInitialSchemesSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const existing = await db.select({ id: schemes.id }).from(schemes).limit(1);
        if (existing.length > 0) return;

        for (const item of INITIAL_SCHEMES) {
          const inserted = await db
            .insert(schemes)
            .values({
              slug: item.slug,
              name: item.name,
              shortDescription: item.shortDescription,
              overview: item.overview,
              objective: item.objective,
              category: item.category,
              governmentLevel: item.governmentLevel,
              department: item.department,
              stateCoverage: item.stateCoverage,
              targetBeneficiaries: item.targetBeneficiaries,
              benefits: item.benefits,
              mainBenefit: item.mainBenefit,
              documentsRequired: item.documentsRequired,
              applicationSteps: item.applicationSteps,
              applicationMethod: item.applicationMethod,
              officialApplicationUrl: item.officialApplicationUrl,
              officialSourceUrl: item.officialSourceUrl,
              verificationStatus: item.verificationStatus,
              lastVerifiedDate: item.lastVerifiedDate,
              tags: item.tags,
            })
            .onConflictDoNothing({ target: schemes.slug })
            .returning({ id: schemes.id });

          const schemeId = inserted[0]?.id;
          if (schemeId && item.rules.length > 0) {
            await db.insert(eligibilityRules).values(
              item.rules.map((r) => ({
                schemeId,
                ruleKey: r.ruleKey,
                operator: r.operator,
                expectedValue: r.expectedValue,
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
          }
        }
      } catch (err) {
        seedPromise = null;
        throw err;
      }
    })();
  }
  return seedPromise;
}

function mapRule(row: typeof eligibilityRules.$inferSelect): EligibilityRuleRecord {
  return {
    id: row.id,
    schemeId: row.schemeId,
    ruleKey: row.ruleKey,
    operator: row.operator as RuleOperator,
    expectedValue: row.expectedValue,
    logicalGroup: row.logicalGroup,
    isMandatory: row.isMandatory,
    isVerifiedRule: row.isVerifiedRule,
    label: row.label,
    explanationPass: row.explanationPass,
    explanationFail: row.explanationFail,
    explanationMissing: row.explanationMissing,
    source: row.source,
  };
}

function mapScheme(
  row: typeof schemes.$inferSelect,
  rulesList?: EligibilityRuleRecord[]
): SchemeRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    overview: row.overview,
    objective: row.objective,
    category: row.category,
    governmentLevel: row.governmentLevel as 'Central' | 'State',
    department: row.department,
    stateCoverage: Array.isArray(row.stateCoverage) ? row.stateCoverage : ['All India'],
    targetBeneficiaries: row.targetBeneficiaries,
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    mainBenefit: row.mainBenefit,
    documentsRequired: Array.isArray(row.documentsRequired) ? row.documentsRequired : [],
    applicationSteps: Array.isArray(row.applicationSteps) ? row.applicationSteps : [],
    applicationMethod: row.applicationMethod as 'Online' | 'Offline' | 'Both Online & Offline',
    officialApplicationUrl: row.officialApplicationUrl,
    officialSourceUrl: row.officialSourceUrl,
    verificationStatus: row.verificationStatus as 'Verified' | 'Unverified',
    lastVerifiedDate: row.lastVerifiedDate,
    tags: Array.isArray(row.tags) ? row.tags : [],
    rules: rulesList,
  };
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name: string
): Promise<AuthUserRecord> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail);

    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing[0]) {
      const current = existing[0];
      const nextRole = isBootstrapAdmin ? 'admin' : current.role;
      if (current.email !== email || current.role !== nextRole || (!current.name && name)) {
        const updated = await db
          .update(users)
          .set({
            email: email || current.email,
            name: current.name || name || '',
            role: nextRole,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        const u = updated[0];
        return {
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role as 'citizen' | 'admin',
          profile: (u.profile ?? {}) as UserProfile,
          createdAt: u.createdAt.toISOString(),
        };
      }
      return {
        id: current.id,
        uid: current.uid,
        email: current.email,
        name: current.name,
        role: current.role as 'citizen' | 'admin',
        profile: (current.profile ?? {}) as UserProfile,
        createdAt: current.createdAt.toISOString(),
      };
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Citizen',
        role: isBootstrapAdmin ? 'admin' : 'citizen',
        profile: { name: name || '' },
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    const u = result[0];
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      name: u.name,
      role: u.role as 'citizen' | 'admin',
      profile: (u.profile ?? {}) as UserProfile,
      createdAt: u.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user account.', { cause: error });
  }
}

export async function updateUserProfile(
  userId: number,
  name: string | undefined,
  profile: UserProfile
): Promise<AuthUserRecord> {
  try {
    const updatePayload: {
      profile: UserProfile;
      updatedAt: Date;
      name?: string;
    } = {
      profile,
      updatedAt: new Date(),
    };
    if (typeof name === 'string' && name.trim().length > 0) {
      updatePayload.name = name.trim();
    }

    const updated = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();

    const u = updated[0];
    return {
      id: u.id,
      uid: u.uid,
      email: u.email,
      name: u.name,
      role: u.role as 'citizen' | 'admin',
      profile: (u.profile ?? {}) as UserProfile,
      createdAt: u.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('Database error in updateUserProfile:', error);
    throw new Error('Unable to save profile changes.', { cause: error });
  }
}

export async function getAllSchemesWithRules(): Promise<SchemeRecord[]> {
  try {
    await ensureInitialSchemesSeeded();
    const [schemeRows, ruleRows] = await Promise.all([
      db.select().from(schemes).orderBy(schemes.name),
      db.select().from(eligibilityRules),
    ]);

    const rulesByScheme = new Map<number, EligibilityRuleRecord[]>();
    for (const r of ruleRows) {
      const list = rulesByScheme.get(r.schemeId) ?? [];
      list.push(mapRule(r));
      rulesByScheme.set(r.schemeId, list);
    }

    return schemeRows.map((row) => mapScheme(row, rulesByScheme.get(row.id) ?? []));
  } catch (error) {
    console.error('Database error in getAllSchemesWithRules:', error);
    throw new Error('Unable to load government schemes at this time.', { cause: error });
  }
}

export async function getSchemeBySlugOrId(identifier: string): Promise<SchemeRecord | null> {
  try {
    await ensureInitialSchemesSeeded();
    const isNumeric = /^\d+$/.test(identifier);
    const rows = isNumeric
      ? await db.select().from(schemes).where(eq(schemes.id, Number(identifier))).limit(1)
      : await db.select().from(schemes).where(eq(schemes.slug, identifier)).limit(1);

    if (!rows[0]) return null;
    const ruleRows = await db
      .select()
      .from(eligibilityRules)
      .where(eq(eligibilityRules.schemeId, rows[0].id));
    return mapScheme(rows[0], ruleRows.map(mapRule));
  } catch (error) {
    console.error('Database error in getSchemeBySlugOrId:', error);
    throw new Error('Unable to fetch scheme details.', { cause: error });
  }
}

export async function getSchemesByIds(ids: number[]): Promise<SchemeRecord[]> {
  if (ids.length === 0) return [];
  try {
    await ensureInitialSchemesSeeded();
    const schemeRows = await db.select().from(schemes).where(inArray(schemes.id, ids));
    const ruleRows = await db
      .select()
      .from(eligibilityRules)
      .where(inArray(eligibilityRules.schemeId, ids));

    const rulesByScheme = new Map<number, EligibilityRuleRecord[]>();
    for (const r of ruleRows) {
      const list = rulesByScheme.get(r.schemeId) ?? [];
      list.push(mapRule(r));
      rulesByScheme.set(r.schemeId, list);
    }
    return schemeRows.map((row) => mapScheme(row, rulesByScheme.get(row.id) ?? []));
  } catch (error) {
    console.error('Database error in getSchemesByIds:', error);
    throw new Error('Unable to fetch selected schemes.', { cause: error });
  }
}

export async function createSchemeWithRules(
  data: Omit<SchemeRecord, 'id' | 'rules'>,
  rulesList: Omit<EligibilityRuleRecord, 'id' | 'schemeId'>[],
  admin: AuthUserRecord
): Promise<SchemeRecord> {
  try {
    const inserted = await db
      .insert(schemes)
      .values({
        slug: data.slug,
        name: data.name,
        shortDescription: data.shortDescription,
        overview: data.overview,
        objective: data.objective,
        category: data.category,
        governmentLevel: data.governmentLevel,
        department: data.department,
        stateCoverage: data.stateCoverage,
        targetBeneficiaries: data.targetBeneficiaries,
        benefits: data.benefits,
        mainBenefit: data.mainBenefit,
        documentsRequired: data.documentsRequired,
        applicationSteps: data.applicationSteps,
        applicationMethod: data.applicationMethod,
        officialApplicationUrl: data.officialApplicationUrl,
        officialSourceUrl: data.officialSourceUrl,
        verificationStatus: data.verificationStatus,
        lastVerifiedDate: data.lastVerifiedDate,
        tags: data.tags,
      })
      .returning();

    const schemeRow = inserted[0];
    let savedRules: EligibilityRuleRecord[] = [];

    if (rulesList.length > 0) {
      const insertedRules = await db
        .insert(eligibilityRules)
        .values(
          rulesList.map((r) => ({
            schemeId: schemeRow.id,
            ruleKey: r.ruleKey,
            operator: r.operator,
            expectedValue: r.expectedValue,
            logicalGroup: r.logicalGroup || 'AND',
            isMandatory: r.isMandatory ?? true,
            isVerifiedRule: r.isVerifiedRule ?? true,
            label: r.label,
            explanationPass: r.explanationPass,
            explanationFail: r.explanationFail,
            explanationMissing: r.explanationMissing,
            source: r.source,
          }))
        )
        .returning();
      savedRules = insertedRules.map(mapRule);
    }

    await db.insert(auditLogs).values({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'CREATE_SCHEME',
      targetType: 'scheme',
      targetId: schemeRow.id,
      details: `Created scheme "${schemeRow.name}" (${schemeRow.verificationStatus}) with ${savedRules.length} rules.`,
    });

    return mapScheme(schemeRow, savedRules);
  } catch (error) {
    console.error('Database error in createSchemeWithRules:', error);
    throw new Error('Unable to create scheme record. Ensure the slug is unique.', { cause: error });
  }
}

export async function updateSchemeWithRules(
  schemeId: number,
  data: Partial<Omit<SchemeRecord, 'id' | 'rules'>>,
  rulesList: Omit<EligibilityRuleRecord, 'id' | 'schemeId'>[] | undefined,
  admin: AuthUserRecord
): Promise<SchemeRecord | null> {
  try {
    const updated = await db
      .update(schemes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schemes.id, schemeId))
      .returning();

    if (!updated[0]) return null;

    let currentRules: EligibilityRuleRecord[] = [];
    if (rulesList !== undefined) {
      await db.delete(eligibilityRules).where(eq(eligibilityRules.schemeId, schemeId));
      if (rulesList.length > 0) {
        const insertedRules = await db
          .insert(eligibilityRules)
          .values(
            rulesList.map((r) => ({
              schemeId,
              ruleKey: r.ruleKey,
              operator: r.operator,
              expectedValue: r.expectedValue,
              logicalGroup: r.logicalGroup || 'AND',
              isMandatory: r.isMandatory ?? true,
              isVerifiedRule: r.isVerifiedRule ?? true,
              label: r.label,
              explanationPass: r.explanationPass,
              explanationFail: r.explanationFail,
              explanationMissing: r.explanationMissing,
              source: r.source,
            }))
          )
          .returning();
        currentRules = insertedRules.map(mapRule);
      }
    } else {
      const existingRules = await db
        .select()
        .from(eligibilityRules)
        .where(eq(eligibilityRules.schemeId, schemeId));
      currentRules = existingRules.map(mapRule);
    }

    await db.insert(auditLogs).values({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'UPDATE_SCHEME',
      targetType: 'scheme',
      targetId: schemeId,
      details: `Updated scheme "${updated[0].name}" (${updated[0].verificationStatus}, verified ${updated[0].lastVerifiedDate}).`,
    });

    return mapScheme(updated[0], currentRules);
  } catch (error) {
    console.error('Database error in updateSchemeWithRules:', error);
    throw new Error('Unable to update scheme record.', { cause: error });
  }
}

export async function deleteSchemeById(schemeId: number, admin: AuthUserRecord): Promise<boolean> {
  try {
    const deleted = await db
      .delete(schemes)
      .where(eq(schemes.id, schemeId))
      .returning({ id: schemes.id, name: schemes.name });

    if (!deleted[0]) return false;

    await db.insert(auditLogs).values({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'DELETE_SCHEME',
      targetType: 'scheme',
      targetId: schemeId,
      details: `Deleted scheme "${deleted[0].name}".`,
    });
    return true;
  } catch (error) {
    console.error('Database error in deleteSchemeById:', error);
    throw new Error('Unable to delete scheme record.', { cause: error });
  }
}

export async function getSavedSchemesForUser(userId: number): Promise<SchemeRecord[]> {
  try {
    const saved = await db
      .select({ schemeId: savedSchemes.schemeId })
      .from(savedSchemes)
      .where(eq(savedSchemes.userId, userId))
      .orderBy(desc(savedSchemes.savedAt));

    const ids = saved.map((s) => s.schemeId);
    if (ids.length === 0) return [];
    const list = await getSchemesByIds(ids);
    const byId = new Map(list.map((s) => [s.id, s]));
    return ids.map((id) => byId.get(id)).filter((s): s is SchemeRecord => Boolean(s));
  } catch (error) {
    console.error('Database error in getSavedSchemesForUser:', error);
    throw new Error('Unable to load saved schemes.', { cause: error });
  }
}

export async function saveSchemeForUser(userId: number, schemeId: number): Promise<void> {
  try {
    await db
      .insert(savedSchemes)
      .values({ userId, schemeId })
      .onConflictDoNothing({ target: [savedSchemes.userId, savedSchemes.schemeId] });
  } catch (error) {
    console.error('Database error in saveSchemeForUser:', error);
    throw new Error('Unable to save scheme.', { cause: error });
  }
}

export async function unsaveSchemeForUser(userId: number, schemeId: number): Promise<void> {
  try {
    await db
      .delete(savedSchemes)
      .where(and(eq(savedSchemes.userId, userId), eq(savedSchemes.schemeId, schemeId)));
  } catch (error) {
    console.error('Database error in unsaveSchemeForUser:', error);
    throw new Error('Unable to remove saved scheme.', { cause: error });
  }
}

export async function saveEligibilityCheck(
  userId: number | null,
  profileSnapshot: UserProfile,
  summary: {
    totalSchemesEvaluated: number;
    eligibleCount: number;
    potentiallyEligibleCount: number;
    notEligibleCount: number;
  },
  results: unknown[]
): Promise<number> {
  try {
    const inserted = await db
      .insert(eligibilityChecks)
      .values({
        userId,
        profileSnapshot,
        summary,
        results,
      })
      .returning({ id: eligibilityChecks.id });
    return inserted[0].id;
  } catch (error) {
    console.error('Database error in saveEligibilityCheck:', error);
    throw new Error('Unable to persist eligibility check history.', { cause: error });
  }
}

export async function getEligibilityHistoryForUser(userId: number) {
  try {
    const rows = await db
      .select()
      .from(eligibilityChecks)
      .where(eq(eligibilityChecks.userId, userId))
      .orderBy(desc(eligibilityChecks.evaluatedAt))
      .limit(15);

    return rows.map((r) => ({
      id: r.id,
      profileSnapshot: r.profileSnapshot,
      summary: r.summary,
      results: r.results,
      evaluatedAt: r.evaluatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database error in getEligibilityHistoryForUser:', error);
    throw new Error('Unable to load eligibility check history.', { cause: error });
  }
}

export async function getChatHistoryForUser(userId: number): Promise<ChatMessageRecord[]> {
  try {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.createdAt)
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      sources: Array.isArray(r.sources) ? r.sources : [],
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database error in getChatHistoryForUser:', error);
    throw new Error('Unable to load chat history.', { cause: error });
  }
}

export async function saveChatMessage(
  userId: number,
  role: 'user' | 'assistant',
  content: string,
  sources: ChatSourceRef[] = []
): Promise<void> {
  try {
    await db.insert(chatMessages).values({
      userId,
      role,
      content,
      sources,
    });
  } catch (error) {
    console.error('Database error in saveChatMessage:', error);
  }
}

export async function clearChatHistoryForUser(userId: number): Promise<void> {
  try {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  } catch (error) {
    console.error('Database error in clearChatHistoryForUser:', error);
    throw new Error('Unable to clear chat history.', { cause: error });
  }
}

export async function getRecentAuditLogs(): Promise<AuditLogRecord[]> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(40);
    return rows.map((r) => ({
      id: r.id,
      adminUid: r.adminUid,
      adminEmail: r.adminEmail,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database error in getRecentAuditLogs:', error);
    throw new Error('Unable to load audit trail.', { cause: error });
  }
}
