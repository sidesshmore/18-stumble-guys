import { z } from 'zod'

export const CreateClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100).trim(),
  last_name: z.string().min(1, 'Last name is required').max(100).trim(),
  date_of_birth: z.iso.date().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()\\.]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  language_preference: z.enum(['en', 'es']).default('en'),
  demographics: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
})

export const UpdateClientSchema = CreateClientSchema.partial()

export type CreateClientInput = z.infer<typeof CreateClientSchema>
