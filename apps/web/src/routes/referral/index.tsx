import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import { ReferralCodeCard } from "@/components/ReferralCodeCard";
import { NetworkTree } from "@/components/NetworkTree";
import { EarningsPanel } from "@/components/EarningsPanel";
import { ClaimButton } from "@/components/ClaimButton";
import { ReferralStats } from "@/components/ReferralStats";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/referral/")({
  component: ReferralRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
});

function ReferralRoute() {
  const { session } = Route.useRouteContext();
  const userId = session.data?.user?.id;

  // Fetch referral code
  const {
    data: codeData,
    isLoading: codeLoading,
    error: codeError,
    refetch: refetchCode,
  } = useQuery(trpc.referral.getMyCode.queryOptions());

  // Generate code mutation
  const generateCodeMutation = useMutation(
    trpc.referral.generate.mutationOptions({
      onSuccess: () => {
        toast.success("Referral code generated successfully!");
        refetchCode(); // Refetch to get the new code
      },
      onError: (error) => {
        toast.error("Failed to generate code", {
          description: error.message,
        });
      },
    }),
  );

  // Fetch network
  const {
    data: networkData,
    isLoading: networkLoading,
    error: networkError,
  } = useQuery(trpc.referral.network.queryOptions());

  // Fetch earnings
  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError,
  } = useQuery(trpc.referral.earnings.queryOptions({ tokenType: "USDC-ARBITRUM" }));

  // Fetch claimable
  const {
    data: claimableData,
    isLoading: claimableLoading,
    refetch: refetchClaimable,
  } = useQuery(trpc.referral.getClaimable.queryOptions());

  // Claim mutation
  const claimMutation = useMutation(
    trpc.referral.claim.mutationOptions({
      onSuccess: () => {
        refetchClaimable();
      },
    }),
  );

  const handleClaim = async (tokenType: string) => {
    await claimMutation.mutateAsync({ tokenType });
  };

  const handleGenerateCode = () => {
    generateCodeMutation.mutate();
  };

  // Loading state
  if (codeLoading || networkLoading || earningsLoading || claimableLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  const hasError = codeError || networkError || earningsError;
  if (hasError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Failed to load referral data</h2>
            <p className="text-sm text-muted-foreground">
              {codeError?.message ||
                networkError?.message ||
                earningsError?.message ||
                "An unexpected error occurred"}
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // No code yet
  if (!codeData?.code) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Get Started with Referrals</h1>
            <p className="text-muted-foreground">
              Generate your unique referral code and start earning commissions
              from your network's trading activity.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold">How it works</h2>
              <ul className="space-y-2 text-left text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Generate your unique referral code</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>Share it with friends and traders</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>Earn 30%, 3%, and 2% from 3 levels of referrals</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>Your referrals get 10% cashback on all trades</span>
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              onClick={handleGenerateCode}
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate My Referral Code"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats safely using actual API response
  const totalReferrals = networkData?.stats?.totalNetwork || 0;
  const directReferrals = networkData?.stats?.level1Count || 0;
  const level2Referrals = networkData?.stats?.level2Count || 0;
  const level3Referrals = networkData?.stats?.level3Count || 0;

  const totalCashback = parseFloat(earningsData?.summary?.totalCashback || "0");
  const totalCommissions = parseFloat(earningsData?.summary?.totalCommissions || "0");
  const totalEarnings = totalCommissions + totalCashback;
  const averageEarningsPerReferral =
    totalReferrals > 0 ? totalEarnings / totalReferrals : 0;

  const stats = {
    totalReferrals,
    directReferrals,
    level2Referrals,
    level3Referrals,
    totalNetworkVolume: "0", // Will be calculated from trades
    totalEarnings: totalEarnings.toString(),
    averageEarningsPerReferral: averageEarningsPerReferral.toString(),
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Referral Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your referral network and track your earnings
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex gap-2">
        <Link to="/referral/network">
          <Button variant="outline" size="sm">
            View Network
          </Button>
        </Link>
        <Link to="/referral/earnings">
          <Button variant="outline" size="sm">
            View Earnings
          </Button>
        </Link>
        <Link to="/referral/trades">
          <Button variant="outline" size="sm">
            View Trades
          </Button>
        </Link>
        <Link to="/referral/test">
          <Button variant="outline" size="sm">
            Test Trade
          </Button>
        </Link>
      </div>

      {/* Referral Code Section */}
      <ReferralCodeCard
        referralCode={codeData.code}
        totalReferrals={codeData.referralCount}
      />

      {/* Stats Section */}
      <ReferralStats stats={stats} />

      {/* Earnings Section */}
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

      {/* Network Section */}
      {networkData?.direct && networkData.direct.length > 0 && (
        <NetworkTree network={networkData.direct.map(d => ({
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
    </div>
  );
}
