import { z } from "zod";

export const KeyMomentSchema = z.object({
  label: z.string().min(1).max(120),
  seconds: z.number().int().nonnegative(),
});

export const SummaryOutputSchema = z.object({
  oneLineSummary: z.string().min(1).max(160),
  markdown: z.string().min(1),
  keyMoments: z.array(KeyMomentSchema),
});

export type KeyMoment = z.infer<typeof KeyMomentSchema>;
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;
