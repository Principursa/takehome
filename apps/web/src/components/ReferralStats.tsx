import { Users, TrendingUp, DollarSign, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReferralStatsProps {
  stats: {
    totalReferrals: number;
    directReferrals: number;
    level2Referrals: number;
    level3Referrals: number;
    totalNetworkVolume: string;
    totalEarnings: string;
    averageEarningsPerReferral: string;
  };
  className?: string;
}

export function ReferralStats({ stats, className }: ReferralStatsProps) {
  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              across 3 levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Network Volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalNetworkVolume)}
            </div>
            <p className="text-xs text-muted-foreground">total traded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">commissions + cashback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg per Referral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageEarningsPerReferral)}
            </div>
            <p className="text-xs text-muted-foreground">earnings efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Network Breakdown</CardTitle>
          <CardDescription>
            Your referral network structure by level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Level 1 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Level 1 (Direct)</p>
                <p className="text-xs text-muted-foreground">
                  30% commission on their trades
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.directReferrals}</p>
                <p className="text-xs text-muted-foreground">referrals</p>
              </div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Level 2 (Indirect)</p>
                <p className="text-xs text-muted-foreground">
                  3% commission on their trades
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.level2Referrals}</p>
                <p className="text-xs text-muted-foreground">referrals</p>
              </div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Level 3 (Deep)</p>
                <p className="text-xs text-muted-foreground">
                  2% commission on their trades
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.level3Referrals}</p>
                <p className="text-xs text-muted-foreground">referrals</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
