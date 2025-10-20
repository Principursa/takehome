import { protectedProcedure, publicProcedure, router } from "../index";
import { referralRouter } from "./referral";
import { webhookRouter } from "./webhook";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	referral: referralRouter,
	webhook: webhookRouter,
});
export type AppRouter = typeof appRouter;
