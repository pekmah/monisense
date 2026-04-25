import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const errorEvents = pgTable(
  "error_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id"),
    code: text("code").notNull(),
    domain: text("domain").notNull(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    exposure: text("exposure").notNull(),
    status: integer("status").notNull(),
    message: text("message").notNull(),
    displayTitle: text("display_title"),
    displayMessage: text("display_message"),
    details: jsonb("details").$type<
      Array<{
        field?: string;
        location?: "body" | "query" | "params" | "request" | "system";
        message: string;
      }>
    >(),
    causeMessage: text("cause_message"),
    stack: text("stack"),
    service: text("service").notNull(),
    component: text("component"),
    operation: text("operation"),
    method: text("method"),
    path: text("path"),
    clientId: text("client_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("error_events_request_id_idx").on(table.requestId),
    index("error_events_code_idx").on(table.code),
    index("error_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const classificationLogs = pgTable(
  "classification_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    rawSmsHash: text("raw_sms_hash").notNull(),
    cleanDescription: text("clean_description").notNull(),
    parsedJson: jsonb("parsed_json").notNull(),
    aiOutputJson: jsonb("ai_output_json"),
    suggestedCategory: text("suggested_category"),
    confidence: integer("confidence_bps"),
    needsReview: boolean("needs_review").notNull().default(true),
    modelName: text("model_name").notNull(),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("classification_logs_user_idx").on(table.userId),
    index("classification_logs_hash_idx").on(table.rawSmsHash),
    index("classification_logs_created_at_idx").on(table.createdAt),
  ],
);

export const merchantMemory = pgTable(
  "merchant_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    merchantKey: text("merchant_key").notNull(),
    merchantDisplayName: text("merchant_display_name").notNull(),
    categoryName: text("category_name").notNull(),
    confidence: integer("confidence_bps").notNull(),
    source: text("source").notNull(),
    usageCount: integer("usage_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("merchant_memory_user_idx").on(table.userId),
    index("merchant_memory_key_idx").on(table.merchantKey),
    uniqueIndex("merchant_memory_user_key_unique").on(table.userId, table.merchantKey),
  ],
);

export const categoryProposals = pgTable(
  "category_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    proposedName: text("proposed_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("category_proposals_user_idx").on(table.userId),
    index("category_proposals_name_idx").on(table.normalizedName),
  ],
);

export const userFeedback = pgTable(
  "user_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    merchantKey: text("merchant_key"),
    aiSuggestedCategory: text("ai_suggested_category"),
    finalCategory: text("final_category").notNull(),
    wasAiCorrect: boolean("was_ai_correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_feedback_user_idx").on(table.userId),
    index("user_feedback_merchant_idx").on(table.merchantKey),
  ],
);
