import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";

interface PODViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string | null;
    bookingId: string;
}

export const PODViewerModal = ({
    isOpen,
    onClose,
    fileUrl,
    bookingId
}: PODViewerModalProps) => {
    if (!fileUrl) return null;

    const isPdf = fileUrl.toLowerCase().includes('.pdf');
    const fileName = `POD_${bookingId}_${new Date().toISOString().split('T')[0]}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName + (isPdf ? '.pdf' : '.jpg');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(fileUrl, '_blank');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        {isPdf ? (
                            <FileText className="w-5 h-5 text-red-600" />
                        ) : (
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                        )}
                        <div>
                            <h3 className="font-semibold text-sm">Proof of Delivery</h3>
                            <p className="text-xs text-muted-foreground">Booking: {bookingId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mr-10">
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.open(fileUrl, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        {/* ❌ REMOVED: Manual close button - DialogContent already has one */}
                    </div>
                </div>

                {/* Content Viewer */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 overflow-auto">
                    {isPdf ? (
                        <iframe
                            src={`${fileUrl}#toolbar=0`}
                            className="w-full h-full rounded-lg shadow-lg bg-white"
                            title="POD PDF"
                        />
                    ) : (
                        <img
                            src={fileUrl}
                            alt="POD"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};