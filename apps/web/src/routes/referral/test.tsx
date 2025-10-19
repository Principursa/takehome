import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/referral/test")({
  component: TestRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function TestRoute() {
  const [tradeVolume, setTradeVolume] = useState("1000");
  const [feeTier, setFeeTier] = useState("0.01");
  const [tokenType, setTokenType] = useState<"USDC-ARBITRUM" | "USDC-SOLANA">(
    "USDC-ARBITRUM"
  );

  // Create trade mutation
  const createTradeMutation = useMutation(
    trpc.webhook.trade.mutationOptions({
      onSuccess: (data) => {
        toast.success("Trade created successfully!", {
          description: `Fee: $${data.feeAmount} | Commissions: ${data.commissions.length} | Cashback: $${data.cashback.amount}`,
        });
      },
      onError: (error) => {
        toast.error("Failed to create trade", {
          description: error.message,
        });
      },
    })
  );

  const handleCreateTrade = () => {
    if (!tradeVolume || parseFloat(tradeVolume) <= 0) {
      toast.error("Invalid trade volume");
      return;
    }

    createTradeMutation.mutate({
      volume: tradeVolume,
      feeTier: feeTier,
      tokenType: tokenType,
    });
  };

  const quickTradeAmounts = [
    { label: "$100", volume: "100" },
    { label: "$500", volume: "500" },
    { label: "$1,000", volume: "1000" },
    { label: "$5,000", volume: "5000" },
    { label: "$10,000", volume: "10000" },
  ];

  const feeAmount = parseFloat(tradeVolume || "0") * parseFloat(feeTier);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Test Trade</h1>
        <p className="text-muted-foreground">
          Simulate trades to test commission distribution
        </p>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
          ⚠️ Testing Mode: These trades are for testing purposes only
        </p>
      </div>

      {/* Create Trade Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mock Trade
          </CardTitle>
          <CardDescription>
            Create a simulated trade to trigger commission payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade Volume */}
          <div className="space-y-2">
            <Label htmlFor="volume">Trade Volume (USD)</Label>
            <Input
              id="volume"
              type="number"
              value={tradeVolume}
              onChange={(e) => setTradeVolume(e.target.value)}
              placeholder="1000"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Fee: ${feeAmount.toFixed(2)} ({(parseFloat(feeTier) * 100).toFixed(2)}%)
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label>Quick Amounts</Label>
            <div className="flex flex-wrap gap-2">
              {quickTradeAmounts.map((amount) => (
                <Button
                  key={amount.volume}
                  variant="outline"
                  size="sm"
                  onClick={() => setTradeVolume(amount.volume)}
                >
                  {amount.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Fee Tier Buttons */}
          <div className="space-y-2">
            <Label>Fee Tier</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "0.1%", value: "0.001" },
                { label: "0.5%", value: "0.005" },
                { label: "1%", value: "0.01" },
                { label: "2%", value: "0.02" },
                { label: "5%", value: "0.05" },
              ].map((tier) => (
                <Button
                  key={tier.value}
                  variant={feeTier === tier.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeeTier(tier.value)}
                >
                  {tier.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Token Type Buttons */}
          <div className="space-y-2">
            <Label>Token Type</Label>
            <div className="flex gap-2">
              <Button
                variant={tokenType === "USDC-ARBITRUM" ? "default" : "outline"}
                onClick={() => setTokenType("USDC-ARBITRUM")}
                className="flex-1"
              >
                USDC (Arbitrum)
              </Button>
              <Button
                variant={tokenType === "USDC-SOLANA" ? "default" : "outline"}
                onClick={() => setTokenType("USDC-SOLANA")}
                className="flex-1"
              >
                USDC (Solana)
              </Button>
            </div>
          </div>

          {/* Create Trade Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateTrade}
            disabled={createTradeMutation.isPending}
          >
            {createTradeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Trade...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Create Trade (${feeAmount.toFixed(2)} fee)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdown</CardTitle>
          <CardDescription>How the ${feeAmount.toFixed(2)} fee will be distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Your Cashback (10%)</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                ${(feeAmount * 0.1).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Level 1 Commission (30%)</span>
              <span className="font-medium">${(feeAmount * 0.3).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Level 2 Commission (3%)</span>
              <span className="font-medium">${(feeAmount * 0.03).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Level 3 Commission (2%)</span>
              <span className="font-medium">${(feeAmount * 0.02).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm">Treasury (55% + unclaimed)</span>
              <span className="font-medium text-muted-foreground">
                ${(feeAmount * 0.55).toFixed(2)}+
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
