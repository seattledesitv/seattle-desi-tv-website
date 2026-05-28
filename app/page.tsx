"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AnyRecord = Record<string, any>;
type TabId = "home" | "tv" | "radio" | "events" | "businesses" | "team" | "studio" | "donate" | "contact" | "login";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY!;
const YOUTUBE_HANDLE = process.env.NEXT_PUBLIC_YOUTUBE_HANDLE || "seattledesitv";
const LIVE365_META_URL = process.env.NEXT_PUBLIC_LIVE365_META_URL || "https://api.live365.com/stations/a45587/nowplaying";
const LIVE365_STREAM_URL = process.env.NEXT_PUBLIC_LIVE365_STREAM_URL || "https://das-edge17-live365-dal02.cdnstream.com/a45587";
const SOCIAL_STATS = [
  { platform: "YouTube", count: "15K", label: "Subscribers", icon: "▶️" },
  { platform: "Instagram", count: "7.3K", label: "Followers", icon: "📸" },
  { platform: "Facebook", count: "2.1K", label: "Followers", icon: "📘" },
  { platform: "TikTok", count: "850", label: "Followers", icon: "🎵" },
  { platform: "Spotify", count: "400", label: "Listeners", icon: "🎙️" },
];
const LOGO_SRC = "/sdtv-logo.png";
//const HERO_IMAGE = "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=2200&q=90";
const HERO_IMAGE = "/hero-sdtv.png?auto=format&fit=crop&w=2200&q=90";
const EVENT_BUCKET = "event-images";
const BUSINESS_BUCKET = "business-images";
const TEAM_BUCKET = "team-images";
const RADIO_TEAM_BUCKET = "radio-team-images";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const navItems: Array<[TabId, string]> = [
  ["home", "🏠 Home"],
  ["tv", "🖥️ TV"],
  ["radio", "🎧 Radio"],
  ["events", "📅 Events"],
  ["businesses", "🏪 Businesses"],
  ["team", "👥 Team"],
  ["donate", "💝 Donate"],
  ["contact", "📞 Contact"]
];

function getDateValue(event: AnyRecord) {
  return event.date || event.event_date || event.start_date || "";
}

function normalizeEvent(event: AnyRecord) {
  return {
    ...event,
    title: event.title || event.name || event.event_name || "Untitled Event",
    date: getDateValue(event),
    location: event.location || event.venue || event.address || "",
    description: event.description || event.details || "",
    image: event.image || event.image_url || event.poster || event.poster_url || "",
    ticket_url: event.ticket_url || event.tickets || event.registration_url || event.url || "",
    crew_member_ids: Array.isArray(event.crew_member_ids) ? event.crew_member_ids : []
  };
}

function getMonthYear(value: string | undefined | null) {
  if (!value) return { month: "", year: "" };
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { month: "", year: "" };
  return { month: String(d.getMonth() + 1), year: String(d.getFullYear()) };
}

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function roleContainsCrew(role: string) {
  const lower = role.toLowerCase();
  return lower.includes("crew") || lower.includes("admin");
}

function filterEventsByMonthYear(events: AnyRecord[], month: string, year: string) {
  return events.filter((event) => {
    if (month === "all" && year === "all") return true;
    const parsed = getMonthYear(event.date);
    return Boolean(parsed.month && parsed.year) && (month === "all" || month === parsed.month) && (year === "all" || year === parsed.year);
  });
}

function LoginRequiredNotice({ title, message }: { title: string; message: string }) {
  return (
    <main className="bg-white text-[#081024] px-8 md:px-14 py-20">
      <div className="max-w-xl mx-auto border rounded-2xl p-8 text-center shadow-sm bg-white">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="text-gray-500 mt-3">{message}</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-sdtv-login"))}
          className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-xl font-bold"
        >
          Login / Create Account
        </button>
      </div>
    </main>
  );
}

async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const promise = Promise.resolve(promiseLike);

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

type AuthPanelProps = {
  email: string;
  password: string;
  authMode: "login" | "signup";
  authMessage: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onResetPassword: () => void;
  onMagicLinkLogin: () => void;
  onToggleMode: () => void;
};

