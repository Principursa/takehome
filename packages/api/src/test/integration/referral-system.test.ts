import { describe, test, expect, beforeEach } from "bun:test";
import { getTestDb, createTestUser, cleanupDatabase } from "../test-setup";
import { user, trades, commissions, cashback, treasuryAllocation } from "@takehome/db";
import { eq, sql } from "drizzle-orm";
import { calculateCommissions, getUplineChain } from "../../utils/commission";
import { decimal } from "../../utils/decimal";
import { generateReferralCode, normalizeReferralCode, isValidReferralCodeFormat } from "../../utils/referral-code";

describe("Referral System - Integration Tests", () => {
	let db: ReturnType<typeof getTestDb>;

	beforeEach(async () => {
		db = getTestDb();
		await cleanupDatabase();
	});

	describe("Critical Path: User Registration with Referral Code", () => {
		beforeEach(async () => {
			await createTestUser({
				id: "referrer1",
				email: "referrer@test.com",
				name: "Referrer User",
				referralCode: "REFER123",
				referralDepth: 0,
			});
		});

		test("should register user with valid referral code and correct depth", async () => {
			const newUser = await createTestUser({
				id: "newuser1",
				email: "newuser@test.com",
				name: "New User",
				referrerId: "referrer1",
				referralDepth: 1,
			});

			expect(newUser).toBeDefined();
			expect(newUser.referrerId).toBe("referrer1");
			expect(newUser.referralDepth).toBe(1);

			// Verify referrer exists and has correct code
			const referrer = await db.query.user.findFirst({
				where: eq(user.id, "referrer1"),
			});
			expect(referrer?.referralCode).toBe("REFER123");
		});

		test("should correctly track referral chain up to 3 levels", async () => {
			// Level 1
			const level1 = await createTestUser({
				id: "level1",
				email: "level1@test.com",
				referralCode: "LEVEL1",
				referrerId: "referrer1",
				referralDepth: 1,
			});

			// Level 2
			const level2 = await createTestUser({
				id: "level2",
				email: "level2@test.com",
				referralCode: "LEVEL2",
				referrerId: "level1",
				referralDepth: 2,
			});

			// Level 3
			const level3 = await createTestUser({
				id: "level3",
				email: "level3@test.com",
				referralCode: "LEVEL3",
				referrerId: "level2",
				referralDepth: 3,
			});

			// Verify chain
			expect(level1.referralDepth).toBe(1);
			expect(level2.referralDepth).toBe(2);
			expect(level3.referralDepth).toBe(3);

			// Verify upline chain for level3
			const upline = await getUplineChain("level3", db);
			expect(upline.length).toBe(3);
			expect(upline[0].id).toBe("level2");
			expect(upline[1].id).toBe("level1");
			expect(upline[2].id).toBe("referrer1");
		});
	});

	describe("Critical Path: Trade Processing and Commission Distribution", () => {
		beforeEach(async () => {
			// Create 3-level referral chain (bottom-up to satisfy foreign keys)
			await createTestUser({
				id: "level3",
				email: "level3@test.com",
				referralCode: "LEVEL3",
				referralDepth: 0,
			});

			await createTestUser({
				id: "level2",
				email: "level2@test.com",
				referralCode: "LEVEL2",
				referrerId: "level3",
				referralDepth: 1,
			});

			await createTestUser({
				id: "level1",
				email: "level1@test.com",
				referralCode: "LEVEL1",
				referrerId: "level2",
				referralDepth: 2,
			});

			await createTestUser({
				id: "trader",
				email: "trader@test.com",
				referralCode: "TRADER",
				referrerId: "level1",
				referralDepth: 3,
			});
		});

		test("should create trade and distribute commissions to all 3 levels", async () => {
			const tradeVolume = "1000";
			const feeTier = "0.01"; // 1%
			const feeAmount = decimal(tradeVolume).times(decimal(feeTier));
			const tokenType = "USDC-ARBITRUM";

			// Create trade
			const tradeId = crypto.randomUUID();
			await db.insert(trades).values({
				id: tradeId,
				userId: "trader",
				volume: tradeVolume,
				feeAmount: feeAmount.toFixed(18),
				feeTier,
				tokenType,
				processedForCommissions: false,
				createdAt: new Date(),
			});

			// Calculate and distribute commissions
			const breakdown = await calculateCommissions("trader", feeAmount.toFixed(18), tokenType, db);

			// Insert commissions
			if (breakdown.commissions.length > 0) {
				await db.insert(commissions).values(
					breakdown.commissions.map((c) => ({
						id: c.id,
						userId: c.userId,
						tradeId,
						amount: c.amount,
						level: c.level,
						tokenType,
						claimed: false,
						createdAt: new Date(),
					}))
				);
			}

			// Insert cashback
			await db.insert(cashback).values({
				id: breakdown.cashback.id,
				userId: "trader",
				tradeId,
				amount: breakdown.cashback.amount,
				tokenType,
				claimed: false,
				createdAt: new Date(),
			});

			// Insert treasury
			await db.insert(treasuryAllocation).values({
				id: breakdown.treasury.id,
				tradeId,
				amount: breakdown.treasury.amount,
				tokenType,
				createdAt: new Date(),
			});

			// Verify commissions were created correctly
			const allCommissions = await db.query.commissions.findMany({
				where: eq(commissions.tradeId, tradeId),
			});

			expect(allCommissions.length).toBe(3); // 3 levels

			// Verify Level 1 (30% of $10 = $3)
			const level1Commission = allCommissions.find((c) => c.level === 1);
			expect(level1Commission).toBeDefined();
			expect(level1Commission?.userId).toBe("level1");
			expect(parseFloat(level1Commission?.amount || "0")).toBeCloseTo(3.0, 2);

			// Verify Level 2 (3% of $10 = $0.30)
			const level2Commission = allCommissions.find((c) => c.level === 2);
			expect(level2Commission).toBeDefined();
			expect(level2Commission?.userId).toBe("level2");
			expect(parseFloat(level2Commission?.amount || "0")).toBeCloseTo(0.3, 2);

			// Verify Level 3 (2% of $10 = $0.20)
			const level3Commission = allCommissions.find((c) => c.level === 3);
			expect(level3Commission).toBeDefined();
			expect(level3Commission?.userId).toBe("level3");
			expect(parseFloat(level3Commission?.amount || "0")).toBeCloseTo(0.2, 2);

			// Verify cashback (10% of $10 = $1)
			const traderCashback = await db.query.cashback.findFirst({
				where: eq(cashback.tradeId, tradeId),
			});
			expect(traderCashback).toBeDefined();
			expect(traderCashback?.userId).toBe("trader");
			expect(parseFloat(traderCashback?.amount || "0")).toBeCloseTo(1.0, 2);

			// Verify treasury (55% of $10 = $5.50)
			const treasury = await db.query.treasuryAllocation.findFirst({
				where: eq(treasuryAllocation.tradeId, tradeId),
			});
			expect(treasury).toBeDefined();
			expect(parseFloat(treasury?.amount || "0")).toBeCloseTo(5.5, 2);
		});

		test("should allocate unclaimed commissions to treasury when no referrers exist", async () => {
			// Create standalone user with no referrer
			await createTestUser({
				id: "standalone",
				email: "standalone@test.com",
				referralCode: "STANDALONE",
				referralDepth: 0,
			});

			const feeAmount = "100";
			const tokenType = "USDC-ARBITRUM";

			const breakdown = await calculateCommissions("standalone", feeAmount, tokenType, db);

			// Should have no commissions
			expect(breakdown.commissions.length).toBe(0);

			// Cashback should be 10%
			expect(breakdown.cashback.amount).toBe("10.000000000000000000");

			// Treasury should get base 55% + unclaimed 35% (30% + 3% + 2%) = 90%
			expect(breakdown.treasury.amount).toBe("90.000000000000000000");
		});

		test("should handle partial referral chain (only 1 level)", async () => {
			// Create user with only 1 referrer
			await createTestUser({
				id: "solo-referrer",
				email: "solo@test.com",
				referralCode: "SOLO",
				referralDepth: 0,
			});

			await createTestUser({
				id: "single-level-trader",
				email: "single@test.com",
				referrerId: "solo-referrer",
				referralDepth: 1,
			});

			const feeAmount = "100";
			const breakdown = await calculateCommissions("single-level-trader", feeAmount, "USDC-ARBITRUM", db);

			// Should have 1 commission (level 1)
			expect(breakdown.commissions.length).toBe(1);
			expect(breakdown.commissions[0].level).toBe(1);
			expect(breakdown.commissions[0].amount).toBe("30.000000000000000000");

			// Cashback: 10%
			expect(breakdown.cashback.amount).toBe("10.000000000000000000");

			// Treasury: 55% + 3% (L2) + 2% (L3) = 60%
			expect(breakdown.treasury.amount).toBe("60.000000000000000000");
		});
	});

	describe("Critical Path: Commission Claiming", () => {
		beforeEach(async () => {
			// Create users (trader and earner who will receive commissions)
			await createTestUser({
				id: "earner",
				email: "earner@test.com",
				referralCode: "EARNER",
				referralDepth: 0,
			});

			await createTestUser({
				id: "some-trader",
				email: "trader@test.com",
				referralCode: "TRADER",
				referrerId: "earner",
				referralDepth: 1,
			});

			const tradeId = crypto.randomUUID();
			await db.insert(trades).values({
				id: tradeId,
				userId: "some-trader",
				volume: "1000",
				feeAmount: "10",
				feeTier: "0.01",
				tokenType: "USDC-ARBITRUM",
				processedForCommissions: true,
				createdAt: new Date(),
			});

			// Create multiple commissions
			await db.insert(commissions).values([
				{
					id: crypto.randomUUID(),
					userId: "earner",
					tradeId,
					amount: "3.0",
					level: 1,
					tokenType: "USDC-ARBITRUM",
					claimed: false,
					createdAt: new Date(),
				},
				{
					id: crypto.randomUUID(),
					userId: "earner",
					tradeId,
					amount: "1.5",
					level: 1,
					tokenType: "USDC-ARBITRUM",
					claimed: false,
					createdAt: new Date(),
				},
			]);
		});

		test("should retrieve all unclaimed commissions for user", async () => {
			const unclaimed = await db.query.commissions.findMany({
				where: sql`${commissions.userId} = ${"earner"} AND ${commissions.claimed} = ${false}`,
			});

			expect(unclaimed.length).toBe(2);
			expect(unclaimed.every((c) => !c.claimed)).toBe(true);

			const total = unclaimed.reduce((sum, c) => sum + parseFloat(c.amount), 0);
			expect(total).toBe(4.5);
		});

		test("should mark commissions as claimed with timestamp", async () => {
			const unclaimed = await db.query.commissions.findMany({
				where: sql`${commissions.userId} = ${"earner"} AND ${commissions.claimed} = ${false}`,
			});

			const claimDate = new Date();

			// Claim all
			for (const commission of unclaimed) {
				await db
					.update(commissions)
					.set({
						claimed: true,
						claimedAt: claimDate,
					})
					.where(eq(commissions.id, commission.id));
			}

			// Verify claimed
			const claimed = await db.query.commissions.findMany({
				where: eq(commissions.userId, "earner"),
			});

			expect(claimed.every((c) => c.claimed)).toBe(true);
			expect(claimed.every((c) => c.claimedAt !== null)).toBe(true);
		});

		test("should prevent double claiming", async () => {
			const unclaimed = await db.query.commissions.findMany({
				where: sql`${commissions.userId} = ${"earner"} AND ${commissions.claimed} = ${false}`,
			});

			const firstCommission = unclaimed[0];

			// Claim first commission
			await db
				.update(commissions)
				.set({
					claimed: true,
					claimedAt: new Date(),
				})
				.where(eq(commissions.id, firstCommission.id));

			// Try to get unclaimed again
			const stillUnclaimed = await db.query.commissions.findMany({
				where: sql`${commissions.userId} = ${"earner"} AND ${commissions.claimed} = ${false}`,
			});

			// Should only have 1 unclaimed now
			expect(stillUnclaimed.length).toBe(1);
			expect(stillUnclaimed[0].id).not.toBe(firstCommission.id);
		});
	});

	describe("Referral Code Validation", () => {
		test("should generate unique referral codes", () => {
			const codes = new Set();
			for (let i = 0; i < 100; i++) {
				codes.add(generateReferralCode());
			}
			// All 100 should be unique
			expect(codes.size).toBe(100);
		});

		test("should validate referral code format correctly", () => {
			// Valid formats
			expect(isValidReferralCodeFormat("ABC123")).toBe(true);
			expect(isValidReferralCodeFormat("A1B2C3D4")).toBe(true);
			expect(isValidReferralCodeFormat("TEST-CODE")).toBe(true);

			// Invalid formats
			expect(isValidReferralCodeFormat("")).toBe(false);
			expect(isValidReferralCodeFormat("AB")).toBe(false); // Too short
			expect(isValidReferralCodeFormat("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toBe(false); // Too long
			expect(isValidReferralCodeFormat("ABC 123")).toBe(false); // Contains space
			expect(isValidReferralCodeFormat("ABC@123")).toBe(false); // Invalid char
		});

		test("should normalize referral codes consistently", () => {
			expect(normalizeReferralCode("  abc123  ")).toBe("ABC123");
			expect(normalizeReferralCode("abc123")).toBe("ABC123");
			expect(normalizeReferralCode("AbC-123")).toBe("ABC-123");
			expect(normalizeReferralCode("TEST")).toBe("TEST");
		});
	});

	describe("Network Query Performance", () => {
		test("should efficiently retrieve direct referrals", async () => {
			// Create root user
			await createTestUser({
				id: "root",
				email: "root@test.com",
				referralCode: "ROOT",
				referralDepth: 0,
			});

			// Create 10 direct referrals
			for (let i = 0; i < 10; i++) {
				await createTestUser({
					id: `child${i}`,
					email: `child${i}@test.com`,
					referralCode: `CHILD${i}`,
					referrerId: "root",
					referralDepth: 1,
				});
			}

			const directReferrals = await db.query.user.findMany({
				where: eq(user.referrerId, "root"),
			});

			expect(directReferrals.length).toBe(10);
		});

		test("should retrieve recursive network tree efficiently", async () => {
			// Create network: root -> 2 children -> 2 grandchildren each
			await createTestUser({
				id: "root",
				email: "root@test.com",
				referralCode: "ROOT",
				referralDepth: 0,
			});

			// Level 1
			await createTestUser({
				id: "child1",
				email: "child1@test.com",
				referralCode: "CHILD1",
				referrerId: "root",
				referralDepth: 1,
			});

			await createTestUser({
				id: "child2",
				email: "child2@test.com",
				referralCode: "CHILD2",
				referrerId: "root",
				referralDepth: 1,
			});

			// Level 2
			await createTestUser({
				id: "grand1",
				email: "grand1@test.com",
				referralCode: "GRAND1",
				referrerId: "child1",
				referralDepth: 2,
			});

			await createTestUser({
				id: "grand2",
				email: "grand2@test.com",
				referralCode: "GRAND2",
				referrerId: "child1",
				referralDepth: 2,
			});

			await createTestUser({
				id: "grand3",
				email: "grand3@test.com",
				referralCode: "GRAND3",
				referrerId: "child2",
				referralDepth: 2,
			});

			await createTestUser({
				id: "grand4",
				email: "grand4@test.com",
				referralCode: "GRAND4",
				referrerId: "child2",
				referralDepth: 2,
			});

			// Query recursive network
			const networkTree = await db.execute<{ id: string; referral_depth: number }>(sql`
				WITH RECURSIVE downline AS (
					SELECT id, referrer_id, referral_depth
					FROM "user"
					WHERE referrer_id = ${"root"}

					UNION ALL

					SELECT u.id, u.referrer_id, u.referral_depth
					FROM "user" u
					INNER JOIN downline d ON u.referrer_id = d.id
					WHERE d.referral_depth < 3
				)
				SELECT id, referral_depth FROM downline
			`);

			// Should have 2 children + 4 grandchildren = 6 total
			expect(networkTree.rows.length).toBe(6);
		});
	});
});
