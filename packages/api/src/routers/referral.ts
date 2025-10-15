import { router, protectedProcedure, publicProcedure } from "../index";
import { z } from "zod";
import { db, user } from "@takehome/db";
import { eq, sql, and } from "drizzle-orm";
import { generateReferralCode, normalizeReferralCode, isValidReferralCodeFormat } from "../utils/referral-code";
import { TRPCError } from "@trpc/server";

export const referralRouter = router({
	// User Story 1: Code generation and registration

	// T023: Generate unique referral code for authenticated user
	generate: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		// Check if user already has a referral code (idempotency)
		const existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: {
				referralCode: true,
			},
		});

		if (existingUser?.referralCode) {
			return {
				code: existingUser.referralCode,
				alreadyExists: true,
			};
		}

		// Generate unique code with retry logic
		let attempts = 0;
		const maxAttempts = 10;

		while (attempts < maxAttempts) {
			const code = generateReferralCode();

			try {
				// Attempt to update user with unique code
				await db
					.update(user)
					.set({
						referralCode: code,
						updatedAt: new Date(),
					})
					.where(and(eq(user.id, userId), sql`${user.referralCode} IS NULL`));

				// Verify the update succeeded
				const updatedUser = await db.query.user.findFirst({
					where: eq(user.id, userId),
					columns: {
						referralCode: true,
					},
				});

				if (updatedUser?.referralCode === code) {
					return {
						code,
						alreadyExists: false,
					};
				}

				// If code is different, another process might have set it
				if (updatedUser?.referralCode) {
					return {
						code: updatedUser.referralCode,
						alreadyExists: true,
					};
				}
			} catch (error: any) {
				// Handle unique constraint violation
				if (error.code === '23505') {
					attempts++;
					continue;
				}
				throw error;
			}

			attempts++;
		}

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to generate unique referral code after multiple attempts",
		});
	}),

	// T024: Get authenticated user's referral code and stats
	getMyCode: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const userData = await db.query.user.findFirst({
			where: eq(user.id, userId),
			columns: {
				referralCode: true,
			},
		});

		if (!userData?.referralCode) {
			return {
				code: null,
				referralCount: 0,
				shareUrl: null,
			};
		}

		// Count direct referrals
		const referralCountResult = await db.execute<{ count: string }>(
			sql`SELECT COUNT(*) as count FROM "user" WHERE referrer_id = ${userId}`
		);
		const referralCount = parseInt(referralCountResult.rows[0]?.count || "0", 10);

		// Generate share URL (frontend will handle the full URL)
		const shareUrl = `/register?ref=${userData.referralCode}`;

		return {
			code: userData.referralCode,
			referralCount,
			shareUrl,
		};
	}),

	// T025: Validate referral code (public endpoint for registration)
	validateCode: publicProcedure
		.input(
			z.object({
				code: z.string().min(1).max(20),
			})
		)
		.query(async ({ input }) => {
			const normalizedCode = normalizeReferralCode(input.code);

			// Validate format
			if (!isValidReferralCodeFormat(normalizedCode)) {
				return {
					valid: false,
					error: "Invalid referral code format",
				};
			}

			// Check if code exists
			const referrer = await db.query.user.findFirst({
				where: eq(user.referralCode, normalizedCode),
				columns: {
					id: true,
					name: true,
					referralDepth: true,
				},
			});

			if (!referrer) {
				return {
					valid: false,
					error: "Referral code not found",
				};
			}

			// Check if referrer is at max depth (level 3)
			if (referrer.referralDepth >= 3) {
				return {
					valid: false,
					error: "Referral code is at maximum depth",
				};
			}

			return {
				valid: true,
				referrer: {
					id: referrer.id,
					name: referrer.name,
				},
			};
		}),

	// T026: Register user with referral code
	register: protectedProcedure
		.input(
			z.object({
				referralCode: z.string().min(1).max(20),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const normalizedCode = normalizeReferralCode(input.referralCode);

			// Get current user
			const currentUser = await db.query.user.findFirst({
				where: eq(user.id, userId),
				columns: {
					id: true,
					referrerId: true,
					referralCode: true,
				},
			});

			if (!currentUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			// Check if user already has a referrer
			if (currentUser.referrerId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User already has a referrer",
				});
			}

			// Validate referral code format
			if (!isValidReferralCodeFormat(normalizedCode)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid referral code format",
				});
			}

			// Find referrer
			const referrer = await db.query.user.findFirst({
				where: eq(user.referralCode, normalizedCode),
				columns: {
					id: true,
					name: true,
					referralDepth: true,
				},
			});

			if (!referrer) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Referral code not found",
				});
			}

			// Prevent self-referral
			if (referrer.id === userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot use your own referral code",
				});
			}

			// Check max depth
			if (referrer.referralDepth >= 3) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Referral code is at maximum depth",
				});
			}

			// Prevent circular references - check if referrer is in user's downline
			if (currentUser.referralCode) {
				const circularCheck = await db.execute<{ id: string }>(sql`
					WITH RECURSIVE downline AS (
						SELECT id, referrer_id
						FROM "user"
						WHERE id = ${userId}
						UNION ALL
						SELECT u.id, u.referrer_id
						FROM "user" u
						INNER JOIN downline d ON u.referrer_id = d.id
					)
					SELECT id FROM downline WHERE id = ${referrer.id}
				`);

				if (circularCheck.rows.length > 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot create circular referral relationship",
					});
				}
			}

			// Update user with referrer
			await db
				.update(user)
				.set({
					referrerId: referrer.id,
					referralDepth: referrer.referralDepth + 1,
					updatedAt: new Date(),
				})
				.where(eq(user.id, userId));

			return {
				success: true,
				referrer: {
					id: referrer.id,
					name: referrer.name,
				},
			};
		}),

	// User Story 2: Commission earning

	// T034: Record a trade and trigger commission distribution
	recordTrade: protectedProcedure
		.input(
			z.object({
				volume: z.string().regex(/^\d+(\.\d+)?$/),
				tokenType: z.enum(["USDC-ARBITRUM", "USDC-SOLANA"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { withSerializableTransaction } = await import("../utils/transaction");
			const { decimal, toDecimalString } = await import("../utils/decimal");
			const { calculateCommissions } = await import("../utils/commission");
			const { trades, commissions, cashback, treasuryAllocation, xpBalance, processedTrades } = await import("@takehome/db");

			const userId = ctx.session.user.id;

			return await withSerializableTransaction(async (tx) => {
				// Get user's fee tier
				const userData = await tx.query.user.findFirst({
					where: eq(user.id, userId),
					columns: {
						feeTier: true,
					},
				});

				if (!userData) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "User not found",
					});
				}

				const volume = decimal(input.volume);
				const feeTier = decimal(userData.feeTier);
				const feeAmount = volume.times(feeTier);

				// Create trade record
				const tradeId = crypto.randomUUID();
				await tx.insert(trades).values({
					id: tradeId,
					userId,
					volume: toDecimalString(volume),
					feeAmount: toDecimalString(feeAmount),
					feeTier: userData.feeTier,
					tokenType: input.tokenType,
					processedForCommissions: false,
					createdAt: new Date(),
				});

				// Calculate commission breakdown
				const breakdown = await calculateCommissions(userId, feeAmount, input.tokenType);

				// Insert commissions for upline
				if (breakdown.commissions.length > 0) {
					await tx.insert(commissions).values(
						breakdown.commissions.map((c) => ({
							id: c.id,
							userId: c.userId,
							tradeId,
							amount: c.amount,
							level: c.level,
							tokenType: input.tokenType,
							claimed: false,
							createdAt: new Date(),
						}))
					);
				}

				// Insert cashback for trader
				if (breakdown.cashback) {
					await tx.insert(cashback).values({
						id: breakdown.cashback.id,
						userId,
						tradeId,
						amount: breakdown.cashback.amount,
						tokenType: input.tokenType,
						claimed: false,
						createdAt: new Date(),
					});
				}

				// Insert treasury allocation
				if (breakdown.treasury) {
					await tx.insert(treasuryAllocation).values({
						id: breakdown.treasury.id,
						tradeId,
						amount: breakdown.treasury.amount,
						tokenType: input.tokenType,
						allocatedAt: new Date(),
					});
				}

				// Mark trade as processed
				await tx
					.update(trades)
					.set({ processedForCommissions: true })
					.where(eq(trades.id, tradeId));

				// Create processed trade record for idempotency
				await tx.insert(processedTrades).values({
					tradeId,
					processedAt: new Date(),
				});

				return {
					tradeId,
					feeAmount: toDecimalString(feeAmount),
					breakdown: {
						commissions: breakdown.commissions.map((c) => ({
							userId: c.userId,
							level: c.level,
							amount: c.amount,
						})),
						cashback: breakdown.cashback?.amount,
						treasury: breakdown.treasury?.amount,
						total: breakdown.total,
					},
				};
			});
		}),

	// User Story 3: Network viewing

	// Get user's referral network (direct referrals and stats)
	getNetwork: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		// Get direct referrals
		const directReferrals = await db.query.user.findMany({
			where: eq(user.referrerId, userId),
			columns: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				referralDepth: true,
			},
		});

		// Get count of indirect referrals (Level 2)
		const level2Count = await db.execute<{ count: string }>(sql`
			SELECT COUNT(*) as count
			FROM "user" u
			WHERE u.referrer_id IN (
				SELECT id FROM "user" WHERE referrer_id = ${userId}
			)
		`);

		// Get count of Level 3 referrals
		const level3Count = await db.execute<{ count: string }>(sql`
			SELECT COUNT(*) as count
			FROM "user" u
			WHERE u.referrer_id IN (
				SELECT id FROM "user" u2
				WHERE u2.referrer_id IN (
					SELECT id FROM "user" WHERE referrer_id = ${userId}
				)
			)
		`);

		return {
			direct: directReferrals.map((r) => ({
				id: r.id,
				name: r.name,
				email: r.email,
				joinedAt: r.createdAt,
				depth: r.referralDepth,
			})),
			stats: {
				level1Count: directReferrals.length,
				level2Count: parseInt(level2Count.rows[0]?.count || "0", 10),
				level3Count: parseInt(level3Count.rows[0]?.count || "0", 10),
				totalNetwork:
					directReferrals.length +
					parseInt(level2Count.rows[0]?.count || "0", 10) +
					parseInt(level3Count.rows[0]?.count || "0", 10),
			},
		};
	}),

	// Get detailed downline tree (recursive query)
	getDownlineTree: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const downlineResult = await db.execute<{
			id: string;
			name: string;
			email: string;
			referrer_id: string;
			referral_depth: number;
			created_at: string;
		}>(sql`
			WITH RECURSIVE downline AS (
				SELECT id, name, email, referrer_id, referral_depth, created_at, 1 as level
				FROM "user"
				WHERE referrer_id = ${userId}

				UNION ALL

				SELECT u.id, u.name, u.email, u.referrer_id, u.referral_depth, u.created_at, d.level + 1
				FROM "user" u
				INNER JOIN downline d ON u.referrer_id = d.id
				WHERE d.level < 3
			)
			SELECT id, name, email, referrer_id, referral_depth, created_at
			FROM downline
			ORDER BY referral_depth, created_at
		`);

		return downlineResult.rows.map((row) => ({
			id: row.id,
			name: row.name,
			email: row.email,
			referrerId: row.referrer_id,
			depth: row.referral_depth,
			joinedAt: row.created_at,
		}));
	}),

	// User Story 4: Earnings dashboard

	// Get earnings summary for authenticated user
	getEarnings: protectedProcedure
		.input(
			z
				.object({
					tokenType: z.enum(["USDC-ARBITRUM", "USDC-SOLANA"]).optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const { commissions, cashback } = await import("@takehome/db");
			const { decimal, sum } = await import("../utils/decimal");
			const userId = ctx.session.user.id;

			// Build where clause
			const whereConditions = [eq(commissions.userId, userId)];
			if (input?.tokenType) {
				whereConditions.push(eq(commissions.tokenType, input.tokenType));
			}

			// Get all commissions
			const userCommissions = await db.query.commissions.findMany({
				where: and(...whereConditions),
				columns: {
					id: true,
					amount: true,
					level: true,
					tokenType: true,
					claimed: true,
					claimedAt: true,
					createdAt: true,
				},
			});

			// Get cashback
			const cashbackWhereConditions = [eq(cashback.userId, userId)];
			if (input?.tokenType) {
				cashbackWhereConditions.push(eq(cashback.tokenType, input.tokenType));
			}

			const userCashback = await db.query.cashback.findMany({
				where: and(...cashbackWhereConditions),
				columns: {
					id: true,
					amount: true,
					tokenType: true,
					claimed: true,
					claimedAt: true,
					createdAt: true,
				},
			});

			// Calculate totals by token type and claim status
			const earnings = {
				commissions: {
					total: "0",
					claimed: "0",
					unclaimed: "0",
					byLevel: {
						level1: "0",
						level2: "0",
						level3: "0",
					},
					byToken: {} as Record<string, { total: string; claimed: string; unclaimed: string }>,
				},
				cashback: {
					total: "0",
					claimed: "0",
					unclaimed: "0",
					byToken: {} as Record<string, { total: string; claimed: string; unclaimed: string }>,
				},
			};

			// Process commissions
			userCommissions.forEach((c) => {
				const amount = decimal(c.amount);
				earnings.commissions.total = sum(decimal(earnings.commissions.total), amount).toFixed(18);

				if (c.claimed) {
					earnings.commissions.claimed = sum(decimal(earnings.commissions.claimed), amount).toFixed(18);
				} else {
					earnings.commissions.unclaimed = sum(decimal(earnings.commissions.unclaimed), amount).toFixed(18);
				}

				// By level
				const levelKey = `level${c.level}` as keyof typeof earnings.commissions.byLevel;
				earnings.commissions.byLevel[levelKey] = sum(
					decimal(earnings.commissions.byLevel[levelKey]),
					amount
				).toFixed(18);

				// By token
				if (!earnings.commissions.byToken[c.tokenType]) {
					earnings.commissions.byToken[c.tokenType] = {
						total: "0",
						claimed: "0",
						unclaimed: "0",
					};
				}
				const tokenStats = earnings.commissions.byToken[c.tokenType];
				tokenStats.total = sum(decimal(tokenStats.total), amount).toFixed(18);
				if (c.claimed) {
					tokenStats.claimed = sum(decimal(tokenStats.claimed), amount).toFixed(18);
				} else {
					tokenStats.unclaimed = sum(decimal(tokenStats.unclaimed), amount).toFixed(18);
				}
			});

			// Process cashback
			userCashback.forEach((cb) => {
				const amount = decimal(cb.amount);
				earnings.cashback.total = sum(decimal(earnings.cashback.total), amount).toFixed(18);

				if (cb.claimed) {
					earnings.cashback.claimed = sum(decimal(earnings.cashback.claimed), amount).toFixed(18);
				} else {
					earnings.cashback.unclaimed = sum(decimal(earnings.cashback.unclaimed), amount).toFixed(18);
				}

				// By token
				if (!earnings.cashback.byToken[cb.tokenType]) {
					earnings.cashback.byToken[cb.tokenType] = {
						total: "0",
						claimed: "0",
						unclaimed: "0",
					};
				}
				const tokenStats = earnings.cashback.byToken[cb.tokenType];
				tokenStats.total = sum(decimal(tokenStats.total), amount).toFixed(18);
				if (cb.claimed) {
					tokenStats.claimed = sum(decimal(tokenStats.claimed), amount).toFixed(18);
				} else {
					tokenStats.unclaimed = sum(decimal(tokenStats.unclaimed), amount).toFixed(18);
				}
			});

			return earnings;
		}),

	// Get earnings history with pagination
	getEarningsHistory: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(50),
				offset: z.number().min(0).default(0),
				tokenType: z.enum(["USDC-ARBITRUM", "USDC-SOLANA"]).optional(),
				type: z.enum(["commission", "cashback", "all"]).default("all"),
			})
		)
		.query(async ({ ctx, input }) => {
			const { commissions, cashback, trades } = await import("@takehome/db");
			const userId = ctx.session.user.id;

			const history: Array<{
				id: string;
				type: "commission" | "cashback";
				amount: string;
				tokenType: string;
				claimed: boolean;
				claimedAt: Date | null;
				createdAt: Date;
				level?: number;
				tradeId?: string;
			}> = [];

			// Fetch commissions
			if (input.type === "commission" || input.type === "all") {
				const whereConditions = [eq(commissions.userId, userId)];
				if (input.tokenType) {
					whereConditions.push(eq(commissions.tokenType, input.tokenType));
				}

				const userCommissions = await db.query.commissions.findMany({
					where: and(...whereConditions),
					limit: input.limit,
					offset: input.offset,
					orderBy: (commissions, { desc }) => [desc(commissions.createdAt)],
				});

				history.push(
					...userCommissions.map((c) => ({
						id: c.id,
						type: "commission" as const,
						amount: c.amount,
						tokenType: c.tokenType,
						claimed: c.claimed,
						claimedAt: c.claimedAt,
						createdAt: c.createdAt,
						level: c.level,
						tradeId: c.tradeId,
					}))
				);
			}

			// Fetch cashback
			if (input.type === "cashback" || input.type === "all") {
				const whereConditions = [eq(cashback.userId, userId)];
				if (input.tokenType) {
					whereConditions.push(eq(cashback.tokenType, input.tokenType));
				}

				const userCashback = await db.query.cashback.findMany({
					where: and(...whereConditions),
					limit: input.limit,
					offset: input.offset,
					orderBy: (cashback, { desc }) => [desc(cashback.createdAt)],
				});

				history.push(
					...userCashback.map((cb) => ({
						id: cb.id,
						type: "cashback" as const,
						amount: cb.amount,
						tokenType: cb.tokenType,
						claimed: cb.claimed,
						claimedAt: cb.claimedAt,
						createdAt: cb.createdAt,
						tradeId: cb.tradeId,
					}))
				);
			}

			// Sort by createdAt desc
			history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			return {
				items: history.slice(0, input.limit),
				hasMore: history.length > input.limit,
			};
		}),

	// User Story 5: Claiming interface
});
