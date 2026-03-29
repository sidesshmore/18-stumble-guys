import { z } from 'zod'

export const ConfirmedFollowUpSchema = z.object({
  description: z.string().min(1),
  urgency: z.enum(['critical', 'high', 'medium', 'low']).catch('medium'),
  due_date: z.string().optional(),
})

export const CreateServiceEntrySchema = z.object({
  client_id: z.string().min(1),
  service_type: z.string().min(1, 'Service type is required').max(100),
  date: z.iso.date(),
  notes: z.string().max(10000).default(''),
  ai_structured_notes: z.record(z.string(), z.unknown()).optional(),
  voice_consent: z.boolean().optional().default(false),
  confirmed_follow_ups: z.array(ConfirmedFollowUpSchema).optional(),
})

export type CreateServiceEntryInput = z.infer<typeof CreateServiceEntrySchema>
