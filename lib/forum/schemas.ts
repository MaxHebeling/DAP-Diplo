import { z } from "zod";

export const threadCreateSchema = z.object({
  title: z.string().trim().min(4).max(160),
  body: z.string().trim().min(10).max(10000),
  phase_id: z
    .string()
    .trim()
    .min(1)
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const threadUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(4).max(160),
  body: z.string().trim().min(10).max(10000),
  phase_id: z
    .string()
    .trim()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const postCreateSchema = z.object({
  thread_id: z.uuid(),
  body: z.string().trim().min(2).max(10000),
});

export const threadCloseSchema = z.object({
  id: z.uuid(),
});
