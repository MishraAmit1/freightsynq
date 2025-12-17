// src/features/lr-generator/templates/GSTPreview.tsx
import { parseCargoAndMaterials, formatDate } from "./helpers";

interface PreviewProps {
  customization: any;
  booking?: any;
}

export const LiveGSTPreview = ({ customization, booking }: PreviewProps) => {
  const cargoData = parseCargoAndMaterials(
    booking?.cargo_units || "10 boxes",
    booking?.material_description || "Sample goods"
  );

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
                Tax Invoice No.
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.invoice_number || booking?.lr_number || "AUTO-GEN"}
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
            TAX INVOICE / LR
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
                Tax Invoice No.
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: customization.style_config.primary_color }}
              >
                {booking?.invoice_number || "AUTO-GEN"}
              </div>
              <div className="text-xs">
                Date: {formatDate(booking?.lr_date)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT INFO */}
      <div className="grid grid-cols-5 gap-2 mb-3 text-xs bg-blue-50 p-2 rounded">
        <div>
          <span className="font-bold">LR No:</span>{" "}
          {booking?.lr_number || "AUTO-GEN"}
        </div>
        <div>
          <span className="font-bold">Vehicle:</span>{" "}
          {booking?.vehicle_number || "-"}
        </div>
        <div>
          <span className="font-bold">E-Way:</span> {booking?.eway_bill || "-"}
        </div>
        <div>
          <span className="font-bold">Weight:</span> {booking?.weight || "0"} Kg
        </div>
        <div>
          <span className="font-bold">HSN:</span> 996511
        </div>
      </div>

      {/* PARTIES */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {customization.visible_fields?.consignor !== false && (
          <div className="border-2 border-blue-300 rounded">
            <div className="bg-blue-500 text-white px-2 py-1 font-bold text-xs">
              BILL TO (Consignor)
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
              SHIP TO (Consignee)
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

      {/* SERVICES TABLE */}
      <div className="border border-gray-400 mb-3">
        <div className="bg-gray-600 text-white p-2 font-bold text-sm text-center">
          GOODS TRANSPORTATION SERVICES
        </div>

        <div className="grid grid-cols-12 bg-gray-200 p-1 text-xs font-bold border-b">
          <div className="col-span-1">S.No</div>
          <div className="col-span-2">Packages</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-center">HSN/SAC</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-2 text-right">Value (₹)</div>
        </div>

        <div className="p-1">
          {cargoData.slice(0, 3).map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-12 text-xs py-1 border-b border-gray-200"
            >
              <div className="col-span-1">{index + 1}</div>
              <div className="col-span-2">{row.cargo}</div>
              <div className="col-span-4">{row.material}</div>
              <div className="col-span-2 text-center">996511</div>
              <div className="col-span-1 text-center">1</div>
              <div className="col-span-2 text-right">-</div>
            </div>
          ))}

          <div className="grid grid-cols-12 text-xs py-1 bg-blue-50 font-semibold">
            <div className="col-span-1">{cargoData.length + 1}</div>
            <div className="col-span-2">Transport</div>
            <div className="col-span-4">Goods Transportation Service</div>
            <div className="col-span-2 text-center">996511</div>
            <div className="col-span-1 text-center">1 Trip</div>
            <div className="col-span-2 text-right">
              {(booking?.freight_charges || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* TAX CALCULATION */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-gray-300 p-2">
          <div
            className="font-bold text-sm mb-2"
            style={{ color: customization.style_config.primary_color }}
          >
            ADDITIONAL INFO
          </div>
          <div className="text-xs space-y-1">
            <div>
              <span className="font-semibold">Invoice No:</span>{" "}
              {booking?.invoice_number || "-"}
            </div>
            <div>
              <span className="font-semibold">E-way Bill:</span>{" "}
              {booking?.eway_bill || "-"}
            </div>
            <div>
              <span className="font-semibold">Remarks:</span>{" "}
              {booking?.remarks || "-"}
            </div>
          </div>
        </div>

        <div className="border border-gray-300 p-2">
          <div
            className="font-bold text-sm mb-2"
            style={{ color: customization.style_config.primary_color }}
          >
            TAX CALCULATION
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Taxable Amount:</span>
              <span>
                ₹ {(booking?.freight_charges || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>CGST @ 2.5%:</span>
              <span>
                ₹ {((booking?.freight_charges || 0) * 0.025).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SGST @ 2.5%:</span>
              <span>
                ₹ {((booking?.freight_charges || 0) * 0.025).toFixed(2)}
              </span>
            </div>
            <div className="border-t-2 border-gray-400 pt-1 mt-2">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>
                  ₹{" "}
                  {((booking?.freight_charges || 0) * 1.05).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DECLARATION */}
      <div className="border border-gray-400 p-2 mb-3">
        <div className="font-bold text-xs mb-1">DECLARATION:</div>
        <div className="text-xs">
          {customization.footer_config?.terms_text ||
            "We declare that this invoice shows the actual price of goods/services and all particulars are true and correct."}
        </div>
      </div>

      {/* SIGNATURES */}
      {customization.footer_config?.show_signature && (
        <div className="grid grid-cols-3 gap-4 text-center mt-4">
          {[
            "Customer Signature",
            "Driver Signature",
            "Authorized Signatory",
          ].map((label, idx) => (
            <div key={idx}>
              <div className="border-b-2 border-gray-400 mb-1 h-8"></div>
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-xs text-gray-500">Date: ___________</div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-600 mt-3 border-t pt-2">
        <div>
          Computer generated Tax Invoice |{" "}
          {customization.company_details?.name || "Company Name"}
        </div>
      </div>
    </div>
  );
};
