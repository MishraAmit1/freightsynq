// src/pages/LRGenerator.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  CheckCircle2,
  LayoutTemplate,
  FormInput,
  Eye,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { TemplateSelectionStep } from "@/features/lr-generator/steps/TemplateSelectionStep";
import { LRFormStep } from "@/features/lr-generator/steps/LRFormStep";
import { LRPreviewStep } from "@/features/lr-generator/steps/LRPreviewStep";
import type { StandaloneLRFormData } from "@/lib/validations/standalone-lr";
import { getCurrentTemplateWithCompany } from "@/api/lr-templates";
import { cn } from "@/lib/utils";

// Step configuration
const STEPS = [
  { id: 1, name: "Select Template", icon: LayoutTemplate },
  { id: 2, name: "Fill Details", icon: FormInput },
  { id: 3, name: "Preview & Save", icon: Eye },
];

export const LRGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState<StandaloneLRFormData | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // ✅ Check for edit mode on mount
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "edit") {
      loadEditDocument();
    }
  }, [searchParams]);

  // ✅ Load company data
  const loadCompanyData = useCallback(async () => {
    try {
      const { company } = await getCurrentTemplateWithCompany();
      setCompanyData(company);
      return company;
    } catch (error) {
      console.error("Error loading company data:", error);
      return null;
    }
  }, []);

  // ✅ Load document for editing
  const loadEditDocument = async () => {
    try {
      const storedDoc = sessionStorage.getItem("editLRDocument");
      if (!storedDoc) {
        toast({
          title: "❌ Error",
          description: "No document found to edit",
          variant: "destructive",
        });
        navigate("/saved-lrs");
        return;
      }

      setIsLoading(true);
      const doc = JSON.parse(storedDoc);

      // Load company data
      await loadCompanyData();

      // Set form data from document
      const editFormData: StandaloneLRFormData = {
        standalone_lr_number: doc.standalone_lr_number || "",
        lr_date: doc.lr_date || new Date().toISOString().split("T")[0],
        consignor_name: doc.consignor_name || "",
        consignor_address: doc.consignor_address || "",
        consignor_city: doc.consignor_city || "",
        consignor_state: doc.consignor_state || "",
        consignor_pincode: doc.consignor_pincode || "",
        consignor_phone: doc.consignor_phone || "",
        consignor_gst: doc.consignor_gst || "",
        consignor_email: doc.consignor_email || "",
        consignee_name: doc.consignee_name || "",
        consignee_address: doc.consignee_address || "",
        consignee_city: doc.consignee_city || "",
        consignee_state: doc.consignee_state || "",
        consignee_pincode: doc.consignee_pincode || "",
        consignee_phone: doc.consignee_phone || "",
        consignee_gst: doc.consignee_gst || "",
        consignee_email: doc.consignee_email || "",
        from_location: doc.from_location || "",
        to_location: doc.to_location || "",
        material_description: doc.material_description || "",
        packages_qty: doc.packages_qty || "",
        weight: doc.weight || undefined,
        invoice_number: doc.invoice_number || "",
        invoice_value: doc.invoice_value || undefined,
        eway_bill_number: doc.eway_bill_number || "",
        vehicle_number: doc.vehicle_number || "",
        driver_name: doc.driver_name || "",
        driver_phone: doc.driver_phone || "",
        freight_amount: doc.freight_amount || undefined,
        payment_mode: doc.payment_mode || "TO_PAY",
        remarks: doc.remarks || "",
        template_code: doc.template_code || "standard",
      };

      setFormData(editFormData);
      setSelectedTemplate(doc.template_code || "standard");
      setEditingDocId(doc.id);
      setCurrentStep(2); // Go directly to form step

      // Clean up session storage
      sessionStorage.removeItem("editLRDocument");

      toast({
        title: "📝 Edit Mode",
        description: `Editing LR ${doc.standalone_lr_number}`,
      });
    } catch (error) {
      console.error("Error loading edit document:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load document for editing",
        variant: "destructive",
      });
      navigate("/saved-lrs");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle template selection
  const handleTemplateSelect = async (templateCode: string) => {
    setSelectedTemplate(templateCode);
    setIsLoading(true);

    await loadCompanyData();

    // Initialize form with defaults (only if not editing)
    if (!editingDocId) {
      setFormData({
        standalone_lr_number: "",
        lr_date: new Date().toISOString().split("T")[0],
        consignor_name: "",
        consignor_address: "",
        consignor_city: "",
        consignor_state: "",
        consignor_pincode: "",
        consignor_phone: "",
        consignor_gst: "",
        consignor_email: "",
        consignee_name: "",
        consignee_address: "",
        consignee_city: "",
        consignee_state: "",
        consignee_pincode: "",
        consignee_phone: "",
        consignee_gst: "",
        consignee_email: "",
        from_location: "",
        to_location: "",
        material_description: "",
        packages_qty: "",
        weight: undefined,
        invoice_number: "",
        invoice_value: undefined,
        eway_bill_number: "",
        vehicle_number: "",
        driver_name: "",
        driver_phone: "",
        freight_amount: undefined,
        payment_mode: "TO_PAY",
        remarks: "",
        template_code: templateCode,
      } as StandaloneLRFormData);
    }

    setIsLoading(false);
    setCurrentStep(2);
  };

  // ✅ Handle template change from step 2
  const handleTemplateChange = (templateCode: string) => {
    setSelectedTemplate(templateCode);
    if (formData) {
      setFormData({ ...formData, template_code: templateCode });
    }
  };

  // ✅ Handle form data update
  const handleFormUpdate = (data: StandaloneLRFormData) => {
    setFormData({ ...data, template_code: selectedTemplate });
  };

  // ✅ Proceed to preview
  const handleProceedToPreview = (data: StandaloneLRFormData) => {
    // Validate required fields
    if (!data.standalone_lr_number) {
      toast({
        title: "⚠️ LR Number Required",
        description: "Please enter the LR number",
        variant: "destructive",
      });
      return;
    }

    if (!data.consignor_name || !data.consignee_name) {
      toast({
        title: "⚠️ Party Details Required",
        description: "Please enter consignor and consignee names",
        variant: "destructive",
      });
      return;
    }

    if (!data.from_location || !data.to_location) {
      toast({
        title: "⚠️ Route Required",
        description: "Please enter from and to locations",
        variant: "destructive",
      });
      return;
    }

    setFormData({ ...data, template_code: selectedTemplate });
    setCurrentStep(3);
  };

  // ✅ Go back to previous step
  const handleBack = () => {
    if (currentStep === 2) {
      // If editing, go back to saved LRs
      if (editingDocId) {
        navigate("/saved-lrs");
        return;
      }
      // Reset form when going back to template selection
      setFormData(null);
      setSelectedTemplate("");
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // ✅ Reset and start over
  const handleStartNew = () => {
    setCurrentStep(1);
    setSelectedTemplate("");
    setFormData(null);
    setEditingDocId(null);
    // Clear URL params
    navigate("/lr-generator", { replace: true });
  };

  return (
    <div className="bg-background dark:bg-background pb-6">
      {/* Header */}
      <div className="border-b border-border dark:border-border bg-card dark:bg-card sticky top-0 z-10 no-print">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground dark:text-white">
                  {editingDocId ? "Edit LR" : "LR Generator"}
                </h1>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {editingDocId
                    ? `Editing: ${formData?.standalone_lr_number || ""}`
                    : "Create standalone Lorry Receipts"}
                </p>
              </div>
            </div>

            {/* Saved LRs Button */}
            <Button
              variant="outline"
              onClick={() => navigate("/saved-lrs")}
              className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              View Saved LRs
            </Button>
          </div>

          {/* Step Progress - Show only if not in edit mode at step 2, or show always except when editing */}
          {!editingDocId && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 md:gap-4">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <step.icon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium hidden md:inline">
                        {step.name}
                      </span>
                      <span className="text-sm font-medium md:hidden">
                        {step.id}
                      </span>
                    </div>

                    {/* Connector Line */}
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "w-8 md:w-12 h-0.5 mx-2",
                          currentStep > step.id
                            ? "bg-green-400 dark:bg-green-600"
                            : "bg-border dark:bg-border"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Mode Progress Bar */}
          {editingDocId && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full",
                    currentStep === 2
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <FormInput className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Details</span>
                </div>

                <div
                  className={cn(
                    "w-12 h-0.5",
                    currentStep > 2 ? "bg-blue-400" : "bg-border"
                  )}
                />

                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full",
                    currentStep === 3
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">Review & Update</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 md:px-6 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {editingDocId ? "Loading document..." : "Preparing form..."}
            </p>
          </div>
        )}

        {/* Step 1: Template Selection */}
        {!isLoading && currentStep === 1 && !editingDocId && (
          <TemplateSelectionStep onSelect={handleTemplateSelect} />
        )}

        {/* Step 2: Form with Preview */}
        {!isLoading && currentStep === 2 && formData && (
          <LRFormStep
            initialData={formData}
            selectedTemplate={selectedTemplate}
            companyData={companyData}
            onTemplateChange={handleTemplateChange}
            onFormChange={handleFormUpdate}
            onNext={handleProceedToPreview}
            onBack={handleBack}
            isEditMode={!!editingDocId}
          />
        )}

        {/* Step 3: Preview */}
        {!isLoading && currentStep === 3 && formData && (
          <LRPreviewStep
            formData={formData}
            templateCode={selectedTemplate}
            companyData={companyData}
            editingDocId={editingDocId}
            onBack={() => setCurrentStep(2)}
            onStartNew={handleStartNew}
          />
        )}
      </div>
    </div>
  );
};
