// src/features/lr-generator/templates/MinimalPreview.tsx
import { parseCargoAndMaterials, formatDate } from "./helpers";

interface GoodsItem {
  id: string;
  description?: string;
  quantity?: string;
}

interface PreviewProps {
  customization: any;
  booking?: any;
}

export const LiveMinimalPreview = ({
  customization,
  booking,
}: PreviewProps) => {
  // ✅ Get goods items - NEW FORMAT
  let goodsData: GoodsItem[] = [];

  if (
    booking?.goods_items &&
    Array.isArray(booking.goods_items) &&
    booking.goods_items.length > 0
  ) {
    // New format - goods_items array
    goodsData = booking.goods_items;
  } else {
    // Legacy format - parse from cargo_units and material_description
    const cargoData = parseCargoAndMaterials(
      booking?.cargo_units || "10 boxes",
      booking?.material_description || "Sample goods"
    );
    goodsData = cargoData.map((row, idx) => ({
      id: `legacy-${idx}`,
      description: row.material || "",
      quantity: row.cargo || "",
    }));
  }

  // ✅ Fill to minimum 4 rows for consistent display
  const displayItems = [...goodsData];
  while (displayItems.length < 4) {
    displayItems.push({
      id: `empty-${displayItems.length}`,
      description: "",
      quantity: "",
    });
  }

  return (
    <div
      className="bg-white border"
      style={{
        fontFamily: customization.style_config.font_family,
        fontSize: "11px",
        width: "100%",
        minHeight: "500px",
        padding: "12px",
      }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-2 pb-2 border-b border-black">
        <div className="flex items-center">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "left" &&
            customization.logo_url && (
              <div className="w-18 h-14 mr-3 flex items-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          {customization.header_config.logo_position !== "left" && (
            <div className="text-left">
              <div className="text-xs">LR Number</div>
              <div
                className="text-base font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GENERATED"}
              </div>
              <div className="text-xs">
                Date: {formatDate(booking?.lr_date)}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 text-center px-2">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "center" &&
            customization.logo_url && (
              <div className="w-18 h-14 mx-auto mb-1 flex items-center justify-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

          <h1
            className="font-bold text-xl mb-1"
            style={{ color: customization.style_config.primary_color }}
          >
            {customization.company_details?.name || "YOUR COMPANY"}
          </h1>
          <div className="text-xs">LORRY RECEIPT</div>
          {customization.header_config.show_address && (
            <p className="text-xs mt-1">
              {customization.company_details?.address || "Company Address"}
            </p>
          )}
          <p className="text-xs">
            {customization.company_details?.phone || "+91-9999999999"} |{" "}
            {customization.company_details?.email || "info@company.com"}
          </p>
          {customization.header_config.show_gst && (
            <p className="text-xs">
              GSTIN: {customization.company_details?.gst || "07AAAAA0000A1Z5"}
            </p>
          )}
        </div>

        <div className="flex items-center">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "right" &&
            customization.logo_url && (
              <div className="w-18 h-14 ml-3 flex items-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          {customization.header_config.logo_position !== "right" && (
            <div className="text-right">
              <div className="text-xs">LR Number</div>
              <div
                className="text-base font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GENERATED"}
              </div>
              <div className="text-xs">
                Date: {formatDate(booking?.lr_date)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FROM-TO */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="border border-gray-400 p-2">
          <div className="font-bold text-xs mb-1">FROM (Origin)</div>
          <div className="text-xs">
            {booking?.from_location || "Origin City"}
          </div>
          {customization.visible_fields?.consignor !== false &&
            booking?.consignor && (
              <div className="mt-2">
                <div className="font-bold text-xs">Consignor:</div>
                <div className="text-xs">
                  <div>{booking.consignor.name || "Consignor Name"}</div>
                  <div>{booking.consignor.address || "Address"}</div>
                  <div>Ph: {booking.consignor.phone || "N/A"}</div>
                </div>
              </div>
            )}
        </div>

        <div className="border border-gray-400 p-2">
          <div className="font-bold text-xs mb-1">TO (Destination)</div>
          <div className="text-xs">
            {booking?.to_location || "Destination City"}
          </div>
          {customization.visible_fields?.consignee !== false &&
            booking?.consignee && (
              <div className="mt-2">
                <div className="font-bold text-xs">Consignee:</div>
                <div className="text-xs">
                  <div>{booking.consignee.name || "Consignee Name"}</div>
                  <div>{booking.consignee.address || "Address"}</div>
                  <div>Ph: {booking.consignee.phone || "N/A"}</div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ✅ GOODS TABLE - UPDATED WITH goods_items */}
      <div className="border border-gray-400 mb-2">
        <div className="grid grid-cols-12 bg-gray-100 p-1 text-xs font-bold border-b border-gray-400">
          <div className="col-span-3">Quantity</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-center">Weight</div>
          <div className="col-span-2 text-right">Value (₹)</div>
        </div>

        <div className="p-1">
          {displayItems.slice(0, 4).map((item, index) => (
            <div
              key={item.id || index}
              className="grid grid-cols-12 text-xs py-1 border-b border-gray-100 last:border-b-0"
            >
              {/* ✅ Quantity - only show if has value */}
              <div className="col-span-3">
                {item.quantity || <span className="text-gray-300">-</span>}
              </div>

              {/* ✅ Description - only show if has value */}
              <div className="col-span-5">
                {item.description || <span className="text-gray-300">-</span>}
              </div>

              {/* Weight - placeholder */}
              <div className="col-span-2 text-center text-gray-300">-</div>

              {/* Value - placeholder */}
              <div className="col-span-2 text-right text-gray-300">-</div>
            </div>
          ))}
        </div>

        {/* BILLING SECTION */}
        <div className="border-t border-gray-400 p-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <span>{booking?.invoice_number || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>E-way Bill:</span>
                <span>{booking?.eway_bill || "-"}</span>
              </div>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Freight:</span>
                <span>
                  ₹ {booking?.freight_charges?.toLocaleString("en-IN") || "0"}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Total:</span>
                <span>
                  ₹ {booking?.freight_charges?.toLocaleString("en-IN") || "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DECLARATION */}
      <div className="text-xs mb-2">
        <div className="font-bold">Declaration:</div>
        <div>
          {customization.footer_config?.terms_text ||
            "Goods booked at owner's risk."}
        </div>
      </div>

      {/* SIGNATURES */}
      {customization.footer_config?.show_signature && (
        <div className="border-t pt-2 mt-2">
          <div className="grid grid-cols-4 gap-2 text-center">
            {["Booking Clerk", "Driver", "Consignor", "Consignee"].map(
              (label, idx) => (
                <div key={idx}>
                  <div className="border-b border-gray-400 mb-1 h-6"></div>
                  <div className="text-xs">{label}</div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
