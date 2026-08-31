import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { CommunityAdminInput,CommunityDirectoryKind } from "../adminTypes";

export async function create(kind:CommunityDirectoryKind,input:CommunityAdminInput,user:{id:string;email:string},siteId?:string|null){
 const approved=input.status==="approved",now=new Date().toISOString(),table=kind==="groups"?"community_groups":"community_organizations";
 const payload:any={...input,submitted_by:user.id,submitted_email:user.email,approved,status:input.status,approved_by:approved?(user.email||user.id):null,approved_at:approved?now:null,updated_at:now};
 if(siteId)payload.site_id=siteId;
 const {error}=await getSupabaseBrowserClient().from(table).insert(payload);
 if(error)throw error;
}
