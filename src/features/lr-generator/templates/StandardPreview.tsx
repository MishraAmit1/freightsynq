// src/features/lr-generator/templates/StandardPreview.tsx
import { formatDate } from "./helpers";

interface GoodsItem {
  id: string;
  description?: string;
  quantity?: string;
}

interface PreviewProps {
  customization: any;
  booking?: any;
}

export const LiveStandardPreview = ({
  customization,
  booking,
}: PreviewProps) => {
  // ✅ Get goods items from booking
  const goodsItems: GoodsItem[] = booking?.goods_items || [];

  // ✅ Fill empty rows up to 5 for consistent display
  const displayItems = [...goodsItems];
  while (displayItems.length < 5) {
    displayItems.push({
      id: `empty-${displayItems.length}`,
      description: "",
      quantity: "",
    });
  }

  return (
    <div
      className="bg-white border-2 border-black"
      style={{
        fontFamily: customization.style_config.font_family,
        fontSize: "11px",
        width: "100%",
        minHeight: "500px",
        padding: "15px",
      }}
    >
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-black">
        {/* LEFT SECTION */}
        <div className="flex items-center">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "left" &&
            customization.logo_url && (
              <div className="w-20 h-16 mr-3 flex items-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          {customization.header_config.logo_position === "right" && (
            <div className="text-left">
              <div className="text-sm font-bold">LR Number</div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GENERATED"}
              </div>
              <div className="text-xs mt-1">{formatDate(booking?.lr_date)}</div>
            </div>
          )}
        </div>

        {/* CENTER - Company Details */}
        <div className="flex-1 text-center">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "center" &&
            customization.logo_url && (
              <div className="w-20 h-16 mx-auto mb-2 flex items-center justify-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

          <h1
            className="font-bold text-2xl mb-1"
            style={{ color: customization.style_config.primary_color }}
          >
            {customization.company_details?.name || "YOUR COMPANY NAME"}
          </h1>
          {customization.header_config.show_address && (
            <p className="text-xs">
              {customization.company_details?.address || "Company Address"}
            </p>
          )}
          <p className="text-xs">
            Email: {customization.company_details?.email || "info@company.com"}{" "}
            | Mobile: {customization.company_details?.phone || "1800-123-4567"}
          </p>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center">
          {customization.header_config.show_logo &&
            customization.header_config.logo_position === "right" &&
            customization.logo_url && (
              <div className="w-20 h-16 ml-3 flex items-center">
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          {customization.header_config.logo_position !== "right" && (
            <div className="text-right">
              <div className="text-sm font-bold">LR Number</div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GENERATED"}
              </div>
              <div className="text-xs mt-1">{formatDate(booking?.lr_date)}</div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-HEADER ROW */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="border border-black p-2">
          <div className="font-bold">At OWNER'S risk</div>
          <div>Subject to Jurisdiction</div>
        </div>
        <div className="border border-black p-2 text-center">
          <div className="font-bold">Vehicle No.</div>
          <div>{booking?.vehicle_number || "-"}</div>
        </div>
        <div className="border border-black p-2 text-center">
          <div className="font-bold">GSTIN</div>
          <div>{customization.company_details?.gst || "29AABCV1234M1Z5"}</div>
        </div>
      </div>

      {/* CONSIGNOR & CONSIGNEE */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {customization.visible_fields?.consignor !== false && (
          <div className="border border-black p-2">
            <div className="font-bold bg-gray-100 px-1 -mx-1 -mt-1 mb-1 border-b border-black">
              CONSIGNOR
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-medium">
                {booking?.consignor?.name || "Consignor Name"}
              </div>
              <div>{booking?.consignor?.address || "Address"}</div>
              <div>GST: {booking?.consignor?.gst_number || "N/A"}</div>
              <div>Mobile: {booking?.consignor?.phone || "N/A"}</div>
            </div>
          </div>
        )}

        {customization.visible_fields?.consignee !== false && (
          <div className="border border-black p-2">
            <div className="font-bold bg-gray-100 px-1 -mx-1 -mt-1 mb-1 border-b border-black">
              CONSIGNEE
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-medium">
                {booking?.consignee?.name || "Consignee Name"}
              </div>
              <div>{booking?.consignee?.address || "Address"}</div>
              <div>GST: {booking?.consignee?.gst_number || "N/A"}</div>
              <div>Mobile: {booking?.consignee?.phone || "N/A"}</div>
            </div>
          </div>
        )}
      </div>

      {/* FROM & TO */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="border border-black p-2">
          <span className="font-bold">FROM:</span>{" "}
          {booking?.from_location || "Origin"}
        </div>
        <div className="border border-black p-2">
          <span className="font-bold">TO:</span>{" "}
          {booking?.to_location || "Destination"}
        </div>
      </div>

      {/* ✅ GOODS & BILLING - Updated with dynamic table */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Goods Description Table */}
        <div className="border border-black">
          <div className="font-bold text-center bg-gray-100 p-1 border-b border-black">
            GOODS DESCRIPTION
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black bg-gray-50">
                <th className="p-1 text-left border-r border-black w-2/3">
                  Description
                </th>
                <th className="p-1 text-left w-1/3">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.slice(0, 5).map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-gray-300">
                  <td className="p-1 border-r border-gray-300 min-h-[20px]">
                    {item.description || (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="p-1 min-h-[20px]">
                    {item.quantity || <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Weight Row */}
          {booking?.weight && (
            <div className="p-1 border-t border-black text-xs font-medium bg-gray-50">
              Total Weight: {booking.weight} kg
            </div>
          )}
        </div>

        {/* Billing Details */}
        <div className="border border-black">
          <div className="font-bold text-center bg-gray-100 p-1 border-b border-black">
            BILLING DETAILS
          </div>
          <div className="p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>DATE:</span>
              <span>{formatDate(booking?.lr_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice No:</span>
              <span>{booking?.invoice_number || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice Value:</span>
              <span>
                ₹ {booking?.invoice_value?.toLocaleString("en-IN") || "0"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>E-way Bill:</span>
              <span>{booking?.eway_bill || "-"}</span>
            </div>
            <div className="flex justify-between border-t border-black pt-1 mt-2">
              <span>Freight:</span>
              <span>
                ₹ {booking?.freight_charges?.toLocaleString("en-IN") || "0"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span className="font-medium">
                {booking?.payment_mode || "TO_PAY"}
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-2">
              <span>TOTAL:</span>
              <span>
                ₹{" "}
                {(
                  (booking?.freight_charges || 0) +
                  (booking?.invoice_value || 0)
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t-2 border-black pt-2">
        {customization.footer_config?.show_terms && (
          <p className="text-xs mb-3 italic">
            Terms: {customization.footer_config.terms_text}
          </p>
        )}

        {customization.footer_config?.show_signature && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {(
              customization.footer_config.signature_labels || [
                "Consignor",
                "Driver",
                "Consignee",
              ]
            ).map((label: string, index: number) => (
              <div key={index} className="text-center">
                <div className="border-b border-black mb-1 h-10"></div>
                <div className="text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
