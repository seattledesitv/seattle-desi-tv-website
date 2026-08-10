export type RadioScheduleType = "one_time" | "daily" | "weekly";
export type RadioProgramStatus = "draft" | "published" | "on_hold" | "archived";

export type RadioProgram = {
  id: string;
  title: string;
  description: string | null;
  host_id: string | null;
  host_name: string | null;
  schedule_type: RadioScheduleType;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  timezone: string;
  effective_from: string | null;
  effective_until: string | null;
  is_published: boolean;
  status: RadioProgramStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
  host?: { id: string; name: string; image: string | null } | null;
};

export type RadioProgramInput = Omit<
  RadioProgram,
  "id" | "created_at" | "updated_at" | "host"
>;

export type PublicRadioSchedule = {
  generatedAt: string;
  timezone: string;
  upcoming: RadioProgram[];
  recurring: RadioProgram[];
};
