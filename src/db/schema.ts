import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { ChatSourceRef, UserProfile } from '../types/index.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('citizen'),
  profile: jsonb('profile').$type<UserProfile>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const schemes = pgTable('schemes', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  shortDescription: text('short_description').notNull(),
  overview: text('overview').notNull(),
  objective: text('objective').notNull(),
  category: text('category').notNull(),
  governmentLevel: text('government_level').notNull(),
  department: text('department').notNull(),
  stateCoverage: jsonb('state_coverage').$type<string[]>().notNull().default(['All India']),
  targetBeneficiaries: text('target_beneficiaries').notNull(),
  benefits: jsonb('benefits').$type<string[]>().notNull().default([]),
  mainBenefit: text('main_benefit').notNull(),
  documentsRequired: jsonb('documents_required').$type<string[]>().notNull().default([]),
  applicationSteps: jsonb('application_steps').$type<string[]>().notNull().default([]),
  applicationMethod: text('application_method').notNull().default('Online'),
  officialApplicationUrl: text('official_application_url').notNull(),
  officialSourceUrl: text('official_source_url').notNull(),
  verificationStatus: text('verification_status').notNull().default('Verified'),
  lastVerifiedDate: text('last_verified_date').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const eligibilityRules = pgTable('eligibility_rules', {
  id: serial('id').primaryKey(),
  schemeId: integer('scheme_id')
    .references(() => schemes.id, { onDelete: 'cascade' })
    .notNull(),
  ruleKey: text('rule_key').notNull(),
  operator: text('operator').notNull(),
  expectedValue: jsonb('expected_value').$type<unknown>().notNull(),
  logicalGroup: text('logical_group').notNull().default('AND'),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  isVerifiedRule: boolean('is_verified_rule').notNull().default(true),
  label: text('label').notNull(),
  explanationPass: text('explanation_pass').notNull(),
  explanationFail: text('explanation_fail').notNull(),
  explanationMissing: text('explanation_missing').notNull(),
  source: text('source').notNull(),
});

export const savedSchemes = pgTable(
  'saved_schemes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    schemeId: integer('scheme_id')
      .references(() => schemes.id, { onDelete: 'cascade' })
      .notNull(),
    savedAt: timestamp('saved_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('saved_schemes_user_scheme_idx').on(table.userId, table.schemeId)]
);

export const eligibilityChecks = pgTable('eligibility_checks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  profileSnapshot: jsonb('profile_snapshot').$type<UserProfile>().notNull(),
  summary: jsonb('summary')
    .$type<{
      totalSchemesEvaluated: number;
      eligibleCount: number;
      potentiallyEligibleCount: number;
      notEligibleCount: number;
    }>()
    .notNull(),
  results: jsonb('results').$type<unknown[]>().notNull(),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  sources: jsonb('sources').$type<ChatSourceRef[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminUid: text('admin_uid').notNull(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedSchemes: many(savedSchemes),
  eligibilityChecks: many(eligibilityChecks),
  chatMessages: many(chatMessages),
}));

export const schemesRelations = relations(schemes, ({ many }) => ({
  rules: many(eligibilityRules),
  savedBy: many(savedSchemes),
}));

export const eligibilityRulesRelations = relations(eligibilityRules, ({ one }) => ({
  scheme: one(schemes, {
    fields: [eligibilityRules.schemeId],
    references: [schemes.id],
  }),
}));

export const savedSchemesRelations = relations(savedSchemes, ({ one }) => ({
  user: one(users, {
    fields: [savedSchemes.userId],
    references: [users.id],
  }),
  scheme: one(schemes, {
    fields: [savedSchemes.schemeId],
    references: [schemes.id],
  }),
}));

export const eligibilityChecksRelations = relations(eligibilityChecks, ({ one }) => ({
  user: one(users, {
    fields: [eligibilityChecks.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
