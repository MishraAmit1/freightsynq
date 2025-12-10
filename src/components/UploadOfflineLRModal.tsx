// components/UploadOfflineLRModal.tsx
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Upload,
    Loader2,
    X,
    FileText,
    Image as ImageIcon,
    FileEdit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface UploadOfflineLRModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: {
        id: string;
        bookingId: string;
        lrNumber: string;
    } | null;
    onSuccess: () => void;
}

export const UploadOfflineLRModal = ({
    isOpen,
    onClose,
    booking,
    onSuccess
}: UploadOfflineLRModalProps) => {
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
                    variant: "destructive"
                });
                return;
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(selectedFile.type)) {
                toast({
                    title: "❌ Invalid File Type",
                    description: "Please select an image (JPG, PNG) or PDF file",
                    variant: "destructive"
                });
                return;
            }

            setFile(selectedFile);

            // Create preview for images
            if (selectedFile.type.startsWith('image/')) {
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${booking.lrNumber}_OFFLINE_LR_${Date.now()}.${fileExt}`;
            const filePath = `offline-lr-documents/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('booking-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('booking-documents')
                .getPublicUrl(filePath);

            // Update booking record
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    offline_lr_file_url: publicUrl,
                    offline_lr_uploaded_at: new Date().toISOString(),
                    offline_lr_uploaded_by: user.id
                })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            // Add timeline entry
            await supabase
                .from('booking_timeline')
                .insert({
                    booking_id: booking.id,
                    action: 'OFFLINE_LR_UPLOADED',
                    description: `Offline LR document uploaded: ${fileName}`
                });

            toast({
                title: "✅ LR Document Uploaded",
                description: "Physical LR copy has been uploaded successfully",
            });

            onSuccess();
            handleClose();

        } catch (error: any) {
            console.error('Offline LR upload error:', error);
            toast({
                title: "❌ Upload Failed",
                description: error.message || "Failed to upload LR document",
                variant: "destructive"
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileEdit className="w-5 h-5 text-primary" />
                        Upload Physical LR Copy
                    </DialogTitle>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>LR Number: <span className="font-medium">{booking.lrNumber}</span></p>
                        <p>Booking: <span className="font-medium">{booking.bookingId}</span></p>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="lr-file">
                            Select LR Document (Image or PDF)
                        </Label>
                        <Input
                            id="lr-file"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Max size: 5MB • Formats: JPG, PNG, PDF
                        </p>
                    </div>

                    {/* Preview */}
                    {file && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <div className="flex items-center gap-3">
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="LR Preview"
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-background rounded flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
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
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload LR
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};