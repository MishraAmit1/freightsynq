// src/lib/validations/standalone-lr.ts
import { z } from 'zod';

export const standaloneLRSchema = z.object({
  // LR Basic Info
  standalone_lr_number: z.string().optional(),
  lr_date: z.string().min(1, "LR date is required"),
  
  // Consignor (Sender) - Required
  consignor_name: z.string().min(1, "Consignor name is required"),
  consignor_address: z.string().optional(),
  consignor_city: z.string().optional(),
  consignor_state: z.string().optional(),
  consignor_pincode: z.string().optional(),
  consignor_phone: z.string().optional(),
  consignor_gst: z.string().optional(),
  consignor_email: z.string().email("Invalid email").optional().or(z.literal('')),
  
  // Consignee (Receiver) - Required
  consignee_name: z.string().min(1, "Consignee name is required"),
  consignee_address: z.string().optional(),
  consignee_city: z.string().optional(),
  consignee_state: z.string().optional(),
  consignee_pincode: z.string().optional(),
  consignee_phone: z.string().optional(),
  consignee_gst: z.string().optional(),
  consignee_email: z.string().email("Invalid email").optional().or(z.literal('')),
  
  // Route - Required
  from_location: z.string().min(1, "From location is required"),
  to_location: z.string().min(1, "To location is required"),
  
  // Goods Details
  material_description: z.string().optional(),
  packages_qty: z.string().optional(),
  weight: z.number().optional().or(z.string().optional()),
  invoice_number: z.string().optional(),
  invoice_value: z.number().optional().or(z.string().optional()),
  eway_bill_number: z.string().optional(),
  
  // Vehicle & Driver
  vehicle_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  
  // Payment
  freight_amount: z.number().optional().or(z.string().optional()),
  payment_mode: z.enum(['PAID', 'TO_PAY', 'TO_BE_BILLED']).optional(),
  
  // Other
  remarks: z.string().optional(),
  template_code: z.string().default('standard'),
});

export type StandaloneLRFormData = z.infer<typeof standaloneLRSchema>;