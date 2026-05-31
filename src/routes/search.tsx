import { createFileRoute } from "@tanstack/react-router";
import { SearchLayout } from "@/components/search/SearchLayout";
import { z } from "zod";

const searchSchema = z.object({
  city: z.string().optional().catch(""),
  locality: z.string().optional().catch(""),
  beds: z.number().optional().catch(undefined),
  minRent: z.number().optional().catch(undefined),
  maxRent: z.number().optional().catch(undefined),
  furnishedStatus: z.enum(["unfurnished", "semi-furnished", "fully-furnished"]).optional().catch(undefined),
  amenities: z.array(z.string()).optional().catch([]),
  sortBy: z.enum(["newest", "price_asc", "price_desc"]).optional().catch("newest"),
  page: z.number().optional().catch(1),
});

export type PropertySearchType = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SearchLayout,
});