function AuthPanel({
  email,
  password,
  authMode,
  authMessage,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignUp,
  onResetPassword,
  onMagicLinkLogin,
  onToggleMode
}: AuthPanelProps) {
  return (
    <div className="bg-white text-black rounded-2xl p-6 w-full max-w-md shadow-2xl">
      <h2 className="text-2xl font-bold mb-4">
        {authMode === "login" ? "Login" : "Create Account"}
      </h2>

      <input
        className="w-full p-3 mb-3 border rounded-lg"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        autoComplete="email"
      />

      <input
        className="w-full p-3 mb-3 border rounded-lg"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        autoComplete={authMode === "login" ? "current-password" : "new-password"}
      />

      {authMessage && <p className="text-sm text-orange-600 mb-3">{authMessage}</p>}

      {authMode === "login" ? (
        <button type="button" onClick={onSignIn} className="bg-pink-600 text-white px-4 py-3 w-full rounded-lg font-bold">
          Login
        </button>
      ) : (
        <button type="button" onClick={onSignUp} className="bg-pink-600 text-white px-4 py-3 w-full rounded-lg font-bold">
          Sign Up
        </button>
      )}

      <div className="grid gap-2 mt-4 text-sm">
        <button type="button" onClick={onToggleMode} className="text-blue-600">
          {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
        </button>
        <button type="button" onClick={onResetPassword} className="text-orange-600">Reset Password</button>
        <button type="button" onClick={onMagicLinkLogin} className="text-green-700">Email Magic Link</button>
      </div>
    </div>
  );
}

const TURNSTILE_SITE_KEY = "0x4AAAAAADS20gwFUGvkmywG";

function TurnstileBox({
  id,
  onVerify,
}: {
  id: string;
  onVerify: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      const turnstile = (window as any).turnstile;

      if (cancelled) return;
      if (!containerRef.current) return;
      if (!turnstile) return;
      if (widgetIdRef.current) return;

      console.log(`Rendering Turnstile: ${id}`);

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          console.log(`Turnstile verified: ${id}`);
          onVerify(token);
        },
        "expired-callback": () => {
          console.log(`Turnstile expired: ${id}`);
          onVerify("");
        },
        "error-callback": () => {
          console.log(`Turnstile error: ${id}`);
          onVerify("");
        },
      });
    };

    const timer = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(timer);
        renderWidget();
      }
    }, 300);

    renderWidget();

    return () => {
      cancelled = true;
      clearInterval(timer);

      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup warning
        }
        widgetIdRef.current = null;
      }
    };
  }, [id, onVerify]);

  return <div ref={containerRef} className="mb-4 min-h-[70px]" />;
}
export default function Page() {
  const [tab, setTab] = useState<TabId>("home");
  const [contactCaptchaToken, setContactCaptchaToken] = useState("");
const [eventCaptchaToken, setEventCaptchaToken] = useState("");
const [businessCaptchaToken, setBusinessCaptchaToken] = useState("");
const [radioTeamCaptchaToken, setRadioTeamCaptchaToken] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [designMode, setDesignMode] = useState<"broadcast" | "classic">("broadcast");
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState("");
  const [adminChecked, setAdminChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
const [eventViewMode, setEventViewMode] = useState<"list" | "calendar">("list");
const [calendarDate, setCalendarDate] = useState(new Date());
const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [videos, setVideos] = useState<AnyRecord[]>([]);
  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [businesses, setBusinesses] = useState<AnyRecord[]>([]);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
const [pendingBusinesses, setPendingBusinesses] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<AnyRecord[]>([]);
  const [radioTeamMembers, setRadioTeamMembers] = useState<AnyRecord[]>([]);
  const [eventCrewAssignments, setEventCrewAssignments] = useState<AnyRecord[]>([]);
  const [radioMeta, setRadioMeta] = useState<AnyRecord | null>(null);
  const [radioMetaUpdatedAt, setRadioMetaUpdatedAt] = useState("");
  const [youtubeLoadMessage, setYoutubeLoadMessage] = useState("");
const [eventAdminFilter, setEventAdminFilter] = useState("pending");
const [businessAdminFilter, setBusinessAdminFilter] = useState("pending");
const [adminEvents, setAdminEvents] = useState<any[]>([]);
const [adminBusinesses, setAdminBusinesses] = useState<any[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventTicketUrl, setEventTicketUrl] = useState("");
  const [eventPocEmail, setEventPocEmail] = useState("");
  const [eventPocPhone, setEventPocPhone] = useState("");
  const [eventImageFiles, setEventImageFiles] = useState<File[]>([]);
  const [eventMonthFilter, setEventMonthFilter] = useState("all");
  const [eventYearFilter, setEventYearFilter] = useState("all");
  const [eventMessage, setEventMessage] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [selectedEventCrewIds, setSelectedEventCrewIds] = useState<string[]>([]);
  const [assignCrewEventId, setAssignCrewEventId] = useState<string | null>(null);
  const [assignCrewMemberIds, setAssignCrewMemberIds] = useState<string[]>([]);
  const [eventCrewMessage, setEventCrewMessage] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AnyRecord | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessDiscount, setBusinessDiscount] = useState("");
  const [businessOffer, setBusinessOffer] = useState("");
  const [businessPocName, setBusinessPocName] = useState("");
  const [businessPocEmail, setBusinessPocEmail] = useState("");
  const [businessPocPhone, setBusinessPocPhone] = useState("");
  const [businessImageFile, setBusinessImageFile] = useState<File | null>(null);
  const [businessCategoryFilter, setBusinessCategoryFilter] = useState("all");
  const [businessMessage, setBusinessMessage] = useState("");
const [editingEventId, setEditingEventId] = useState<string | null>(null);
const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
const [eventEditForm, setEventEditForm] = useState<any>({});
const [businessEditForm, setBusinessEditForm] = useState<any>({});
  const [teamName, setTeamName] = useState("");
  const [teamTitle, setTeamTitle] = useState("");
  const [teamImageFile, setTeamImageFile] = useState<File | null>(null);
  const [teamMessage, setTeamMessage] = useState("");
const [adminDateFilter, setAdminDateFilter] = useState("all");
const [adminMonthFilter, setAdminMonthFilter] = useState("all");
const [adminYearFilter, setAdminYearFilter] = useState("all");
  const [radioTeamName, setRadioTeamName] = useState("");
  const [radioTeamTitle, setRadioTeamTitle] = useState("");
  const [radioSegmentName, setRadioSegmentName] = useState("");
  const [radioTeamImageFile, setRadioTeamImageFile] = useState<File | null>(null);
  const [radioTeamMessage, setRadioTeamMessage] = useState("");
  const [spotifyEpisodes, setSpotifyEpisodes] = useState<any[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactInterest, setContactInterest] = useState("volunteer");
  const [contactMessage, setContactMessage] = useState("");
  const [contactStatus, setContactStatus] = useState("");

const isAdmin = useMemo(() => {
  const role = String(userRole || "").toLowerCase().trim();
  return role.includes("admin") || role.includes("super_admin");
}, [userRole]);
  const isCrew = useMemo(() => roleContainsCrew(userRole), [userRole]);
  const canAccessAdminArea = Boolean(user && isAdmin);
  const canChooseCrew = Boolean(user && adminChecked && isCrew);

  const filteredEvents = useMemo(() => filterEventsByMonthYear(events, eventMonthFilter, eventYearFilter), [events, eventMonthFilter, eventYearFilter]);
  const availableEventYears = useMemo(() => Array.from(new Set(events.map((event) => getMonthYear(event.date).year).filter(Boolean))).sort(), [events]);
  const filteredBusinesses = useMemo(() => businesses.filter((business) => businessCategoryFilter === "all" || business.category === businessCategoryFilter), [businesses, businessCategoryFilter]);
  const availableBusinessCategories = useMemo(() => Array.from(new Set(businesses.map((business) => business.category).filter(Boolean))).sort(), [businesses]);

  const openLogin = () => {
    setAuthMode("login");
    setAuthMessage("");
    setTab("login");
  };

const approveEvent = async (id: string) => {
  const { data, error } = await supabase
    .from("events")
    .update({ status: "approved"  })
    .eq("id", id)
    .select("id,title,status");

 if (error) {
  alert(error.message);
  return;
}

setEventMessage("Event approved successfully.");

  await loadAdminDashboardData();
  await loadEventsOnly();
};

const updateEventStatus = async (id: string, status: string) => {
  const updatePayload: any = { status };

  if (status === "approved") {
    updatePayload.approved_by = user?.email || user?.id;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAdminDashboardData();
  await loadEventsOnly();
};

const updateBusinessStatus = async (id: string, status: string) => {
  const updatePayload: any = { status };

  if (status === "approved") {
    updatePayload.approved_by = user?.email || user?.id;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("local_businesses")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAdminDashboardData();
  await loadData();
};

const startEditEvent = (event: any) => {
  setEditingEventId(event.id);
  setEventEditForm({
    title: event.title || "",
    date: event.date || "",
    location: event.location || "",
    description: event.description || "",
    ticket_url: event.ticket_url || "",
  });
};

const saveEventEdit = async () => {
  if (!editingEventId) return;

  const { error } = await supabase
    .from("events")
    .update(eventEditForm)
    .eq("id", editingEventId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingEventId(null);
  setEventEditForm({});
  await loadAdminDashboardData();
  await loadEventsOnly();
};

const startEditBusiness = (business: any) => {
  setEditingBusinessId(business.id);
  setBusinessEditForm({
    name: business.name || "",
    address: business.address || "",
    website: business.website || "",
    category: business.category || "",
    discount: business.discount || "",
    offer: business.offer || "",
  });
};

const saveBusinessEdit = async () => {
  if (!editingBusinessId) return;

  const { error } = await supabase
    .from("local_businesses")
    .update(businessEditForm)
    .eq("id", editingBusinessId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingBusinessId(null);
  setBusinessEditForm({});
  await loadAdminDashboardData();
  await loadData();
};

  
const holdEvent = async (id:string)=>{

 const {error}=await supabase
 .from("events")
 .update({
   status:"on_hold"
 })
 .eq("id",id);

 if(error){
   alert(error.message);
   return;
 }

 alert("Event moved to On Hold");

 await loadAdminDashboardData();
};

const holdBusiness=async(id:string)=>{

 const {error}=await supabase
 .from("local_businesses")
 .update({
   status:"on_hold"
 })
 .eq("id",id);

 if(error){
   alert(error.message);
   return;
 }

 alert("Business moved to On Hold");

 await loadAdminDashboardData();
};
  
const approveBusiness = async (id: string) => {
  const { data, error } = await supabase
    .from("local_businesses")
    .update({
 status:"approved"
})
    .eq("id", id)
    .select("id,name,approved");

if (error) {
  alert(error.message);
  return;
}

setEventMessage("Event approved successfully.");

  await loadAdminDashboardData();
  await loadData();
};

  const rejectEvent = async (id: string) => {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Event rejected and removed.");
  await loadAdminDashboardData();
};

const rejectBusiness = async (id: string) => {
  const { error } = await supabase
    .from("local_businesses")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Business rejected and removed.");
  await loadAdminDashboardData();
};
  const isValidTab = (value: string): value is TabId =>
  [
    "home",
    "tv",
    "radio",
    "events",
    "businesses",
    "team",
    "studio",
    "donate",
    "contact",
    "login",
  ].includes(value);
  
  const uploadFileToBucket = async (file: File, bucket: string) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

const loadAdminRole = async (currentUser: any) => {
    setAdminChecked(false);
    if (!currentUser?.id) {
  setUserRole("");
      setAdminChecked(true);
      return;
    }
    try {
      const byUserId = await withTimeout(
        supabase.from("admins").select("user_id,email,role").eq("user_id", currentUser.id).maybeSingle(),
        8000,
        "Admin lookup"
      );
      if (byUserId.error) throw byUserId.error;
      let row = byUserId.data;
      if (!row && currentUser.email) {
        const byEmail = await withTimeout(
          supabase.from("admins").select("user_id,email,role").eq("email", currentUser.email).maybeSingle(),
          8000,
          "Admin lookup by email"
        );
        if (byEmail.error) throw byEmail.error;
        row = byEmail.data;
      }
      setUserRole(row?.role || "");
    } finally {
      setAdminChecked(true);
}
  };


  const signIn = async () => {
    setAuthMessage("");
    if (!email || !password) return setAuthMessage("Please enter email and password.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthMessage(error.message);
    if (data?.user) {
      setUser(data.user);
      setPassword("");
      setTab("home");
      await loadAdminRole(data.user);
    }
  };

  const signUp = async () => {
    setAuthMessage("");
    if (!email || !password) return setAuthMessage("Please enter email and password.");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) return setAuthMessage(error.message);
    if (data?.user && data?.session) {
      setUser(data.user);
      setTab("home");
      await loadAdminRole(data.user);
    } else {
      setAuthMessage("Account created. Please check your email to verify your account.");
    }
  };

  const resetPassword = async () => {
    if (!email) return setAuthMessage("Enter your email first, then click Reset Password.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setAuthMessage(error ? error.message : "Password reset email sent.");
  };

  const magicLinkLogin = async () => {
    if (!email) return setAuthMessage("Enter your email first, then click Magic Link.");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setAuthMessage(error ? error.message : "Magic login link sent.");
  };

  const signOut = async () => {
    setUser(null);
    setUserRole("");
    setAdminChecked(true);
    setPassword("");
    setTab("login");
    await supabase.auth.signOut({ scope: "global" });
  };

  const fetchYouTubeVideos = async () => {
    if (!YOUTUBE_API_KEY) {
      setYoutubeLoadMessage("YouTube API key missing. Add NEXT_PUBLIC_YOUTUBE_API_KEY to .env.local.");
      return [];
    }
    setYoutubeLoadMessage("Loading YouTube videos...");
    try {
      const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&forHandle=${encodeURIComponent(YOUTUBE_HANDLE)}&key=${YOUTUBE_API_KEY}`);
      const channelData = await channelRes.json();
      let uploads = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) {
        const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(YOUTUBE_HANDLE)}&key=${YOUTUBE_API_KEY}`);
        const searchData = await searchRes.json();
        const channelId = searchData?.items?.[0]?.snippet?.channelId;
        if (channelId) {
          const byIdRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`);
          const byId = await byIdRes.json();
          uploads = byId?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        }
      }
      if (!uploads) {
        setYoutubeLoadMessage("Could not find YouTube uploads playlist.");
        return [];
      }
      const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=12&playlistId=${uploads}&key=${YOUTUBE_API_KEY}`);
      const playlistData = await playlistRes.json();
      const items = (playlistData.items || []).map((item: AnyRecord) => {
        const videoId = item.snippet.resourceId.videoId;
        return {
          id: videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      });
      setVideos(items);
      setYoutubeLoadMessage(items.length ? `Loaded ${items.length} YouTube video(s).` : "No YouTube videos returned.");
      return items;
    } catch (error: any) {
      setYoutubeLoadMessage(error?.message || "Could not load YouTube videos.");
      return [];
    }
  };
  
const loadSpotifyEpisodes = async () => {
  try {
    const rssUrl =
      "https://anchor.fm/s/1102c5888/podcast/rss";

    const api =
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    const response = await fetch(api);
    const data = await response.json();

    setSpotifyEpisodes(data.items?.slice(0, 6) || []);
  } catch (e) {
    console.error("Spotify load failed", e);
  }
};
  const fetchRadioMetadata = async () => {
    try {
      const res = await fetch(LIVE365_META_URL, { cache: "no-store" });
      const data = await res.json();
      const current = data?.current || data?.now_playing?.song || data?.now_playing || {};
      setRadioMeta({
        title: current?.title || data?.title || "Seattle Desi Radio Live",
        artist: current?.artist || data?.artist || "",
        album: current?.album || data?.album || "",
        artwork: current?.art || current?.artwork || current?.image || data?.station?.logo || "",
        stationName: data?.station?.name || "Seattle Desi Radio"
      });
      setRadioMetaUpdatedAt(new Date().toLocaleTimeString());
    } catch {
      setRadioMeta({ title: "Seattle Desi Radio Live", artist: "", album: "", artwork: "", stationName: "Seattle Desi Radio" });
      setRadioMetaUpdatedAt(new Date().toLocaleTimeString());
    }
  };

  const loadEventCrewAssignments = async () => {
    const { data } = await supabase.from("event_crew_assignments").select("*, team_members(name,title,image)");
    setEventCrewAssignments(data || []);
  };

 const loadEventsOnly = async () => {
  const result = await supabase
    .from("events")
    .select("*")
    .eq("status","approved")
    .order("created_at", { ascending: false });

  setEvents((result.data || []).map(normalizeEvent));
  await loadEventCrewAssignments();
};

  const loadData = async () => {
    const [businessRows, teamRows, radioTeamRows] = await Promise.all([
      supabase.from("local_businesses").select("*").eq("status","approved").order("created_at", { ascending: false }),
      supabase.from("team_members").select("*").order("created_at", { ascending: true }),
      supabase.from("radio_team_members").select("*").order("created_at", { ascending: true })
    ]);
    setBusinesses(businessRows.data || []);
    setTeamMembers(teamRows.data || []);
    setRadioTeamMembers(radioTeamRows.data || []);
    await loadEventsOnly();
    await fetchYouTubeVideos();
  };

const loadAdminDashboardData = async () => {
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: businesses } = await supabase
    .from("local_businesses")
    .select("*")
    .order("created_at", { ascending: false });

  setAdminEvents(events || []);
  setAdminBusinesses(businesses || []);
};
  
const createEvent = async () => {
  setEventMessage("");

  if (!user?.id) {
    openLogin();
    return setEventMessage("Please login first.");
  }

  if (!eventTitle || !eventDate || !eventLocation) {
    return setEventMessage("Please enter event title, date, and location.");
  }

  setEventSaving(true);

  try {
    const imageUrls = eventImageFiles.length
      ? await Promise.all(
          eventImageFiles.map((file) => uploadFileToBucket(file, EVENT_BUCKET))
        )
      : [];

    const imageUrl = imageUrls[0] || "";

    const { error } = await supabase.from("events").insert({
      title: eventTitle,
      date: eventDate,
      location: eventLocation,
      description: eventDescription || null,
      ticket_url: eventTicketUrl || null,
      poc_email: eventPocEmail || null,
      poc_phone: eventPocPhone || null,
      image: imageUrl || null,
      image_urls: imageUrls,
      crew_member_ids: selectedEventCrewIds,
      created_by: user.id,
     status: "pending",
    });

    if (error) throw error;

    await fetch("/api/admin-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "Event",
        name: eventTitle,
        description: eventDescription,
        submitterEmail: user?.email,
        phone: eventPocPhone,
        location: eventLocation,
      }),
    });

    setEventTitle("");
    setEventDate("");
    setEventLocation("");
    setEventDescription("");
    setEventTicketUrl("");
    setEventPocEmail("");
    setEventPocPhone("");
    setEventImageFiles([]);
    setSelectedEventCrewIds([]);

    setEventMessage(
      "Event submitted successfully. It will be visible after admin approval."
    );

    await loadEventsOnly();
  } catch (error: any) {
    setEventMessage(error.message || "Could not add event.");
  } finally {
    setEventSaving(false);
  }
};

  
  const openAssignCrewForEvent = (event: AnyRecord) => {
    setAssignCrewEventId(event.id);
    setAssignCrewMemberIds(Array.isArray(event.crew_member_ids) ? event.crew_member_ids : []);
    setEventCrewMessage("");
  };

  const saveAssignedCrewForEvent = async (eventId: string) => {
    if (!canAccessAdminArea) return setEventCrewMessage("Only admins can assign Desi TV crew to events.");
    const { error } = await supabase.from("events").update({ crew_member_ids: assignCrewMemberIds }).eq("id", eventId);
    if (error) return setEventCrewMessage(error.message || "Could not assign crew.");
    setAssignCrewEventId(null);
    setAssignCrewMemberIds([]);
    setEventCrewMessage("Desi TV Crew assigned successfully.");
    await loadEventsOnly();
  };

  const volunteerForEventCrew = async (eventId: string) => {
    if (!user?.id) {
      openLogin();
      return setEventCrewMessage("Please login before joining crew.");
    }
    if (!canChooseCrew) return setEventCrewMessage("Only users with a role containing crew can join as crew.");
    const { error } = await supabase.from("event_crew_assignments").insert({ event_id: eventId, user_id: user.id, assignment_type: "self_selected" });
    if (error) return setEventCrewMessage(error.message || "Could not join crew.");
    setEventCrewMessage("You joined as Desi TV Crew.");
    await loadEventCrewAssignments();
  };

const createBusiness = async () => {
  setBusinessMessage("");

  if (!user?.id) {
    openLogin();
    return;
  }

  if (!businessName || !businessAddress || !businessCategory) {
    return setBusinessMessage("Please enter name, address and category.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[0-9+\-() ]{7,20}$/;

  if (businessPocEmail && !emailPattern.test(businessPocEmail.trim())) {
    setBusinessMessage("Please enter a valid POC email address.");
    return;
  }

  if (businessPocPhone && !phonePattern.test(businessPocPhone.trim())) {
    setBusinessMessage(
      "Please enter a valid POC phone number. Use only numbers, spaces, +, -, or brackets."
    );
    return;
  }

  if (businessWebsite) {
    try {
      new URL(
        businessWebsite.startsWith("http")
          ? businessWebsite
          : `https://${businessWebsite}`
      );
    } catch {
      setBusinessMessage("Please enter a valid website URL.");
      return;
    }
  }

  const imageUrl = businessImageFile
    ? await uploadFileToBucket(businessImageFile, BUSINESS_BUCKET)
    : "";

  const { error } = await supabase.from("local_businesses").insert({
    name: businessName,
    address: businessAddress,
    website: businessWebsite,
    category: businessCategory,
    discount: businessDiscount,
    offer: businessOffer,
    poc_name: businessPocName,
    poc_email: businessPocEmail,
    poc_phone: businessPocPhone,
    image: imageUrl,
    created_by: user.id,
    status: "pending",
  });

  if (error) {
    return setBusinessMessage(error.message);
  }

  await fetch("/api/admin-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "Business",
      name: businessName,
      description: businessOffer,
      submitterEmail: user?.email,
      phone: businessPocPhone,
      location: businessAddress,
    }),
  });

  setBusinessName("");
  setBusinessAddress("");
  setBusinessWebsite("");
  setBusinessCategory("");
  setBusinessDiscount("");
  setBusinessOffer("");
  setBusinessPocName("");
  setBusinessPocEmail("");
  setBusinessPocPhone("");
  setBusinessImageFile(null);

  setBusinessMessage(
    "Business submitted successfully. It will be visible after admin approval."
  );

  await loadData();
};

 const createTeamMember = async () => {
  setTeamMessage("");

  if (!canAccessAdminArea) {
    return setTeamMessage("Only admins can add team members.");
  }

  if (!teamName || !teamTitle) {
    return setTeamMessage("Please enter name and title.");
  }

  const imageUrl = teamImageFile
    ? await uploadFileToBucket(teamImageFile, TEAM_BUCKET)
    : "";

  const { error } = await supabase.from("team_members").insert({
    name: teamName,
    title: teamTitle,
    image: imageUrl,
    created_by: user.id,
  });

  if (error) {
    return setTeamMessage(error.message);
  }

  setTeamName("");
  setTeamTitle("");
  setTeamImageFile(null);
  setTeamMessage("Team member added.");

  await loadData();
};
   

  const createRadioTeamMember = async () => {
    setRadioTeamMessage("");
    if (!canAccessAdminArea) return setRadioTeamMessage("Only admins can add radio team members.");
    if (!radioTeamName || !radioTeamTitle || !radioSegmentName) return setRadioTeamMessage("Please enter name, title and segment.");
    const imageUrl = radioTeamImageFile ? await uploadFileToBucket(radioTeamImageFile, RADIO_TEAM_BUCKET) : "";
    const { error } = await supabase.from("radio_team_members").insert({ name: radioTeamName, title: radioTeamTitle, segment_name: radioSegmentName, image: imageUrl, created_by: user.id });
    if (error) return setRadioTeamMessage(error.message);
    setRadioTeamName(""); setRadioTeamTitle(""); setRadioSegmentName(""); setRadioTeamImageFile(null); setRadioTeamMessage("Radio team member added.");
    await loadData();
  };

const submitContact = async () => {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      name: contactName,
      email: contactEmail,
      message: contactMessage
    })
  });
