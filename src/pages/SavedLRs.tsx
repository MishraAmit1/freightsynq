// src/pages/SavedLRs.tsx - Complete with Edit
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Search,
  Loader2,
  FileText,
  Calendar,
  MapPin,
  Trash2,
  Edit,
  FileDown,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getStandaloneLRDocuments,
  deleteStandaloneLRDocument,
  type StandaloneLRDocument,
} from "@/api/standalone-lr-generator";
import { generateStandaloneLRPDF } from "@/lib/standaloneLRPdfGenerator";
import { getCurrentTemplateWithCompany } from "@/api/lr-templates";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  DRAFT: {
    label: "Draft",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  GENERATED: {
    label: "Generated",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
};

export const SavedLRs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<StandaloneLRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<StandaloneLRDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadCompanyData();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getStandaloneLRDocuments({ limit: 100 });
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load saved LRs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      const { company } = await getCurrentTemplateWithCompany();
      setCompanyData(company);
    } catch (error) {
      console.error("Error loading company data:", error);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      setDeleting(true);
      await deleteStandaloneLRDocument(documentToDelete.id);

      setDocuments((prev) =>
        prev.filter((doc) => doc.id !== documentToDelete.id)
      );

      toast({
        title: "✅ Deleted",
        description: `LR ${documentToDelete.standalone_lr_number} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "❌ Error",
        description: "Failed to delete LR",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleDownload = async (doc: StandaloneLRDocument) => {
    try {
      setDownloadingId(doc.id);

      console.log("📥 Download clicked for:", doc.standalone_lr_number);
      console.log("📦 Document goods_items:", doc.goods_items);

      await generateStandaloneLRPDF(
        doc,
        companyData,
        doc.template_code || "standard"
      );

      toast({
        title: "✅ PDF Downloaded",
        description: `LR ${doc.standalone_lr_number} has been downloaded`,
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "❌ Download Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // ✅ EDIT HANDLER - Navigate to LR Generator with edit mode
  const handleEdit = (doc: StandaloneLRDocument) => {
    // Store the document in sessionStorage for editing
    sessionStorage.setItem("editLRDocument", JSON.stringify(doc));
    navigate("/lr-generator?mode=edit");
  };

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.standalone_lr_number?.toLowerCase().includes(query) ||
      doc.consignor_name?.toLowerCase().includes(query) ||
      doc.consignee_name?.toLowerCase().includes(query) ||
      doc.from_location?.toLowerCase().includes(query) ||
      doc.to_location?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-background dark:bg-background p-4 md:p-6 pb-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/lr-generator")}
              className="hover:bg-accent dark:hover:bg-secondary"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Saved LR Documents
              </h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                {documents.length} total LRs saved
              </p>
            </div>
          </div>
          {/* 
          <Button
            onClick={() => navigate("/lr-generator")}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New LR
          </Button> */}
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6 bg-card border border-border dark:border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by LR number, consignor, consignee, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-10",
                "border-border dark:border-border bg-card",
                "text-foreground dark:text-white",
                "placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-ring focus:border-primary"
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border border-border dark:border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-2">
                {searchQuery ? "No LRs found" : "No saved LRs yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first LR to get started"}
              </p>
              {/* {!searchQuery && (
                <Button
                  onClick={() => navigate("/lr-generator")}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New LR
                </Button>
              )} */}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted dark:bg-[#252530] hover:bg-muted">
                    <TableHead className="font-semibold text-foreground dark:text-white">
                      LR Number
                    </TableHead>
                    <TableHead className="font-semibold text-foreground dark:text-white">
                      Date
                    </TableHead>
                    <TableHead className="font-semibold text-foreground dark:text-white">
                      Consignor
                    </TableHead>
                    <TableHead className="font-semibold text-foreground dark:text-white">
                      Consignee
                    </TableHead>
                    <TableHead className="font-semibold text-foreground dark:text-white">
                      Route
                    </TableHead>
                    {/* <TableHead className="font-semibold text-foreground dark:text-white">
                      Status
                    </TableHead> */}
                    <TableHead className="font-semibold text-foreground dark:text-white text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border"
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground dark:text-white">
                            {doc.standalone_lr_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-foreground dark:text-white">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(doc.lr_date), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground dark:text-white">
                          {doc.consignor_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.consignor_city || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground dark:text-white">
                          {doc.consignee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.consignee_city || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground dark:text-white">
                            {doc.from_location?.split(",")[0]} →{" "}
                            {doc.to_location?.split(",")[0]}
                          </span>
                        </div>
                      </TableCell>
                      {/* <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            statusConfig[doc.status || "DRAFT"].color
                          )}
                        >
                          {statusConfig[doc.status || "DRAFT"].label}
                        </Badge>
                      </TableCell> */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* Download */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            title="Download PDF"
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <FileDown className="w-4 h-4 text-primary" />
                            )}
                          </Button>

                          {/* ✅ EDIT BUTTON */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
                            onClick={() => handleEdit(doc)}
                            title="Edit LR"
                          >
                            <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => {
                              setDocumentToDelete(doc);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-white">
              Delete LR Document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete LR{" "}
              <span className="font-semibold text-foreground">
                {documentToDelete?.standalone_lr_number}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border dark:border-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
