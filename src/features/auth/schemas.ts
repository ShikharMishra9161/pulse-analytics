import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  // bcrypt only uses the first 72 bytes.
  .max(72, "Use at most 72 characters")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Don't apply strength rules on login; just bound the input.
  password: z.string().min(1, "Password is required").max(72),
  callbackUrl: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: emailSchema,
  token: z.string().min(16).max(128),
});

export const resendVerificationSchema = z.object({ email: emailSchema });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(72).optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
