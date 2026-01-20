// pages/CompanyProfile.tsx
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Edit,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  MapPin,
  FileText,
  CreditCard,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const CompanyProfile = () => {
  const { company, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    gst_number: "",
    pan_number: "",
    company_type: "",
    logo_url: "",
  });

  useEffect(() => {
    if (company) {
      loadCompanyData();
    }
  }, [company]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", company.id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        gst_number: data.gst_number || "",
        pan_number: data.pan_number || "",
        company_type: data.company_type || "transporter",
        logo_url: data.logo_url || "",
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load company data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          gst_number: formData.gst_number,
          pan_number: formData.pan_number,
          company_type: formData.company_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", company.id);

      if (error) throw error;

      toast({
        title: "✅ Success",
        description: "Company profile updated successfully",
      });

      setEditMode(false);
      await refreshUserProfile();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update company profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "❌ Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "❌ File Too Large",
        description: "Image size should be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${company.id}-${Date.now()}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("company-assets").getPublicUrl(filePath);

      // Update company
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", company.id);

      if (updateError) throw updateError;

      setFormData((prev) => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "✅ Logo Uploaded",
        description: "Company logo updated successfully",
      });

      await refreshUserProfile();
    } catch (error: any) {
      toast({
        title: "❌ Upload Failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Company Profile
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your company information and branding
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <Button onClick={() => setEditMode(true)} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false);
                    loadCompanyData();
                  }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Upload your company logo (Max 2MB, PNG/JPG)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Logo Preview */}
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Company Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: Square image, at least 200x200px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!editMode}
                className={cn(!editMode && "bg-muted")}
              />
            </div>

            <div className="space-y-2">
              <Label>Company Type *</Label>
              <Select
                value={formData.company_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, company_type: value }))
                }
                disabled={!editMode}
              >
                <SelectTrigger className={cn(!editMode && "bg-muted")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transporter">Transporter</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="3pl">3PL</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="shipper">Shipper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <div className="relative">
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className={cn("pl-9", !editMode && "bg-muted")}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone *</Label>
              <div className="relative">
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className={cn("pl-9", !editMode && "bg-muted")}
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tax Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>GST Number</Label>
              <div className="relative">
                <Input
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  placeholder="27AABCU9603R1ZM"
                  className={cn("pl-9", !editMode && "bg-muted")}
                  maxLength={15}
                />
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>PAN Number</Label>
              <div className="relative">
                <Input
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  placeholder="AABCU9603R"
                  className={cn("pl-9", !editMode && "bg-muted")}
                  maxLength={10}
                />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Status Badges */}
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  GST Status:
                </span>
                {formData.gst_number ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600 text-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Added
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  PAN Status:
                </span>
                {formData.pan_number ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Added
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600 text-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Added
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Company Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Address</Label>
            <Textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!editMode}
              placeholder="Enter complete address"
              className={cn(!editMode && "bg-muted")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                disabled={!editMode}
                placeholder="Mumbai"
                className={cn(!editMode && "bg-muted")}
              />
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Input
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                disabled={!editMode}
                placeholder="Maharashtra"
                className={cn(!editMode && "bg-muted")}
              />
            </div>
          </div>

          {/* Address Completion Alert */}
          {(!formData.address || !formData.city || !formData.state) && (
            <Alert className="border-yellow-200 bg-yellow-50/50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Complete your address to show on invoices and LR documents
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
