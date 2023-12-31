import { z } from 'nestjs-zod/z';

export const QuoteSchema = z
  .object({
    anime: z.string(),
    character: z.string(),
    quote: z.string(),
  })
  .transform((data) => ({
    title: data.anime,
    character: data.character,
    text: data.quote,
  }));

export type QuoteResponse = z.input<typeof QuoteSchema>;
