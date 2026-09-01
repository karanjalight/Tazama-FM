export const STEP_GREETINGS: Record<number, string> = {
  1: "Hi Michael 👋 You're creating a new schedule. Let's start with the basics — what would you like to schedule?",
  2: "Where should this run? Tell me the locations, zones or rooms, or just ask me to target everything.",
  3: "Let's build your day. Tell me what should play and when — like \"dancehall in the morning\" — or add sessions manually below.",
  4: "Everything looks ready. Here's what will happen when you create this schedule.",
};

export const STEP_SUGGESTIONS: Record<number, string[]> = {
  1: ["Happy hour promotion", "Morning playlist", "Customer announcement", "Advertisement"],
  2: ["All screens", "Main Hall", "Bar Area", "Nairobi CBD"],
  3: ["Fill the rest of the day", "Add a lunch session", "Add an evening ad break"],
  4: ["Create Schedule", "Edit", "Save Draft"],
};