const emailDebug = await response.json();
//alert(JSON.stringify(emailDebug, null, 2));
console.log("Email debug:", emailDebug);

//alert(JSON.stringify(emailDebug, null, 2));
  if(response.ok){
     setContactMessage("Message sent successfully");
  }
};

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      setUser(currentUser);
      if (currentUser) await loadAdminRole(currentUser);
      else setAdminChecked(true);
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await loadAdminRole(currentUser);
      } else {
        setUserRole("");
        setAdminChecked(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

useEffect(() => {
  const handlePopState = () => {
    const hash = window.location.hash.replace("#", "") || "home";

    if (isValidTab(hash)) {
      setTab(hash);
    }
  };

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);
  
useEffect(() => {
  const hash = window.location.hash.replace("#", "");

  if (
    hash === "home" ||
    hash === "tv" ||
    hash === "radio" ||
    hash === "events" ||
    hash === "businesses" ||
    hash === "team" ||
    hash === "donate" ||
    hash === "contact"
  ) {
    setTab(hash as TabId);
  }
}, []);
  
  useEffect(() => {
    loadData();
    fetchRadioMetadata();
    loadSpotifyEpisodes();
    loadAdminDashboardData();
    const interval = setInterval(() => {
      loadData();
      fetchRadioMetadata();
      loadAdminDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === "events") loadEventsOnly();
    if (tab === "tv" || tab === "home") fetchYouTubeVideos();
  }, [tab]);

const goToProtectedTab = (id: TabId) => {
  if (id === "studio" && !canAccessAdminArea) {
    openLogin();
    return;
  }

  setTab(id);
  window.history.pushState({ tab: id }, "", `#${id}`);
};
  
  const Header = () => (
  <>
    <div className="bg-[#050b18] text-white text-sm px-4 md:px-7 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-4 flex-wrap">
        <span>Follow Us:</span>
        <a href="https://seattledesitv.com" target="_blank" rel="noreferrer" className="hover:text-pink-400">🌐 Website</a>
        <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-400">▶ YouTube</a>
        <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-400">📸 Instagram</a>
        <a href="https://www.tiktok.com/@seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-400">🎵 TikTok</a>
        <a href="mailto:info@seattledesitv.com" className="hover:text-pink-400">✉ Email</a>
      </div>
      <span>📻 Listen Live: <b className="text-yellow-400">Seattle Desi Radio</b> <span className="bg-red-600 px-3 py-1 rounded-md text-xs font-bold">LIVE</span></span>
    </div>

    <header className="bg-white/95 backdrop-blur text-[#080d1d] px-4 md:px-12 py-4 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => { goToProtectedTab("home"); setMobileMenuOpen(false); }} className="flex items-center -my-3">
          <img src={LOGO_SRC} alt="Seattle Desi TV" className="h-24 md:h-36 w-auto object-contain" />
        </button>

        <nav className="hidden lg:flex items-center gap-3 font-bold">
          {navItems.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "studio" && !canAccessAdminArea) openLogin();
                else goToProtectedTab(id);
              }}
              className={`px-4 py-3 rounded-2xl transition ${tab === id ? "text-pink-600 bg-pink-50 shadow border-b-2 border-pink-600" : "hover:text-pink-600 hover:bg-pink-50"}`}
            >
              {label}
            </button>
          ))}
          {canAccessAdminArea && (
            <button
              type="button"
              onClick={() => goToProtectedTab("studio")}
              className={`px-5 py-4 rounded-2xl transition ${
                tab === "studio"
                  ? "text-pink-600 bg-pink-50 shadow-lg border-b-2 border-pink-600"
                  : "hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              🎬 Studio
            </button>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button type="button" onClick={() => setDesignMode(designMode === "broadcast" ? "classic" : "broadcast")} className="border border-pink-600 text-pink-600 px-4 py-3 rounded-xl font-bold bg-white">
            {designMode === "broadcast" ? "Switch Classic" : "Switch Broadcast"}
          </button>
          <button type="button" onClick={() => goToProtectedTab("tv")} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black shadow">▶ Watch TV</button>
          {user ? (
            <button type="button" onClick={signOut} className="border px-5 py-3 rounded-xl font-semibold">Logout</button>
          ) : (
            <button type="button" onClick={openLogin} className="border border-gray-400 px-5 py-3 rounded-xl font-semibold">Login</button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="lg:hidden border border-gray-300 rounded-xl px-4 py-3 font-black text-2xl"
          aria-label="Open menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden mt-4 border-t pt-4 bg-white">
         <div className="grid gap-2 mb-4">
  {user ? (
    <>
      <p className="text-xs text-gray-500 px-2">
        Logged in as {user.email || "user"}
      </p>

      <button
        type="button"
        onClick={() => {
          setMobileMenuOpen(false);
          signOut();
        }}
        className="bg-red-600 text-white px-4 py-3 rounded-xl font-bold"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={() => {
          setMobileMenuOpen(false);
          openLogin();
        }}
        className="bg-pink-600 text-white px-4 py-3 rounded-xl font-bold"
      >
        Login
      </button>

      <button
        type="button"
        onClick={() => {
          setMobileMenuOpen(false);
          setAuthMode("signup");
          setTab("login");
        }}
        className="border border-pink-600 text-pink-600 px-4 py-3 rounded-xl font-bold bg-white"
      >
        👥 Sign Up
      </button>
    </>
  )}
</div>

<div className="grid gap-2 font-bold">
  {navItems.map(([id, label]) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        if (id === "studio" && !canAccessAdminArea) openLogin();
        else goToProtectedTab(id);
      }}
      className={`text-left px-4 py-3 rounded-xl ${
        tab === id ? "text-pink-600 bg-pink-50" : "hover:bg-pink-50"
      }`}
    >
      {label}
    </button>
  ))}
  {canAccessAdminArea && (
  <button
    type="button"
    onClick={() => {
      setMobileMenuOpen(false);
      setTab("studio");
    }}
    className={`text-left px-4 py-3 rounded-xl ${
      tab === "studio"
        ? "text-pink-600 bg-pink-50"
        : "hover:bg-pink-50"
    }`}
  >
    🎬 Studio
  </button>
)}
</div>

<div className="grid gap-2 mt-4">
  <button
    type="button"
    onClick={() => {
      setMobileMenuOpen(false);
      setDesignMode(designMode === "broadcast" ? "classic" : "broadcast");
    }}
    className="border border-pink-600 text-pink-600 px-4 py-3 rounded-xl font-bold bg-white"
  >
    {designMode === "broadcast" ? "Switch Classic" : "Switch Broadcast"}
  </button>

  <button
    type="button"
    onClick={() => {
      setMobileMenuOpen(false);
      goToProtectedTab("tv");
    }}
    className="bg-[#071123] text-white px-4 py-3 rounded-xl font-black"
  >
    ▶ Watch Live TV
  </button>
</div>
      </div>
      )}
    </header>
  </>
);


  const Hero = () => (
    <section className="relative min-h-[380px] flex items-center overflow-hidden bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,28,.98) 0%, rgba(2,6,28,.88) 36%, rgba(2,6,28,.25) 100%), url(${HERO_IMAGE})` }}>
      <div className="absolute -left-28 top-0 bottom-0 w-36 bg-pink-600 rounded-r-full border-r-4 border-yellow-400 opacity-95" />
      <div className="px-8 md:px-16 py-16 max-w-4xl relative z-10 text-white">
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-tight tracking-tight drop-shadow">Voice of the <br /><span className="text-yellow-400">Desi Community</span></h1>
        <div className="w-16 h-2 bg-pink-600 rounded-full mt-3" />
        <p className="mt-6 text-lg max-w-xl leading-relaxed">Seattle Desi TV is your source for news, entertainment, culture, and community stories across the Pacific Northwest and beyond.</p>
        <div className="mt-8 flex flex-wrap gap-4"><button type="button" onClick={() => goToProtectedTab("tv")} className="bg-pink-600 hover:bg-pink-700 px-7 py-4 rounded-lg font-bold shadow-lg">▶ Watch Live TV</button><button type="button" onClick={() => goToProtectedTab("radio")} className="border border-white/80 bg-black/20 px-7 py-4 rounded-lg font-bold">🎧 Listen Live Radio</button></div>
      </div>
    </section>
  );

  const VideoCard = ({ video }: { video: AnyRecord }) => <a href={video.url} target="_blank" rel="noreferrer" className="block group"><div className="rounded-xl overflow-hidden bg-gray-200 aspect-video">{video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="w-full h-full bg-gray-300" />}</div><h3 className="mt-3 text-sm font-bold leading-snug">{video.title}</h3><p className="text-xs text-gray-500 mt-1">Seattle Desi TV • Latest</p></a>;

  const EventsHomeList = () => <div><div className="flex items-center justify-between mb-4"><h3 className="text-xl font-black flex items-center gap-2"><span className="text-pink-600">📅</span> Upcoming Events</h3><button type="button" onClick={() => goToProtectedTab("events")} className="border px-3 py-1 rounded-lg text-xs font-bold">View All</button></div>{events.slice(0, 3).map((event) => { const d = event.date ? new Date(`${String(event.date).split("T")[0]}T00:00:00`) : null; return <div key={event.id} className="flex gap-4 border-b py-4 last:border-b-0"><div className="bg-pink-50 rounded-xl px-4 py-2 text-center min-w-20 shadow-sm"><p className="text-pink-600 text-xs font-black uppercase">{d ? d.toLocaleString("en", { month: "short" }) : "TBA"}</p><p className="text-3xl font-black">{d ? d.getDate() : ""}</p></div><div><p className="font-black text-sm">{event.title}</p><p className="text-sm text-gray-500">{d ? d.toLocaleDateString() : event.date} · {event.location || "Seattle, WA"}</p></div></div>; })}{events.length === 0 && <p className="text-gray-500 text-sm">No events added yet.</p>}</div>;

  const HomePage = () => (
    <>
      <Hero />
      <main className={designMode === "broadcast" ? "bg-gradient-to-b from-white to-gray-50 text-[#081024] px-6 md:px-10 py-8 space-y-8" : "bg-white text-[#081024] px-8 md:px-14 py-10 space-y-12"}>
        <section className={designMode === "broadcast" ? "grid xl:grid-cols-[1fr_360px_300px] gap-6 items-stretch" : "space-y-8"}>
          <div className="bg-white rounded-2xl shadow-xl border p-6">
            <div className="flex items-center justify-between mb-5"><h2 className="text-2xl font-black flex items-center gap-3"><span className="bg-red-600 text-white rounded-lg px-3 py-2">▶</span> Latest Videos</h2><button type="button" onClick={() => goToProtectedTab("tv")} className="border border-pink-600 text-pink-600 px-5 py-2 rounded-lg font-bold">View All</button></div>
            {videos.length === 0 ? <div className="text-gray-500"><p>{youtubeLoadMessage || "Loading latest videos..."}</p><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="inline-block mt-3 bg-pink-600 text-white px-4 py-2 rounded-lg font-bold">Open YouTube</a></div> : <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-5">{videos.slice(0, 5).map((video) => <VideoCard key={video.id} video={video} />)}</div>}
          </div>
          <div className="bg-white rounded-2xl shadow-xl border p-5"><EventsHomeList /></div>
          <div className="bg-[#071123] text-white rounded-2xl shadow-xl p-6 text-center flex flex-col items-center justify-center"><h3 className="text-2xl font-black">SEATTLE DESI RADIO</h3><span className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black mt-5">ON AIR</span><div className="text-7xl my-7">🎙️</div><p className="text-gray-200">24/7 Bollywood, Bhangra & Desi Hits!</p><button type="button" onClick={() => goToProtectedTab("radio")} className="mt-6 border border-white/70 bg-purple-900/60 px-8 py-3 rounded-xl font-bold">🎧 Listen Live</button></div>
        </section>
        <section className="bg-[#071123] text-white rounded-2xl shadow-xl p-6">
  <h2 className="text-2xl font-black mb-5">
    🌎 Seattle Desi TV Community Reach
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    {SOCIAL_STATS.map((item) => (
      <div key={item.platform} className="bg-white/10 rounded-xl p-5 text-center">
        <div className="text-3xl">{item.icon}</div>
        <div className="text-3xl font-black mt-2">{item.count}</div>
        <div className="text-sm text-gray-300">{item.platform}</div>
        <div className="text-xs text-gray-400">{item.label}</div>
      </div>
    ))}
  </div>
</section>
        <section className="bg-white rounded-2xl p-6 shadow-xl mt-8">
  <h2 className="text-2xl font-black mb-5">
    🎙 Latest Spotify Episodes
  </h2>

  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
    {spotifyEpisodes.map((episode) => (
      <div
        key={episode.guid}
        className="border rounded-2xl overflow-hidden shadow-sm"
      >
        {episode.thumbnail && (
          <img
            src={episode.thumbnail}
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-4">
          <h3 className="font-black">
            {episode.title}
          </h3>

          <p className="text-sm text-gray-500 mt-2 line-clamp-3">
            {episode.description?.replace(/<[^>]*>/g, "")}
          </p>

          <a
            href={episode.link}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded-lg font-bold"
          >
            Listen
          </a>
        </div>
      </div>
    ))}
  </div>
</section>
       {/* {renderContactSection({ compact: true })} */}
        <div className="max-w-5xl mx-auto bg-[#071123] text-white rounded-2xl shadow-xl p-6 text-center">
  <h3 className="text-2xl font-black">Get Involved with Seattle Desi TV</h3>
  <p className="text-gray-300 mt-2">
    Volunteer, intern, become an RJ/VJ, partner with us, or learn about sponsorship.
  </p>
  <button
    type="button"
    onClick={() => goToProtectedTab("contact")}
    className="mt-5 bg-pink-600 text-white px-6 py-3 rounded-xl font-bold"
  >
    Contact Us
  </button>
</div>
      </main>
    </>
  );

const submitContactRequest = async () => {
  setContactStatus("Submit clicked...");

  if (!contactName || !contactEmail || !contactInterest) {
    setContactStatus("Please enter your name, email, and reason for reaching out.");
    return;
  }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(contactEmail.trim())) {
  setContactStatus("Please enter a valid email address.");
  return;
}

const phonePattern = /^[0-9+\-() ]{7,20}$/;

if (contactPhone && !phonePattern.test(contactPhone.trim())) {
  setContactStatus("Please enter a valid phone number. Use only numbers, spaces, +, -, or brackets.");
  return;
}
  if (!contactCaptchaToken) {
    setContactStatus("Captcha token missing. Please complete the captcha.");
    return;
  }

  setContactStatus("Captcha passed. Saving to Supabase...");

  const { error } = await supabase.from("contact_requests").insert({
    name: contactName,
    email: contactEmail,
    phone: contactPhone,
    interest: contactInterest,
    message: contactMessage,
  });

  if (error) {
    setContactStatus(error.message || "Could not save your request.");
    return;
  }

  setContactStatus("Saved to Supabase. Sending email...");

  const response = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      interest: contactInterest,
      message: contactMessage,
      captchaToken: contactCaptchaToken,
    }),
  });

  const emailDebug = await response.json();

  //alert(JSON.stringify(emailDebug, null, 2));

  if (!response.ok) {
    setContactStatus("Saved your request, but email notification failed.");
    return;
  }

  setContactName("");
  setContactEmail("");
  setContactPhone("");
  setContactInterest("volunteer");
  setContactMessage("");
  setContactStatus("Thank you. Your request has been submitted.");
};
  
  const renderContactSection = ({ compact = false }: { compact?: boolean }) => <section className={`${compact ? "" : "max-w-6xl mx-auto"} bg-[#071123] text-white rounded-2xl p-8 grid lg:grid-cols-[1fr_520px] gap-8 items-start`}><div><h2 className="text-3xl font-black">Get Involved with Seattle Desi TV</h2><p className="text-gray-300 mt-3">Reach out to volunteer, intern, become an RJ/VJ, partner with us, or learn about sponsorship opportunities.</p><div className="grid md:grid-cols-2 gap-3 mt-6 text-sm text-gray-300"><div className="bg-white/10 rounded-xl p-4">🤝 Volunteer</div><div className="bg-white/10 rounded-xl p-4">🎓 Internship</div><div className="bg-white/10 rounded-xl p-4">🎙 RJ</div><div className="bg-white/10 rounded-xl p-4">🎥 VJ</div><div className="bg-white/10 rounded-xl p-4">💼 Sponsorship</div><div className="bg-white/10 rounded-xl p-4">📺 Media Partnership</div></div></div><div className="bg-white text-[#081024] rounded-2xl p-5 shadow-xl"><input className="w-full border rounded-lg p-3 mb-3" placeholder="Your name" value={contactName} onChange={(e) => setContactName(e.target.value)} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /><input
  className="w-full border rounded-lg p-3 mb-3"
  placeholder="Phone number"
  type="tel"
  inputMode="tel"
  value={contactPhone}
  onChange={(e) => {
    const cleaned = e.target.value.replace(/[^0-9+\-() ]/g, "");
    setContactPhone(cleaned);
  }}
