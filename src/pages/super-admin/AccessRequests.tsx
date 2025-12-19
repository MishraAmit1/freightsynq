import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Building2,
  User,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  fetchAccessRequests,
  getRequestCounts,
  approveAccessRequest,
  rejectAccessRequest,
  type AccessRequest,
} from "@/api/access-requests";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const AccessRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  >("PENDING");

  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [grantDuration, setGrantDuration] = useState("365");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsData, countsData] = await Promise.all([
        fetchAccessRequests(activeTab === "ALL" ? undefined : activeTab),
        getRequestCounts(),
      ]);
      setRequests(requestsData);
      setCounts(countsData);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await approveAccessRequest(
        selectedRequest.id,
        parseInt(grantDuration),
        adminNotes.trim() || undefined
      );

      toast({
        title: "✅ Request Approved",
        description: `Full access granted to ${selectedRequest.company_name}`,
      });

      setShowApproveModal(false);
      setShowDetailsModal(false);
      setAdminNotes("");
      loadData();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminNotes.trim()) {
      toast({
        title: "❌ Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      await rejectAccessRequest(selectedRequest.id, adminNotes.trim());

      toast({
        title: "✅ Request Rejected",
        description: `Request from ${selectedRequest.company_name} has been rejected`,
      });

      setShowRejectModal(false);
      setShowDetailsModal(false);
      setAdminNotes("");
      loadData();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDetailsModal = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div>
        <h1 className="text-2xl font-bold text-foreground">Access Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve user requests for full access
        </p>
      </div> */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {counts.pending}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {counts.approved}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rejected
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {counts.rejected}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="PENDING">
            Pending {counts.pending > 0 && `(${counts.pending})`}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === "ALL" ? "All Requests" : `${activeTab} Requests`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No requests found
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {request.company_name}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            {request.user_email}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(
                              new Date(request.requested_at),
                              "MMM dd, yyyy • hh:mm a"
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {request.requested_features.map((feature, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailsModal(request)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>

                          {request.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApproveModal(true);
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Company
                  </Label>
                  <p className="font-semibold">
                    {selectedRequest.company_name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    User Email
                  </Label>
                  <p className="font-semibold">{selectedRequest.user_email}</p>
                </div>
                {selectedRequest.business_type && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Business Type
                    </Label>
                    <p className="font-semibold capitalize">
                      {selectedRequest.business_type}
                    </p>
                  </div>
                )}
                {selectedRequest.expected_monthly_bookings && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Monthly Bookings
                    </Label>
                    <p className="font-semibold">
                      {selectedRequest.expected_monthly_bookings}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Features Requested
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.requested_features.map((feature, idx) => (
                    <Badge key={idx} variant="outline">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Reason
                </Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>

              {selectedRequest.additional_notes && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Additional Notes
                  </Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedRequest.additional_notes}
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.status !== "PENDING" && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(selectedRequest.status)}
                    {selectedRequest.processed_at && (
                      <span className="text-xs text-muted-foreground">
                        on{" "}
                        {format(
                          new Date(selectedRequest.processed_at),
                          "MMM dd, yyyy"
                        )}
                      </span>
                    )}
                  </div>
                  {selectedRequest.admin_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Admin Notes
                      </Label>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{selectedRequest.admin_notes}</p>
                      </div>
                    </div>
                  )}
                  {selectedRequest.grant_duration && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Granted for: {selectedRequest.grant_duration} days
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowRejectModal(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApproveModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Grant full access to {selectedRequest?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Access Duration</Label>
              <RadioGroup
                value={grantDuration}
                onValueChange={setGrantDuration}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="7" id="7days" />
                  <Label htmlFor="7days" className="font-normal cursor-pointer">
                    7 Days (Trial)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30" id="30days" />
                  <Label
                    htmlFor="30days"
                    className="font-normal cursor-pointer"
                  >
                    30 Days (1 Month)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="90" id="90days" />
                  <Label
                    htmlFor="90days"
                    className="font-normal cursor-pointer"
                  >
                    90 Days (3 Months)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="365" id="365days" />
                  <Label
                    htmlFor="365days"
                    className="font-normal cursor-pointer"
                  >
                    365 Days (1 Year)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="approve-notes" className="mb-2 block">
                Admin Notes (Optional)
              </Label>
              <Textarea
                id="approve-notes"
                placeholder="Any notes for this approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Grant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Access Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedRequest?.company_name}'s
              request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-notes" className="mb-2 block">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-notes"
                placeholder="Please provide a clear reason..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be shared with the user
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !adminNotes.trim()}
              variant="destructive"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
