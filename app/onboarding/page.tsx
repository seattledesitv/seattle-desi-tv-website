"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

const agreementText = `Seattle Desi TV Volunteer & Contributor Agreement

Thank you for choosing to volunteer with Seattle Desi TV (SDTV). SDTV is a community media platform focused on culture, events, interviews, radio, local businesses, youth leadership, and community storytelling.

By submitting this onboarding form, I acknowledge and agree to the following:

1. Community Standards
I will represent SDTV respectfully and professionally at events, interviews, recordings, radio programs, online discussions, and community interactions. I will treat organizers, guests, sponsors, viewers, team members, and the public with courtesy and respect.

2. Volunteer Role
I understand that volunteer participation does not create employment, compensation, ownership, or agency rights. SDTV may assign, change, pause, or end volunteer responsibilities based on community needs, availability, conduct, and team fit.

3. Media, Content, and Brand
I will not publish, distribute, edit, remove, monetize, or represent SDTV content, logo, recordings, photos, interviews, credentials, or brand materials without SDTV approval. Content captured for SDTV may be used by SDTV across website, social media, radio, YouTube, promotional materials, sponsor decks, archives, and partner communications.

4. Event Conduct
When attending an event as an SDTV volunteer, I will follow organizer rules, venue rules, safety instructions, media access boundaries, and SDTV assignment guidance. I will not promise coverage, sponsorship, publishing, interviews, approvals, discounts, or partnerships unless authorized by SDTV leadership.

5. Confidentiality
I may receive private information such as internal contacts, sponsor discussions, unpublished content, team planning, guest details, volunteer records, access links, credentials, or event logistics. I will keep this information confidential and use it only for SDTV-approved work.

6. Safety and Consent
I will act safely and responsibly. I will seek appropriate consent before recording interviews or using personal images where required. I will immediately report concerns, conflicts, harassment, safety issues, or misuse of SDTV access to the SDTV team.

7. Equipment and Access
Any SDTV-provided credentials, accounts, files, footage, documents, equipment, or access must be used only for approved SDTV work and returned or removed when requested. I will not share login credentials or access with others.

8. Conflict of Interest
I will disclose potential conflicts, including paid engagements, sponsor relationships, competing media work, or situations where I may personally benefit from SDTV access or coverage.

9. Photo and Profile Permission
I authorize SDTV to use the profile details and photo I submit for internal onboarding, team coordination, public team pages, credits, assignments, and SDTV promotional or recognition purposes, unless I separately request limited use.

10. Acknowledgment
I have read and understood this agreement. I agree to follow SDTV standards and understand that final team access is subject to SDTV review and approval.`;

export default function OnboardingPage() {
/* existing file unchanged until submit */
}
