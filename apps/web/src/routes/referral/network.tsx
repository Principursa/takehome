import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, AlertCircle, Filter, ArrowLeft } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { NetworkTree } from "@/components/NetworkTree";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/referral/network")({
  component: NetworkRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function NetworkRoute() {
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  // Fetch full network
  const {
    data: networkData,
    isLoading: networkLoading,
    error: networkError,
  } = useQuery(trpc.referral.network.queryOptions());

  // Fetch downline tree (recursive)
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
  } = useQuery(
    trpc.referral.getDownlineTree.queryOptions({ maxDepth: 3 }),
  );

  const isLoading = networkLoading || treeLoading;
  const error = networkError || treeError;

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
            <h2 className="text-xl font-semibold">Failed to load network data</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const networkStats = {
    total: networkData?.stats?.totalNetwork || 0,
    byLevel: {
      1: networkData?.stats?.level1Count || 0,
      2: networkData?.stats?.level2Count || 0,
      3: networkData?.stats?.level3Count || 0,
    },
    totalVolume: "0.00", // Will be calculated from trades
    totalCommissions: "0.00", // Will be calculated from earnings
  };

  const filteredNetwork = networkData?.direct || [];

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
          <h1 className="text-3xl font-bold">Referral Network</h1>
          <p className="text-muted-foreground">
            View your complete referral network and their performance
          </p>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkStats.total}</div>
            <p className="text-xs text-muted-foreground">referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>By Level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">L1:</span>
                <span className="font-medium">{networkStats.byLevel[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">L2:</span>
                <span className="font-medium">{networkStats.byLevel[2]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">L3:</span>
                <span className="font-medium">{networkStats.byLevel[3]}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Network Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${networkStats.totalVolume}</div>
            <p className="text-xs text-muted-foreground">total traded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${networkStats.totalCommissions}
            </div>
            <p className="text-xs text-muted-foreground">from network</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Level:</Label>
              <div className="flex gap-2">
                <Button
                  variant={levelFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevelFilter(null)}
                >
                  All
                </Button>
                <Button
                  variant={levelFilter === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevelFilter(1)}
                >
                  Level 1
                </Button>
                <Button
                  variant={levelFilter === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevelFilter(2)}
                >
                  Level 2
                </Button>
                <Button
                  variant={levelFilter === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLevelFilter(3)}
                >
                  Level 3
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Tree */}
      {filteredNetwork.length > 0 && (
        <NetworkTree network={filteredNetwork.map(d => ({
          userId: d.id,
          name: d.name,
          email: d.email,
          level: 1,
          directReferrals: 0,
          totalVolume: "0",
          totalCommissions: "0",
          joinedAt: d.joinedAt,
        }))} />
      )}

      {/* Downline Tree Info */}
      {treeData && Array.isArray(treeData) && treeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network Structure</CardTitle>
            <CardDescription>
              Recursive view of your complete referral tree
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Total Nodes:</span>{" "}
                {treeData.length}
              </p>
              <p>
                <span className="font-medium">Max Depth:</span>{" "}
                {Math.max(...treeData.map((n) => n.depth))}
              </p>
              <p className="text-muted-foreground">
                Your referral network extends up to 3 levels deep. Each level
                earns you different commission rates (30%, 3%, 2%).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
