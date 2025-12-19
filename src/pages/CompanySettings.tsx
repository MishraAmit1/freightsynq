// src/pages/CompanySettings.tsx - FULLY REDESIGNED
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiUsageDashboard } from "@/components/ApiUsageDashboard";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Copy,
  Users,
  Building2,
  RefreshCw,
  FileText,
  Settings,
  Edit,
  Eye,
  CheckCircle,
  Shield,
  FileDown,
  Palette,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  User,
  MapPin,
  XCircle,
  Hash,
  Package,
  Star,
  ArrowRight,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  checkTemplateStatus,
  generateLRWithTemplate,
} from "@/api/lr-templates";
import { LRTemplateOnboarding } from "@/components/LRTemplateOnboarding";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  fetchLRCities,
  addLRCity,
  setActiveLRCity,
  deleteLRCity,
  LRCitySequence,
  fetchLRsByCity,
  CityLR,
} from "@/api/lr-sequences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import {
  CompanyBranch,
  fetchCompanyBranches,
  createBranch,
} from "@/api/bookings";
import { format } from "date-fns";

interface BranchStats {
  totalBookings: number;
  activeBookings: number;
  currentCounter: number;
}

export const CompanySettings = () => {
  const { company, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [companyCode, setCompanyCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // LR Template states
  const [templateLoading, setTemplateLoading] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [showTemplateOnboarding, setShowTemplateOnboarding] = useState(false);

  // LR City states
  const [lrCities, setLrCities] = useState<LRCitySequence[]>([]);
  const [lrCitiesLoading, setLrCitiesLoading] = useState(false);
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [editingCity, setEditingCity] = useState<LRCitySequence | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCityForm, setNewCityForm] = useState({
    city_name: "",
    prefix: "LR",
    current_lr_number: 1001,
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState<string>("all");

  // City LRs Modal States
  const [selectedCity, setSelectedCity] = useState<LRCitySequence | null>(null);
  const [cityLRs, setCityLRs] = useState<CityLR[]>([]);
  const [loadingCityLRs, setLoadingCityLRs] = useState(false);
  const [showCityLRsModal, setShowCityLRsModal] = useState(false);
  const [lrSearchTerm, setLrSearchTerm] = useState("");

  // Branch states
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>(
    {}
  );
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(
    null
  );
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [branchFormData, setBranchFormData] = useState({
    branch_name: "",
    city: "",
    address: "",
  });
  const [branchSaving, setBranchSaving] = useState(false);

  useEffect(() => {
    if (company) {
      loadData();
      loadTemplateData();
      loadLRCities();
      loadBranches();
      setIsAdmin(userProfile?.role === "admin");
    }
  }, [company, userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("company_code")
        .eq("id", company.id)
        .single();

      if (companyError) throw companyError;
      setCompanyCode(companyData.company_code || "");

      const { data: employeesData, error: employeesError } = await supabase
        .from("users")
        .select("id, name, email, phone, role, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateData = async () => {
    setTemplateLoading(true);
    try {
      const { hasTemplate, template } = await checkTemplateStatus();
      setCurrentTemplate(hasTemplate ? template : null);
    } catch (error) {
      console.error("Error loading template data:", error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadLRCities = async () => {
    setLrCitiesLoading(true);
    try {
      const cities = await fetchLRCities();
      setLrCities(cities);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load LR cities",
        variant: "destructive",
      });
    } finally {
      setLrCitiesLoading(false);
    }
  };

  const loadBranches = async () => {
    setBranchesLoading(true);
    try {
      const branchData = await fetchCompanyBranches();
      setBranches(branchData);

      const stats: Record<string, BranchStats> = {};
      for (const branch of branchData) {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("id, status")
          .eq("branch_id", branch.id);

        const { data: counterData } = await supabase
          .from("booking_counters")
          .select("current_number")
          .eq("branch_id", branch.id)
          .single();

        stats[branch.id] = {
          totalBookings: bookingData?.length || 0,
          activeBookings:
            bookingData?.filter(
              (b) => !["DELIVERED", "CANCELLED"].includes(b.status)
            ).length || 0,
          currentCounter: counterData?.current_number || 0,
        };
      }
      setBranchStats(stats);
    } catch (error) {
      console.error("Error loading branches:", error);
    } finally {
      setBranchesLoading(false);
    }
  };

  const getNextBranchCode = () => {
    if (branches.length >= 26) return "AA";
    return String.fromCharCode(65 + branches.length);
  };

  const handleAddBranch = async () => {
    if (!branchFormData.branch_name || !branchFormData.city) {
      toast({
        title: "❌ Validation Error",
        description: "Branch name and city are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setBranchSaving(true);
      const newBranch = await createBranch({
        branch_name: branchFormData.branch_name,
        city: branchFormData.city,
        address: branchFormData.address,
      });

      toast({
        title: "✅ Branch Created",
        description: `${newBranch.branch_name} (${newBranch.branch_code}) has been created`,
      });

      setShowAddBranchModal(false);
      setBranchFormData({ branch_name: "", city: "", address: "" });
      loadBranches();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to create branch",
        variant: "destructive",
      });
    } finally {
      setBranchSaving(false);
    }
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;

    try {
      setBranchSaving(true);
      const { error } = await supabase
        .from("company_branches")
        .update({
          branch_name: branchFormData.branch_name,
          city: branchFormData.city,
          address: branchFormData.address,
        })
        .eq("id", editingBranch.id);

      if (error) throw error;

      toast({
        title: "✅ Branch Updated",
        description: `${branchFormData.branch_name} has been updated`,
      });

      setShowEditBranchModal(false);
      setEditingBranch(null);
      setBranchFormData({ branch_name: "", city: "", address: "" });
      loadBranches();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update branch",
        variant: "destructive",
      });
    } finally {
      setBranchSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranchId) return;

    try {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("branch_id", deletingBranchId)
        .limit(1);

      if (bookings && bookings.length > 0) {
        toast({
          title: "❌ Cannot Delete",
          description: "This branch has existing bookings",
          variant: "destructive",
        });
        setDeletingBranchId(null);
        return;
      }

      const { error } = await supabase
        .from("company_branches")
        .delete()
        .eq("id", deletingBranchId);

      if (error) throw error;

      toast({
        title: "✅ Branch Deleted",
        description: "Branch has been deleted successfully",
      });

      loadBranches();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete branch",
        variant: "destructive",
      });
    } finally {
      setDeletingBranchId(null);
    }
  };

  const openEditBranchModal = (branch: CompanyBranch) => {
    setEditingBranch(branch);
    setBranchFormData({
      branch_name: branch.branch_name,
      city: branch.city || "",
      address: branch.address || "",
    });
    setShowEditBranchModal(true);
  };

  const handleAddCity = async () => {
    if (!newCityForm.city_name.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "City name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await addLRCity(newCityForm);
      await loadLRCities();
      setShowAddCityModal(false);
      setNewCityForm({ city_name: "", prefix: "LR", current_lr_number: 1001 });
      toast({
        title: "✅ City Added",
        description: `${newCityForm.city_name} has been added successfully`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add city",
        variant: "destructive",
      });
    }
  };

  const handleSetActiveCity = async (
    cityId: string,
    cityName: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    try {
      await setActiveLRCity(cityId);
      await loadLRCities();
      toast({
        title: "✅ Active City Changed",
        description: `${cityName} is now active for LR generation`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to set active city",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCity = async (
    cityId: string,
    cityName: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${cityName}?`)) return;

    try {
      await deleteLRCity(cityId);
      await loadLRCities();
      toast({
        title: "✅ City Deleted",
        description: `${cityName} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete city",
        variant: "destructive",
      });
    }
  };

  const handleEditCity = (city: LRCitySequence, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingCity(city);
    setShowEditModal(true);
  };

  const handleUpdateCityNumber = async () => {
    if (!editingCity) return;

    if (!editingCity.city_name?.trim() || !editingCity.prefix?.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "City name and prefix are required",
        variant: "destructive",
      });
      return;
    }

    const duplicatePrefix = lrCities.find(
      (c) => c.id !== editingCity.id && c.prefix === editingCity.prefix
    );

    if (duplicatePrefix) {
      toast({
        title: "❌ Duplicate Prefix",
        description: `Prefix "${editingCity.prefix}" is already used by ${duplicatePrefix.city_name}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("lr_city_sequences")
        .update({
          city_name: editingCity.city_name,
          prefix: editingCity.prefix,
          current_lr_number: editingCity.current_lr_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCity.id);

      if (error) throw error;

      await loadLRCities();
      setShowEditModal(false);
      setEditingCity(null);

      toast({
        title: "✅ City Updated",
        description: `${editingCity.city_name} configuration has been updated`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update city configuration",
        variant: "destructive",
      });
    }
  };

  const handleViewCityLRs = async (city: LRCitySequence) => {
    setSelectedCity(city);
    setShowCityLRsModal(true);
    setLoadingCityLRs(true);
    setLrSearchTerm("");

    try {
      const lrs = await fetchLRsByCity(city.prefix, city.id);
      setCityLRs(lrs);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to fetch LRs",
        variant: "destructive",
      });
      setCityLRs([]);
    } finally {
      setLoadingCityLRs(false);
    }
  };

  const filteredCityLRs = cityLRs.filter((lr) => {
    if (!lrSearchTerm) return true;
    const searchLower = lrSearchTerm.toLowerCase();
    return (
      lr.lr_number?.toLowerCase().includes(searchLower) ||
      lr.booking_id?.toLowerCase().includes(searchLower) ||
      lr.consignor?.name?.toLowerCase().includes(searchLower) ||
      lr.consignee?.name?.toLowerCase().includes(searchLower) ||
      lr.from_location?.toLowerCase().includes(searchLower) ||
      lr.to_location?.toLowerCase().includes(searchLower)
    );
  });

  const handleExportCityLRs = () => {
    if (filteredCityLRs.length === 0) {
      toast({
        title: "No Data",
        description: "No LRs to export",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      [
        "LR Number",
        "Booking Number",
        "LR Date",
        "From",
        "To",
        "Consignor",
        "Consignee",
        "Status",
      ],
      ...filteredCityLRs.map((lr) => [
        lr.lr_number,
        lr.booking_id,
        lr.lr_date ? format(new Date(lr.lr_date), "dd/MM/yyyy") : "",
        lr.from_location,
        lr.to_location,
        lr.consignor?.name || "",
        lr.consignee?.name || "",
        lr.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCity?.city_name}_LRs_${format(
      new Date(),
      "dd-MM-yyyy"
    )}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported",
      description: "LRs exported successfully",
    });
  };

  const generateNewCode = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const newCode = `${company.name.substring(0, 3).toUpperCase()}${
        Math.floor(Math.random() * 900) + 100
      }`;

      const { error } = await supabase
        .from("companies")
        .update({ company_code: newCode })
        .eq("id", company.id);

      if (error) throw error;

      setCompanyCode(newCode);
      toast({
        title: "✅ Success",
        description: "Company code updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update company code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (
    employeeId: string,
    newRole: string,
    employeeName: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "✅ Role Updated",
        description: `${employeeName}'s role changed to ${newRole}`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (
    employeeId: string,
    employeeName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to remove ${employeeName}?\n\nThis will revoke their access immediately.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "✅ Employee Removed",
        description: `${employeeName} has been removed`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to remove employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(companyCode);
    toast({
      title: "✅ Copied!",
      description: "Company code copied to clipboard",
    });
  };

  const handleTemplateChange = () => {
    setShowTemplateOnboarding(true);
  };

  const handleTemplatePreview = async () => {
    try {
      await generateLRWithTemplate("preview-mode");
      toast({
        title: "✅ Preview Generated",
        description: "Template preview downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "ℹ️ Preview",
        description: "Create a booking and generate LR to see template",
      });
    }
  };

  const handleTemplateUpdated = () => {
    setShowTemplateOnboarding(false);
    loadTemplateData();
    toast({
      title: "✅ Template Updated",
      description: "Your LR template has been updated",
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesRole =
      employeeRoleFilter === "all" || emp.role === employeeRoleFilter;
    return matchesSearch && matchesRole;
  });

  if (showTemplateOnboarding) {
    return (
      <div className="min-h-screen">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowTemplateOnboarding(false)}
            className="flex items-center gap-2"
          >
            ← Back to Settings
          </Button>
        </div>
        <LRTemplateOnboarding
          onComplete={handleTemplateUpdated}
          changeMode={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Main Grid Layout */}
      <div className="grid gap-6">
        {/* Row 3: Branches - Full Width */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg">Branches</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {branches.length} Branch{branches.length !== 1 ? "es" : ""}
                </Badge>
                {isAdmin && (
                  <Button onClick={() => setShowAddBranchModal(true)} size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Branch
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {branchesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Branches</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first branch to manage locations
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowAddBranchModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Branch
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{branches.length}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {branches.filter((b) => b.status === "ACTIVE").length}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Next Code</p>
                    <Badge className="text-lg px-2 py-0.5">
                      {getNextBranchCode()}
                    </Badge>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Bookings</p>
                    <p className="text-2xl font-bold">
                      {Object.values(branchStats).reduce(
                        (sum, stat) => sum + stat.totalBookings,
                        0
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Branch List - Compact Grid */}
                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {branches.map((branch) => {
                    const stats = branchStats[branch.id] || {
                      totalBookings: 0,
                      activeBookings: 0,
                      currentCounter: 0,
                    };

                    return (
                      <div
                        key={branch.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          branch.is_default
                            ? "bg-accent border-primary"
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Badge
                              variant="outline"
                              className="text-lg px-3 py-1 font-mono shrink-0"
                            >
                              {branch.branch_code}
                            </Badge>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">
                                  {branch.branch_name}
                                </span>
                                {branch.is_default && (
                                  <Badge className="text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {branch.city && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {branch.city}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs"
                            >
                              <Hash className="w-3 h-3 mr-1" />
                              {stats.currentCounter.toString().padStart(3, "0")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              {stats.totalBookings}
                            </Badge>
                            {stats.activeBookings > 0 && (
                              <Badge className="text-xs bg-green-100 text-green-700">
                                {stats.activeBookings} Active
                              </Badge>
                            )}

                            {isAdmin && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditBranchModal(branch)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {!branch.is_default && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setDeletingBranchId(branch.id)
                                    }
                                    className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Row 2: LR Template + LR Cities */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LR Template */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">LR Template</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure how your LRs look
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templateLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : currentTemplate ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Template
                      </Label>
                      <Badge className="mt-1">
                        {currentTemplate.template_name}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Color
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-5 h-5 rounded-full border"
                          style={{
                            backgroundColor:
                              currentTemplate.style_config?.primary_color,
                          }}
                        />
                        <span className="text-xs font-mono">
                          {currentTemplate.style_config?.primary_color}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTemplateChange}
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-3.5 h-3.5 mr-2" />
                      Change
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTemplatePreview}
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm mb-3">No template configured</p>
                  <Button onClick={handleTemplateChange} size="sm">
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    Configure Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LR Cities - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">LR Cities</CardTitle>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => setShowAddCityModal(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">
                City-wise LR numbering
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lrCitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : lrCities.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm mb-3">No cities configured</p>
                  {isAdmin && (
                    <Button onClick={() => setShowAddCityModal(true)} size="sm">
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Add First City
                    </Button>
                  )}
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                  {lrCities.map((city) => (
                    <div
                      key={city.id}
                      onClick={() => handleViewCityLRs(city)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        city.is_active
                          ? "bg-accent border-primary"
                          : "bg-muted border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              city.is_active ? "bg-green-500" : "bg-gray-300"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {city.city_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Current:{" "}
                              <span className="font-mono font-medium">
                                {city.prefix}
                                {city.current_lr_number}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {city.is_active ? (
                            <Badge className="text-xs bg-green-100 text-green-700 border-0">
                              Active
                            </Badge>
                          ) : (
                            isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) =>
                                  handleSetActiveCity(
                                    city.id,
                                    city.city_name,
                                    e
                                  )
                                }
                                className="h-6 px-2 text-xs"
                              >
                                Set Active
                              </Button>
                            )
                          )}

                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleEditCity(city, e)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>

                              {!city.is_active && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) =>
                                    handleDeleteCity(city.id, city.city_name, e)
                                  }
                                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
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
        </div>
        {/* Row 1: Company Code + Team Members */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Code Card - COMPACT */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Company Code</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Share with employees to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={companyCode}
                  readOnly
                  className="font-mono text-lg font-bold bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCodeToClipboard}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={generateNewCode}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  Generate New Code
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Team Members - COMPACT */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg">Team</CardTitle>
                </div>
                <Badge variant="outline">{employees.length}</Badge>
              </div>
              <CardDescription className="text-xs">
                {filteredEmployees.length} of {employees.length} members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
                {employeeSearch && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEmployeeSearch("")}
                    className="absolute right-0 top-0 h-9 w-9 p-0"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Employee List - Compact */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No employees found
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-2.5 bg-muted rounded-lg text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {employee.name}
                          </span>
                          {employee.id === userProfile?.id && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isAdmin && employee.id !== userProfile?.id ? (
                          <Select
                            value={employee.role}
                            onValueChange={(newRole) =>
                              handleChangeRole(
                                employee.id,
                                newRole,
                                employee.name
                              )
                            }
                          >
                            <SelectTrigger className="w-24 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="dispatcher">
                                Dispatcher
                              </SelectItem>
                              <SelectItem value="warehouse">
                                Warehouse
                              </SelectItem>
                              <SelectItem value="accounts">Accounts</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              employee.role === "admin"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {employee.role}
                          </Badge>
                        )}

                        {isAdmin && employee.id !== userProfile?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDeleteEmployee(employee.id, employee.name)
                            }
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: API Usage - Full Width */}
        <ApiUsageDashboard />
      </div>

      {/* ALL MODALS - Keep as is from original code */}
      {/* Branch Add Modal */}
      <Dialog open={showAddBranchModal} onOpenChange={setShowAddBranchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Code {getNextBranchCode()} will be assigned automatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Branch Code</Label>
              <Badge variant="outline" className="text-2xl px-4 py-2 font-mono">
                {getNextBranchCode()}
              </Badge>
            </div>
            <div>
              <Label>Branch Name *</Label>
              <Input
                value={branchFormData.branch_name}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    branch_name: e.target.value,
                  })
                }
                placeholder="e.g., Vapi Main Office"
                disabled={branchSaving}
              />
            </div>
            <div>
              <Label>City *</Label>
              <Input
                value={branchFormData.city}
                onChange={(e) =>
                  setBranchFormData({ ...branchFormData, city: e.target.value })
                }
                placeholder="e.g., Vapi"
                disabled={branchSaving}
              />
            </div>
            <div>
              <Label>Address (Optional)</Label>
              <Input
                value={branchFormData.address}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    address: e.target.value,
                  })
                }
                placeholder="Full address"
                disabled={branchSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddBranchModal(false)}
              disabled={branchSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBranch}
              disabled={
                branchSaving ||
                !branchFormData.branch_name ||
                !branchFormData.city
              }
            >
              {branchSaving && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Edit Modal */}
      <Dialog open={showEditBranchModal} onOpenChange={setShowEditBranchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Branch Code</Label>
              <Badge variant="outline" className="text-2xl px-4 py-2 font-mono">
                {editingBranch?.branch_code}
              </Badge>
            </div>
            <div>
              <Label>Branch Name *</Label>
              <Input
                value={branchFormData.branch_name}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    branch_name: e.target.value,
                  })
                }
                disabled={branchSaving}
              />
            </div>
            <div>
              <Label>City *</Label>
              <Input
                value={branchFormData.city}
                onChange={(e) =>
                  setBranchFormData({ ...branchFormData, city: e.target.value })
                }
                disabled={branchSaving}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={branchFormData.address}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    address: e.target.value,
                  })
                }
                disabled={branchSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditBranchModal(false);
                setEditingBranch(null);
              }}
              disabled={branchSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleEditBranch} disabled={branchSaving}>
              {branchSaving && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Delete Alert */}
      <AlertDialog
        open={!!deletingBranchId}
        onOpenChange={() => setDeletingBranchId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Branch?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Make sure no bookings are associated
              with this branch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add City Modal */}
      <Dialog open={showAddCityModal} onOpenChange={setShowAddCityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New LR City</DialogTitle>
            <DialogDescription>
              Configure LR numbering for a new city
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>City Name *</Label>
              <Input
                value={newCityForm.city_name}
                onChange={(e) =>
                  setNewCityForm({ ...newCityForm, city_name: e.target.value })
                }
                placeholder="e.g., Vapi, Surat"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prefix</Label>
                <Input
                  value={newCityForm.prefix}
                  onChange={(e) =>
                    setNewCityForm({ ...newCityForm, prefix: e.target.value })
                  }
                  placeholder="LR"
                />
              </div>
              <div>
                <Label>Starting Number *</Label>
                <Input
                  type="number"
                  value={newCityForm.current_lr_number}
                  onChange={(e) =>
                    setNewCityForm({
                      ...newCityForm,
                      current_lr_number: parseInt(e.target.value) || 1001,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCityModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCity} disabled={!newCityForm.city_name}>
              Add City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit LR City Configuration</DialogTitle>
            <DialogDescription>
              Update city name, prefix, and current LR number
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>City Name *</Label>
              <Input
                value={editingCity?.city_name || ""}
                onChange={(e) =>
                  setEditingCity(
                    editingCity
                      ? { ...editingCity, city_name: e.target.value }
                      : null
                  )
                }
                placeholder="e.g., Vapi, Ahmedabad"
              />
            </div>
            <div>
              <Label>Prefix *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editingCity?.prefix || ""}
                  onChange={(e) =>
                    setEditingCity(
                      editingCity
                        ? {
                            ...editingCity,
                            prefix: e.target.value.toUpperCase(),
                          }
                        : null
                    )
                  }
                  placeholder="e.g., VPI, AMD"
                  maxLength={10}
                />
                <Badge variant="outline" className="px-3 py-2 font-mono">
                  {editingCity?.prefix || "XX"}
                  {(editingCity?.current_lr_number || 0)
                    .toString()
                    .padStart(6, "0")}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Current LR Number *</Label>
              <Input
                type="number"
                value={editingCity?.current_lr_number || 1001}
                onChange={(e) =>
                  setEditingCity(
                    editingCity
                      ? {
                          ...editingCity,
                          current_lr_number: parseInt(e.target.value) || 1001,
                        }
                      : null
                  )
                }
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Next LR: {editingCity?.prefix || "XX"}
                {((editingCity?.current_lr_number || 0) + 1)
                  .toString()
                  .padStart(6, "0")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingCity(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCityNumber}
              disabled={
                !editingCity?.city_name ||
                !editingCity?.prefix ||
                editingCity.current_lr_number < 0 ||
                lrCities.some(
                  (c) =>
                    c.id !== editingCity.id && c.prefix === editingCity.prefix
                )
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City LRs Modal */}
      <Dialog open={showCityLRsModal} onOpenChange={setShowCityLRsModal}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {selectedCity?.city_name} - LR Records
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Prefix:{" "}
                  <span className="font-mono font-medium">
                    {selectedCity?.prefix}
                  </span>
                </DialogDescription>
              </div>
              <Badge variant="outline">{filteredCityLRs.length} LRs</Badge>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-2 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search LR number, consignor, route..."
                value={lrSearchTerm}
                onChange={(e) => setLrSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
              {lrSearchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLrSearchTerm("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {filteredCityLRs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCityLRs}
                className="h-9"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden border rounded-lg">
            {loadingCityLRs ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading LRs...</p>
              </div>
            ) : filteredCityLRs.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-1">
                  {lrSearchTerm ? "No matching LRs" : "No LRs yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lrSearchTerm
                    ? "Try adjusting search"
                    : `No LRs for ${selectedCity?.city_name}`}
                </p>
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        LR No.
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Consignor
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Route
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCityLRs.map((lr) => (
                      <tr key={lr.id} className="hover:bg-accent/50">
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {lr.lr_number}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm whitespace-nowrap">
                            {lr.lr_date
                              ? format(new Date(lr.lr_date), "dd MMM yyyy")
                              : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate max-w-[180px]">
                              {lr.consignor?.name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="truncate max-w-[120px]">
                              {lr.from_location || "-"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[120px]">
                              {lr.to_location || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            className={cn(
                              "text-xs",
                              lr.status === "DELIVERED" &&
                                "bg-green-100 text-green-700",
                              lr.status === "IN_TRANSIT" &&
                                "bg-blue-100 text-blue-700",
                              lr.status === "CANCELLED" &&
                                "bg-red-100 text-red-700",
                              lr.status === "PENDING" &&
                                "bg-yellow-100 text-yellow-700"
                            )}
                          >
                            {lr.status.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
