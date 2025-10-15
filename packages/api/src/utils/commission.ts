import { Decimal, decimal, sum } from './decimal';
import { db } from '@takehome/db';
import { user, commissions, cashback, treasuryAllocation, xpBalance, processedTrades } from '@takehome/db';
import { eq, sql } from 'drizzle-orm';

// Commission rates
export const COMMISSION_RATES = {
	LEVEL_1: decimal('0.30'), // 30%
	LEVEL_2: decimal('0.03'), // 3%
	LEVEL_3: decimal('0.02'), // 2%
	CASHBACK: decimal('0.10'), // 10%
	TREASURY: decimal('0.55'), // 55%
} as const;

// Get upline chain (up to 3 levels) for a user
export async function getUplineChain(userId: string) {
	const result = await db.execute<{ id: string; level: number }>(sql`
		WITH RECURSIVE upline AS (
			SELECT id, referrer_id, referral_depth, 0 as level
			FROM "user"
			WHERE id = ${userId}

			UNION ALL

			SELECT u.id, u.referrer_id, u.referral_depth, up.level + 1
			FROM "user" u
			INNER JOIN upline up ON u.id = up.referrer_id
			WHERE up.level < 3
		)
		SELECT id, level FROM upline WHERE level > 0 ORDER BY level
	`);

	return result.rows;
}

// Calculate commission breakdown for a trade
export function calculateCommissionBreakdown(feeAmount: string | Decimal) {
	const fee = decimal(feeAmount);

	return {
		cashback: fee.times(COMMISSION_RATES.CASHBACK),
		level1: fee.times(COMMISSION_RATES.LEVEL_1),
		level2: fee.times(COMMISSION_RATES.LEVEL_2),
		level3: fee.times(COMMISSION_RATES.LEVEL_3),
		treasury: fee.times(COMMISSION_RATES.TREASURY),
	};
}

// Validate that commission breakdown sums to original fee
export function validateCommissionSum(
	feeAmount: string | Decimal,
	breakdown: ReturnType<typeof calculateCommissionBreakdown>
): boolean {
	const fee = decimal(feeAmount);
	const total = sum(
		breakdown.cashback,
		breakdown.level1,
		breakdown.level2,
		breakdown.level3,
		breakdown.treasury
	);
	return total.equals(fee);
}

// Generate unique ID for records
export function generateId(): string {
	return crypto.randomUUID();
}
