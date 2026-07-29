import type { PublicationSectionSeed } from "./types";

export const DEFAULT_PUBLICATION_SECTIONS: PublicationSectionSeed[] = [
  { section_key: "cover", title: "Cover", introduction: "Edition title, hero image and release message.", included: true, sort_order: 0, section_type: "cover" },
  { section_key: "highlights", title: "Community Highlights", introduction: "Top stories and milestones from the selected period.", included: true, sort_order: 10, section_type: "dynamic" },
  { section_key: "events", title: "Upcoming Events", introduction: "Events selected for the publication and social campaign.", included: true, sort_order: 20, section_type: "dynamic" },
  { section_key: "businesses", title: "New & Featured Businesses", introduction: "New listings, premium businesses and editor-selected spotlights.", included: true, sort_order: 30, section_type: "dynamic" },
  { section_key: "organizations", title: "Community Organizations", introduction: "New and featured organizations.", included: true, sort_order: 40, section_type: "dynamic" },
  { section_key: "groups", title: "Community Groups", introduction: "Useful WhatsApp, Facebook and local community groups.", included: true, sort_order: 50, section_type: "dynamic" },
  { section_key: "recognition", title: "Recognition", introduction: "Team and community recognition.", included: true, sort_order: 60, section_type: "dynamic" },
  { section_key: "videos", title: "Watch on SDTV", introduction: "Recently published interviews, event coverage and programmes.", included: true, sort_order: 70, section_type: "dynamic" },
  { section_key: "statistics", title: "Impact & Statistics", introduction: "Activity during the period, growth and end-of-period totals.", included: true, sort_order: 80, section_type: "statistics" },
  { section_key: "get_involved", title: "Get Involved", introduction: "Join SDTV, submit content, request coverage and become a contributor.", included: true, sort_order: 90, section_type: "call_to_action" },
];
