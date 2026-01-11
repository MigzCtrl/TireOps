import { z } from 'zod';

// ==========================================
// Customer Validation Schema
// ==========================================

export const customerSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  // Combined name field for database storage (computed from first + last)
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase()
    .or(z.literal('')), // Allow empty string for optional email
  phone: z
    .string()
    .min(1, 'Phone is required')
    .max(20, 'Phone must be less than 20 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Phone must contain only numbers and basic formatting characters')
    .trim(),
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ==========================================
// Inventory Validation Schema
// ==========================================

export const inventorySchema = z.object({
  brand: z
    .string()
    .min(1, 'Brand is required')
    .max(50, 'Brand must be less than 50 characters')
    .trim(),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(100, 'Model must be less than 100 characters')
    .trim(),
  size: z
    .string()
    .min(1, 'Size is required')
    .max(20, 'Size must be less than 20 characters')
    .regex(/^\d{3}\/\d{2}R\d{2}$/, 'Size must be in format like 225/45R17')
    .trim(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(10000, 'Quantity must be less than 10,000'),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price must be less than $100,000')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type InventoryFormData = z.infer<typeof inventorySchema>;

// ==========================================
// Work Order Validation Schema
// ==========================================

export const workOrderSchema = z.object({
  customer_id: z
    .string()
    .uuid('Invalid customer ID')
    .or(z.literal('')),
  service_type: z
    .string()
    .min(1, 'Service type is required')
    .max(50, 'Service type must be less than 50 characters')
    .trim(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const selectedDate = new Date(date);
      return !isNaN(selectedDate.getTime());
    }, 'Invalid date'),
  scheduled_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format')
    .or(z.literal('')),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'], { message: 'Invalid status' }),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

// ==========================================
// Authentication Validation Schemas
// ==========================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  shopName: z
    .string()
    .min(1, 'Shop name is required')
    .max(100, 'Shop name must be less than 100 characters')
    .trim(),
  ownerName: z
    .string()
    .min(1, 'Owner name is required')
    .max(100, 'Owner name must be less than 100 characters')
    .trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ==========================================
// Task Validation Schema
// ==========================================

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be less than 200 characters')
    .trim(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// ==========================================
// Sanitization Helpers
// ==========================================

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous HTML/script tags
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validates and sanitizes a UUID
 */
export function sanitizeUUID(uuid: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(uuid)) {
    return uuid.toLowerCase();
  }
  return null;
}
