import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft, TrendingUp, Coins } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { EarningsPanel } from "@/components/EarningsPanel";
import { ClaimButton } from "@/components/ClaimButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/referral/earnings")({
  component: EarningsRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function EarningsRoute() {
  // Fetch earnings
  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError,
  } = useQuery(trpc.referral.getEarnings.queryOptions({ tokenType: "USDC-ARBITRUM" }));

  // Fetch earnings history
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery(
    trpc.referral.getEarningsHistory.queryOptions({
      tokenType: "USDC-ARBITRUM",
      limit: 50,
    }),
  );

  // Fetch claimable
  const {
    data: claimableData,
    isLoading: claimableLoading,
    refetch: refetchClaimable,
  } = useQuery(trpc.referral.getClaimable.queryOptions());

  // Claim mutation
  const claimMutation = useMutation(
    trpc.referral.claimAll.mutationOptions({
      onSuccess: () => {
        refetchClaimable();
      },
    }),
  );

  const handleClaim = async (tokenType: string) => {
    await claimMutation.mutateAsync({ tokenType });
  };

  const isLoading = earningsLoading || historyLoading || claimableLoading;
  const error = earningsError || historyError;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Failed to load earnings data</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header with Back Button */}
      <div className="space-y-4">
        <Link to="/referral">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
          <p className="text-muted-foreground">
            Track your commissions, cashback, and claim your earnings
          </p>
        </div>
      </div>

      {/* Earnings Summary */}
      {earningsData?.summary && (
        <EarningsPanel
          earnings={{
            totalCommissions: earningsData.summary.totalCommissions || "0",
            totalCashback: earningsData.summary.totalCashback || "0",
            unclaimedCommissions: earningsData.summary.unclaimedCommissions || "0",
            unclaimedCashback: earningsData.summary.unclaimedCashback || "0",
            byLevel: (earningsData.byLevel || []).map((l) => ({
              level: l.level,
              amount: l.total || "0",
              claimed: l.claimed || "0",
              unclaimed: l.unclaimed || "0",
            })),
          }}
          tokenType="USDC-ARBITRUM"
        />
      )}

      {/* Claim Section */}
      {claimableData && (
        <ClaimButton claimable={claimableData} onClaim={handleClaim} />
      )}

      {/* Earnings History */}
      {historyData?.history && historyData.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>
              Recent commissions and cashback transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historyData.history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-full p-2 ${
                        item.type === "commission"
                          ? "bg-blue-500/10"
                          : "bg-green-500/10"
                      }`}
                    >
                      {item.type === "commission" ? (
                        <Coins className="h-4 w-4 text-blue-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.type === "commission"
                            ? `Level ${item.level} Commission`
                            : "Cashback"}
                        </span>
                        {item.claimed ? (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                            Claimed
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Trade #{item.tradeId} •{" "}
                        {new Date(item.createdAt).toLocaleString()}
                        {item.claimed && item.claimedAt && (
                          <span>
                            {" "}
                            • Claimed{" "}
                            {new Date(item.claimedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${parseFloat(item.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.tokenType}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {historyData.hasMore && (
              <div className="mt-4 text-center">
                <Button variant="outline">Load More</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {historyData?.history && historyData.history.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>
              Your earnings transactions will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No earnings yet. Start trading or refer friends to earn
                commissions!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
