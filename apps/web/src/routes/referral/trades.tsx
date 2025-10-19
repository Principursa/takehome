import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, AlertCircle, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/referral/trades")({
  component: TradesRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

interface Trade {
  id: string;
  volume: string;
  feeAmount: string;
  feeTier: string;
  tokenType: string;
  createdAt: Date;
  processedForCommissions: boolean;
}

interface Commission {
  id: string;
  amount: string;
  level: number;
  userId: string;
  claimed: boolean;
  claimedAt: Date | null;
  user?: {
    name: string | null;
    email: string;
  };
}

interface Cashback {
  id: string;
  amount: string;
  claimed: boolean;
  claimedAt: Date | null;
}

function TradesRoute() {
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());

  const {
    data: tradesData,
    isLoading,
    error,
  } = useQuery(
    trpc.referral.trades.queryOptions({
      limit: 50,
      offset: 0,
    })
  );

  const toggleTrade = (tradeId: string) => {
    const newExpanded = new Set(expandedTrades);
    if (newExpanded.has(tradeId)) {
      newExpanded.delete(tradeId);
    } else {
      newExpanded.add(tradeId);
    }
    setExpandedTrades(newExpanded);
  };

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
            <h2 className="text-xl font-semibold">Failed to load trades</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const trades = tradesData?.trades || [];

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Trade History</h1>
        <p className="text-muted-foreground">
          View all your trades and their commission breakdowns
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${trades.reduce((sum, t) => sum + parseFloat(t.volume), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Fees Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${trades.reduce((sum, t) => sum + parseFloat(t.feeAmount), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cashback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              $
              {trades
                .reduce((sum, t) => sum + parseFloat(t.cashback?.amount || "0"), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No trades yet. Create your first trade to see it here!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => {
            const isExpanded = expandedTrades.has(trade.id);
            const totalCommissions = trade.commissions.reduce(
              (sum, c) => sum + parseFloat(c.amount),
              0
            );

            return (
              <Card key={trade.id}>
                <CardContent className="p-0">
                  {/* Trade Summary - Always Visible */}
                  <button
                    onClick={() => toggleTrade(trade.id)}
                    className="w-full p-6 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              ${parseFloat(trade.volume).toLocaleString()}
                            </span>
                          </div>
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                            {trade.tokenType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(trade.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Fee: </span>
                            <span className="font-medium">
                              ${parseFloat(trade.feeAmount).toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              ({(parseFloat(trade.feeTier) * 100).toFixed(2)}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cashback: </span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              ${parseFloat(trade.cashback?.amount || "0").toFixed(2)}
                            </span>
                          </div>
                          {trade.commissions.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">
                                Commissions:{" "}
                              </span>
                              <span className="font-medium">
                                ${totalCommissions.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-6">
                      <div className="space-y-6">
                        {/* Trade Details */}
                        <div>
                          <h4 className="mb-3 font-semibold">Trade Details</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="text-xs text-muted-foreground">
                                Trade ID
                              </p>
                              <p className="font-mono text-sm">{trade.id}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="text-xs text-muted-foreground">
                                Timestamp
                              </p>
                              <p className="text-sm">
                                {new Date(trade.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="text-xs text-muted-foreground">Volume</p>
                              <p className="text-sm font-medium">
                                ${parseFloat(trade.volume).toLocaleString()}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="text-xs text-muted-foreground">
                                Fee Tier
                              </p>
                              <p className="text-sm font-medium">
                                {(parseFloat(trade.feeTier) * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Commission Breakdown */}
                        <div>
                          <h4 className="mb-3 font-semibold">
                            Commission Distribution
                          </h4>
                          <div className="space-y-2">
                            {/* Cashback */}
                            {trade.cashback && (
                              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    Your Cashback (10%)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {trade.cashback.claimed
                                      ? `Claimed on ${new Date(trade.cashback.claimedAt!).toLocaleDateString()}`
                                      : "Pending claim"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    ${parseFloat(trade.cashback.amount).toFixed(2)}
                                  </p>
                                  {!trade.cashback.claimed && (
                                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                                      Unclaimed
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Commissions to Referrers */}
                            {trade.commissions.map((commission) => (
                              <div
                                key={commission.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    Level {commission.level} Commission (
                                    {commission.level === 1
                                      ? "30%"
                                      : commission.level === 2
                                        ? "3%"
                                        : "2%"}
                                    )
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {commission.user?.name ||
                                      commission.user?.email ||
                                      `User ${commission.userId.slice(0, 8)}...`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold">
                                    ${parseFloat(commission.amount).toFixed(2)}
                                  </p>
                                  {commission.claimed ? (
                                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                                      Claimed
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                                      Unclaimed
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Treasury */}
                            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                              <div>
                                <p className="text-sm font-medium">
                                  Treasury Allocation
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  55% base + unclaimed commissions
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  ${parseFloat(trade.treasury.amount).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Total Verification */}
                            <div className="mt-4 flex items-center justify-between rounded-lg border-2 border-dashed border-border bg-muted/50 p-3">
                              <p className="font-semibold">Total Fee</p>
                              <p className="text-lg font-bold">
                                ${parseFloat(trade.feeAmount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
