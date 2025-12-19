// src/features/lr-generator/LRLivePreview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StandaloneLRFormData } from "@/lib/validations/standalone-lr";

import { LiveStandardPreview } from "./templates/StandardPreview";
import { LiveMinimalPreview } from "./templates/MinimalPreview";
import { LiveDetailedPreview } from "./templates/DetailedPreview";
import { LiveGSTPreview } from "./templates/GSTPreview";

interface LRLivePreviewProps {
  formData: StandaloneLRFormData;
  templateCode: string;
  companyData?: any;
  className?: string;
  showCard?: boolean;
}

export const LRLivePreview = ({
  formData,
  templateCode,
  companyData,
  className,
  showCard = true,
}: LRLivePreviewProps) => {
  // ✅ Convert goods_items array for templates
  const goodsItems =
    formData.goods_items?.filter((item) => item.description || item.quantity) ||
    [];

  // Convert form data to booking-like structure
  const bookingData = {
    lr_number: formData.standalone_lr_number || "LR-XXXXXX",
    lr_date: formData.lr_date,
    booking_id: "STANDALONE",

    consignor: {
      name: formData.consignor_name || "Consignor Name",
      address: formData.consignor_address,
      city: formData.consignor_city,
      state: formData.consignor_state,
      pincode: formData.consignor_pincode,
      phone: formData.consignor_phone,
      gst_number: formData.consignor_gst,
      email: formData.consignor_email,
    },

    consignee: {
      name: formData.consignee_name || "Consignee Name",
      address: formData.consignee_address,
      city: formData.consignee_city,
      state: formData.consignee_state,
      pincode: formData.consignee_pincode,
      phone: formData.consignee_phone,
      gst_number: formData.consignee_gst,
      email: formData.consignee_email,
    },

    from_location: formData.from_location || "Origin",
    to_location: formData.to_location || "Destination",

    // ✅ NEW: Pass goods_items array
    goods_items:
      goodsItems.length > 0
        ? goodsItems
        : [{ id: "1", description: "Sample goods", quantity: "10 boxes" }],

    weight: formData.weight,
    invoice_number: formData.invoice_number,
    invoice_value: formData.invoice_value,
    eway_bill: formData.eway_bill_number,

    vehicle_number: formData.vehicle_number,
    driver_name: formData.driver_name,
    driver_phone: formData.driver_phone,

    freight_charges: formData.freight_amount,
    payment_mode: formData.payment_mode,

    remarks: formData.remarks,
  };

  // USE FORM DATA FOR COMPANY (with fallback to companyData prop)
  const customization = {
    logo_url: formData.company_logo_url || companyData?.logo_url || "",
    company_details: {
      name: formData.company_name || companyData?.name || "Your Company Name",
      address:
        formData.company_address || companyData?.address || "Company Address",
      city: formData.company_city || companyData?.city || "City",
      state: formData.company_state || companyData?.state || "State",
      gst: formData.company_gst || companyData?.gst_number || "22AAAAA0000A1Z5",
      pan: formData.company_pan || companyData?.pan_number || "AAAAA0000A",
      phone: formData.company_phone || companyData?.phone || "+91 9999999999",
      email: formData.company_email || companyData?.email || "info@company.com",
    },
    header_config: {
      show_logo: !!(formData.company_logo_url || companyData?.logo_url),
      logo_position: "left",
      show_gst: true,
      show_pan: false,
      show_address: true,
    },
    visible_fields: {
      lr_number: true,
      booking_id: false,
      date: true,
      consignor: true,
      consignee: true,
      from_location: true,
      to_location: true,
      goods_items: true,
      vehicle_number: true,
      driver_details: true,
      weight: !!formData.weight,
      freight_charges: !!formData.freight_amount,
      payment_mode: !!formData.payment_mode,
      remarks: !!formData.remarks,
    },
    style_config: {
      primary_color: "#000000",
      secondary_color: "#666666",
      font_family: "Arial",
      font_size: "12px",
    },
    footer_config: {
      show_terms: true,
      terms_text: formData.remarks || "Goods once sent will not be taken back",
      show_signature: true,
      signature_labels: ["Consignor", "Driver", "Consignee"],
    },
  };

  const renderTemplate = () => {
    switch (templateCode) {
      case "standard":
        return (
          <LiveStandardPreview
            customization={customization}
            booking={bookingData}
          />
        );
      case "minimal":
        return (
          <LiveMinimalPreview
            customization={customization}
            booking={bookingData}
          />
        );
      case "detailed":
        return (
          <LiveDetailedPreview
            customization={customization}
            booking={bookingData}
          />
        );
      case "gst_invoice":
        return (
          <LiveGSTPreview customization={customization} booking={bookingData} />
        );
      default:
        return (
          <LiveStandardPreview
            customization={customization}
            booking={bookingData}
          />
        );
    }
  };

  const isLandscape =
    templateCode === "standard" || templateCode === "detailed";

  if (!showCard) {
    return <div className={cn("bg-white", className)}>{renderTemplate()}</div>;
  }

  return (
    <Card
      className={cn(
        "bg-card border border-border dark:border-border",
        className
      )}
    >
      <CardHeader className="border-b border-border dark:border-border pb-3 no-print">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <Eye className="w-5 h-5 text-primary" />
            Live Preview
          </CardTitle>
          <Badge
            variant="secondary"
            className="text-xs bg-accent dark:bg-secondary"
          >
            {isLandscape ? "Landscape" : "Portrait"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-auto bg-muted dark:bg-[#1a1a1a] p-4">
          <div
            className="origin-top-left"
            style={{
              transform: isLandscape ? "scale(0.6)" : "scale(0.7)",
              width: isLandscape ? "166%" : "143%",
            }}
          >
            {renderTemplate()}
          </div>
        </div>

        <div className="border-t border-border dark:border-border p-3 bg-accent/50 dark:bg-secondary/50 no-print">
          <p className="text-xs text-muted-foreground text-center">
            Preview updates as you type
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
