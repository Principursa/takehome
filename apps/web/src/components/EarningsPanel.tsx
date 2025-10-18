import { TrendingUp, Coins, Gift, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EarningsSummary {
  totalCommissions: string;
  totalCashback: string;
  unclaimedCommissions: string;
  unclaimedCashback: string;
  byLevel: {
    level: number;
    amount: string;
    claimed: string;
    unclaimed: string;
  }[];
}

interface EarningsPanelProps {
  earnings: EarningsSummary;
  tokenType?: string;
  className?: string;
}

export function EarningsPanel({
  earnings,
  tokenType = "USDC-ARBITRUM",
  className,
}: EarningsPanelProps) {
  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(2);
  };

  const totalEarnings =
    parseFloat(earnings.totalCommissions) + parseFloat(earnings.totalCashback);
  const totalUnclaimed =
    parseFloat(earnings.unclaimedCommissions) +
    parseFloat(earnings.unclaimedCashback);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Earnings */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatAmount(totalEarnings.toString())}
            </div>
            <p className="text-xs text-muted-foreground">{tokenType}</p>
          </CardContent>
        </Card>

        {/* Unclaimed */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Available to Claim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${formatAmount(totalUnclaimed.toString())}
            </div>
            <p className="text-xs text-muted-foreground">{tokenType}</p>
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatAmount(earnings.totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${formatAmount(earnings.unclaimedCommissions)} unclaimed
            </p>
          </CardContent>
        </Card>

        {/* Cashback */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Cashback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatAmount(earnings.totalCashback)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${formatAmount(earnings.unclaimedCashback)} unclaimed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Level */}
      {earnings.byLevel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Breakdown by Level</CardTitle>
            <CardDescription>
              Your earnings from each referral level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnings.byLevel.map((level) => (
                <div
                  key={level.level}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Level {level.level}</span>
                      <span className="text-xs text-muted-foreground">
                        {level.level === 1
                          ? "30%"
                          : level.level === 2
                            ? "3%"
                            : "2%"}{" "}
                        commission
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${formatAmount(level.claimed)} claimed • $
                      {formatAmount(level.unclaimed)} pending
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${formatAmount(level.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">total</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
