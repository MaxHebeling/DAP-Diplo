import { z } from "zod";

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede tener más de 72 caracteres");

export const signUpSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase(),
  password,
  fullName: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  ministryName: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  country: z.string().trim().min(2, "Selecciona tu país").max(80),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase(),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type SignInInput = z.infer<typeof signInSchema>;

// Request reset: el alumno solo manda email. Supabase manda magic link.
export const requestPasswordResetSchema = z.object({
  email: z.email("Correo inválido").trim().toLowerCase(),
});

// Update password: al volver del magic link, el alumno ya tiene
// sesión recovery y puede setear nueva contraseña.
export const updatePasswordSchema = z
  .object({
    password,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
