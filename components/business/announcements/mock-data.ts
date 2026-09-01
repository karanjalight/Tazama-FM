/**
 * Re-exports the shared Announcements types + pure helpers from
 * `lib/business/announcement-types.ts`, which is the canonical home (so
 * server query/action code can depend on them too). Kept as a shim here
 * rather than moved outright — every component in this feature already
 * imports from "./mock-data" / "../mock-data" / "../../mock-data", and
 * there is no longer any actual mock data behind it: real announcements,
 * locations, zones, rooms, and audio zones all come from Supabase via
 * `lib/business/announcement-queries.ts` and are passed down as props.
 */
export * from "@/lib/business/announcement-types";
