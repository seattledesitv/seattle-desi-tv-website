import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

function clean(value: any) { return String(value || "").trim(); }

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }) as any;
    const userResult = await sessionClient.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    if (!serviceKey) return NextResponse.json({ error: "Supabase server key is missing." }, { status: 500 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
    const body = await request.json();
    const action = clean(body.action);
    const assignmentId = clean(body.assignment_id);
    if (!assignmentId) return NextResponse.json({ error: "Assignment id is required." }, { status: 400 });

    const assignmentResult = await db.from("event_crew_assignments").select("*").eq("id", assignmentId).maybeSingle();
    if (assignmentResult.error) throw assignmentResult.error;
    const assignment = assignmentResult.data;
    if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    const sameUser = assignment.user_id === user.id || String(assignment.user_email || "").toLowerCase() === String(user.email || "").toLowerCase();
    if (!sameUser) return NextResponse.json({ error: "You can only update your own assignment." }, { status: 403 });

    const eventId = assignment.event_id;
    const workflowResult = await db.from("event_video_workflows").select("*").eq("event_id", eventId).maybeSingle();
    if (workflowResult.error) throw workflowResult.error;
    let workflow = workflowResult.data;

    if (action === "confirm_assignment") {
      const result = await db.from("event_crew_assignments").update({ crew_confirmed: true }).eq("id", assignmentId);
      if (result.error) throw result.error;
      await db.from("event_video_workflow_activity").insert({ event_id: eventId, workflow_id: workflow?.id || null, actor_user_id: user.id, actor_email: user.email, activity_type: "assignment_confirmed", notes: "Crew confirmed assignment." });
      return NextResponse.json({ ok: true, message: "Assignment confirmed." });
    }

    if (action === "submit_coverage") {
      const uploadedToSdtv = Boolean(body.uploaded_to_sdtv_folder);
      const crewSharedFolderUrl = clean(body.crew_shared_folder_url || body.media_url);
      const notes = clean(body.notes);
      const noContent = Boolean(body.no_content);
      if (!noContent && !uploadedToSdtv && !crewSharedFolderUrl) return NextResponse.json({ error: "Confirm upload to SDTV folder or add your shared folder URL." }, { status: 400 });
      const coverageNotes = noContent ? `No media content from this crew member.${notes ? `\n\nNotes: ${notes}` : ""}` : [`Uploaded to SDTV folder: ${uploadedToSdtv ? "Yes" : "No"}`, crewSharedFolderUrl ? `Crew shared folder: ${crewSharedFolderUrl}` : "", notes ? `Notes: ${notes}` : ""].filter(Boolean).join("\n");
      const currentStatus = workflow?.status;
      const nextWorkflowPayload: any = {
        event_id: eventId,
        status: currentStatus && currentStatus !== "published_complete" ? currentStatus : "ready_for_editing",
        crew_reviewer_email: user.email || assignment.user_email || null,
        crew_shared_folder_url: crewSharedFolderUrl || workflow?.crew_shared_folder_url || null,
        external_media_url: crewSharedFolderUrl || workflow?.external_media_url || null,
        crew_notes: [workflow?.crew_notes, `Crew submission from ${user.email || assignment.user_email || "crew"}:\n${coverageNotes}`].filter(Boolean).join("\n\n---\n\n"),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (workflow?.id) {
        delete nextWorkflowPayload.event_id;
        const result = await db.from("event_video_workflows").update(nextWorkflowPayload).eq("id", workflow.id).select("*").maybeSingle();
        if (result.error) throw result.error;
        workflow = result.data;
      } else {
        nextWorkflowPayload.created_by = user.id;
        const result = await db.from("event_video_workflows").insert(nextWorkflowPayload).select("*").maybeSingle();
        if (result.error) throw result.error;
        workflow = result.data;
      }
      const assignmentUpdate = await db.from("event_crew_assignments").update({ coverage_completed: true, crew_confirmed: true, coverage_notes: coverageNotes, completed_at: new Date().toISOString() }).eq("id", assignmentId);
      if (assignmentUpdate.error) throw assignmentUpdate.error;
      await db.from("event_video_workflow_activity").insert({ event_id: eventId, workflow_id: workflow?.id || null, actor_user_id: user.id, actor_email: user.email, activity_type: noContent ? "coverage_no_content" : "coverage_submitted", notes: coverageNotes });
      return NextResponse.json({ ok: true, message: noContent ? "Marked complete with no media content." : "Coverage submitted to the editor workflow." });
    }

    if (action === "crew_review") {
      if (!workflow?.id) return NextResponse.json({ error: "Video workflow not found." }, { status: 404 });
      const decision = clean(body.decision);
      const notes = clean(body.notes);
      if (!decision) return NextResponse.json({ error: "Review decision is required." }, { status: 400 });
      const nextStatus = decision === "approved" ? "awaiting_admin_approval" : "changes_requested";
      const result = await db.from("event_video_workflows").update({ status: nextStatus, crew_review_decision: decision, crew_review_notes: notes || null, crew_reviewed_at: new Date().toISOString(), updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", workflow.id);
      if (result.error) throw result.error;
      await db.from("event_video_workflow_activity").insert({ event_id: eventId, workflow_id: workflow.id, actor_user_id: user.id, actor_email: user.email, activity_type: decision === "approved" ? "crew_approved_draft" : "crew_requested_changes", notes });
      return NextResponse.json({ ok: true, message: decision === "approved" ? "Draft approved and sent to admin review." : "Change request sent to the editor." });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not update coverage workflow." }, { status: 500 });
  }
}
