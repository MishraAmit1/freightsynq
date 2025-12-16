// src/pages/super-admin/ManageCompanies.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Lock,
  Unlock,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  AlertTriangle,
  Clock,
  CalendarX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  gst_number: string;
  pan_number: string;
  access_level: "FREE" | "FULL";
  access_expires_at?: string | null;
  created_at: string;
  status: string;
}

export const ManageCompanies = () => {
  const { isSuperAdmin, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<"grant" | "revoke">("grant");
  const [selectedDays, setSelectedDays] = useState("30");

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchCompanies();

    // Auto-refresh every minute to update expiry status
    const interval = setInterval(fetchCompanies, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const getDaysLeft = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const daysLeft = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysLeft;
  };

  const isExpiringSoon = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    const daysLeft = getDaysLeft(expiryDate);
    return daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  };

  const isExpired = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate)
      return { label: "Permanent", color: "default", icon: CheckCircle };

    const daysLeft = getDaysLeft(expiryDate);

    if (daysLeft === null || daysLeft < 0) {
      return { label: "Expired", color: "destructive", icon: CalendarX };
    }
    if (daysLeft === 0) {
      return {
        label: "Expires Today",
        color: "destructive",
        icon: AlertTriangle,
      };
    }
    if (daysLeft <= 7) {
      return {
        label: `${daysLeft} days left`,
        color: "warning",
        icon: AlertTriangle,
      };
    }
    if (daysLeft <= 30) {
      return {
        label: `${daysLeft} days left`,
        color: "secondary",
        icon: Clock,
      };
    }
    return { label: `${daysLeft} days`, color: "default", icon: CheckCircle };
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error("Fetch companies error:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleAccessChange = async (
    company: Company,
    action: "grant" | "revoke"
  ) => {
    setSelectedCompany(company);
    setActionType(action);
    setSelectedDays("30"); // Reset to default
    setShowConfirmDialog(true);
  };

  const confirmAccessChange = async () => {
    if (!selectedCompany) return;

    setActionLoading(true);
    try {
      const newAccessLevel = actionType === "grant" ? "FULL" : "FREE";
      const days = actionType === "grant" ? parseInt(selectedDays) : null;

      // Use RPC function with days parameter
      const { data, error } = await supabase.rpc("update_company_access", {
        p_company_id: selectedCompany.id,
        p_access_level: newAccessLevel,
        p_days: days,
      });

      if (error) {
        console.error("RPC Error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to update access");
      }

      console.log("Update successful:", data);

      // Update local state immediately
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedCompany.id
            ? {
                ...c,
                access_level: newAccessLevel,
                access_expires_at: data.expires_at,
              }
            : c
        )
      );

      toast.success(
        actionType === "grant"
          ? `Full access granted to ${selectedCompany.name}`
          : `Access revoked for ${selectedCompany.name}`,
        {
          description:
            actionType === "grant"
              ? `Valid for ${selectedDays} days (until ${new Date(
                  data.expires_at
                ).toLocaleDateString("en-IN")})`
              : "Company limited to FREE features only",
        }
      );

      setShowConfirmDialog(false);
      setSelectedCompany(null);
    } catch (error: any) {
      console.error("Access change error:", error);
      toast.error(error.message || "Failed to update access level");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: companies.length,
    free: companies.filter((c) => c.access_level === "FREE").length,
    full: companies.filter((c) => c.access_level === "FULL").length,
    active: companies.filter((c) => c.status === "ACTIVE").length,
    expiringSoon: companies.filter((c) => isExpiringSoon(c.access_expires_at))
      .length,
    expired: companies.filter((c) => isExpired(c.access_expires_at)).length,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground dark:text-white">
          <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
            <Building2 className="w-8 h-8 text-primary dark:text-primary" />
          </div>
          Manage Companies
        </h1>
        <p className="text-muted-foreground dark:text-muted-foreground mt-2">
          Control company access levels and monitor registrations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-card border-border dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  Total
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-white">
                  {stats.total}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-muted-foreground dark:text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-green-200 dark:border-green-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  FREE
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.free}
                </p>
              </div>
              <Lock className="w-8 h-8 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary dark:text-primary">FULL</p>
                <p className="text-2xl font-bold text-primary dark:text-primary">
                  {stats.full}
                </p>
              </div>
              <Unlock className="w-8 h-8 text-primary dark:text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-card border-border dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  Active
                </p>
                <p className="text-2xl font-bold text-foreground dark:text-white">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card> */}

        {/* Expiring Soon Card */}
        {stats.expiringSoon > 0 && (
          <Card className="bg-card border-orange-200 dark:border-orange-900/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Expiring
                  </p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {stats.expiringSoon}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Card */}
        {stats.expired > 0 && (
          <Card className="bg-card border-red-200 dark:border-red-900/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Expired
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {stats.expired}
                  </p>
                </div>
                <CalendarX className="w-8 h-8 text-red-600 dark:text-red-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search */}
      <Card className="mb-6 bg-card border-border dark:border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border dark:border-border bg-card text-foreground dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card className="bg-card border-border dark:border-border">
        <CardHeader className="border-b border-border dark:border-border">
          <CardTitle className="text-foreground dark:text-white">
            All Companies ({filteredCompanies.length})
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-muted-foreground">
            Manage access levels for registered companies
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground dark:text-muted-foreground">
                No companies found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border dark:border-border">
                    <TableHead className="text-foreground dark:text-white">
                      Company
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Contact
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Location
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Registered
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Status
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Access Level
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white">
                      Expires
                    </TableHead>
                    <TableHead className="text-right text-foreground dark:text-white">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => {
                    const expiryStatus = getExpiryStatus(
                      company.access_expires_at
                    );
                    const StatusIcon = expiryStatus.icon;

                    return (
                      <TableRow
                        key={company.id}
                        className={cn(
                          "border-border dark:border-border hover:bg-accent dark:hover:bg-accent/50",
                          isExpiringSoon(company.access_expires_at) &&
                            "bg-orange-50/50 dark:bg-orange-900/10",
                          isExpired(company.access_expires_at) &&
                            "bg-red-50/50 dark:bg-red-900/10"
                        )}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground dark:text-white">
                              {company.name}
                            </p>
                            {company.gst_number && (
                              <p className="text-xs text-muted-foreground dark:text-muted-foreground font-mono">
                                GST: {company.gst_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-foreground dark:text-white">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {company.email}
                            </div>
                            {company.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {company.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.city || company.state ? (
                            <div className="flex items-center gap-1 text-sm text-foreground dark:text-white">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              {[company.city, company.state]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground dark:text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(company.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              company.status === "ACTIVE"
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              company.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                            )}
                          >
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.access_level === "FREE" ? (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-400"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              FREE
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-primary",
                                isExpired(company.access_expires_at) &&
                                  "bg-red-100 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                              )}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              FULL
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {company.access_level === "FULL" &&
                          company.access_expires_at ? (
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  expiryStatus.color === "destructive" &&
                                    "bg-red-100 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400",
                                  expiryStatus.color === "warning" &&
                                    "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-400",
                                  expiryStatus.color === "secondary" &&
                                    "bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-900/20 dark:border-gray-900/50 dark:text-gray-400",
                                  expiryStatus.color === "default" &&
                                    "bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400"
                                )}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {expiryStatus.label}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  company.access_expires_at
                                ).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          ) : company.access_level === "FULL" ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Permanent
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {company.access_level === "FREE" ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAccessChange(company, "grant")
                              }
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              Grant Full Access
                            </Button>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              {isExpired(company.access_expires_at) ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleAccessChange(company, "grant")
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Renew Access
                                </Button>
                              ) : isExpiringSoon(company.access_expires_at) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleAccessChange(company, "grant")
                                  }
                                  className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Extend
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleAccessChange(company, "revoke")
                                }
                                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-card border-border dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-white">
              {actionType === "grant"
                ? "Grant Full Access?"
                : "Revoke Full Access?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-muted-foreground dark:text-muted-foreground">
              {actionType === "grant" ? (
                <>
                  <p>
                    Grant{" "}
                    <strong className="text-foreground dark:text-white">
                      {selectedCompany?.name}
                    </strong>{" "}
                    full access to all features.
                  </p>

                  {/* Duration Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground dark:text-white">
                      Select Access Duration
                    </label>
                    <Select
                      value={selectedDays}
                      onValueChange={setSelectedDays}
                    >
                      <SelectTrigger className="border-border dark:border-border bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border dark:border-border">
                        <SelectItem value="7">7 Days (1 Week)</SelectItem>
                        <SelectItem value="15">15 Days (Trial)</SelectItem>
                        <SelectItem value="30">30 Days (1 Month)</SelectItem>
                        <SelectItem value="90">90 Days (3 Months)</SelectItem>
                        <SelectItem value="180">180 Days (6 Months)</SelectItem>
                        <SelectItem value="365">365 Days (1 Year)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-accent dark:bg-primary/10 rounded-lg border border-primary/20">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium text-foreground dark:text-white">
                          {selectedDays} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Expires on:
                        </span>
                        <span className="font-medium text-primary dark:text-primary">
                          {new Date(
                            Date.now() +
                              parseInt(selectedDays) * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {/* <p className="text-sm font-medium mb-2">
                      Features included:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Bookings Management</li>
                      <li>Customer Database</li>
                      <li>Fleet Management</li>
                      <li>Warehouse Operations</li>
                      <li>Complete Portal Access</li>
                    </ul> */}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Revoke full access for{" "}
                    <strong className="text-foreground dark:text-white">
                      {selectedCompany?.name}
                    </strong>
                    ?
                  </p>
                  <p>
                    They will be limited to FREE features only (LR Generator &
                    Tracking).
                  </p>
                  {selectedCompany?.access_expires_at && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        Current access expires on:{" "}
                        {new Date(
                          selectedCompany.access_expires_at
                        ).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              className="border-border dark:border-border text-foreground dark:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAccessChange}
              disabled={actionLoading}
              className={cn(
                actionType === "grant"
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "grant" ? (
                    <>
                      <Unlock className="w-4 h-4 mr-1" />
                      Grant Access ({selectedDays} days)
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-1" />
                      Revoke Access
                    </>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
