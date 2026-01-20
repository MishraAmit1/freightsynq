import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface UploadPODModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    bookingId: string;
  } | null;
  onSuccess: () => void;
}

export const UploadPODModal = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: UploadPODModalProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "❌ File Too Large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "❌ Invalid File Type",
          description: "Please select an image (JPG, PNG) or PDF file",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !booking) return;

    setUploading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${booking.bookingId}_POD_${Date.now()}.${fileExt}`;
      const filePath = `pod-documents/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("booking-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("booking-documents").getPublicUrl(filePath);

      // Update booking record
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          pod_file_url: publicUrl,
          pod_uploaded_at: new Date().toISOString(),
          pod_uploaded_by: user.id,
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      // Add timeline entry
      await supabase.from("booking_timeline").insert({
        booking_id: booking.id,
        action: "POD_UPLOADED",
        description: `POD uploaded: ${fileName}`,
      });

      toast({
        title: "✅ POD Uploaded",
        description: "Proof of delivery has been uploaded successfully",
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("POD upload error:", error);
      toast({
        title: "❌ Upload Failed",
        description: error.message || "Failed to upload POD",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md min-[2000px]:sm:max-w-lg">
        <DialogHeader className="min-[2000px]:pb-2">
          <DialogTitle className="text-lg min-[2000px]:text-xl">
            Upload Proof of Delivery
          </DialogTitle>
          <p className="text-sm min-[2000px]:text-base text-muted-foreground">
            Booking: {booking.bookingId}
          </p>
        </DialogHeader>

        <div className="space-y-4 min-[2000px]:space-y-5 py-4 min-[2000px]:py-5">
          <div>
            <Label
              htmlFor="pod-file"
              className="text-sm min-[2000px]:text-base"
            >
              Select POD Document (Image or PDF)
            </Label>
            <Input
              id="pod-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-2 h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base file:text-sm min-[2000px]:file:text-base"
            />
            <p className="text-xs min-[2000px]:text-sm text-muted-foreground mt-1">
              Max size: 5MB • Formats: JPG, PNG, PDF
            </p>
          </div>

          {/* Preview */}
          {file && (
            <div className="border rounded-lg p-4 min-[2000px]:p-5 bg-muted/50">
              <div className="flex items-center gap-3 min-[2000px]:gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="POD Preview"
                    className="w-20 h-20 min-[2000px]:w-24 min-[2000px]:h-24 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 min-[2000px]:w-24 min-[2000px]:h-24 bg-background rounded flex items-center justify-center">
                    <FileText className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm min-[2000px]:text-base">
                    {file.name}
                  </p>
                  <p className="text-xs min-[2000px]:text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  disabled={uploading}
                  className="h-9 w-9 min-[2000px]:h-10 min-[2000px]:w-10"
                >
                  <X className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 min-[2000px]:gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                Upload POD
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
