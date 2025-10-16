import { pgTable, text, timestamp, numeric, integer, boolean, index, sql } from "drizzle-orm/pg-core";
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
}, (table) => ({
	userIdIdx: index("trades_user_id_idx").on(table.userId),
	userIdCreatedAtIdx: index("trades_user_id_created_at_idx").on(table.userId, table.createdAt),
	processedIdx: index("trades_processed_idx").on(table.processedForCommissions),
}));

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
}, (table) => ({
	userIdIdx: index("commissions_user_id_idx").on(table.userId),
	userIdClaimedIdx: index("commissions_user_id_claimed_idx").on(table.userId, table.claimed),
	userIdTokenTypeIdx: index("commissions_user_id_token_type_idx").on(table.userId, table.tokenType),
	tradeIdIdx: index("commissions_trade_id_idx").on(table.tradeId),
	createdAtIdx: index("commissions_created_at_idx").on(table.createdAt),
}));

// Cashback table - trader's own 10% cashback
export const cashback = pgTable("cashback", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	tradeId: text("trade_id")
		.notNull()
		.references(() => trades.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 28, scale: 18 }).notNull(),
	tokenType: text("token_type").notNull(),
	claimed: boolean("claimed").default(false).notNull(),
	claimedAt: timestamp("claimed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
	userIdIdx: index("cashback_user_id_idx").on(table.userId),
	userIdClaimedIdx: index("cashback_user_id_claimed_idx").on(table.userId, table.claimed),
	userIdTokenTypeIdx: index("cashback_user_id_token_type_idx").on(table.userId, table.tokenType),
	tradeIdIdx: index("cashback_trade_id_idx").on(table.tradeId),
	createdAtIdx: index("cashback_created_at_idx").on(table.createdAt),
}));

// Treasury allocation - 55% of fees
export const treasuryAllocation = pgTable("treasury_allocation", {
	id: text("id").primaryKey(),
	tradeId: text("trade_id")
		.notNull()
		.references(() => trades.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 28, scale: 18 }).notNull(),
	tokenType: text("token_type").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
	tradeIdIdx: index("treasury_allocation_trade_id_idx").on(table.tradeId),
	tokenTypeIdx: index("treasury_allocation_token_type_idx").on(table.tokenType),
}));

// XP Balance - cross-chain aggregate view
export const xpBalance = pgTable("xp_balance", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	totalXP: numeric("total_xp", { precision: 28, scale: 18 }).default("0").notNull(),
	lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});

// Processed trades - idempotency tracking
export const processedTrades = pgTable("processed_trades", {
	tradeId: text("trade_id").primaryKey(),
	processedAt: timestamp("processed_at").defaultNow().notNull(),
});
