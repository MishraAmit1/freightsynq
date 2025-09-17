// Replace entire VehicleDetailDrawer.tsx with this:

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Truck,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Package
} from "lucide-react";
import { format } from "date-fns";

interface VehicleDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: any | null; // Using any for now since we have mixed data structure
}

export const VehicleDetailDrawer = ({ isOpen, onClose, vehicle }: VehicleDetailDrawerProps) => {
  if (!vehicle) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      AVAILABLE: "bg-success text-success-foreground",
      OCCUPIED: "bg-info text-info-foreground",
      MAINTENANCE: "bg-warning text-warning-foreground",
      INACTIVE: "bg-muted text-muted-foreground"
    };
    return colors[status as keyof typeof colors] || colors.AVAILABLE;
  };

  // Handle both old and new data formats
  const vehicleNumber = vehicle.vehicle_number || vehicle.vehicleNumber;
  const vehicleType = vehicle.vehicle_type || vehicle.vehicleType;
  const capacity = vehicle.capacity;
  const status = vehicle.status;
  const isOwned = vehicle.is_owned !== undefined ? vehicle.is_owned : vehicle.isOwned;
  const isVerified = vehicle.is_verified !== undefined ? vehicle.is_verified : vehicle.isVerified;
  const addedDate = vehicle.added_date || vehicle.addedDate || vehicle.created_at;
  const broker = vehicle.broker;
  const vehicleAssignments = vehicle.vehicle_assignments || [];
  const vehicleDocuments = vehicle.vehicle_documents || vehicle.documents || [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Vehicle Details - {vehicleNumber}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Number</p>
                <p className="font-medium">{vehicleNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{vehicleType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium">{capacity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(status)}>
                  {status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ownership</p>
                <p className="font-medium">{isOwned ? 'Owned' : 'Hired'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verification</p>
                {isVerified ? (
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-warning text-warning-foreground">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Broker Information (if hired) */}
          {!isOwned && broker && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Broker Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{broker.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Person</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {broker.contact_person || broker.contactPerson}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{broker.phone}</span>
                    </div>
                  </div>
                  {broker.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{broker.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Assignment Information */}
          {vehicleAssignments && vehicleAssignments.length > 0 && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Assignment</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      Booking ID: {vehicleAssignments[0].booking?.booking_id || `BKG-${vehicleAssignments[0].booking_id}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vehicle is currently assigned to this booking
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            {vehicleDocuments && vehicleDocuments.length > 0 ? (
              <div className="space-y-2">
                {vehicleDocuments.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4" />
                      <div>
                        <p className="font-medium">
                          {doc.file_name || doc.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type || doc.type} • Uploaded {format(new Date(doc.uploaded_date || doc.uploadedDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(doc.is_verified !== undefined ? doc.is_verified : doc.isVerified) ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning text-warning-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vehicle History</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Vehicle Added</p>
                  <p className="text-sm text-muted-foreground">
                    {addedDate ? format(new Date(addedDate), 'MMM dd, yyyy HH:mm') : 'Date not available'}
                  </p>
                </div>
              </div>
              {isVerified && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-medium">Vehicle Verified</p>
                    <p className="text-sm text-muted-foreground">
                      All documents verified and approved
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};