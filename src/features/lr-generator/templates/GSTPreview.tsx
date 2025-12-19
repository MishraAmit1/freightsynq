// src/features/lr-generator/templates/GSTPreview.tsx
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

export const LiveGSTPreview = ({ customization, booking }: PreviewProps) => {
  // ✅ Get goods items
  let goodsData: GoodsItem[] = [];

  if (
    booking?.goods_items &&
    Array.isArray(booking.goods_items) &&
    booking.goods_items.length > 0
  ) {
    goodsData = booking.goods_items;
  } else {
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

  // Fill to minimum 5 rows
  const displayItems = [...goodsData];
  while (displayItems.length < 5) {
    displayItems.push({
      id: `empty-${displayItems.length}`,
      description: "",
      quantity: "",
    });
  }

  return (
    <div
      className="bg-white border-2 border-gray-600"
      style={{
        fontFamily: customization.style_config.font_family,
        fontSize: "11px",
        width: "100%",
        minHeight: "500px",
        padding: "12px",
      }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-gray-700">
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
          {customization.header_config.logo_position !== "left" && (
            <div className="text-left">
              <div className="text-xs font-semibold text-gray-600">
                LR Number
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GEN"}
              </div>
              <div className="text-xs">
                Date: {formatDate(booking?.lr_date)}
              </div>
            </div>
          )}
        </div>

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
            {customization.company_details?.name || "CARGO SOLUTIONS"}
          </h1>
          <div className="text-sm font-semibold bg-gray-100 px-3 py-1 rounded">
            LORRY RECEIPT
          </div>
          {customization.header_config.show_address && (
            <p className="text-xs mt-1">
              {customization.company_details?.address || "Address"}
            </p>
          )}
          <p className="text-xs">
            Ph: {customization.company_details?.phone || "0000-0000000"} |
            Email: {customization.company_details?.email || "info@company.com"}
          </p>
          {customization.header_config.show_gst && (
            <p className="text-xs font-semibold">
              GSTIN: {customization.company_details?.gst || "09AAAAA0000A1Z5"}
            </p>
          )}
        </div>

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
              <div className="text-xs font-semibold text-gray-600">
                LR Number
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.lr_number || "AUTO-GEN"}
              </div>
              <div className="text-xs">
                Date: {formatDate(booking?.lr_date)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT INFO */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-xs bg-blue-50 p-2 rounded">
        <div>
          <span className="font-bold">Vehicle:</span>{" "}
          {booking?.vehicle_number || "-"}
        </div>
        <div>
          <span className="font-bold">E-Way Bill:</span>{" "}
          {booking?.eway_bill || "-"}
        </div>
        <div>
          <span className="font-bold">Weight:</span> {booking?.weight || "0"} Kg
        </div>
        <div>
          <span className="font-bold">Invoice No:</span>{" "}
          {booking?.invoice_number || "-"}
        </div>
      </div>

      {/* PARTIES */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {customization.visible_fields?.consignor !== false && (
          <div className="border-2 border-blue-300 rounded">
            <div className="bg-blue-500 text-white px-2 py-1 font-bold text-xs">
              CONSIGNOR
            </div>
            <div className="p-2 text-xs">
              <div className="font-bold text-sm">
                {booking?.consignor?.name || "Consignor Name"}
              </div>
              <div className="mt-1">
                {booking?.consignor?.address || "Address"}
              </div>
              <div className="mt-2 space-y-1">
                <div>
                  <span className="font-semibold">GSTIN:</span>{" "}
                  {booking?.consignor?.gst_number || "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Mobile:</span>{" "}
                  {booking?.consignor?.phone || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {customization.visible_fields?.consignee !== false && (
          <div className="border-2 border-green-300 rounded">
            <div className="bg-green-500 text-white px-2 py-1 font-bold text-xs">
              CONSIGNEE
            </div>
            <div className="p-2 text-xs">
              <div className="font-bold text-sm">
                {booking?.consignee?.name || "Consignee Name"}
              </div>
              <div className="mt-1">
                {booking?.consignee?.address || "Address"}
              </div>
              <div className="mt-2 space-y-1">
                <div>
                  <span className="font-semibold">GSTIN:</span>{" "}
                  {booking?.consignee?.gst_number || "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Mobile:</span>{" "}
                  {booking?.consignee?.phone || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TRANSPORT DETAILS */}
      <div className="bg-yellow-50 border border-yellow-400 p-2 mb-3 rounded">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <span className="font-bold">From:</span>{" "}
            {booking?.from_location || "Origin"}
          </div>
          <div>
            <span className="font-bold">To:</span>{" "}
            {booking?.to_location || "Destination"}
          </div>
          <div>
            <span className="font-bold">Driver:</span>{" "}
            {booking?.driver_name || "-"}
          </div>
          <div>
            <span className="font-bold">Payment:</span>{" "}
            {booking?.payment_mode || "TO PAY"}
          </div>
        </div>
      </div>

      {/* ✅ GOODS & BILLING - Same as Standard Template */}
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

        {/* ✅ Billing Details - Simple like Standard Template */}
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

      {/* DECLARATION */}
      <div className="border border-gray-400 p-2 mb-3">
        <div className="font-bold text-xs mb-1">DECLARATION:</div>
        <div className="text-xs">
          {customization.footer_config?.terms_text ||
            "Goods booked at owner's risk. Subject to terms and conditions."}
        </div>
      </div>

      {/* SIGNATURES */}
      {customization.footer_config?.show_signature && (
        <div className="grid grid-cols-3 gap-4 text-center mt-4">
          {["Consignor", "Driver", "Consignee"].map((label, idx) => (
            <div key={idx}>
              <div className="border-b-2 border-gray-400 mb-1 h-8"></div>
              <div className="text-xs font-semibold">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-600 mt-3 border-t pt-2">
        <div>
          Computer generated document |{" "}
          {customization.company_details?.name || "Company Name"}
        </div>
      </div>
    </div>
  );
};
