/** Industry options for business accounts (signup step 2). */
export const industries = [
  "Bar & Nightclub",
  "Restaurant & Café",
  "Hotel & Hospitality",
  "Retail & Shopping",
  "Gym & Fitness",
  "Salon & Spa",
  "Events & Entertainment",
  "Office & Co-working",
  "Healthcare & Wellness",
  "Other",
] as const;

export type Industry = (typeof industries)[number];
