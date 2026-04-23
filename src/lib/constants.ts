import type { PermKey, Role, Stage } from "./types";

export const DOMAIN = "cottondivision.com";

export const STAGES: Stage[] = [
  "Design Sent",
  "Modifications Requested",
  "Concept Approved",
  "PreProduction Samples PPS",
  "PPS Shipped",
  "Proceed to Production",
  "Production Samples",
  "Production Samples Shipped",
  "Fully Approved",
  "Archived",
];

export const BOARD_STAGES: Stage[] = STAGES.filter(
  (s) => s !== "Fully Approved" && s !== "Archived"
);

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const WAITING_OPTS = ["Designer", "Licensing Team", "Licensor", "Production", "Supplier", "None"] as const;
export const GENDERS = ["Unisex", "Male", "Female", "Kids Boys", "Kids Girls", "Kids Unisex"] as const;
export const PROD_TYPES = ["Apparel", "Accessories", "Footwear", "Home", "Bags", "Stationery", "Toys"] as const;
export const BRANDS = ["Warner Bros", "Universal Studios", "Disney", "Marvel", "Nintendo", "Paramount"] as const;

export const PROPS: Record<string, string[]> = {
  "Warner Bros": ["Looney Tunes", "Harry Potter", "Batman", "DC Comics"],
  "Universal Studios": ["Jurassic Park", "Minions", "Fast & Furious"],
  Disney: ["Stitch", "Frozen", "Mickey Mouse", "Princesses", "Toy Story"],
  Marvel: ["Spiderman", "Avengers", "Iron Man", "X-Men"],
  Nintendo: ["Mario", "Zelda", "Pokemon"],
  Paramount: ["Transformers", "Paw Patrol", "SpongeBob"],
};

export const STAGE_META: Record<Stage, { icon: string; bg: string; color: string; border: string }> = {
  "Design Sent":                { icon: "📤", bg: "#EEF0FF", color: "#4B52B8", border: "#C7CCFF" },
  "Modifications Requested":    { icon: "✏️", bg: "#FFF5EB", color: "#B87A2B", border: "#FFD9A8" },
  "Concept Approved":           { icon: "✅", bg: "#EEFBF4", color: "#2B8B57", border: "#A8E6C3" },
  "PreProduction Samples PPS":  { icon: "🧪", bg: "#F5EEFF", color: "#7B3FC4", border: "#D4B8FF" },
  "PPS Shipped":                { icon: "📦", bg: "#EBF7FF", color: "#2B6CB0", border: "#A8D8FF" },
  "Proceed to Production":      { icon: "🏭", bg: "#FFF8E1", color: "#8D6E00", border: "#FFE082" },
  "Production Samples":         { icon: "🔬", bg: "#FFF0F5", color: "#B8255F", border: "#FFB8D2" },
  "Production Samples Shipped": { icon: "🚚", bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  "Fully Approved":             { icon: "🏆", bg: "#EEFBF0", color: "#1A7A3A", border: "#80E8A0" },
  Archived:                     { icon: "📁", bg: "#F5F5F5", color: "#757575", border: "#E0E0E0" },
};

export const BRAND_COLORS: Record<string, string> = {
  "Warner Bros": "#1A3A5C",
  "Universal Studios": "#2C1810",
  Disney: "#0B3D91",
  Marvel: "#ED1D24",
  Nintendo: "#E60012",
  Paramount: "#0055A5",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "#6BAF92",
  Medium: "#E8A838",
  High: "#E06B3A",
  Urgent: "#D43C3C",
};

export const AVATAR_COLORS = ["#3D5A80", "#7B3FC4", "#C0392B", "#27AE60", "#D4922A", "#2C8C99", "#8B5CF6"];

export const ALL_PERMS: { key: PermKey; label: string; cat: string }[] = [
  { key: "viewRecords",   label: "View records",         cat: "View" },
  { key: "createRecords", label: "Create records",        cat: "Edit" },
  { key: "editRecords",   label: "Edit all fields",       cat: "Edit" },
  { key: "editPriority",  label: "Change priority only",  cat: "Edit" },
  { key: "deleteRecords", label: "Delete records",        cat: "Edit" },
  { key: "dragStage",     label: "Drag between stages",   cat: "Workflow" },
  { key: "changeStage",   label: "Change stage dropdown", cat: "Workflow" },
  { key: "archive",       label: "Archive / unarchive",   cat: "Workflow" },
  { key: "addComments",   label: "Add comments",          cat: "Collaborate" },
  { key: "sendEmail",     label: "Send notifications",    cat: "Collaborate" },
  { key: "exportCSV",     label: "Export CSV",            cat: "Data" },
  { key: "manageTeam",    label: "Manage team & access",  cat: "Admin" },
];

export const ROLE_DEFAULTS: Record<Role, Record<PermKey, boolean>> = {
  admin:     { viewRecords: true,  createRecords: true,  editRecords: true,  editPriority: true,  deleteRecords: true,  dragStage: true,  changeStage: true,  archive: true,  addComments: true,  sendEmail: true,  exportCSV: true,  manageTeam: true  },
  editor:    { viewRecords: true,  createRecords: true,  editRecords: true,  editPriority: true,  deleteRecords: false, dragStage: true,  changeStage: true,  archive: true,  addComments: true,  sendEmail: true,  exportCSV: true,  manageTeam: false },
  viewer:    { viewRecords: true,  createRecords: false, editRecords: false, editPriority: false, deleteRecords: false, dragStage: false, changeStage: false, archive: false, addComments: false, sendEmail: true,  exportCSV: true,  manageTeam: false },
  commenter: { viewRecords: true,  createRecords: false, editRecords: false, editPriority: false, deleteRecords: false, dragStage: false, changeStage: false, archive: false, addComments: true,  sendEmail: true,  exportCSV: false, manageTeam: false },
  custom:    { viewRecords: true,  createRecords: false, editRecords: false, editPriority: false, deleteRecords: false, dragStage: false, changeStage: false, archive: false, addComments: false, sendEmail: true,  exportCSV: false, manageTeam: false },
};
