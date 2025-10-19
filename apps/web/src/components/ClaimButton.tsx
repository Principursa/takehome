import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ClaimableData {
  commissions: Array<{
    id: string;
    amount: string;
    level: number;
    tokenType: string;
    createdAt: Date;
  }>;
  cashback: Array<{
    id: string;
    amount: string;
    tokenType: string;
    createdAt: Date;
  }>;
  totals: Record<string, {
    commissions: string;
    cashback: string;
    total: string;
  }>;
}

interface ClaimButtonProps {
  claimable: ClaimableData;
  onClaim: (tokenType: string) => Promise<void>;
  className?: string;
}

export function ClaimButton({
  claimable,
  onClaim,
  className,
}: ClaimButtonProps) {
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaim = async (tokenType: string) => {
    setClaiming(tokenType);
    try {
      await onClaim(tokenType);
      toast.success(`Successfully claimed ${tokenType} earnings!`, {
        description: "Your funds will be processed shortly.",
      });
    } catch (error) {
      toast.error("Failed to claim earnings", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setClaiming(null);
    }
  };

  // Convert totals object to array for rendering
  const claimableBalances = Object.entries(claimable.totals || {}).map(
    ([tokenType, amounts]) => {
      const commissionCount = claimable.commissions.filter(
        (c) => c.tokenType === tokenType
      ).length;
      const cashbackCount = claimable.cashback.filter(
        (cb) => cb.tokenType === tokenType
      ).length;

      return {
        tokenType,
        commissions: amounts.commissions,
        cashback: amounts.cashback,
        total: amounts.total,
        commissionCount,
        cashbackCount,
      };
    }
  );

  const hasClaimable = claimableBalances.some((c) => parseFloat(c.total) > 0);

  if (!hasClaimable) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>Claim Earnings</CardTitle>
          <CardDescription>
            Your claimable balance will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No claimable earnings yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Claim Earnings</CardTitle>
        <CardDescription>
          Claim your commissions and cashback rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {claimableBalances
          .filter((c) => parseFloat(c.total) > 0)
          .map((balance) => (
            <div
              key={balance.tokenType}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4"
            >
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  {balance.tokenType}
                </Label>
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  {parseFloat(balance.commissions) > 0 && (
                    <p>
                      ${parseFloat(balance.commissions).toFixed(2)} commissions
                      ({balance.commissionCount})
                    </p>
                  )}
                  {parseFloat(balance.cashback) > 0 && (
                    <p>
                      ${parseFloat(balance.cashback).toFixed(2)} cashback (
                      {balance.cashbackCount})
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${parseFloat(balance.total).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">available</div>
                </div>
                <Button
                  onClick={() => handleClaim(balance.tokenType)}
                  disabled={claiming === balance.tokenType}
                  size="lg"
                >
                  {claiming === balance.tokenType ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Claim
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}

        <div className="rounded-md bg-blue-500/10 p-4 text-sm text-blue-600 dark:text-blue-400">
          <p className="font-medium">Note:</p>
          <p className="mt-1 text-xs">
            Claims are processed on-chain. Make sure you have sufficient gas for
            the transaction.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
