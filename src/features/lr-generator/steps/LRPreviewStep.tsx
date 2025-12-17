// src/features/lr-generator/steps/LRPreviewStep.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileDown,
  Save,
  Printer,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Eye,
  Edit3,
} from "lucide-react";
import { LRLivePreview } from "@/features/lr-generator/LRLivePreview";
import type { StandaloneLRFormData } from "@/lib/validations/standalone-lr";
import {
  createStandaloneLRDocument,
  updateStandaloneLRDocument,
} from "@/api/standalone-lr-generator";
import { generateStandaloneLRPDF } from "@/lib/standaloneLRPdfGenerator";

interface LRPreviewStepProps {
  formData: StandaloneLRFormData;
  templateCode: string;
  companyData: any;
  editingDocId?: string | null; // ✅ For edit mode
  onBack: () => void;
  onStartNew: () => void;
}

export const LRPreviewStep = ({
  formData,
  templateCode,
  companyData,
  editingDocId = null,
  onBack,
  onStartNew,
}: LRPreviewStepProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(editingDocId);

  // ✅ Handle Save (Create or Update)
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const dataToSave = {
        ...formData,
        template_code: templateCode,
        status: "DRAFT" as const,
      };

      if (editingDocId) {
        // ✅ UPDATE existing document
        await updateStandaloneLRDocument(editingDocId, dataToSave);
        setSavedId(editingDocId);
        setIsSaved(true);

        toast({
          title: "✅ LR Updated Successfully!",
          description: `LR ${formData.standalone_lr_number} has been updated`,
        });
      } else {
        // ✅ CREATE new document
        const doc = await createStandaloneLRDocument(dataToSave);
        setSavedId(doc.id);
        setIsSaved(true);

        toast({
          title: "✅ LR Saved Successfully!",
          description: `LR ${formData.standalone_lr_number} has been saved`,
        });
      }
    } catch (error) {
      console.error("Error saving LR:", error);
      toast({
        title: "❌ Save Failed",
        description: "Failed to save LR. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Handle Download PDF
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      // Save first if not saved
      if (!isSaved && !editingDocId) {
        const dataToSave = {
          ...formData,
          template_code: templateCode,
          status: "GENERATED" as const,
        };
        const doc = await createStandaloneLRDocument(dataToSave);
        setSavedId(doc.id);
        setIsSaved(true);
      } else if (editingDocId && !isSaved) {
        // Update status if editing
        await updateStandaloneLRDocument(editingDocId, {
          status: "GENERATED" as const,
        });
        setIsSaved(true);
      }

      // Generate PDF
      await generateStandaloneLRPDF(formData, companyData, templateCode);

      toast({
        title: "✅ PDF Downloaded!",
        description: `LR ${formData.standalone_lr_number} PDF has been generated`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
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
    <div className="max-w-5xl mx-auto">
      {/* Header - Hide on print */}
      <div className="text-center mb-6 no-print">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          {editingDocId ? (
            <Edit3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          ) : (
            <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
          {editingDocId ? "Review Changes" : "Preview Your LR"}
        </h2>
        <p className="text-muted-foreground dark:text-muted-foreground">
          {editingDocId
            ? "Review your changes and update when ready"
            : "Review the LR and save or download when ready"}
        </p>
      </div>

      {/* Actions Bar - Hide on print */}
      <Card className="mb-6 bg-card border border-border dark:border-border no-print">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground dark:text-white">
                LR Number:
              </span>
              <span className="text-lg font-bold text-primary">
                {formData.standalone_lr_number || "-"}
              </span>
              {editingDocId && (
                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                  <Edit3 className="w-3 h-3" />
                  Editing
                </span>
              )}
              {isSaved && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {editingDocId ? "Updated" : "Saved"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isSaved ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaved
                  ? editingDocId
                    ? "Updated"
                    : "Saved"
                  : editingDocId
                  ? "Update LR"
                  : "Save LR"}
              </Button>

              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Preview - Wrapped in print-area class */}
      <div className="mb-6 print-area">
        <LRLivePreview
          formData={formData}
          templateCode={templateCode}
          companyData={companyData}
          showCard={false}
        />
      </div>

      {/* Bottom Actions - Hide on print */}
      <div className="flex justify-between pt-4 border-t border-border dark:border-border no-print">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Edit
        </Button>

        <Button
          variant="outline"
          onClick={onStartNew}
          className="border-primary text-primary hover:bg-primary/10"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New LR
        </Button>
      </div>
    </div>
  );
};
