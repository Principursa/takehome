import { Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReferralCodeCardProps {
  referralCode: string;
  totalReferrals: number;
  className?: string;
}

export function ReferralCodeCard({
  referralCode,
  totalReferrals,
  className,
}: ReferralCodeCardProps) {
  const shareUrl = `${window.location.origin}/login?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success("Referral code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share URL copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join with my referral code",
          text: `Use my referral code ${referralCode} to sign up and get 10% cashback on your trades!`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      // Fallback to copy
      handleCopyUrl();
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Your Referral Code</CardTitle>
        <CardDescription>
          Share your code and earn commissions from your referrals' trading fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Code Display */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-border bg-muted px-4 py-3">
            <code className="text-2xl font-bold tracking-wider">
              {referralCode}
            </code>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy code"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {totalReferrals} {totalReferrals === 1 ? "referral" : "referrals"}
          </span>
        </div>

        {/* Share Actions */}
        <div className="flex gap-2">
          <Button variant="default" className="flex-1" onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* URL Preview */}
        <div className="rounded-md bg-muted/50 p-3">
          <p className="break-all text-xs text-muted-foreground">{shareUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
