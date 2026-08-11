export type CommunityDirectoryKind = "groups" | "organizations";
export type CommunityAdminInput = {
  name:string; category:string; location:string; description:string; contact_name:string; contact_email:string; contact_phone:string;
  platform?:string; language?:string; group_url?:string;
  organization_type?:string; website?:string; image?:string;
  status:"pending"|"approved";
};
