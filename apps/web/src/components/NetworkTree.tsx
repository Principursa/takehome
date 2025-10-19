import { Users, TrendingUp, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NetworkNode {
  userId: string;
  name: string | null;
  email: string;
  level: number;
  directReferrals: number;
  totalVolume: string;
  totalCommissions: string;
  joinedAt: Date;
}

interface NetworkTreeProps {
  network: NetworkNode[];
  className?: string;
}

export function NetworkTree({ network, className }: NetworkTreeProps) {
  // Handle undefined or empty network
  if (!network || network.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>Your Referral Network</CardTitle>
          <CardDescription>
            Your referrals and their network stats will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No referrals yet. Share your referral code to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by level
  const groupedByLevel = network.reduce(
    (acc, node) => {
      if (!acc[node.level]) {
        acc[node.level] = [];
      }
      acc[node.level].push(node);
      return acc;
    },
    {} as Record<number, NetworkNode[]>,
  );

  const levels = Object.keys(groupedByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Your Referral Network</CardTitle>
        <CardDescription>
          {network.length} total {network.length === 1 ? "referral" : "referrals"} across {levels.length}{" "}
          {levels.length === 1 ? "level" : "levels"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {levels.map((level) => (
          <div key={level} className="space-y-3">
            {/* Level Header */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span>
                Level {level} ({groupedByLevel[level].length}{" "}
                {groupedByLevel[level].length === 1 ? "user" : "users"})
              </span>
              <span className="text-xs text-muted-foreground">
                • {level === 1 ? "30%" : level === 2 ? "3%" : "2%"} commission
              </span>
            </div>

            {/* Users Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupedByLevel[level].map((node) => (
                <NetworkNodeCard key={node.userId} node={node} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NetworkNodeCard({ node }: { node: NetworkNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <p className="font-medium leading-none">
            {node.name || "Anonymous User"}
          </p>
          <p className="text-xs text-muted-foreground">{node.email}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {/* Direct Referrals */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            Referrals
          </span>
          <span className="font-medium">{node.directReferrals}</span>
        </div>

        {/* Total Volume */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Volume
          </span>
          <span className="font-medium">
            ${parseFloat(node.totalVolume).toLocaleString()}
          </span>
        </div>

        {/* Commissions Generated */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Your Earnings</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            ${parseFloat(node.totalCommissions).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Joined Date */}
      <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        Joined {new Date(node.joinedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
