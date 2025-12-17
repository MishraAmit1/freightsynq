// src/features/lr-generator/SavedLRsList.tsx
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Search,
  Loader2,
  FileText,
  Calendar,
  MapPin,
  Trash2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getStandaloneLRDocuments,
  deleteStandaloneLRDocument,
  type StandaloneLRDocument,
} from "@/api/standalone-lr-generator";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SavedLRsListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (doc: StandaloneLRDocument) => void;
}

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

export const SavedLRsList = ({
  isOpen,
  onClose,
  onSelect,
}: SavedLRsListProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<StandaloneLRDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getStandaloneLRDocuments({ limit: 50 });
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

  const handleDelete = async (id: string, lrNumber: string) => {
    if (!confirm(`Are you sure you want to delete LR ${lrNumber}?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteStandaloneLRDocument(id);

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));

      toast({
        title: "✅ Deleted",
        description: `LR ${lrNumber} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "❌ Error",
        description: "Failed to delete LR",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl bg-card border-l border-border dark:border-border overflow-y-auto"
      >
        <SheetHeader className="border-b border-border dark:border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <FileText className="w-5 h-5 text-primary" />
            Saved LR Documents
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
            <Input
              placeholder="Search by LR number, consignor, consignee, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-10",
                "border-border dark:border-border bg-card",
                "text-foreground dark:text-white",
                "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-ring focus:border-primary"
              )}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredDocuments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-3" />
              <p className="text-muted-foreground dark:text-muted-foreground">
                {searchQuery
                  ? "No LRs found matching your search"
                  : "No saved LRs yet"}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="mt-4 border-border dark:border-border"
                >
                  Create Your First LR
                </Button>
              )}
            </div>
          )}

          {/* Documents List */}
          {!loading && filteredDocuments.length > 0 && (
            <div className="border border-border dark:border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted dark:bg-[#252530] hover:bg-muted">
                    <TableHead className="text-foreground dark:text-white font-semibold">
                      LR Number
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white font-semibold">
                      Route
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-foreground dark:text-white font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-accent dark:hover:bg-muted cursor-pointer"
                      onClick={() => onSelect(doc)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground dark:text-white">
                            {doc.standalone_lr_number}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {doc.consignor_name} → {doc.consignee_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground dark:text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.lr_date).toLocaleDateString("en-IN")}
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
                          <span className="text-foreground dark:text-white">
                            {doc.from_location?.split(",")[0]} →{" "}
                            {doc.to_location?.split(",")[0]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            statusConfig[doc.status || "DRAFT"].color
                          )}
                        >
                          {statusConfig[doc.status || "DRAFT"].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(doc);
                            }}
                          >
                            <Eye className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20"
                            disabled={deletingId === doc.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc.id, doc.standalone_lr_number);
                            }}
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer Info */}
          {!loading && filteredDocuments.length > 0 && (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center pt-2">
              Showing {filteredDocuments.length} of {documents.length} LR
              documents
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
