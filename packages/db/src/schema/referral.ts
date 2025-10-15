import { pgTable, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth";
// Trades table - represents trading activity that generates fees
export const trades = pgTable("trades", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	volume: numeric("volume", { precision: 28, scale: 18 }).notNull(),
	feeAmount: numeric("fee_amount", { precision: 28, scale: 18 }).notNull(),
	feeTier: numeric("fee_tier", { precision: 5, scale: 4 }).notNull(),
	tokenType: text("token_type").notNull(), // 'USDC-ARBITRUM' | 'USDC-SOLANA'
	processedForCommissions: boolean("processed_for_commissions").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
// Commissions table - tracks earned commissions by referral level
export const commissions = pgTable("commissions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	tradeId: text("trade_id")
		.notNull()
		.references(() => trades.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 28, scale: 18 }).notNull(),
	level: integer("level").notNull(), // 1, 2, or 3
	tokenType: text("token_type").notNull(),
	claimed: boolean("claimed").default(false).notNull(),
	claimedAt: timestamp("claimed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
// XP Balance - cross-chain aggregate view
export const xpBalance = pgTable("xp_balance", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	totalXP: numeric("total_xp", { precision: 28, scale: 18 }).default("0").notNull(),
	lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});
