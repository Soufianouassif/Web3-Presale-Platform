import { pgTable, text, serial, boolean, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const pageVisits = pgTable("page_visits", {
  id: serial("id").primaryKey(),
  page: text("page").notNull().default("/"),
  visitorId: text("visitor_id"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const walletConnections = pgTable("wallet_connections", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  walletType: text("wallet_type").notNull(),
  network: text("network").notNull().default("unknown"),
  ip: text("ip"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  walletType: text("wallet_type"),
  network: text("network").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 6 }).notNull().default("0"),
  amountTokens: decimal("amount_tokens", { precision: 18, scale: 6 }).notNull().default("0"),
  txHash: text("tx_hash"),
  stage: integer("stage").default(1),
  verificationStatus: text("verification_status").default("VERIFIED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const presaleConfig = pgTable("presale_config", {
  id: integer("id").primaryKey().default(1),
  isActive: boolean("is_active").default(true),
  claimEnabled: boolean("claim_enabled").default(false),
  stakingEnabled: boolean("staking_enabled").default(false),
  currentStage: integer("current_stage").default(1),
  totalRaisedUsd: decimal("total_raised_usd", { precision: 18, scale: 6 }).default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").unique().notNull(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatar: text("avatar"),
  lastLogin: timestamp("last_login", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  code: text("code").notNull().unique(),
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalRewardTokens: decimal("total_reward_tokens", { precision: 18, scale: 6 }).notNull().default("0"),
  totalRewardUsd: decimal("total_reward_usd", { precision: 18, scale: 6 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerWallet: text("referrer_wallet").notNull(),
  referredWallet: text("referred_wallet").notNull(),
  purchaseId: integer("purchase_id"),
  rewardRate: decimal("reward_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),
  rewardTokens: decimal("reward_tokens", { precision: 18, scale: 6 }).notNull().default("0"),
  rewardUsd: decimal("reward_usd", { precision: 18, scale: 6 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const referralCodesRelations = relations(referralCodes, ({ many }) => ({
  referrals: many(referrals),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  purchase: one(purchases, { fields: [referrals.purchaseId], references: [purchases.id] }),
}));
