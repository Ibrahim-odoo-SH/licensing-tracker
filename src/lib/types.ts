export type Stage =
  | "Design Sent"
  | "Modifications Requested"
  | "Concept Approved"
  | "PreProduction Samples PPS"
  | "PPS Shipped"
  | "Proceed to Production"
  | "Production Samples"
  | "Production Samples Shipped"
  | "Fully Approved"
  | "Archived";

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type WaitingOn = "Designer" | "Licensing Team" | "Licensor" | "Production" | "Supplier" | "None";
export type Role = "admin" | "editor" | "viewer" | "commenter" | "custom";

export type PermKey =
  | "viewRecords" | "createRecords" | "editRecords" | "editPriority"
  | "deleteRecords" | "dragStage" | "changeStage" | "archive"
  | "addComments" | "sendEmail" | "exportCSV" | "manageTeam";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  custom_perms: Record<PermKey, boolean> | null;
  team: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LicRecord {
  id: string;
  internal_ref: string;
  main_licensor_ref: string;
  product_name: string;
  product_type: string;
  gender: string;
  brand: string;
  property: string;
  source_status: string;
  normalized_stage: Stage;
  owner_id: string | null;
  owner_name_snapshot: string;
  contact_name: string;
  submission_date: string | null;
  concept_approval_date: string | null;
  pps_photos_date: string | null;
  pps_approval_date: string | null;
  sample_sent_date: string | null;
  sample_approval_date: string | null;
  samples_requested_qty: number;
  priority: Priority;
  waiting_on: WaitingOn;
  next_action: string;
  notes_summary: string;
  licensor_feedback: string;
  tech_pack_link: string;
  additional_link: string;
  reminder_date: string | null;
  reminder_note: string;
  reminder_done: boolean;
  is_archived: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  record_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  public_url: string;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  record_id: string;
  author_id: string | null;
  author_name: string;
  comment_text: string;
  is_internal: boolean;
  is_pinned: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  record_id: string | null;
  user_id: string | null;
  user_name: string;
  action_type: string;
  old_value: string;
  new_value: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Filters {
  search: string;
  brand: string;
  property: string;
  stage: string;
  owner: string;
  priority: string;
  waitingOn: string;
  showArchived: boolean;
  showReminders?: boolean;
}
