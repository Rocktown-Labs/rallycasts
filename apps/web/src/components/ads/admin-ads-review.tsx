import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { usePendingAds, useReviewAd } from "@/lib/hooks/use-ads";

export function AdminAdsReview() {
  const { data } = usePendingAds();
  const review = useReviewAd();
  const campaigns = data?.campaigns ?? [];

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4 text-primary" /> Ad approvals
        </CardTitle>
        <CardDescription>
          Organizer boosts go live across cards and video prerolls after review.
          Activation also requires prepaid budget.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No campaigns awaiting review.
          </p>
        ) : (
          campaigns.map((campaign) => (
            <div
              className="rounded-lg border border-border p-4"
              key={campaign.adCampaign.id}
            >
              <p className="font-semibold">{campaign.adCampaign.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaign.event.name} ·{" "}
                {(campaign.adCampaign.totalBudgetCents / 100).toFixed(0)} total
                budget · {(campaign.adCampaign.fundedCents / 100).toFixed(2)}{" "}
                funded · {campaign.adCampaign.placements}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate(
                      { approve: true, id: campaign.adCampaign.id },
                      {
                        onError: (error) => toast.error(error.message),
                        onSuccess: () => toast.success("Campaign activated."),
                      }
                    )
                  }
                  size="sm"
                >
                  Approve
                </Button>
                <Button
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate(
                      { approve: false, id: campaign.adCampaign.id },
                      {
                        onError: (error) => toast.error(error.message),
                        onSuccess: () => toast.success("Campaign rejected."),
                      }
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
