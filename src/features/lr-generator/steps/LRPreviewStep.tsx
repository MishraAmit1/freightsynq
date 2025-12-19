// src/features/lr-generator/steps/LRPreviewStep.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { LRLivePreview } from "../LRLivePreview";
import type { StandaloneLRFormData } from "@/lib/validations/standalone-lr";
import {
  createStandaloneLRDocument,
  updateStandaloneLRDocument,
} from "@/api/standalone-lr-generator";
import { generateStandaloneLRPDF } from "@/lib/standaloneLRPdfGenerator"; // ✅ Add this import

interface LRPreviewStepProps {
  formData: StandaloneLRFormData;
  templateCode: string;
  companyData?: any;
  editingDocId?: string | null;
  onBack: () => void;
  onStartNew: () => void;
}

export const LRPreviewStep = ({
  formData,
  templateCode,
  companyData,
  editingDocId,
  onBack,
  onStartNew,
}: LRPreviewStepProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // ✅ Changed from isPrinting
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(editingDocId);

  // Handle Save
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const saveData = {
        standalone_lr_number: formData.standalone_lr_number,
        lr_date: formData.lr_date,

        // Company details
        company_name: formData.company_name,
        company_address: formData.company_address,
        company_city: formData.company_city,
        company_state: formData.company_state,
        company_phone: formData.company_phone,
        company_email: formData.company_email,
        company_gst: formData.company_gst,
        company_pan: formData.company_pan,
        company_logo_url: formData.company_logo_url,

        // Consignor
        consignor_name: formData.consignor_name,
        consignor_address: formData.consignor_address,
        consignor_city: formData.consignor_city,
        consignor_state: formData.consignor_state,
        consignor_pincode: formData.consignor_pincode,
        consignor_phone: formData.consignor_phone,
        consignor_gst: formData.consignor_gst,
        consignor_email: formData.consignor_email,

        // Consignee
        consignee_name: formData.consignee_name,
        consignee_address: formData.consignee_address,
        consignee_city: formData.consignee_city,
        consignee_state: formData.consignee_state,
        consignee_pincode: formData.consignee_pincode,
        consignee_phone: formData.consignee_phone,
        consignee_gst: formData.consignee_gst,
        consignee_email: formData.consignee_email,

        // Route
        from_location: formData.from_location,
        to_location: formData.to_location,

        // Goods items (filter empty items)
        goods_items:
          formData.goods_items?.filter(
            (item) => item.description || item.quantity
          ) || [],

        // Other goods details
        weight: formData.weight,
        invoice_number: formData.invoice_number,
        invoice_value: formData.invoice_value,
        eway_bill_number: formData.eway_bill_number,

        // Vehicle & Driver
        vehicle_number: formData.vehicle_number,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone,

        // Payment
        freight_amount: formData.freight_amount,
        payment_mode: formData.payment_mode,

        // Other
        remarks: formData.remarks,
        template_code: templateCode,
        status: "DRAFT" as const,
      };

      console.log("💾 Saving data:", saveData);

      let result;
      if (savedDocId) {
        result = await updateStandaloneLRDocument(savedDocId, saveData);
        toast({
          title: "✅ LR Updated",
          description: `LR ${formData.standalone_lr_number} has been updated successfully`,
        });
      } else {
        result = await createStandaloneLRDocument(saveData);
        setSavedDocId(result.id);
        toast({
          title: "✅ LR Saved",
          description: `LR ${formData.standalone_lr_number} has been saved successfully`,
        });
      }

      setIsSaved(true);
      console.log("✅ Save successful:", result);
    } catch (error) {
      console.error("❌ Save error:", error);
      toast({
        title: "❌ Error",
        description: "Failed to save LR. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ NEW: Handle Download PDF (using jsPDF generator)
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      console.log("📥 Starting PDF download...");
      console.log("📄 Form Data:", formData);
      console.log("🏢 Company Data:", companyData);

      // ✅ Convert formData to StandaloneLRDocument format
      const lrDocument = {
        id: savedDocId || "temp-id",
        standalone_lr_number: formData.standalone_lr_number,
        lr_date: formData.lr_date,

        // Company
        company_name: formData.company_name,
        company_address: formData.company_address,
        company_city: formData.company_city,
        company_state: formData.company_state,
        company_phone: formData.company_phone,
        company_email: formData.company_email,
        company_gst: formData.company_gst,
        company_pan: formData.company_pan,
        company_logo_url: formData.company_logo_url,

        // Consignor
        consignor_name: formData.consignor_name,
        consignor_address: formData.consignor_address,
        consignor_city: formData.consignor_city,
        consignor_state: formData.consignor_state,
        consignor_pincode: formData.consignor_pincode,
        consignor_phone: formData.consignor_phone,
        consignor_gst: formData.consignor_gst,
        consignor_email: formData.consignor_email,

        // Consignee
        consignee_name: formData.consignee_name,
        consignee_address: formData.consignee_address,
        consignee_city: formData.consignee_city,
        consignee_state: formData.consignee_state,
        consignee_pincode: formData.consignee_pincode,
        consignee_phone: formData.consignee_phone,
        consignee_gst: formData.consignee_gst,
        consignee_email: formData.consignee_email,

        // Route
        from_location: formData.from_location,
        to_location: formData.to_location,

        // ✅ Goods items - filter empty
        goods_items:
          formData.goods_items?.filter(
            (item) => item.description || item.quantity
          ) || [],

        // Other
        weight: formData.weight,
        invoice_number: formData.invoice_number,
        invoice_value: formData.invoice_value,
        eway_bill_number: formData.eway_bill_number,
        vehicle_number: formData.vehicle_number,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone,
        freight_amount: formData.freight_amount,
        payment_mode: formData.payment_mode,
        remarks: formData.remarks,
        template_code: templateCode,
        status: "DRAFT",
      } as any;

      console.log("📦 LR Document for PDF:", lrDocument);

      // Generate PDF using jsPDF
      await generateStandaloneLRPDF(lrDocument, companyData, templateCode);

      toast({
        title: "✅ PDF Downloaded",
        description: `LR ${formData.standalone_lr_number} has been downloaded`,
      });
    } catch (error) {
      console.error("❌ Download error:", error);
      toast({
        title: "❌ Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card className="bg-card border border-border dark:border-border no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isSaving || isDownloading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edit
              </Button>

              {isSaved && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved Successfully</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isDownloading}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {savedDocId ? "Update LR" : "Save LR"}
                  </>
                )}
              </Button>

              {/* ✅ UPDATED: Download PDF button */}
              <Button
                onClick={handleDownloadPDF}
                disabled={isSaving || isDownloading}
                className="bg-primary hover:bg-primary/90"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>

              {/* {isSaved && (
                <Button variant="outline" onClick={onStartNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              )} */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <div className="w-full">
        <LRLivePreview
          formData={formData}
          templateCode={templateCode}
          companyData={companyData}
          showCard={true}
        />
      </div>
    </div>
  );
};
