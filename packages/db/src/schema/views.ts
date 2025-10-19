import { pgView, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * User Referral Summary View
 * Provides all required user referral fields per specifications:
 * 1. Unique referral code ✓
 * 2. Referrer ID ✓
 * 3. List of direct referrals
 * 4. Commission balance (by token type)
 * 5. Claimed amount history
 * 6. Timestamp data for all actions
 */
export const userReferralSummary = pgView("user_referral_summary", {
	id: text("id").notNull(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	referralCode: text("referral_code"),
	referrerId: text("referrer_id"),
	referralDepth: integer("referral_depth").notNull(),
	feeTier: numeric("fee_tier", { precision: 5, scale: 4 }).notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),

	// 3. Direct referrals list and count
	directReferrals: jsonb("direct_referrals"),
	directReferralCount: integer("direct_referral_count"),

	// 4. Commission balances (unclaimed)
	unclaimedCommissionBalance: jsonb("unclaimed_commission_balance"),
	totalUnclaimedCommissions: numeric("total_unclaimed_commissions"),
	unclaimedCashbackBalance: jsonb("unclaimed_cashback_balance"),
	totalUnclaimedCashback: numeric("total_unclaimed_cashback"),

	// 5. Claimed amount history
	claimedCommissionHistory: jsonb("claimed_commission_history"),
	totalClaimedCommissions: numeric("total_claimed_commissions"),
	claimedCashbackHistory: jsonb("claimed_cashback_history"),
	totalClaimedCashback: numeric("total_claimed_cashback"),

	// 6. Timestamp data for actions
	lastCommissionClaimAt: timestamp("last_commission_claim_at"),
	lastCashbackClaimAt: timestamp("last_cashback_claim_at"),
	lastTradeAt: timestamp("last_trade_at"),
}).as(sql`
	SELECT
		u.id,
		u.name,
		u.email,
		u.referral_code,
		u.referrer_id,
		u.referral_depth,
		u.fee_tier,
		u.created_at,
		u.updated_at,

		-- 3. List of direct referrals (as JSON array)
		COALESCE(
			(SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
				'id', ref.id,
				'name', ref.name,
				'email', ref.email,
				'joinedAt', ref.created_at
			))
			FROM "user" ref
			WHERE ref.referrer_id = u.id),
			'[]'::jsonb
		) as direct_referrals,

		(SELECT COUNT(*)::integer FROM "user" ref WHERE ref.referrer_id = u.id) as direct_referral_count,

		-- 4. Commission balance by token type (unclaimed)
		COALESCE(
			(SELECT JSONB_OBJECT_AGG(token_type, total_amount)
			FROM (
				SELECT token_type, SUM(amount::numeric) as total_amount
				FROM commissions
				WHERE user_id = u.id AND claimed = false
				GROUP BY token_type
			) comm_by_token),
			'{}'::jsonb
		) as unclaimed_commission_balance,

		COALESCE(
			(SELECT SUM(amount::numeric) FROM commissions WHERE user_id = u.id AND claimed = false),
			0
		) as total_unclaimed_commissions,

		-- 4. Cashback balance by token type (unclaimed)
		COALESCE(
			(SELECT JSONB_OBJECT_AGG(token_type, total_amount)
			FROM (
				SELECT token_type, SUM(amount::numeric) as total_amount
				FROM cashback
				WHERE user_id = u.id AND claimed = false
				GROUP BY token_type
			) cash_by_token),
			'{}'::jsonb
		) as unclaimed_cashback_balance,

		COALESCE(
			(SELECT SUM(amount::numeric) FROM cashback WHERE user_id = u.id AND claimed = false),
			0
		) as total_unclaimed_cashback,

		-- 5. Claimed amount history by token type
		COALESCE(
			(SELECT JSONB_OBJECT_AGG(token_type, total_claimed)
			FROM (
				SELECT token_type, SUM(amount::numeric) as total_claimed
				FROM commissions
				WHERE user_id = u.id AND claimed = true
				GROUP BY token_type
			) claimed_by_token),
			'{}'::jsonb
		) as claimed_commission_history,

		COALESCE(
			(SELECT SUM(amount::numeric) FROM commissions WHERE user_id = u.id AND claimed = true),
			0
		) as total_claimed_commissions,

		COALESCE(
			(SELECT JSONB_OBJECT_AGG(token_type, total_claimed)
			FROM (
				SELECT token_type, SUM(amount::numeric) as total_claimed
				FROM cashback
				WHERE user_id = u.id AND claimed = true
				GROUP BY token_type
			) claimed_cash_by_token),
			'{}'::jsonb
		) as claimed_cashback_history,

		COALESCE(
			(SELECT SUM(amount::numeric) FROM cashback WHERE user_id = u.id AND claimed = true),
			0
		) as total_claimed_cashback,

		-- 6. Timestamp data for all actions
		(SELECT MAX(claimed_at) FROM commissions WHERE user_id = u.id AND claimed = true) as last_commission_claim_at,
		(SELECT MAX(claimed_at) FROM cashback WHERE user_id = u.id AND claimed = true) as last_cashback_claim_at,
		(SELECT MAX(created_at) FROM trades WHERE user_id = u.id) as last_trade_at

	FROM "user" u
`);
