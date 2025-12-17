// src/features/lr-generator/templates/StandardPreview.tsx
import { parseCargoAndMaterials, formatDate } from "./helpers";

interface PreviewProps {
  customization: any;
  booking?: any;
}

export const LiveStandardPreview = ({
  customization,
  booking,
}: PreviewProps) => {
  const cargoData = parseCargoAndMaterials(
    booking?.cargo_units || "10 boxes",
    booking?.material_description || "Sample goods"
  );

  return (
    <div
      className="bg-white border-2"
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
        <div className="border p-2">
          <div className="font-bold">At OWNER'S risk</div>
          <div>Subject to Jurisdiction</div>
        </div>
        <div className="border p-2 text-center">
          <div className="font-bold">Vehicle No.</div>
          <div>{booking?.vehicle_number || "-"}</div>
        </div>
        <div className="border p-2 text-center">
          <div className="font-bold">GSTIN</div>
          <div>{customization.company_details?.gst || "29AABCV1234M1Z5"}</div>
        </div>
      </div>

      {/* CONSIGNOR & CONSIGNEE */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {customization.visible_fields?.consignor !== false && (
          <div className="border p-2">
            <div className="font-bold bg-gray-100 px-1">CONSIGNOR</div>
            <div className="text-xs mt-1">
              <div>{booking?.consignor?.name || "Consignor Name"}</div>
              <div>{booking?.consignor?.address || "Address"}</div>
              <div>GST: {booking?.consignor?.gst_number || "N/A"}</div>
              <div>Mobile: {booking?.consignor?.phone || "N/A"}</div>
            </div>
          </div>
        )}

        {customization.visible_fields?.consignee !== false && (
          <div className="border p-2">
            <div className="font-bold bg-gray-100 px-1">CONSIGNEE</div>
            <div className="text-xs mt-1">
              <div>{booking?.consignee?.name || "Consignee Name"}</div>
              <div>{booking?.consignee?.address || "Address"}</div>
              <div>GST: {booking?.consignee?.gst_number || "N/A"}</div>
              <div>Mobile: {booking?.consignee?.phone || "N/A"}</div>
            </div>
          </div>
        )}
      </div>

      {/* FROM & TO */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="border p-2">
          <span className="font-bold">FROM:</span>{" "}
          {booking?.from_location || "Origin"}
        </div>
        <div className="border p-2">
          <span className="font-bold">TO:</span>{" "}
          {booking?.to_location || "Destination"}
        </div>
      </div>

      {/* GOODS & BILLING */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="border">
          <div className="font-bold text-center bg-gray-100 p-1">
            GOODS DESCRIPTION
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-1 text-left">Packages</th>
                <th className="p-1 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {cargoData.slice(0, 3).map((row, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-1">{row.cargo}</td>
                  <td className="p-1">{row.material}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border">
          <div className="font-bold text-center bg-gray-100 p-1">
            BILLING DETAILS
          </div>
          <div className="p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>DATE:</span>
              <span>{formatDate(booking?.lr_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>VALUE:</span>
              <span>₹ {booking?.invoice_value || "0"}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span>Freight:</span>
              <span>₹ {booking?.freight_charges || "0"}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total:</span>
              <span>
                ₹{" "}
                {(
                  parseFloat(booking?.freight_charges || 0) +
                  parseFloat(booking?.invoice_value || 0)
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t pt-2">
        {customization.footer_config?.show_terms && (
          <p className="text-xs mb-2">
            {customization.footer_config.terms_text}
          </p>
        )}

        {customization.footer_config?.show_signature && (
          <div className="grid grid-cols-3 gap-4">
            {(
              customization.footer_config.signature_labels || [
                "Consignor",
                "Driver",
                "Consignee",
              ]
            ).map((label: string, index: number) => (
              <div key={index} className="text-center">
                <div className="border-b border-black mb-1 h-8"></div>
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
