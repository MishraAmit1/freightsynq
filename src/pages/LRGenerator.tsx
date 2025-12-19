// src/pages/LRGenerator.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
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

const STEPS = [
  { id: 1, name: "Select Template", icon: LayoutTemplate },
  { id: 2, name: "Fill Details", icon: FormInput },
  { id: 3, name: "Preview & Save", icon: Eye },
];

export const LRGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState<StandaloneLRFormData | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith("/lr-generator")) {
      setCurrentStep(1);
      setSelectedTemplate("");
      setFormData(null);
      setEditingDocId(null);
      setIsLoading(false);
      sessionStorage.removeItem("editLRDocument");
    }
  }, [location.pathname]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "edit") {
      loadEditDocument();
    }
  }, [searchParams]);

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
      const company = await loadCompanyData();

      // Parse goods_items if it's a string
      let goodsItems = doc.goods_items;
      if (typeof goodsItems === "string") {
        try {
          goodsItems = JSON.parse(goodsItems);
        } catch {
          goodsItems = [];
        }
      }

      const editFormData: StandaloneLRFormData = {
        standalone_lr_number: doc.standalone_lr_number || "",
        lr_date: doc.lr_date || new Date().toISOString().split("T")[0],

        // Company fields from saved doc or fallback
        company_name: doc.company_name || company?.name || "",
        company_address: doc.company_address || company?.address || "",
        company_city: doc.company_city || company?.city || "",
        company_state: doc.company_state || company?.state || "",
        company_phone: doc.company_phone || company?.phone || "",
        company_email: doc.company_email || company?.email || "",
        company_gst: doc.company_gst || company?.gst_number || "",
        company_pan: doc.company_pan || company?.pan_number || "",
        company_logo_url: doc.company_logo_url || company?.logo_url || "",

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

        // Goods items
        goods_items:
          Array.isArray(goodsItems) && goodsItems.length > 0
            ? goodsItems
            : [{ id: crypto.randomUUID(), description: "", quantity: "" }],

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
      setCurrentStep(2);

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

  const handleTemplateSelect = async (templateCode: string) => {
    setSelectedTemplate(templateCode);
    setIsLoading(true);

    const company = await loadCompanyData();

    if (!editingDocId) {
      setFormData({
        standalone_lr_number: "",
        lr_date: new Date().toISOString().split("T")[0],

        // Company fields auto-filled
        company_name: company?.name || "",
        company_address: company?.address || "",
        company_city: company?.city || "",
        company_state: company?.state || "",
        company_phone: company?.phone || "",
        company_email: company?.email || "",
        company_gst: company?.gst_number || "",
        company_pan: company?.pan_number || "",
        company_logo_url: company?.logo_url || "",

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

        // Initialize with one empty goods item
        goods_items: [
          { id: crypto.randomUUID(), description: "", quantity: "" },
        ],

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

  const handleTemplateChange = (templateCode: string) => {
    setSelectedTemplate(templateCode);
    if (formData) {
      setFormData({ ...formData, template_code: templateCode });
    }
  };

  const handleFormUpdate = (data: StandaloneLRFormData) => {
    setFormData({ ...data, template_code: selectedTemplate });
  };

  const handleProceedToPreview = (data: StandaloneLRFormData) => {
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

  const handleBack = () => {
    if (currentStep === 2) {
      if (editingDocId) {
        navigate("/saved-lrs");
        return;
      }
      setFormData(null);
      setSelectedTemplate("");
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleStartNew = () => {
    setCurrentStep(1);
    setSelectedTemplate("");
    setFormData(null);
    setEditingDocId(null);
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
                <p className="text-sm text-muted-foreground">
                  {editingDocId
                    ? `Editing: ${formData?.standalone_lr_number || ""}`
                    : "Create standalone Lorry Receipts"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/saved-lrs")}
              className="border-border hover:bg-accent dark:hover:bg-secondary"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              View Saved LRs
            </Button>
          </div>

          {/* Step Progress */}
          {!editingDocId && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 md:gap-4">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
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

                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "w-8 md:w-12 h-0.5 mx-2",
                          currentStep > step.id
                            ? "bg-green-400 dark:bg-green-600"
                            : "bg-border"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Mode Progress */}
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

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {editingDocId ? "Loading document..." : "Preparing form..."}
            </p>
          </div>
        )}

        {!isLoading && currentStep === 1 && !editingDocId && (
          <TemplateSelectionStep onSelect={handleTemplateSelect} />
        )}

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
