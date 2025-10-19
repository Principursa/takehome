import { router, protectedProcedure } from "../index";
import { z } from "zod";
import { db } from "@takehome/db";
import { eq } from "drizzle-orm";

export const webhookRouter = router({
	// POST /api/webhook/trade - Simulate trading activity and distribute commissions
	trade: protectedProcedure
		.input(
			z.object({
				volume: z.string().regex(/^\d+(\.\d+)?$/),
				feeTier: z.string().regex(/^\d+(\.\d+)?$/),
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
				try {
					const volume = decimal(input.volume);
					const feeTier = decimal(input.feeTier);
					const feeAmount = volume.times(feeTier);

					// Create trade record
					const tradeId = crypto.randomUUID();
					await tx.insert(trades).values({
						id: tradeId,
						userId,
						volume: toDecimalString(volume),
						feeAmount: toDecimalString(feeAmount),
						feeTier: input.feeTier,
						tokenType: input.tokenType,
						processedForCommissions: false,
						createdAt: new Date(),
					});

					// Calculate commission breakdown
					const breakdown = await calculateCommissions(userId, feeAmount, input.tokenType);

					console.log('Commission breakdown:', breakdown);

					// Insert commissions for upline
					if (breakdown?.commissions && breakdown.commissions.length > 0) {
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
					if (breakdown?.cashback) {
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
					if (breakdown?.treasury) {
						await tx.insert(treasuryAllocation).values({
							id: breakdown.treasury.id,
							tradeId,
							amount: breakdown.treasury.amount,
							tokenType: input.tokenType,
							createdAt: new Date(),
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
							commissions: breakdown?.commissions?.map((c) => ({
								userId: c.userId,
								level: c.level,
								amount: c.amount,
							})) || [],
							cashback: breakdown?.cashback?.amount || '0',
							treasury: breakdown?.treasury?.amount || '0',
							total: breakdown?.total || '0',
						},
						commissions: breakdown?.commissions || [],
						cashback: breakdown?.cashback || { id: '', amount: '0' },
					};
				} catch (error) {
					console.error('Error in webhook.trade:', error);
					throw error;
				}
			});
		}),
});
