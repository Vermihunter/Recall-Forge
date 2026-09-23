import { AnyPgColumn, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  track: text("track").notNull(),
  parentTopicId: uuid("parent_topic_id").references((): AnyPgColumn => topics.id, { onDelete: "set null" }),
  order: integer("sort_order").notNull().default(0),
  summary: text("summary").notNull().default(""),
  stage: text("stage").notNull().default("foundation"),
  mustKnow: jsonb("must_know").$type<string[]>().notNull().default([]),
  progress: integer("progress").notNull().default(0),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roadmapSessions = pgTable("roadmap_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  order: integer("sort_order").notNull().default(0),
  objective: text("objective").notNull().default(""),
  scope: jsonb("scope").$type<string[]>().notNull().default([]),
  outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
  estimatedMinutes: integer("estimated_minutes").notNull().default(45),
  status: text("status").notNull().default("todo"),
  plannedFor: text("planned_for"),
  planOrder: integer("plan_order").notNull().default(0),
  notes: text("notes").notNull().default(""),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").unique(),
  topicSlug: text("topic_slug").notNull(),
  sessionSlug: text("session_slug"),
  subtopics: jsonb("subtopics").$type<string[]>().notNull().default([]),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
  type: text("type").notNull(),
  format: text("format").notNull().default("open"),
  difficulty: integer("difficulty").notNull(),
  questionMd: text("question_md").notNull(),
  answerMd: text("answer_md").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  correctOptionIndexes: jsonb("correct_option_indexes").$type<number[]>().notNull().default([]),
  optionFeedback: jsonb("option_feedback").$type<{ rationale:string; concepts:string[] }[]>().notNull().default([]),
  concepts: jsonb("concepts").$type<string[]>().notNull().default([]),
  relatedQuestionIds: jsonb("related_question_ids").$type<string[]>().notNull().default([]),
  prerequisiteQuestionIds: jsonb("prerequisite_question_ids").$type<string[]>().notNull().default([]),
  keyPoints: jsonb("key_points").$type<string[]>().notNull().default([]),
  hints: jsonb("hints").$type<{level:number; text:string}[]>().notNull().default([]),
  commonMistakes: jsonb("common_mistakes").$type<string[]>().notNull().default([]),
  expectedMinutes: integer("expected_minutes").notNull().default(2),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  origin: text("origin").notNull().default("user"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull().defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  repetitions: integer("repetitions").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  intervalDays: integer("interval_days").notNull().default(0),
  lastGrade: text("last_grade"),
  confidence: integer("confidence"),
  lastPrintedAt: timestamp("last_printed_at", { withTimezone: true }),
  printCount: integer("print_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mistakes = pgTable("mistakes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  topicSlug: text("topic_slug").notNull().default("general"),
  source: text("source").notNull().default("study"),
  severity: text("severity").notNull().default("medium"),
  context: text("context").notNull().default(""),
  rootCause: text("root_cause").notNull().default(""),
  repair: text("repair").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSessions = pgTable("ai_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  mode: text("mode").notNull(),
  topic: text("topic").notNull().default(""),
  roadmapSessionSlug: text("roadmap_session_slug"),
  prompt: text("prompt").notNull(),
  response: text("response").notNull().default(""),
  notes: text("notes").notNull().default(""),
  score: integer("score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});


export const revisionSessions = pgTable("revision_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sourceSessionSlugs: jsonb("source_session_slugs").$type<string[]>().notNull().default([]),
  targetQuestionCount: integer("target_question_count").notNull().default(30),
  recommendationMode: text("recommendation_mode").notNull().default("balanced"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, (table) => ({
  statusIdx: index("revision_sessions_status_idx").on(table.status),
}));

export const revisionSessionItems = pgTable("revision_session_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionSessionId: uuid("revision_session_id").notNull().references(() => revisionSessions.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  origin: text("origin").notNull().default("source"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueQuestion: uniqueIndex("revision_session_items_session_question_uq").on(table.revisionSessionId, table.questionId),
  sessionIdx: index("revision_session_items_session_idx").on(table.revisionSessionId),
}));

export const questionAttempts = pgTable("question_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionSessionId: uuid("revision_session_id").references(() => revisionSessions.id, { onDelete: "set null" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  format: text("format").notNull().default("open"),
  selfSignal: text("self_signal"),
  selectedOptionIndexes: jsonb("selected_option_indexes").$type<number[]>().notNull().default([]),
  scorePermille: integer("score_permille").notNull().default(0),
  responseMs: integer("response_ms").notNull().default(0),
  hintCount: integer("hint_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  questionIdx: index("question_attempts_question_idx").on(table.questionId),
  sessionIdx: index("question_attempts_revision_session_idx").on(table.revisionSessionId),
  createdIdx: index("question_attempts_created_idx").on(table.createdAt),
}));