/><select className="w-full border rounded-lg p-3 mb-3" value={contactInterest} onChange={(e) => setContactInterest(e.target.value)}><option value="volunteer">I want to volunteer</option><option value="intern">I am interested in an internship</option><option value="rj">I want to be an RJ</option><option value="vj">I want to be a VJ</option><option value="sponsorship">I want sponsorship details</option><option value="media-partner">Media partnership</option><option value="general">General enquiry</option></select><textarea className="w-full border rounded-lg p-3 mb-3 min-h-28" placeholder="Tell us more" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />{contactStatus && <p className="text-sm text-orange-600 mb-3">{contactStatus}</p>}<TurnstileBox id="contact" onVerify={setContactCaptchaToken} /><button type="button" onClick={submitContactRequest} className="bg-pink-600 text-white px-6 py-3 rounded-lg font-bold w-full">Submit Request</button></div></section>;

  const CrewBadges = ({ event }: { event: AnyRecord }) => {
    const assigned = teamMembers.filter((member) => event.crew_member_ids?.includes(member.id));
    const volunteers = eventCrewAssignments.filter((assignment) => assignment.event_id === event.id);
    return <>{assigned.length > 0 && <div className="mt-4 bg-gray-50 rounded-xl p-3"><p className="text-xs font-black text-gray-500 uppercase">Desi TV Crew</p><div className="flex flex-wrap gap-2 mt-2">{assigned.map((member) => <span key={member.id} className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-bold">{member.name}</span>)}</div></div>}{volunteers.length > 0 && <div className="mt-3 bg-blue-50 rounded-xl p-3"><p className="text-xs font-black text-blue-700 uppercase">Crew Volunteers</p><p className="text-xs text-blue-700 mt-1">{volunteers.length} crew member(s) joined</p></div>}</>;
  };

  const authPanelProps = {
    email,
    password,
    authMode,
    authMessage,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSignIn: signIn,
    onSignUp: signUp,
    onResetPassword: resetPassword,
    onMagicLinkLogin: magicLinkLogin,
    onToggleMode: () => setAuthMode(authMode === "login" ? "signup" : "login")
  };
  
  return (
    <div className="min-h-screen bg-white">
      <Header />
      {tab === "login" && <main className="bg-[#071123] min-h-[650px] flex items-center justify-center px-8 py-16"><div><div className="text-center text-white mb-6"><h1 className="text-3xl font-black">Seattle Desi TV Login</h1><p className="text-gray-300 mt-2">Login, sign up, reset password, or use magic link.</p></div><AuthPanel {...authPanelProps}/></div></main>}
      {tab === "home" && <HomePage />}
      {tab === "tv" && <main className="bg-white text-[#081024] px-8 md:px-14 py-10"><h1 className="text-4xl font-black mb-2">Seattle Desi TV Videos</h1>{youtubeLoadMessage && <p className="text-sm text-gray-500 mb-6">{youtubeLoadMessage}</p>}<div className="grid md:grid-cols-3 xl:grid-cols-4 gap-6">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></main>}

      {tab === "radio" && <main className="bg-white text-[#081024] px-8 md:px-14 py-10 space-y-10"><section className="bg-[#081024] text-white rounded-3xl p-10 max-w-6xl mx-auto"><div className="grid lg:grid-cols-[220px_1fr] gap-8 items-center"><div className="w-full aspect-square rounded-3xl bg-white/10 overflow-hidden grid place-items-center">{radioMeta?.artwork ? <img src={radioMeta.artwork} alt="Now playing" className="w-full h-full object-cover" /> : <div className="text-center p-6"><div className="text-5xl">🎧</div><p className="mt-3 font-black">Seattle Desi Radio</p></div>}</div><div><div className="flex flex-wrap items-center gap-3 mb-4"><span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-black">● LIVE</span><span className="text-sm text-gray-300">Updated: {radioMetaUpdatedAt || "Loading..."}</span></div><h1 className="text-5xl font-black">{radioMeta?.stationName || "Seattle Desi Radio"}</h1><p className="mt-4 text-gray-300">Live South Asian music, interviews, culture, and community stories.</p><div className="mt-6 bg-white/10 rounded-2xl p-5"><p className="text-sm text-gray-300 uppercase tracking-wide">Now Playing</p><h2 className="text-3xl font-black mt-1">{radioMeta?.title || "Seattle Desi Radio Live"}</h2>{radioMeta?.artist && <p className="text-xl text-yellow-300 mt-1">{radioMeta.artist}</p>}</div><audio controls className="w-full mt-8"><source src={LIVE365_STREAM_URL} type="audio/mpeg" /></audio></div></div></section><section className="max-w-6xl mx-auto grid lg:grid-cols-[420px_1fr] gap-8">{canAccessAdminArea && <div className="border rounded-2xl p-6 shadow-sm bg-white"><h2 className="text-2xl font-black mb-4">Admin: Add Radio Team / Host</h2><input className="w-full border rounded-lg p-3 mb-3" placeholder="Name" value={radioTeamName} onChange={(e) => setRadioTeamName(e.target.value)} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Title / Role" value={radioTeamTitle} onChange={(e) => setRadioTeamTitle(e.target.value)} /><input className="w-full border rounded-lg p-3 mb-3" placeholder="Segment name" value={radioSegmentName} onChange={(e) => setRadioSegmentName(e.target.value)} /><input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(e) => setRadioTeamImageFile(e.target.files?.[0] || null)} />{radioTeamMessage && <p className="text-sm text-orange-600 mb-3">{radioTeamMessage}</p>}<button type="button" onClick={createRadioTeamMember} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">Add Radio Team Member</button></div>}<div className={canAccessAdminArea ? "" : "lg:col-span-2"}><h2 className="text-3xl font-black mb-5">Radio Team & Segments</h2>{radioTeamMembers.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500">No radio team members added yet.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{radioTeamMembers.map((member) => <TeamCard key={member.id} member={member} segment={member.segment_name} />)}</div>}</div></section></main>}

  {tab === "events" && (
  <main className="bg-white text-[#081024] px-8 md:px-14 py-10">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-4xl font-black">Community Events</h1>
        <p className="text-gray-500 mt-2">
          View community events. Login is required only to add an event.
        </p>
      </div>
      {!user && (
        <button
          type="button"
          onClick={openLogin}
          className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold"
        >
          Login to Add Event
        </button>
      )}
    </div>

    {selectedEvent ? (
      <EventDetailView event={selectedEvent} />
    ) : (
      <section className="grid lg:grid-cols-[420px_1fr] gap-8">
        {user ? renderEventForm() : (
          <div className="border rounded-2xl p-6 bg-yellow-50 text-yellow-800">
            <h2 className="text-2xl font-black mb-2">Want to add an event?</h2>
            <p className="mb-4">Please login or create an account to submit community events.</p>
            <button
              type="button"
              onClick={openLogin}
              className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold"
            >
              Login / Create Account
            </button>
          </div>
        )}
        <EventsList />
      </section>
    )}
  </main>
)}
{tab === "businesses" && renderBusinessesPage()}

      {tab === "team" && renderTeamPage()}
      {tab === "studio" && <StudioPage />}
      {tab === "donate" && <main className="bg-white text-[#081024] px-8 md:px-14 py-20 text-center"><h1 className="text-5xl font-black">Support Seattle Desi TV</h1><p className="mt-4 text-gray-600 max-w-2xl mx-auto">Your support helps us amplify South Asian voices, arts, culture, and community stories.</p><button type="button" className="mt-8 bg-pink-600 text-white px-8 py-4 rounded-xl font-bold"> <a
      href="https://www.zeffy.com/en-US/donation-form/amplify-south-asian-stories"
      target="_blank"
      rel="noreferrer"      
    >
      ❤️ Donate Now
    </a></button></main>}
      {tab === "contact" && <main className="bg-white text-[#081024] px-8 md:px-14 py-10">{renderContactSection({ compact: false })}</main>}
      <Footer />
    </div>
  );

  function EventImageSlider({ event }: { event: AnyRecord }) {
  const images =
    Array.isArray(event.image_urls) && event.image_urls.length > 0
      ? event.image_urls
      : event.image
      ? [event.image]
      : [];

  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-pink-50 grid place-items-center text-pink-600 font-black">
        Seattle Desi TV
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 overflow-hidden">
      <img
        src={images[index]}
        alt={event.title}
        className="w-full h-full object-cover"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setIndex(index === 0 ? images.length - 1 : index - 1)
            }
            className="absolute left-2 top-1/2 bg-black/60 text-white rounded-full w-8 h-8"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() =>
              setIndex(index === images.length - 1 ? 0 : index + 1)
            }
            className="absolute right-2 top-1/2 bg-black/60 text-white rounded-full w-8 h-8"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
