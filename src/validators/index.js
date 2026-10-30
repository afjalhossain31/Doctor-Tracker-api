import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const doctorSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  specialization: z.string().trim().min(2, 'Specialization is required').max(60),
  hospital: z.string().trim().min(2, 'Hospital is required').max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export const patientSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  age: z.coerce.number().int().min(0, 'Age must be 0 or more').max(120, 'Age must be 120 or less'),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().trim().max(20).optional().default(''),
  condition: z.string().trim().min(2, 'Condition is required').max(80),
  notes: z.string().trim().max(500).optional().default(''),
  doctor: objectId.optional(),
});
