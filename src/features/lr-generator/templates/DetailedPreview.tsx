// src/features/lr-generator/templates/DetailedPreview.tsx
import { parseCargoAndMaterials, formatDate } from "./helpers";

interface PreviewProps {
  customization: any;
  booking?: any;
}

export const LiveDetailedPreview = ({
  customization,
  booking,
}: PreviewProps) => {
  const cargoData = parseCargoAndMaterials(
    booking?.cargo_units || "10 boxes",
    booking?.material_description || "Sample goods"
  );

  return (
    <div
      className="bg-white border-2 border-gray-800"
      style={{
        fontFamily: customization.style_config.font_family,
        fontSize: "10px",
        width: "100%",
        minHeight: "500px",
        padding: "10px",
      }}
    >
      {/* HEADER */}
      <div className="border-b-2 border-black pb-2 mb-2">
        <div className="flex justify-between items-start mb-2">
          {customization.header_config.show_logo &&
            customization.logo_url &&
            customization.header_config.logo_position === "left" && (
              <img
                src={customization.logo_url}
                alt="Logo"
                className="w-16 h-12 object-contain mr-2"
              />
            )}

          <div className="flex-1 text-center">
            {customization.header_config.show_logo &&
              customization.logo_url &&
              customization.header_config.logo_position === "center" && (
                <img
                  src={customization.logo_url}
                  alt="Logo"
                  className="w-16 h-12 object-contain mx-auto mb-1"
                />
              )}

            <h1
              className="text-lg font-bold uppercase"
              style={{ color: customization.style_config.primary_color }}
            >
              {customization.company_details?.name || "NATIONAL CARGO MOVERS"}
            </h1>
            <div className="text-xs font-semibold">
              LOGISTICS & SUPPLY CHAIN SOLUTIONS
            </div>
            {customization.header_config.show_address && (
              <div className="text-xs mt-1">
                {customization.company_details?.address ||
                  "Transport Hub, City - 000000"}
              </div>
            )}
          </div>

          {customization.header_config.show_logo &&
            customization.logo_url &&
            customization.header_config.logo_position === "right" && (
              <img
                src={customization.logo_url}
                alt="Logo"
                className="w-16 h-12 object-contain ml-2"
              />
            )}
        </div>

        <div className="bg-gray-100 px-2 py-1 flex justify-between text-xs">
          <div>
            📞 {customization.company_details?.phone || "0000-0000000"} | 📧{" "}
            {customization.company_details?.email || "info@company.com"}
          </div>
          <div>
            {customization.header_config.show_gst && (
              <span>
                GSTIN: {customization.company_details?.gst || "00AAAAA0000A1Z5"}
              </span>
            )}
            {customization.header_config.show_pan && (
              <span className="ml-3">
                PAN: {customization.company_details?.pan || "AAAAA0000A"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TITLE */}
      <div className="bg-black text-white text-center py-1 mb-2">
        <div className="text-sm font-bold">
          CONSIGNMENT NOTE / LORRY RECEIPT
        </div>
      </div>

      {/* KEY DETAILS */}
      <div className="grid grid-cols-6 gap-1 mb-2 text-xs">
        <div className="border p-1">
          <div className="font-bold text-gray-600">LR NO.</div>
          <div
            className="font-bold"
            style={{ color: customization.style_config.primary_color }}
          >
            {booking?.lr_number || "AUTO-GEN"}
          </div>
        </div>
        <div className="border p-1">
          <div className="font-bold text-gray-600">DATE</div>
          <div>{formatDate(booking?.lr_date)}</div>
        </div>
        <div className="border p-1">
          <div className="font-bold text-gray-600">INVOICE NO.</div>
          <div>{booking?.invoice_number || "-"}</div>
        </div>
        <div className="border p-1">
          <div className="font-bold text-gray-600">VEHICLE</div>
          <div>{booking?.vehicle_number || "-"}</div>
        </div>
        <div className="border p-1">
          <div className="font-bold text-gray-600">WEIGHT</div>
          <div>{booking?.weight || "-"} Kg</div>
        </div>
        <div className="border p-1">
          <div className="font-bold text-gray-600">E-WAY BILL</div>
          <div>{booking?.eway_bill || "-"}</div>
        </div>
      </div>

      {/* PARTIES */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {customization.visible_fields?.consignor !== false && (
          <div className="border border-gray-600">
            <div className="bg-gray-200 px-2 py-1 font-bold text-xs">
              CONSIGNOR (SENDER)
            </div>
            <div className="p-2 text-xs">
              <div className="font-bold">
                {booking?.consignor?.name || "Consignor Name"}
              </div>
              <div>{booking?.consignor?.address || "Address"}</div>
              <div className="mt-1">
                <span className="font-semibold">GSTIN:</span>{" "}
                {booking?.consignor?.gst_number || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Contact:</span>{" "}
                {booking?.consignor?.phone || "N/A"}
              </div>
            </div>
          </div>
        )}

        {customization.visible_fields?.consignee !== false && (
          <div className="border border-gray-600">
            <div className="bg-gray-200 px-2 py-1 font-bold text-xs">
              CONSIGNEE (RECEIVER)
            </div>
            <div className="p-2 text-xs">
              <div className="font-bold">
                {booking?.consignee?.name || "Consignee Name"}
              </div>
              <div>{booking?.consignee?.address || "Address"}</div>
              <div className="mt-1">
                <span className="font-semibold">GSTIN:</span>{" "}
                {booking?.consignee?.gst_number || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Contact:</span>{" "}
                {booking?.consignee?.phone || "N/A"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROUTE */}
      <div className="bg-blue-50 border border-blue-300 p-2 mb-2">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="font-bold">From:</span>{" "}
            {booking?.from_location || "Origin"}
          </div>
          <div>
            <span className="font-bold">To:</span>{" "}
            {booking?.to_location || "Destination"}
          </div>
          <div>
            <span className="font-bold">Vehicle:</span>{" "}
            {booking?.vehicle_number || "-"}
          </div>
          <div>
            <span className="font-bold">Driver:</span>{" "}
            {booking?.driver_name || "-"}
          </div>
        </div>
      </div>

      {/* GOODS TABLE */}
      <div className="border border-gray-600 mb-2">
        <div className="bg-gray-300 font-bold text-xs p-1">
          GOODS DESCRIPTION
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-r border-gray-400 p-1 text-left">S.No</th>
              <th className="border-r border-gray-400 p-1 text-left">
                Packages
              </th>
              <th className="border-r border-gray-400 p-1 text-left">
                Description
              </th>
              <th className="border-r border-gray-400 p-1 text-center">
                Weight
              </th>
              <th className="p-1 text-center">Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {cargoData.slice(0, 5).map((row, index) => (
              <tr key={index} className="border-t border-gray-300">
                <td className="border-r border-gray-300 p-1">{index + 1}</td>
                <td className="border-r border-gray-300 p-1">{row.cargo}</td>
                <td className="border-r border-gray-300 p-1">{row.material}</td>
                <td className="border-r border-gray-300 p-1 text-center">-</td>
                <td className="p-1 text-center">-</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-400 font-bold bg-gray-50">
              <td colSpan={3} className="p-1 text-right">
                TOTAL:
              </td>
              <td className="border-r border-gray-300 p-1 text-center">
                {booking?.weight || "0"}
              </td>
              <td className="p-1 text-center">
                {booking?.invoice_value || "0"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CHARGES */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="border border-gray-400 p-2">
          <div className="font-bold text-xs mb-1">SERVICE DETAILS</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span>{booking?.payment_mode || "TO PAY"}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice No:</span>
              <span>{booking?.invoice_number || "-"}</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-400 p-2">
          <div className="font-bold text-xs mb-1">FREIGHT CHARGES</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Basic Freight:</span>
              <span>₹ {booking?.freight_charges || "0"}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>TOTAL:</span>
              <span>₹ {booking?.freight_charges || "0"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TERMS */}
      {customization.footer_config?.show_terms && (
        <div className="border border-gray-300 p-2 mb-2">
          <div className="font-bold text-xs mb-1">TERMS & CONDITIONS:</div>
          <div className="text-xs">
            {customization.footer_config?.terms_text ||
              "Goods once booked will not be cancelled."}
          </div>
        </div>
      )}

      {/* SIGNATURES */}
      {customization.footer_config?.show_signature && (
        <div className="grid grid-cols-5 gap-2 text-center mt-4">
          {[
            "Prepared By",
            "Checked By",
            "Driver",
            "Consignor",
            "Consignee",
          ].map((label, idx) => (
            <div key={idx}>
              <div className="border-b border-black mb-1 h-8"></div>
              <div className="text-xs">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-600 mt-3 border-t pt-2">
        <div>
          System generated document |{" "}
          {customization.company_details?.name || "Company Name"}
        </div>
      </div>
    </div>
  );
};
