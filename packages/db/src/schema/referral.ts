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
