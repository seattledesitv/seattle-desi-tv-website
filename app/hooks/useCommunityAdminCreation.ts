"use client";
import {useState} from "react";
import {createCommunityListing} from "../lib/communityDirectory/services/communityDirectoryAdminService";
import type {CommunityAdminInput,CommunityDirectoryKind} from "../lib/communityDirectory/adminTypes";
export function useCommunityAdminCreation(kind:CommunityDirectoryKind,user:{id:string;email?:string|null}|null,onCreated:()=>Promise<void>,siteId?:string|null){
 const[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function create(input:CommunityAdminInput){if(!user)throw new Error("Admin login is required.");setSaving(true);setError("");try{await createCommunityListing(kind,input,{id:user.id,email:user.email||""},siteId);await onCreated();}catch(cause){setError(cause instanceof Error?cause.message:"Listing could not be created.");throw cause;}finally{setSaving(false);}}
 return{create,saving,error};
}