function EventDetailView({ event }: { event: AnyRecord }) {
  const images =
    Array.isArray(event.image_urls) && event.image_urls.length > 0
      ? event.image_urls
      : event.image
      ? [event.image]
      : [];

  return (
    <main className="bg-white text-[#081024] px-8 md:px-14 py-10">
      <button
        type="button"
        onClick={() => setSelectedEvent(null)}
        className="mb-6 border px-4 py-2 rounded-lg font-bold"
      >
        ← Back to Events
      </button>

      <h1 className="text-5xl font-black">{event.title}</h1>
      <p className="text-gray-500 mt-3">
        {event.date} · {event.location}
      </p>

      <div className="mt-8 grid gap-6">
        {images.map((image, index) => (
          <img
            key={image}
            src={image}
            alt={`${event.title} ${index + 1}`}
            className="w-full max-h-[750px] object-contain rounded-2xl border bg-gray-50"
          />
        ))}
      </div>

      {event.description && (
        <section className="mt-10 max-w-4xl">
          <h2 className="text-3xl font-black mb-3">Event Details</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </section>
      )}

      {event.location && (
        <section className="mt-10">
          <h2 className="text-3xl font-black mb-3">Location</h2>
          <iframe
            title="Event location map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              event.location
            )}&output=embed`}
            className="w-full h-96 rounded-2xl border"
            loading="lazy"
          />
        </section>
      )}
    </main>
  );
}

  function EventsCalendarView() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selectedCalendarDate
    ? filteredEvents.filter(
        (event) => String(event.date).split("T")[0] === selectedCalendarDate
      )
    : [];

  return (
    <div className="border rounded-2xl p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
          className="border px-4 py-2 rounded-lg font-bold"
        >
          ← Prev
        </button>

        <h2 className="text-2xl font-black">
          {calendarDate.toLocaleString("en", { month: "long", year: "numeric" })}
        </h2>

        <button
          type="button"
          onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
          className="border px-4 py-2 rounded-lg font-bold"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm font-black text-gray-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (!day) return <div key={index} />;

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;

          const dayEvents = filteredEvents.filter(
            (event) => String(event.date).split("T")[0] === dateKey
          );

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedCalendarDate(dateKey)}
              className={`min-h-24 rounded-xl border p-2 text-left ${
                selectedCalendarDate === dateKey
                  ? "border-pink-600 bg-pink-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="font-black">{day}</div>
              {dayEvents.length > 0 && (
                <div className="mt-2 text-xs text-pink-600 font-bold">
                  {dayEvents.length} event(s)
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedCalendarDate && (
        <div className="mt-8">
          <h3 className="text-xl font-black mb-4">
            Events on {selectedCalendarDate}
          </h3>

          {selectedEvents.length === 0 ? (
            <p className="text-gray-500">No events on this date.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


  function CrewSelector({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
    return <div className="border rounded-xl p-3 mb-3 bg-pink-50"><p className="font-black text-sm mb-2">Assign Desi TV Crew</p>{teamMembers.length === 0 ? <p className="text-xs text-gray-500">No team members available yet.</p> : <div className="space-y-2 max-h-48 overflow-auto">{teamMembers.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm bg-white rounded-lg p-2 border"><input type="checkbox" checked={selected.includes(member.id)} onChange={() => onToggle(member.id)} /><span className="font-semibold">{member.name}</span><span className="text-gray-500">{member.title}</span></label>)}</div>}</div>;
  }

  function EventsList() {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-black">Published Events</h2>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setEventViewMode("list")}
              className={`px-4 py-2 rounded-lg font-bold ${
                eventViewMode === "list" ? "bg-pink-600 text-white" : "border"
              }`}
            >
              List
            </button>

            <button
              type="button"
              onClick={() => setEventViewMode("calendar")}
              className={`px-4 py-2 rounded-lg font-bold ${
                eventViewMode === "calendar" ? "bg-pink-600 text-white" : "border"
              }`}
            >
              Calendar
            </button>
          </div>

          {eventCrewMessage && (
            <p className="text-sm text-blue-700 mt-2">{eventCrewMessage}</p>
          )}

          <p className="text-xs text-gray-500 mt-1">
            Loaded events: {events.length}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={loadEventsOnly}
            className="border border-pink-600 text-pink-600 px-4 py-3 rounded-lg font-bold"
          >
            Refresh Events
          </button>

          <select
            className="border rounded-lg p-3"
            value={eventMonthFilter}
            onChange={(e) => setEventMonthFilter(e.target.value)}
          >
            <option value="all">All Months</option>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="border rounded-lg p-3"
            value={eventYearFilter}
            onChange={(e) => setEventYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            {availableEventYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {eventViewMode === "calendar" ? (
        <EventsCalendarView />
      ) : (
        <>
          {events.length === 0 ? (
            <div className="border rounded-2xl p-8 text-gray-500">
              No events added yet.
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="border rounded-2xl p-8 text-gray-500">
              No events match the selected filters.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function renderEventForm() {
  return (
  <div className="border rounded-2xl p-6 shadow-sm bg-white">
    <h2 className="text-2xl font-black mb-4">Add New Event</h2>

    {!user && (
      <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl p-3 mb-3 text-sm">
        Login is required to add events.
      </div>
    )}

    <input
      className="w-full border rounded-lg p-3 mb-3"
      placeholder="Event title"
      value={eventTitle}
      onChange={(e) => setEventTitle(e.target.value)}
    />

    <input
      className="w-full border rounded-lg p-3 mb-3"
      type="date"
      value={eventDate}
      onChange={(e) => setEventDate(e.target.value)}
    />

    <input
      className="w-full border rounded-lg p-3 mb-3"
      placeholder="Location"
      value={eventLocation}
      onChange={(e) => setEventLocation(e.target.value)}
    />

    <textarea
      className="w-full border rounded-lg p-3 mb-3 min-h-28"
      placeholder="Event description"
      value={eventDescription}
      onChange={(e) => setEventDescription(e.target.value)}
    />

    <input
      className="w-full border rounded-lg p-3 mb-3"
      placeholder="Ticket link / registration URL"
      value={eventTicketUrl}
      onChange={(e) => setEventTicketUrl(e.target.value)}
    />

    <input
      className="w-full border rounded-lg p-3 mb-3"
      placeholder="POC email (internal only)"
      type="email"
      value={eventPocEmail}
      onChange={(e) => setEventPocEmail(e.target.value)}
    />

    <input
      className="w-full border rounded-lg p-3 mb-3"
      placeholder="POC phone (internal only)"
      value={eventPocPhone}
      onChange={(e) => setEventPocPhone(e.target.value)}
    />

    {canAccessAdminArea && (
      <CrewSelector
        selected={selectedEventCrewIds}
        onToggle={(id) =>
          setSelectedEventCrewIds((current) =>
            current.includes(id)
              ? current.filter((x) => x !== id)
              : [...current, id]
          )
        }
      />
    )}

    <label className="block text-sm font-bold mb-2">
      Upload event image / poster
    </label>

    <input
      className="w-full border rounded-lg p-3 mb-3"
      type="file"
      accept="image/*"
      multiple
      onChange={(e) => setEventImageFiles(Array.from(e.target.files || []))}
    />

    {eventImageFiles.length > 0 && (
      <p className="text-xs text-gray-500 mb-3">
        Selected {eventImageFiles.length} image(s)
      </p>
    )}

    {eventMessage && (
      <p className="text-sm text-orange-600 mb-3">{eventMessage}</p>
    )}

    <button
      type="button"
      onClick={createEvent}
      disabled={eventSaving || !user}
      className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60"
    >
      {eventSaving ? "Saving Event..." : "Add Event"}
    </button>
  </div>
 );
}
  function EventCard({ event }: { event: AnyRecord }) {
    return <div className="border rounded-2xl overflow-hidden shadow-sm bg-white"><EventImageSlider event={event} /><div className="p-5"><h3 className="text-xl font-black">{event.title}</h3><p className="text-gray-500 mt-1">{event.date}</p><p className="text-gray-500">{event.location}</p>{event.description && <p className="text-sm text-gray-600 mt-3">{event.description}</p>}<CrewBadges event={event} />{canAccessAdminArea && <button type="button" onClick={() => openAssignCrewForEvent(event)} className="inline-block mt-4 mr-2 bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Assign Desi TV Crew</button>}{canChooseCrew && <button type="button" onClick={() => volunteerForEventCrew(event.id)} className="inline-block mt-4 mr-2 bg-[#071123] text-white px-4 py-2 rounded-lg font-bold text-sm">Join as Desi TV Crew</button>}{assignCrewEventId === event.id && <div className="mt-4 border rounded-xl p-3 bg-purple-50"><CrewSelector selected={assignCrewMemberIds} onToggle={(id) => setAssignCrewMemberIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id])} /><div className="flex gap-2"><button type="button" onClick={() => saveAssignedCrewForEvent(event.id)} className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Save Crew</button><button type="button" onClick={() => setAssignCrewEventId(null)} className="border px-4 py-2 rounded-lg font-bold text-sm">Cancel</button></div></div>}<button
  type="button"
  onClick={() => setSelectedEvent(event)}
  className="inline-block mt-4 mr-2 bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
>
  View Event
</button>{event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="inline-block mt-4 bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tickets / Register</a>}</div></div>;
  }

function renderBusinessesPage() {
  return (
    <main className="bg-white text-[#081024] px-8 md:px-14 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black">Local Business Directory</h1>
          <p className="text-gray-500 mt-2">
            Add local businesses, upload images, publish offers, and help the community discover trusted services.
          </p>
        </div>
      </div>

      <section className="grid lg:grid-cols-[420px_1fr] gap-8">
          {user ? (
        <div className="border rounded-2xl p-6 shadow-sm bg-white">
          <h2 className="text-2xl font-black mb-4">Add Local Business</h2>

          <input className="w-full border rounded-lg p-3 mb-3" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <input className="w-full border rounded-lg p-3 mb-3" placeholder="Business address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
          <input className="w-full border rounded-lg p-3 mb-3" placeholder="Website URL" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} />

          <select className="w-full border rounded-lg p-3 mb-3" value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)}>
            <option value="">Select category</option>
            {["restaurant", "grocery", "beauty", "legal", "real-estate", "finance", "health", "education", "events", "other"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input className="w-full border rounded-lg p-3 mb-3" placeholder="Discount" value={businessDiscount} onChange={(e) => setBusinessDiscount(e.target.value)} />

          <textarea className="w-full border rounded-lg p-3 mb-3 min-h-24" placeholder="Current offers / specials" value={businessOffer} onChange={(e) => setBusinessOffer(e.target.value)} />

          <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC name (internal only)" value={businessPocName} onChange={(e) => setBusinessPocName(e.target.value)} />

          <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC email (internal only)" type="email" value={businessPocEmail} onChange={(e) => setBusinessPocEmail(e.target.value)} />

          <input
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="POC phone (internal only)"
            type="tel"
            inputMode="tel"
            value={businessPocPhone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9+\-() ]/g, "");
              setBusinessPocPhone(cleaned);
            }}
          />

          <input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(e) => setBusinessImageFile(e.target.files?.[0] || null)} />

          {businessMessage && <p className="text-sm text-orange-600 mb-3">{businessMessage}</p>}

          <button type="button" onClick={createBusiness} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">
            Add Business
          </button>
        </div>
) : (
  <div className="border rounded-2xl p-6 bg-yellow-50 text-yellow-800">
    <h2 className="text-2xl font-black mb-2">Want to add a business?</h2>
    <p className="mb-4">Please login or create an account to add a local business.</p>
    <button
      type="button"
      onClick={openLogin}
      className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold"
    >
      Login / Create Account
    </button>
  </div>
)}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-black">Published Businesses</h2>
            <select className="border rounded-lg p-3" value={businessCategoryFilter} onChange={(e) => setBusinessCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {availableBusinessCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {businesses.length === 0 ? (
            <div className="border rounded-2xl p-8 text-gray-500">No businesses added yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => (
                <div key={business.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                  {business.image ? (
                    <img src={business.image} alt={business.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-pink-50 grid place-items-center text-pink-600 font-black">Local Business</div>
                  )}

                  <div className="p-5">
                    <h3 className="text-xl font-black">{business.name}</h3>
                    <p className="text-gray-500 mt-2">{business.address}</p>

                    {business.discount && <p className="mt-3 font-bold text-green-700">Discount: {business.discount}</p>}
                    {business.offer && <p className="text-sm text-gray-600 mt-2">{business.offer}</p>}

                    {business.website && (
                      <a href={business.website} target="_blank" rel="noreferrer" className="inline-block mt-4 bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

  function TeamCard({ member, segment }: { member: AnyRecord; segment?: string }) {
    return <div className="border rounded-2xl overflow-hidden shadow-sm bg-white text-center">{member.image ? <img src={member.image} alt={member.name} className="w-full h-64 object-cover" /> : <div className="w-full h-64 bg-pink-50 grid place-items-center text-pink-600 font-black">SDTV</div>}<div className="p-5"><h3 className="text-xl font-black">{member.name}</h3><p className="text-gray-500 mt-1">{member.title}</p>{segment && <p className="mt-3 inline-block bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-sm font-bold">{segment}</p>}</div></div>;
  }

function renderTeamPage() {
  return (
    <main className="bg-white text-[#081024] px-8 md:px-14 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black">Seattle Desi TV Team</h1>
          <p className="text-gray-500 mt-2">
            Meet the people helping build Seattle Desi TV, Radio, events, and community media.
          </p>
        </div>
      </div>

      {canAccessAdminArea && (
        <section className="border rounded-2xl p-6 shadow-sm bg-white mb-10 max-w-xl">
          <h2 className="text-2xl font-black mb-4">Admin: Add Team Member</h2>

          <input
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Team member name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <input
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Title / Role"
            value={teamTitle}
            onChange={(e) => setTeamTitle(e.target.value)}
          />

          <input
            className="w-full border rounded-lg p-3 mb-3"
            type="file"
            accept="image/*"
            onChange={(e) => setTeamImageFile(e.target.files?.[0] || null)}
          />

          {teamMessage && (
            <p className="text-sm text-orange-600 mb-3">{teamMessage}</p>
          )}

          <button
            type="button"
            onClick={createTeamMember}
            className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full"
          >
            Add Team Member
          </button>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-black mb-5">Our Team</h2>

        {teamMembers.length === 0 ? (
          <div className="border rounded-2xl p-8 text-gray-500">
            No team members added yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

  function StudioPage() {

const filterByAdminDate = (items: any[], dateField = "created_at") => {
  const now = new Date();

  return items.filter((item) => {
    const rawDate = item[dateField] || item.date || item.created_at;
    if (!rawDate) return true;

    const itemDate = new Date(rawDate);
    if (Number.isNaN(itemDate.getTime())) return true;

    if (adminYearFilter !== "all" && String(itemDate.getFullYear()) !== adminYearFilter) {
      return false;
    }

    if (adminMonthFilter !== "all" && String(itemDate.getMonth() + 1) !== adminMonthFilter) {
      return false;
    }

    if (adminDateFilter === "last_month") {
      const past = new Date();
      past.setMonth(now.getMonth() - 1);
      return itemDate >= past;
    }

    if (adminDateFilter === "quarter") {
      const past = new Date();
      past.setMonth(now.getMonth() - 3);
      return itemDate >= past;
    }

    if (adminDateFilter === "six_months") {
      const past = new Date();
      past.setMonth(now.getMonth() - 6);
      return itemDate >= past;
    }

    if (adminDateFilter === "year") {
      const past = new Date();
      past.setFullYear(now.getFullYear() - 1);
      return itemDate >= past;
    }

    return true;
  });
};

const filteredAdminEvents = filterByAdminDate(adminEvents, "date");
const filteredAdminBusinesses = filterByAdminDate(adminBusinesses, "created_at");

const visibleAdminEvents = filteredAdminEvents.filter(
  (event) => (event.status || "pending") === eventAdminFilter
);

const visibleAdminBusinesses = filteredAdminBusinesses.filter(
  (business) => (business.status || "pending") === businessAdminFilter
);
    
  const countByStatus = (items: any[], status: string) =>
    items.filter((item) => (item.status || "pending") === status).length;

  return (
    <main className="bg-white text-[#081024] px-8 md:px-14 py-10">
      {!user ? (
        <div className="max-w-xl mx-auto border rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-black">Admin Login Required</h1>
          <p className="text-gray-500 mt-3">Please login with an admin account to access Studio.</p>
          <button type="button" onClick={openLogin} className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-xl font-bold">
            Login
          </button>
        </div>
      ) : !adminChecked && !isAdmin ?  (
  <div className="max-w-xl mx-auto border rounded-2xl p-8 text-center">
    <h1 className="text-3xl font-black">Checking Access...</h1>
    <p className="text-gray-500 mt-3">Please wait while we verify your admin role.</p> <p className="text-xs text-gray-400 mt-3">
  Debug: adminChecked={String(adminChecked)} role=[{userRole}]
</p>
  </div>
) : !canAccessAdminArea ? (
        <div className="max-w-xl mx-auto bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-black">Access Restricted</h1>
          <p className="mt-3">You are logged in, but your role does not include admin access.</p>
          <p className="mt-2 text-sm">Current role: [{userRole || "No admin role assigned"}]</p>
        </div>
      ) : (
        <div>
          <h1 className="text-4xl font-black mb-2">Seattle Desi TV Studio</h1>
          <p className="text-gray-500 mb-8">Admin control center for approvals and updates.</p>
<section className="border rounded-2xl p-5 mb-8 bg-gray-50">
  <h2 className="text-xl font-black mb-4">Global Dashboard Filter</h2>

  <div className="grid md:grid-cols-3 gap-3">
    <select className="border rounded-lg p-3" value={adminDateFilter} onChange={(e) => setAdminDateFilter(e.target.value)}>
      <option value="all">All Time</option>
      <option value="last_month">Last Month</option>
      <option value="quarter">Last Quarter</option>
      <option value="six_months">Last 6 Months</option>
      <option value="year">Last Year</option>
    </select>

    <select className="border rounded-lg p-3" value={adminMonthFilter} onChange={(e) => setAdminMonthFilter(e.target.value)}>
      <option value="all">All Months</option>
      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((month, index) => (
        <option key={month} value={String(index + 1)}>{month}</option>
      ))}
    </select>

    <select className="border rounded-lg p-3" value={adminYearFilter} onChange={(e) => setAdminYearFilter(e.target.value)}>
      <option value="all">All Years</option>
      {[2024, 2025, 2026, 2027].map((year) => (
        <option key={year} value={String(year)}>{year}</option>
      ))}
    </select>
  </div>
</section>
         <div className="grid md:grid-cols-3 gap-6 mb-10">

 
  <div className="border rounded-2xl p-6 shadow-sm bg-white">
    <p className="text-gray-500">Events</p>

    <h2 className="text-4xl font-black">
      {adminEvents.length}
    </h2>

    <div className="mt-4 text-sm space-y-1">
      <p>🟡 Pending: {countByStatus(adminEvents, "pending")}</p>
      <p>🟢 Approved: {countByStatus(adminEvents, "approved")}</p>
      <p>🟠 On Hold: {countByStatus(adminEvents, "on_hold")}</p>
      <p>🔴 Rejected: {countByStatus(adminEvents, "rejected")}</p>
    </div>
  </div>

  <div className="border rounded-2xl p-6 shadow-sm bg-white">
    <p className="text-gray-500">Businesses</p>

    <h2 className="text-4xl font-black">
      {adminBusinesses.length}
    </h2>

    <div className="mt-4 text-sm space-y-1">
      <p>🟡 Pending: {countByStatus(adminBusinesses, "pending")}</p>
      <p>🟢 Approved: {countByStatus(adminBusinesses, "approved")}</p>
      <p>🟠 On Hold: {countByStatus(adminBusinesses, "on_hold")}</p>
      <p>🔴 Rejected: {countByStatus(adminBusinesses, "rejected")}</p>
    </div>
  </div>

  <div className="border rounded-2xl p-6 shadow-sm bg-white">
    <p className="text-gray-500">Team Members</p>

    <h2 className="text-4xl font-black">
      {teamMembers.length}
    </h2>

    <div className="mt-4 text-sm space-y-1">
      <p>👥 Active Team Profiles</p>
      <p>🎬 TV + Radio + Crew</p>
    </div>
  </div>

</div>

          <section className="border rounded-2xl p-6 shadow-sm mb-10 bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <h2 className="text-2xl font-black">Events Review</h2>
              <select className="border rounded-lg p-3" value={eventAdminFilter} onChange={(e) => setEventAdminFilter(e.target.value)}>
                <option value="pending">To Be Approved ({countByStatus(adminEvents, "pending")})</option>
                <option value="approved">Approved ({countByStatus(adminEvents, "approved")})</option>
                <option value="on_hold">On Hold ({countByStatus(adminEvents, "on_hold")})</option>
                <option value="rejected">Rejected ({countByStatus(adminEvents, "rejected")})</option>
              </select>
            </div>

            {visibleAdminEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No events in this status.</p>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleAdminEvents.map((event) => (
                  <div key={event.id} className="border rounded-xl p-4">
                    {event.image && <img src={event.image} alt={event.title} className="w-full h-40 object-cover rounded-xl mb-3" />}
                    <p className="font-bold">{event.title}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                    <p className="text-sm text-gray-500">{event.location}</p>
                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
  <p><b>POC Email:</b> {event.poc_email || "Not provided"}</p>
  <p><b>POC Phone:</b> {event.poc_phone || "Not provided"}</p>
  <p><b>Approved By:</b> {event.approved_by || "Not approved yet"}</p>
  <p><b>Approved At:</b> {event.approved_at ? new Date(event.approved_at).toLocaleString() : "Not approved yet"}</p>
</div>
                    <p className="text-xs mt-2">Status: <b>{event.status || "pending"}</b></p>
{editingEventId === event.id && (
  <div className="mt-4 grid gap-2 bg-gray-50 p-3 rounded-xl">
    <input
      className="border rounded-lg p-2"
      value={eventEditForm.title}
      onChange={(e) =>
        setEventEditForm({ ...eventEditForm, title: e.target.value })
      }
      placeholder="Event title"
    />

    <input
      className="border rounded-lg p-2"
      type="date"
      value={eventEditForm.date}
      onChange={(e) =>
        setEventEditForm({ ...eventEditForm, date: e.target.value })
      }
    />

    <input
      className="border rounded-lg p-2"
      value={eventEditForm.location}
      onChange={(e) =>
        setEventEditForm({ ...eventEditForm, location: e.target.value })
      }
      placeholder="Location"
    />

    <textarea
      className="border rounded-lg p-2 min-h-24"
      value={eventEditForm.description}
      onChange={(e) =>
        setEventEditForm({ ...eventEditForm, description: e.target.value })
      }
      placeholder="Description"
    />

    <input
      className="border rounded-lg p-2"
      value={eventEditForm.ticket_url}
      onChange={(e) =>
        setEventEditForm({ ...eventEditForm, ticket_url: e.target.value })
      }
      placeholder="Ticket URL"
    />

    <div className="flex gap-2">
      <button
        type="button"
        onClick={saveEventEdit}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm"
      >
        Save Changes
      </button>

      <button
        type="button"
        onClick={() => setEditingEventId(null)}
        className="border px-3 py-2 rounded-lg font-bold text-sm"
      >
        Cancel
      </button>
    </div>
  </div>
)}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" onClick={() => updateEventStatus(event.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button type="button" onClick={() => updateEventStatus(event.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button type="button" onClick={() => updateEventStatus(event.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button type="button" onClick={() => startEditEvent(event)} className="border px-3 py-2 rounded-lg font-bold text-sm">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border rounded-2xl p-6 shadow-sm mb-10 bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <h2 className="text-2xl font-black">Businesses Review</h2>
              <select className="border rounded-lg p-3" value={businessAdminFilter} onChange={(e) => setBusinessAdminFilter(e.target.value)}>
                <option value="pending">To Be Approved ({countByStatus(adminBusinesses, "pending")})</option>
                <option value="approved">Approved ({countByStatus(adminBusinesses, "approved")})</option>
                <option value="on_hold">On Hold ({countByStatus(adminBusinesses, "on_hold")})</option>
                <option value="rejected">Rejected ({countByStatus(adminBusinesses, "rejected")})</option>
              </select>
            </div>

            {visibleAdminBusinesses.length === 0 ? (
              <p className="text-gray-500 text-sm">No businesses in this status.</p>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleAdminBusinesses.map((business) => (
                  <div key={business.id} className="border rounded-xl p-4">
                    {business.image && <img src={business.image} alt={business.name} className="w-full h-40 object-cover rounded-xl mb-3" />}
                    <p className="font-bold">{business.name}</p>
                    <p className="text-sm text-gray-500">{business.address}</p>
                    <p className="text-sm text-gray-500">{business.category}</p>
                    <p className="text-xs mt-2">Status: <b>{business.status || "pending"}</b></p>
                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
  <p><b>POC Name:</b> {business.poc_name || "Not provided"}</p>
  <p><b>POC Email:</b> {business.poc_email || "Not provided"}</p>
  <p><b>POC Phone:</b> {business.poc_phone || "Not provided"}</p>
  <p><b>Approved By:</b> {business.approved_by || "Not approved yet"}</p>
  <p><b>Approved At:</b> {business.approved_at ? new Date(business.approved_at).toLocaleString() : "Not approved yet"}</p>
</div>
{editingBusinessId === business.id && (
  <div className="mt-4 grid gap-2 bg-gray-50 p-3 rounded-xl">
    <input
      className="border rounded-lg p-2"
      value={businessEditForm.name}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, name: e.target.value })
      }
      placeholder="Business name"
    />

    <input
      className="border rounded-lg p-2"
      value={businessEditForm.address}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, address: e.target.value })
      }
      placeholder="Address"
    />

    <input
      className="border rounded-lg p-2"
      value={businessEditForm.website}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, website: e.target.value })
      }
      placeholder="Website"
    />

    <input
      className="border rounded-lg p-2"
      value={businessEditForm.category}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, category: e.target.value })
      }
      placeholder="Category"
    />

    <input
      className="border rounded-lg p-2"
      value={businessEditForm.discount}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, discount: e.target.value })
      }
      placeholder="Discount"
    />

    <textarea
      className="border rounded-lg p-2 min-h-24"
      value={businessEditForm.offer}
      onChange={(e) =>
        setBusinessEditForm({ ...businessEditForm, offer: e.target.value })
      }
      placeholder="Offer / Details"
    />

    <div className="flex gap-2">
      <button
        type="button"
        onClick={saveBusinessEdit}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm"
      >
        Save Changes
      </button>

      <button
        type="button"
        onClick={() => setEditingBusinessId(null)}
        className="border px-3 py-2 rounded-lg font-bold text-sm"
      >
        Cancel
      </button>
    </div>
  </div>
)}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" onClick={() => updateBusinessStatus(business.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button type="button" onClick={() => updateBusinessStatus(business.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button type="button" onClick={() => updateBusinessStatus(business.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button type="button" onClick={() => startEditBusiness(business)} className="border px-3 py-2 rounded-lg font-bold text-sm">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
  function Footer() {
    return <footer className="bg-[#050b18] text-white px-8 md:px-14 py-10"><div className="grid md:grid-cols-3 gap-8"><div><img src={LOGO_SRC} alt="Seattle Desi TV" className="h-20 mb-4" /><p className="text-gray-300 text-sm">Voice of the Desi Community across TV, Radio, Events and Local Stories.</p></div><div><h3 className="font-black mb-3">Connect</h3><div className="space-y-2 text-sm text-gray-300"><p><a href="https://seattledesitv.com" target="_blank" rel="noreferrer" className="hover:text-pink-400">🌐 Website: seattledesitv.com</a></p><p><a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-400">▶ YouTube: @SeattleDesiTV</a></p><p><a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-400">📸 Instagram: @seattledesitv</a></p><p><a href="https://www.tiktok.com/@seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-400">🎵 TikTok: @seattledesitv</a></p><p><a href="https://www.facebook.com/search/top?q=Seattle%20Desi%20TV" target="_blank" rel="noreferrer" className="hover:text-pink-400">📘 Facebook: Seattle Desi TV Page</a></p><p><a href="mailto:info@seattledesitv.com" className="hover:text-pink-400">✉ Email: info@seattledesitv.com</a></p></div></div><div><h3 className="font-black mb-3">Quick Links</h3><div className="space-y-2 text-sm text-gray-300">{["home", "tv", "radio", "events", "businesses"].map((id) => <button key={id} type="button" onClick={() => setTab(id as TabId)} className="block hover:text-pink-400 capitalize">{id}</button>)}</div></div></div><div className="border-t border-white/10 mt-8 pt-6 text-sm flex flex-col md:flex-row justify-between gap-3"><p>© 2026 Seattle Desi TV. All Rights Reserved.</p><p>Built with ❤️ for the community</p></div></footer>;
  }
}
