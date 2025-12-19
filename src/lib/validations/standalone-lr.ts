// src/lib/validations/standalone-lr.ts
import { z } from "zod";

// Goods Item Schema
export const goodsItemSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  quantity: z.string().optional(),
});

export type GoodsItem = z.infer<typeof goodsItemSchema>;

export const standaloneLRSchema = z.object({
  // LR Basic Info
  standalone_lr_number: z.string().min(1, "LR number is required"),
  lr_date: z.string().min(1, "Date is required"),

  // Company Details (Editable - stored in LR document)
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_city: z.string().optional(),
  company_state: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().optional(),
  company_gst: z.string().optional(),
  company_pan: z.string().optional(),
  company_logo_url: z.string().optional(),

  // Consignor Details
  consignor_name: z.string().min(1, "Consignor name is required"),
  consignor_address: z.string().optional(),
  consignor_city: z.string().optional(),
  consignor_state: z.string().optional(),
  consignor_pincode: z.string().optional(),
  consignor_phone: z.string().optional(),
  consignor_gst: z.string().optional(),
  consignor_email: z.string().optional(),

  // Consignee Details
  consignee_name: z.string().min(1, "Consignee name is required"),
  consignee_address: z.string().optional(),
  consignee_city: z.string().optional(),
  consignee_state: z.string().optional(),
  consignee_pincode: z.string().optional(),
  consignee_phone: z.string().optional(),
  consignee_gst: z.string().optional(),
  consignee_email: z.string().optional(),

  // Route Details
  from_location: z.string().min(1, "From location is required"),
  to_location: z.string().min(1, "To location is required"),

  // Goods Items (Array up to 5)
  goods_items: z.array(goodsItemSchema).max(5).optional(),

  // Other Goods Details
  weight: z.number().optional(),
  invoice_number: z.string().optional(),
  invoice_value: z.number().optional(),
  eway_bill_number: z.string().optional(),

  // Vehicle Details
  vehicle_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),

  // Billing
  freight_amount: z.number().optional(),
  payment_mode: z.enum(["TO_PAY", "PAID", "TO_BE_BILLED"]).optional(),

  // Other
  remarks: z.string().optional(),
  template_code: z.string().optional(),
});

export type StandaloneLRFormData = z.infer<typeof standaloneLRSchema>;