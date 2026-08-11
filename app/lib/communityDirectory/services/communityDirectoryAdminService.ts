import * as repository from "../repositories/communityDirectoryAdminRepository";
import type {CommunityAdminInput,CommunityDirectoryKind} from "../adminTypes";
const url=(value:string|undefined)=>{const v=value?.trim()||"";return !v?"":/^https?:\/\//i.test(v)?v:`https://${v}`};
export async function createCommunityListing(kind:CommunityDirectoryKind,input:CommunityAdminInput,user:{id:string;email:string}){
 if(input.name.trim().length<2)throw new Error("Listing name is required.");
 if(!input.category.trim())throw new Error("Category is required.");
 if(!input.location.trim())throw new Error("Location is required.");
 const destination=kind==="groups"?input.group_url:input.website;
 if(!destination?.trim())throw new Error(kind==="groups"?"Group link is required.":"Organization website is required.");
 const common={...input,name:input.name.trim(),category:input.category.trim(),location:input.location.trim(),description:input.description.trim(),contact_name:input.contact_name.trim(),contact_email:input.contact_email.trim(),contact_phone:input.contact_phone.trim()};
 await repository.create(kind,kind==="groups"?{...common,group_url:url(input.group_url),organization_type:undefined,website:undefined,image:undefined}:{...common,website:url(input.website),group_url:undefined,platform:undefined,language:undefined},user);
}
