import { z } from 'zod';

export const contactVerificationSchema = z
  .object({
    contact: z
      .string()
      .min(1, 'Contact information is required')
      .refine((value) => {
        // Check if it's an email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Check if it's a phone number (basic validation)
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      }, 'Please enter a valid email or phone number'),
    verificationCode: z
      .string()
      .length(6, 'Verification code must be 6 digits')
      .regex(/^\d+$/, 'Verification code must contain only numbers')
      .optional(),
    termsAccepted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Only require terms acceptance when verification code is present
      if (data.verificationCode) {
        return data.termsAccepted === true;
      }
      return true;
    },
    {
      message: 'You must accept the terms and conditions',
      path: ['termsAccepted'],
    }
  );

export type ContactVerificationFormData = z.infer<
  typeof contactVerificationSchema
>;

export const notificationSignupSchema = z.object({
  contact: z
    .string()
    .min(1, 'Contact information is required')
    .refine((value) => {
      // Check if it's an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a phone number (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    }, 'Please enter a valid email or phone number'),
  name: z.string().min(1, 'Name is required'),
  preferences: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
    })
    .optional(),
});

export type NotificationSignupFormData = z.infer<
  typeof notificationSignupSchema
>;
