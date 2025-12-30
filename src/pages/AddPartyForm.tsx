import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Save,
  XCircle,
  Info,
  MapPin,
  User,
  Home,
  FileText,
  CreditCard,
} from "react-feather";

const AddPartyForm = () => {
  const [formData, setFormData] = useState({
    partyType: "",
    partyName: "",
    contactPerson: "",
    phoneNumber: "",
    email: "",
    searchArea: "",
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    tags: [],
    paymentTerms: "",
    creditLimit: "",
    isDefaultBilling: false,
    notes: "",
  });

  const [expandedSections, setExpandedSections] = useState({
    taxInfo: false,
    additionalInfo: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  const businessTags = [
    "Packaging",
    "FMCG",
    "Steel",
    "E-commerce",
    "Textiles",
    "Chemicals",
    "Pharmaceuticals",
    "Auto Parts",
    "Electronics",
    "Agriculture",
    "Machinery",
  ];

  const areaSuggestions = [
    { area: "Chanod", city: "Vapi", state: "Gujarat", pincode: "396375" },
    { area: "GIDC", city: "Vapi", state: "Gujarat", pincode: "396195" },
    { area: "Adajan", city: "Surat", state: "Gujarat", pincode: "395009" },
    {
      area: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400069",
    },
    {
      area: "Whitefield",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560066",
    },
  ];

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleAreaSelect = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      searchArea: suggestion.area,
      city: suggestion.city,
      state: suggestion.state,
      pincode: suggestion.pincode,
    }));
    setShowAreaSuggestions(false);
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 10);
    if (limited.length > 6) {
      return `${limited.slice(0, 5)} ${limited.slice(5)}`;
    }
    return limited;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Integration Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span>Parties</span>
            <span>/</span>
            <span className="text-gray-900">Add New Party</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Party</h1>
          <p className="text-gray-600 mt-1">
            Create a new client, consignor, or vendor in your system
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <form className="space-y-8">
            {/* Section 1: Party Type & Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#FFCB1F] to-[#FFE066] rounded-lg">
                    <User className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Basic Information
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Primary details about the party
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Party Type - Full Width */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Party Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.partyType}
                    onChange={(e) =>
                      setFormData({ ...formData, partyType: e.target.value })
                    }
                    className="w-full md:w-1/2 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all text-gray-900"
                    required
                  >
                    <option value="">Select Party Type</option>
                    <option value="consignor">Consignor (Sender)</option>
                    <option value="consignee">Consignee (Receiver)</option>
                    <option value="broker">Broker</option>
                    <option value="transporter">Transporter</option>
                    <option value="vendor">Vendor</option>
                    <option value="both">Both (Consignor & Consignee)</option>
                  </select>
                </div>

                {/* Company Details Group */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Home className="h-4 w-4 text-gray-400" />
                    Company Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Party Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.partyName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            partyName: e.target.value,
                          })
                        }
                        placeholder="Shree Ganesh Roadways"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contactPerson: e.target.value,
                          })
                        }
                        placeholder="Rajesh Kumar"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Group */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500 text-sm font-medium">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phoneNumber: formatPhoneNumber(e.target.value),
                            })
                          }
                          placeholder="98765 43210"
                          className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        10-digit mobile number
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="contact@ganeshlogistics.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        For sending invoices and updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Address Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#FFCB1F] to-[#FFE066] rounded-lg">
                    <MapPin className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Address Details
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Where is this party located?
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Search Area with Better Spacing */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Area/Locality
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.searchArea}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          searchArea: e.target.value,
                        });
                        setShowAreaSuggestions(e.target.value.length > 0);
                      }}
                      placeholder="Search for Chanod, GIDC, Andheri..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Area Suggestions Dropdown */}
                  {showAreaSuggestions && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                      {areaSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAreaSelect(suggestion)}
                          className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            {suggestion.area}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {suggestion.city}, {suggestion.state} -{" "}
                            {suggestion.pincode}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.streetAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        streetAddress: e.target.value,
                      })
                    }
                    placeholder="Plot 42, Shree Industrial Estate, Near SBI Bank"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                {/* City, State, Pincode Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="Vapi"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Select State</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pincode: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        })
                      }
                      placeholder="396375"
                      // maxLength="6"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Tax Information (Collapsible) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("taxInfo")}
                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Tax Information
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      GST and PAN details (Optional)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Optional
                  </span>
                  {expandedSections.taxInfo ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSections.taxInfo && (
                <div className="px-8 pb-8 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* GST Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        GST Number
                        <div className="group relative">
                          <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                          <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                            Format: 15 characters (e.g., 24ABCDE1234F1Z5)
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.gstNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gstNumber: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="24ABCDE1234F1Z5"
                          // maxLength="15"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all uppercase"
                        />
                        {formData.gstNumber.length === 15 && (
                          <button
                            type="button"
                            onClick={() => setGstVerified(true)}
                            className="absolute right-3 top-3.5"
                          >
                            {gstVerified ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                                Verify
                              </div>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PAN Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            panNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="ABCDE1234F"
                        // maxLength="10"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all uppercase"
                      />
                    </div>
                  </div>

                  {/* Upload Documents */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Documents
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                      <div className="flex items-center justify-center">
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="h-10 w-10 text-gray-400 mb-3" />
                          <span className="text-sm font-medium text-gray-700">
                            Upload GST Certificate / PAN Document
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            PDF, JPG, PNG up to 5MB
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Additional Information (Collapsible) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("additionalInfo")}
                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Additional Information
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Payment terms and business categories
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Optional
                  </span>
                  {expandedSections.additionalInfo ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSections.additionalInfo && (
                <div className="px-8 pb-8 pt-2 border-t border-gray-100 space-y-6">
                  {/* Business Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Business Categories / Tags
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {businessTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.tags.includes(tag)
                              ? "bg-gradient-to-r from-[#FFCB1F] to-[#FFE066] text-foreground shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Terms and Credit */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Terms
                      </label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentTerms: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      >
                        <option value="">Select Payment Terms</option>
                        <option value="prepaid">Prepaid</option>
                        <option value="cod">Cash on Delivery (COD)</option>
                        <option value="credit7">Credit 7 Days</option>
                        <option value="credit15">Credit 15 Days</option>
                        <option value="credit30">Credit 30 Days</option>
                        <option value="custom">Custom Terms</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creditLimit: e.target.value,
                          })
                        }
                        placeholder="50,000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Default Billing Checkbox */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="defaultBilling"
                        checked={formData.isDefaultBilling}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isDefaultBilling: e.target.checked,
                          })
                        }
                        className="h-5 w-5 text-[#3B5988] focus:ring-[#3B5988] border-gray-300 rounded mt-0.5"
                      />
                      <div className="ml-3">
                        <label
                          htmlFor="defaultBilling"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Mark as Default Billing Party
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          This party will be selected by default for new
                          transactions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes / Special Instructions
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any special handling instructions, preferred communication time, etc."
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5988] focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Form Actions - Better Dashboard Integration */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Fields marked with <span className="text-red-500">*</span> are
                  required
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  Save & Close
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#FFCB1F] to-[#FFE066] text-foreground rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1E1E24] border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save & Add Another
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {false && (
        <div className="fixed bottom-8 right-8 bg-white border border-green-200 rounded-lg shadow-xl p-5 flex items-start gap-4 max-w-sm">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              Party added successfully
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Shree Ganesh Roadways has been created
            </p>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AddPartyForm;
