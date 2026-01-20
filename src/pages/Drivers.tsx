import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UserCog,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  User,
  Loader2,
  Star,
  AlertCircle,
  XCircle,
  CheckCircle,
  X,
  Save,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Types
interface Driver {
  id: string;
  name: string;
  phone: string;
  license_number: string;
  experience?: string;
  status?: string;
  created_at?: string;
}

interface DriverFormData {
  name: string;
  phone: string;
  licenseNumber: string;
  experience: string;
}

// ✅ THEMED: Drawer Modal Component WITH 2000PX+ RESPONSIVE
const DriverDrawer = ({
  isOpen,
  onClose,
  onSave,
  driver = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driverData: DriverFormData) => Promise<void>;
  driver?: Driver | null;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState<DriverFormData>({
    name: "",
    phone: "",
    licenseNumber: "",
    experience: "",
  });

  const mode = driver ? "edit" : "create";

  useEffect(() => {
    if (isOpen) {
      if (driver) {
        setDriverData({
          name: driver.name || "",
          phone: driver.phone || "",
          licenseNumber: driver.license_number || "",
          experience: driver.experience || "",
        });
      } else {
        setDriverData({
          name: "",
          phone: "",
          licenseNumber: "",
          experience: "",
        });
      }
    }
  }, [driver, isOpen]);

  const handleSubmit = async () => {
    if (
      !driverData.name.trim() ||
      !driverData.phone.trim() ||
      !driverData.licenseNumber.trim()
    ) {
      toast({
        title: "❌ Validation Error",
        description: "Name, Phone, and License Number are required",
        variant: "destructive",
      });
      return;
    }

    if (driverData.phone.length < 10) {
      toast({
        title: "❌ Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await onSave(driverData);
      handleClose();
    } catch (error) {
      console.error("Error saving driver:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDriverData({ name: "", phone: "", licenseNumber: "", experience: "" });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md min-[2000px]:sm:max-w-lg overflow-y-auto bg-card border-l border-border dark:border-border">
        <SheetHeader className="border-b border-border dark:border-border pb-4 min-[2000px]:pb-6">
          <SheetTitle className="flex items-center gap-2 min-[2000px]:gap-3 text-foreground dark:text-white min-[2000px]:text-xl">
            <div className="p-2 min-[2000px]:p-3 bg-accent dark:bg-primary/10 rounded-lg">
              <UserCog className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
            </div>
            {mode === "edit" ? "Edit Driver" : "Add New Driver"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 min-[2000px]:space-y-6 py-6 min-[2000px]:py-8">
          {/* Driver Name */}
          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-foreground dark:text-white">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={driverData.name}
              onChange={(e) =>
                setDriverData({ ...driverData, name: e.target.value })
              }
              placeholder="Enter driver's name"
              disabled={loading}
              className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
            />
          </div>

          <Separator className="my-4 min-[2000px]:my-5 bg-[#E5E7EB] dark:bg-secondary" />

          {/* Phone & License in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-[2000px]:gap-4">
            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-foreground dark:text-white">
                Phone <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-2.5 min-[2000px]:left-3 top-2.5 min-[2000px]:top-3 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground" />
                <Input
                  value={driverData.phone}
                  onChange={(e) =>
                    setDriverData({ ...driverData, phone: e.target.value })
                  }
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  disabled={loading}
                  className="pl-9 min-[2000px]:pl-10 h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-foreground dark:text-white">
                License Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 min-[2000px]:left-3 top-2.5 min-[2000px]:top-3 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground" />
                <Input
                  value={driverData.licenseNumber}
                  onChange={(e) =>
                    setDriverData({
                      ...driverData,
                      licenseNumber: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="MH1420110012345"
                  disabled={loading}
                  className="pl-9 min-[2000px]:pl-10 h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 uppercase border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
            </div>
          </div>

          <Separator className="my-4 min-[2000px]:my-5 bg-[#E5E7EB] dark:bg-secondary" />

          {/* Rating */}
          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-foreground dark:text-white">
              Rating (Out of 5)
            </Label>
            <div className="relative">
              <Star className="absolute left-2.5 min-[2000px]:left-3 top-2.5 min-[2000px]:top-3 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                value={driverData.experience}
                onChange={(e) =>
                  setDriverData({ ...driverData, experience: e.target.value })
                }
                placeholder="e.g., 5 or 3"
                disabled={loading}
                className="pl-9 min-[2000px]:pl-10 h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
            <p className="text-[10px] min-[2000px]:text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              Optional - Rate driver performance (1-5)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 min-[2000px]:gap-3 pt-4 min-[2000px]:pt-6 border-t border-border dark:border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              size="sm"
              className="h-9 min-[2000px]:h-11 min-[2000px]:text-base border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
            >
              <X className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
              className="h-9 min-[2000px]:h-11 min-[2000px]:text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2" />
                  {mode === "edit" ? "Update" : "Add Driver"}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Main Driver Component WITH 2000PX+ RESPONSIVE
const Drivers = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
            .driver-table td { position: relative; }
            .driver-table td::before { content: ''; position: absolute; left: 0; right: 0; top: -1px; bottom: -1px; background: transparent; pointer-events: none; transition: background-color 0.2s ease; z-index: 0; }
            .driver-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
            .driver-table tr:hover td > * { position: relative; z-index: 1; }
        `;
    document.head.appendChild(styleElement);
    return () => document.head.removeChild(styleElement);
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load drivers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async (driverData: DriverFormData) => {
    try {
      const { error } = await supabase
        .from("drivers")
        .insert([
          {
            name: driverData.name,
            phone: driverData.phone,
            license_number: driverData.licenseNumber,
            experience: driverData.experience || null,
            status: "ACTIVE",
          },
        ])
        .select()
        .single();
      if (error) {
        if (error.code === "23505")
          throw new Error(
            `A driver with license number ${driverData.licenseNumber} already exists.`,
          );
        throw error;
      }
      await fetchDrivers();
      toast({ title: "✅ Success", description: "Driver added successfully" });
    } catch (error: any) {
      console.error("Error adding driver:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add driver",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateDriver = async (driverData: DriverFormData) => {
    if (!editingDriver) return;
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          name: driverData.name,
          phone: driverData.phone,
          license_number: driverData.licenseNumber,
          experience: driverData.experience || null,
        })
        .eq("id", editingDriver.id);
      if (error) {
        if (error.code === "23505")
          throw new Error(
            `A driver with license number ${driverData.licenseNumber} already exists.`,
          );
        throw error;
      }
      await fetchDrivers();
      toast({
        title: "✅ Success",
        description: "Driver updated successfully",
      });
      setEditingDriver(null);
    } catch (error: any) {
      console.error("Error updating driver:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update driver",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteDriver = async () => {
    if (!deletingDriverId) return;
    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", deletingDriverId);
      if (error) throw error;
      await fetchDrivers();
      toast({
        title: "✅ Success",
        description: "Driver deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast({
        title: "❌ Error",
        description: "Failed to delete driver",
        variant: "destructive",
      });
    } finally {
      setDeletingDriverId(null);
    }
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] min-[2000px]:min-h-[500px] space-y-4 min-[2000px]:space-y-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 min-[2000px]:w-16 min-[2000px]:h-16 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg min-[2000px]:text-xl font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
          Loading drivers...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-[2000px]:space-y-8">
      {/* Add Driver Button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditingDriver(null);
            setIsDrawerOpen(true);
          }}
          className="h-10 min-[2000px]:h-12 min-[2000px]:text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
        >
          <Plus className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Search + Table Card */}
      <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        {/* Search Section */}
        <div className="p-4 sm:p-6 min-[2000px]:p-8 border-b border-border dark:border-border">
          <div className="relative w-full sm:w-96 min-[2000px]:sm:w-[500px]">
            <Search className="absolute left-3 min-[2000px]:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground dark:text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-[2000px]:pl-12 pr-10 min-[2000px]:pr-12 h-10 min-[2000px]:h-12 min-[2000px]:text-lg border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary text-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 min-[2000px]:h-10 min-[2000px]:w-10 p-0 hover:bg-accent dark:hover:bg-secondary"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="p-4 sm:p-6 min-[2000px]:p-8">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="driver-table">
              <TableHeader>
                <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
                    <div className="flex items-center gap-2 min-[2000px]:gap-3">
                      <User className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                      Name
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
                    <div className="flex items-center gap-2 min-[2000px]:gap-3">
                      <Phone className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                      Phone
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
                    <div className="flex items-center gap-2 min-[2000px]:gap-3">
                      <CreditCard className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                      License No.
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
                    <div className="flex items-center gap-2 min-[2000px]:gap-3">
                      <Star className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                      Experience
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center min-[2000px]:text-base">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-16 min-[2000px]:py-20"
                    >
                      <div className="flex flex-col items-center gap-4 min-[2000px]:gap-5">
                        <div className="p-4 min-[2000px]:p-5 bg-muted rounded-full">
                          <UserCog className="w-12 h-12 min-[2000px]:w-16 min-[2000px]:h-16 text-muted-foreground dark:text-muted-foreground" />
                        </div>
                        <div className="text-muted-foreground dark:text-muted-foreground">
                          <p className="text-lg min-[2000px]:text-xl font-medium">
                            No drivers found
                          </p>
                          <p className="text-sm min-[2000px]:text-base mt-1">
                            {searchTerm
                              ? "Try adjusting your search"
                              : "Add your first driver to get started"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow
                      key={driver.id}
                      className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                    >
                      <TableCell>
                        <div className="font-semibold flex items-center gap-2 min-[2000px]:gap-3 text-foreground dark:text-white min-[2000px]:text-base">
                          <User className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground dark:text-muted-foreground" />
                          {driver.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-[2000px]:gap-3 text-sm min-[2000px]:text-base text-foreground dark:text-white">
                          <Phone className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-muted-foreground dark:text-muted-foreground" />
                          <span className="font-mono">{driver.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs min-[2000px]:text-sm border-border dark:border-border"
                        >
                          {driver.license_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {driver.experience ? (
                          <div className="flex items-center gap-1 min-[2000px]:gap-1.5 text-sm min-[2000px]:text-base text-foreground dark:text-white">
                            <Star className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-yellow-500" />
                            <span>{driver.experience}</span>
                          </div>
                        ) : (
                          <span className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            driver.status === "ACTIVE" ? "default" : "secondary"
                          }
                          className={cn(
                            "cursor-pointer text-xs min-[2000px]:text-sm font-medium",
                            driver.status === "ACTIVE"
                              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : "bg-[#F3F4F6] text-muted-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
                          )}
                        >
                          {driver.status === "ACTIVE" ? (
                            <CheckCircle className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 mr-1" />
                          )}
                          {driver.status || "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 min-[2000px]:h-10 min-[2000px]:w-10 hover:bg-accent dark:hover:bg-secondary"
                              >
                                <MoreVertical className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 min-[2000px]:w-56 bg-card border-border dark:border-border"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDriver(driver);
                                  setIsDrawerOpen(true);
                                }}
                                className="hover:bg-accent dark:hover:bg-secondary cursor-pointer min-[2000px]:text-base min-[2000px]:py-3"
                              >
                                <Edit className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-secondary" />
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer min-[2000px]:text-base min-[2000px]:py-3"
                                onClick={() => setDeletingDriverId(driver.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                                Delete Driver
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 min-[2000px]:space-y-4">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-12 min-[2000px]:py-16">
                <div className="flex flex-col items-center gap-4 min-[2000px]:gap-5">
                  <div className="p-4 min-[2000px]:p-5 bg-muted rounded-full">
                    <UserCog className="w-12 h-12 min-[2000px]:w-16 min-[2000px]:h-16 text-muted-foreground dark:text-muted-foreground" />
                  </div>
                  <div className="text-muted-foreground dark:text-muted-foreground">
                    <p className="text-lg min-[2000px]:text-xl font-medium">
                      No drivers found
                    </p>
                    <p className="text-sm min-[2000px]:text-base mt-1">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Add your first driver to get started"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-card border border-border dark:border-border rounded-lg p-4 min-[2000px]:p-6 space-y-3 min-[2000px]:space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 min-[2000px]:gap-3">
                        <User className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground dark:text-muted-foreground" />
                        <span className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                          {driver.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-[2000px]:gap-1.5 text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground ml-6 min-[2000px]:ml-8">
                        <Phone className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5" />
                        <span className="font-mono">{driver.phone}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-[2000px]:h-10 min-[2000px]:w-10"
                        >
                          <MoreVertical className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 min-[2000px]:w-56 bg-card border-border dark:border-border"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingDriver(driver);
                            setIsDrawerOpen(true);
                          }}
                          className="hover:bg-accent dark:hover:bg-secondary min-[2000px]:text-base min-[2000px]:py-3"
                        >
                          <Edit className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-secondary" />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 min-[2000px]:text-base min-[2000px]:py-3"
                          onClick={() => setDeletingDriverId(driver.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                          Delete Driver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        driver.status === "ACTIVE" ? "default" : "secondary"
                      }
                      className={cn(
                        "cursor-pointer text-xs min-[2000px]:text-sm font-medium",
                        driver.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : "bg-[#F3F4F6] text-muted-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
                      )}
                    >
                      {driver.status === "ACTIVE" ? (
                        <CheckCircle className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 mr-1" />
                      )}
                      {driver.status || "ACTIVE"}
                    </Badge>
                  </div>

                  <div className="space-y-2 min-[2000px]:space-y-2.5 text-sm min-[2000px]:text-base pt-2 min-[2000px]:pt-3 border-t border-border dark:border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-muted-foreground text-xs min-[2000px]:text-sm">
                        License:
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs min-[2000px]:text-sm border-border dark:border-border"
                      >
                        {driver.license_number}
                      </Badge>
                    </div>
                    {driver.experience && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground dark:text-muted-foreground text-xs min-[2000px]:text-sm">
                          Experience:
                        </span>
                        <div className="flex items-center gap-1 min-[2000px]:gap-1.5 text-xs min-[2000px]:text-sm">
                          <Star className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 text-yellow-500" />
                          <span>{driver.experience}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Driver Drawer */}
      <DriverDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingDriver(null);
        }}
        onSave={editingDriver ? handleUpdateDriver : handleAddDriver}
        driver={editingDriver}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingDriverId}
        onOpenChange={() => setDeletingDriverId(null)}
      >
        <AlertDialogContent className="max-w-md min-[2000px]:max-w-lg bg-card border-border dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 min-[2000px]:gap-3 text-foreground dark:text-white min-[2000px]:text-xl">
              <AlertCircle className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-red-600" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
              This action will permanently delete the driver. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="min-[2000px]:gap-3">
            <AlertDialogCancel className="h-10 min-[2000px]:h-11 min-[2000px]:text-base border-border dark:border-border hover:bg-accent dark:hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              className="h-10 min-[2000px]:h-11 min-[2000px]:text-base bg-red-600 text-white hover:bg-red-700"
            >
              Delete Driver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Drivers;
