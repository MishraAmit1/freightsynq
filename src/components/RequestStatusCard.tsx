import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  getUserLatestRequest,
  type AccessRequest,
} from "@/api/access-requests";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RequestStatusCardProps {
  onRequestAgain?: () => void;
}

export const RequestStatusCard = ({
  onRequestAgain,
}: RequestStatusCardProps) => {
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this request before
    const dismissedRequests = JSON.parse(
      localStorage.getItem("dismissedRequests") || "[]"
    );
    loadRequest(dismissedRequests);
  }, []);

  const loadRequest = async (dismissedRequests: string[]) => {
    try {
      const data = await getUserLatestRequest();

      // If this specific request was dismissed, don't show it
      if (data && dismissedRequests.includes(data.id)) {
        setDismissed(true);
      }

      setRequest(data);
    } catch (error) {
      console.error("Error loading request:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Dismiss function - saves to localStorage
  const handleDismiss = () => {
    if (!request) return;

    // Save dismissed request ID to localStorage
    const dismissedRequests = JSON.parse(
      localStorage.getItem("dismissedRequests") || "[]"
    );
    if (!dismissedRequests.includes(request.id)) {
      dismissedRequests.push(request.id);
      localStorage.setItem(
        "dismissedRequests",
        JSON.stringify(dismissedRequests)
      );
    }

    setDismissed(true);
  };

  // Don't show if loading, no request, or dismissed
  if (loading) return null;
  if (!request) return null;
  if (dismissed) return null;

  // Don't show old rejected requests (older than 7 days) - auto cleanup
  if (request.status === "REJECTED") {
    const rejectedDate = new Date(request.processed_at || request.requested_at);
    const daysSinceRejection =
      (Date.now() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRejection > 7) return null;
  }

  // Don't show old approved requests (user should have access now)
  if (request.status === "APPROVED") {
    const approvedDate = new Date(request.processed_at || request.requested_at);
    const daysSinceApproval =
      (Date.now() - approvedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceApproval > 1) return null; // Hide after 1 day
  }

  const getStatusConfig = () => {
    switch (request.status) {
      case "PENDING":
        return {
          icon: Clock,
          title: "Request Pending",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
          borderColor: "border-yellow-200 dark:border-yellow-800/30",
          iconBg: "bg-yellow-100 dark:bg-yellow-900/20",
          iconColor: "text-yellow-600",
          badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
          canDismiss: false, // Pending nahi dismiss hoga
        };
      case "REJECTED":
        return {
          icon: XCircle,
          title: "Request Rejected",
          bgColor: "bg-red-50 dark:bg-red-900/10",
          borderColor: "border-red-200 dark:border-red-800/30",
          iconBg: "bg-red-100 dark:bg-red-900/20",
          iconColor: "text-red-600",
          badgeClass: "bg-red-100 text-red-700 border-red-200",
          canDismiss: true, // ✅ Rejected dismiss ho sakta
        };
      case "APPROVED":
        return {
          icon: CheckCircle2,
          title: "Request Approved!",
          bgColor: "bg-green-50 dark:bg-green-900/10",
          borderColor: "border-green-200 dark:border-green-800/30",
          iconBg: "bg-green-100 dark:bg-green-900/20",
          iconColor: "text-green-600",
          badgeClass: "bg-green-100 text-green-700 border-green-200",
          canDismiss: true, // ✅ Approved dismiss ho sakta
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-300 relative",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* ✅ Close/Dismiss Button (Top Right) */}
      {config.canDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <CardContent className="p-4 pr-10">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", config.iconBg)}>
              <StatusIcon className={cn("w-5 h-5", config.iconColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.title}</h3>
              <p className="text-xs text-muted-foreground">
                {request.status === "PENDING" && "Under review"}
                {request.status === "REJECTED" && "View details below"}
                {request.status === "APPROVED" && "Refresh to access features"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={config.badgeClass}>{request.status}</Badge>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
            {/* Request Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {format(
                    new Date(request.requested_at),
                    "MMM dd, yyyy • hh:mm a"
                  )}
                </p>
              </div>
              {request.processed_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Reviewed</p>
                  <p className="font-medium">
                    {format(
                      new Date(request.processed_at),
                      "MMM dd, yyyy • hh:mm a"
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Features Requested */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Features Requested
              </p>
              <div className="flex flex-wrap gap-1.5">
                {request.requested_features.map((feature, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Status-specific content */}
            {request.status === "PENDING" && (
              <div className="flex items-start gap-2 p-3 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your request is being reviewed by our team. This usually takes
                  24-48 hours.
                </p>
              </div>
            )}

            {request.status === "REJECTED" && (
              <div className="space-y-3">
                {request.admin_notes && (
                  <>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">
                      Reason for Rejection
                    </p>
                    <div className="p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        "{request.admin_notes}"
                      </p>
                    </div>
                  </>
                )}

                {/* ✅ Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDismiss}
                    className="flex-1"
                  >
                    Got it
                  </Button>
                  {onRequestAgain && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleDismiss(); // Dismiss old one
                        onRequestAgain(); // Open new request
                      }}
                      className="flex-1"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Request Again
                    </Button>
                  )}
                </div>
              </div>
            )}

            {request.status === "APPROVED" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Congratulations! You now have full access to all features.
                    </p>
                    {request.grant_duration && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Valid for {request.grant_duration} days
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    handleDismiss();
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh to Unlock Features
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
