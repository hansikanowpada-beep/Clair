// ---------------------------------------------------------------------------
// LandingPage — the site's real front door. A visitor picks who they are,
// then either logs in right here (Doctor — the only role without its own
// dedicated login screen elsewhere) or is handed off into ClairMDEHR's
// existing PatientPortalView / CareTeamPortalView, which already have their
// own complete, real login/signup flows — this page doesn't duplicate those.
// "Others" (companies/campaigns) and "Medical students" both have no backend
// account type yet, so each is a simple, honest form instead of a fake login
// — Medical students collects real signup-shaped details (name/institution/
// email/password) since it's framed as an account, not just a contact form,
// but is equally upfront that it isn't backend-wired yet.
//
// Same brand tokens as ClairMDEHR.jsx (see that file's own design-tokens
// comment) — teal primary, marigold accent — not a new arbitrary palette.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import {
  Stethoscope, Users2, HeartPulse, GraduationCap, Briefcase, ShieldCheck,
  ArrowRight, Loader2, Mail, Heart,
} from "lucide-react";
import { backendLogin, backendSignup } from "./api.js";

const TEAL = "#0F5C56";
const MARIGOLD = "#E8A33D";
const INK = "#16241F";
const PAPER = "#EFF3F0";
const HAIRLINE = "#D8DED9";

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap";

// The four primary roles, shown in one row/grid. "Others" is deliberately
// NOT in this list — it renders as its own row below all four, per explicit
// request (medicalStudent took its old slot here).
const MAIN_ROLES = [
  {
    key: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    blurb: "Run your practice — OPD and ICU/Ward notes, diagnosis workflows, and your patient records.",
  },
  {
    key: "hospitalStaff",
    label: "Hospital staff",
    icon: Users2,
    blurb: "Technicians, pharmacists, and administrative assistants — task-scoped instructions from a doctor, nothing more.",
  },
  {
    key: "patient",
    label: "Patient",
    icon: HeartPulse,
    blurb: "Your own treatment summaries, billing, and emergency profile.",
  },
  {
    key: "medicalStudent",
    label: "Medical students",
    icon: GraduationCap,
    blurb: "For students and trainees. This is a new account type — not yet wired into the working app, but we want your details so we can reach out first.",
  },
];

const OTHERS_ROLE = {
  key: "others",
  label: "Others",
  icon: Briefcase,
  blurb: "Companies and organizations interested in running a campaign with ClairMD.",
};

const ROLES = [...MAIN_ROLES, OTHERS_ROLE];

const DOCTOR_TYPES = [
  { key: "individual_doctor", label: "Independent doctor" },
  { key: "hospital_doctor", label: "Doctor at a hospital" },
];

function DoctorAuth({ onEnter }) {
  const [doctorType, setDoctorType] = useState("individual_doctor");
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await backendSignup({ accountType: doctorType, email, password, displayName, licenseNumber });
      } else {
        await backendLogin({ email, password });
      }
      onEnter("clinic");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <div>
          <label className="text-xs text-[#5B6B63]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>This account is for</label>
          <select
            value={doctorType}
            onChange={(e) => setDoctorType(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-sm text-sm"
            style={{ borderColor: HAIRLINE, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {DOCTOR_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        {["login", "signup"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 text-sm py-1.5 rounded-sm border font-medium"
            style={mode === m ? { background: TEAL, borderColor: TEAL, color: "#FFFFFF" } : { borderColor: HAIRLINE, color: "#5B6B63" }}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      {mode === "signup" && (
        <>
          <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
          <input required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Medical license number" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
        </>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-sm font-medium text-white disabled:opacity-60"
        style={{ background: TEAL }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        {busy ? "Connecting…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      {error && <p className="text-xs" style={{ color: "#B34A3C" }}>{error}</p>}
    </form>
  );
}

// Hospital staff and Patient both already have their own complete, real
// login/signup screens inside CareTeamPortalView / PatientPortalView — this
// just hands off into the right one rather than duplicating either.
function HandoffContinue({ role, onEnter }) {
  const targetMode = role === "hospitalStaff" ? "careTeam" : "patient";
  return (
    <button
      type="button"
      onClick={() => onEnter(targetMode)}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-sm font-medium text-white"
      style={{ background: TEAL }}
    >
      Continue <ArrowRight size={15} />
    </button>
  );
}

// "Medical students" has no backend account type yet either — this collects
// real signup-shaped details (framed as an account, not a generic contact
// form) but is upfront that there's nothing to log back into yet, same
// "local only for now" honesty as the app's own Feedback/Report panels.
function MedicalStudentForm() {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-sm p-4 text-sm" style={{ background: "#F2F7F5", border: `1px solid ${HAIRLINE}`, color: INK }}>
        Thanks, {name.split(" ")[0] || "there"} — we'll email {email} once student accounts are live.
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <input required value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Medical college / institution" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-sm font-medium text-white" style={{ background: TEAL }}>
        <ArrowRight size={15} /> Request early access
      </button>
      <p className="text-[11px] text-[#8A958E]">Not yet wired to a backend in this prototype — kept locally for this session only.</p>
    </form>
  );
}

// "Others" has no backend account type — an honest contact form, not a
// fake login, same "local only for now" pattern as ClairMD's own
// Feedback/Report panels.
function OthersContact() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-sm p-4 text-sm" style={{ background: "#F2F7F5", border: `1px solid ${HAIRLINE}`, color: INK }}>
        Thanks — we'll be in touch at {email}.
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3">
      <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company / organization name" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contact email" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What kind of campaign are you interested in?" rows={4} className="w-full px-3 py-2 border rounded-sm text-sm resize-none" style={{ borderColor: HAIRLINE }} />
      <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-sm font-medium text-white" style={{ background: TEAL }}>
        <Mail size={15} /> Send
      </button>
      <p className="text-[11px] text-[#8A958E]">Not yet wired to a backend in this prototype — kept locally for this session only.</p>
    </form>
  );
}

// Each of these used to open as a popup modal — now every one is its own
// full page (same treatment as the Admin login screen below), reached by
// navigating away from the role-selection view rather than overlaying it.
const FOOTER_PAGES = {
  about: {
    title: "About Us",
    body: [
      "ClairMD is an AI-assisted EHR built for small Indian clinics, hospitals, and the people who work in them — quick OPD notes, a full ICU/Ward workflow, and clinical reference tools in one place.",
      "Diagnoses are coded against a locally-harvested ICD-10 terminology database (WHO's classification, tens of thousands of codes), searchable by code or by name. A built-in library covers medical conditions, symptoms, aetiology, and drugs, alongside examination templates for eleven body systems and dedicated workflows for trauma, disaster management, poisoning, and environmental injuries.",
      "Separate, scoped accounts exist for independent doctors, hospital doctors, hospital administrators, hospital staff (technicians, pharmacists, administrative assistants), patients, and care-team members — each sees only what their role needs, nothing more.",
      "Patient record content is encrypted on your own device before it's ever sent anywhere; ClairMD's backend stores only encrypted data and has no way to read it, even from our own admin tools. Nightly backup runs to your own Google Drive, and every account can export or deactivate its data on request, per DPDP.",
      "Built by Ayodhya.",
    ],
  },
  contact: {
    title: "Contact Us",
    body: [
      "Reach us via the Feedback and Report a problem panels once you're logged in, or through the Mailings inbox on a doctor account — mail sent there by companies, other doctors, or anyone contacting a doctor for a non-clinical reason routes straight to that doctor's inbox.",
      "A public contact address will be listed here once clairmd.net is live.",
    ],
  },
  affiliations: {
    title: "Affiliations",
    body: [
      "ClairMD is currently in early pilot conversations with hospitals interested in running the OPD/ICU-Ward workflow and hospital billing features on real wards.",
      "Confirmed affiliation partnerships will be listed here once they're finalized — nothing is confirmed yet, and we'd rather say that plainly than claim a partnership before it's real.",
    ],
  },
};

// Admin isn't a plain info page like the other three — it's a real login
// screen (founder-admin / staff account_type, gated server-side, see
// ClairMDEHR.jsx's AdminDashboardView) that this button navigates to,
// same handoff mechanism as the Hospital staff / Patient roles above.
const FOOTER_LINKS = [{ key: "admin", title: "Admin", enterMode: "admin" }];

// A generic full-page shell for the plain info pages (About Us / Contact
// Us / Affiliations) — same lockup as the Admin login landing page (logo,
// back link, centered card) so every footer destination reads as one
// consistent "separate landing page," not a mix of styles.
function FooterPageShell({ onBack, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="w-full max-w-md">
        <button type="button" onClick={onBack} className="text-xs text-[#5B6B63] mb-8 hover:text-[#16241F]">← Back to ClairMD</button>
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3" style={{ background: TEAL, fontFamily: "'Fraunces', serif" }}>C</div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: INK }}>ClairMD</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function FooterInfoPage({ pageKey, onBack }) {
  const p = FOOTER_PAGES[pageKey];
  if (!p) return null;
  return (
    <FooterPageShell onBack={onBack}>
      <div className="bg-white border rounded-md p-5" style={{ borderColor: HAIRLINE }}>
        <h2 className="text-lg mb-3" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: INK }}>{p.title}</h2>
        <div className="space-y-3">
          {p.body.map((para, i) => <p key={i} className="text-sm text-[#5B6B63]">{para}</p>)}
        </div>
      </div>
    </FooterPageShell>
  );
}

// Donations aren't live yet — no payment processing is wired up, and
// ClairMD's Section 8 nonprofit registration (the vehicle for a real
// patient financial-assistance program) hasn't happened yet either. Same
// honesty pattern as MedicalStudentForm/OthersContact: collect interest,
// say plainly what stage this is at, don't fake a payment flow.
function DonateForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-sm p-4 text-sm" style={{ background: "#FBF6EC", border: `1px solid #F0DDB0`, color: INK }}>
        Thanks — we'll email {email} the moment donations open.
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-full px-3 py-2 border rounded-sm text-sm" style={{ borderColor: HAIRLINE }} />
      <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-sm font-medium text-white" style={{ background: MARIGOLD }}>
        <Heart size={15} /> Notify me when donations open
      </button>
      <p className="text-[11px] text-[#8A958E]">Not yet wired to a backend in this prototype — kept locally for this session only.</p>
    </form>
  );
}

function DonatePage({ onBack }) {
  return (
    <FooterPageShell onBack={onBack}>
      <div className="bg-white border rounded-md p-5" style={{ borderColor: "#F0DDB0" }}>
        <div className="flex items-center gap-2 mb-3">
          <Heart size={18} style={{ color: MARIGOLD }} />
          <h2 className="text-lg" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: INK }}>Donate</h2>
        </div>
        <div className="space-y-3 mb-4">
          <p className="text-sm text-[#5B6B63]">
            ClairMD is working toward Section 8 nonprofit registration to run a patient financial-assistance program alongside the clinical product — a way to help cover care costs (ICU stays, surgeries, ongoing treatment) for patients who can't afford them, funded separately from the clinical software business.
          </p>
          <p className="text-sm text-[#5B6B63]">
            Public donations aren't open yet, and won't be until that registration is complete: without it, there's no legal structure to issue a proper donation receipt, no 80G tax-exemption status to offer donors, and no board oversight of how funds are used. We'd rather build that properly than take money before the structure exists to use it responsibly.
          </p>
        </div>
        <DonateForm />
      </div>
    </FooterPageShell>
  );
}

// Same look as the working page's sidebar Profile button — icon + label on
// the left, a '>' on the right in the spot a collapse/expand indicator
// usually sits, per explicit request (matches Profile's final treatment).
function RoleButton({ role, active, onClick }) {
  const Icon = role.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-sm border text-sm text-left transition-colors"
      style={active ? { borderColor: TEAL, background: "#F2F7F5" } : { borderColor: HAIRLINE, background: "#FFFFFF" }}
    >
      <span className="flex items-center gap-2.5" style={{ color: active ? TEAL : INK, fontWeight: active ? 500 : 400 }}>
        <Icon size={16} style={{ color: active ? MARIGOLD : "#5B6B63" }} />
        {role.label}
      </span>
      <span aria-hidden="true" style={{ color: active ? TEAL : "#8A958E" }}>&gt;</span>
    </button>
  );
}

// Merged, alphabetized once at module scope rather than every render — the
// footer's five buttons (About Us / Admin / Affiliations / Contact Us /
// Donate) come from two different sources (plain info pages vs. a real
// navigation link into ClairMDEHR's admin login) but render as one
// alphabetically-ordered row. "donate" is a "page" kind like the info
// pages — it's just visually highlighted separately in the footer below,
// not treated differently in the ordering.
const FOOTER_ITEMS = [
  ...Object.keys(FOOTER_PAGES).map((key) => ({ key, title: FOOTER_PAGES[key].title, kind: "page" })),
  { key: "donate", title: "Donate", kind: "page" },
  ...FOOTER_LINKS.map((l) => ({ key: l.key, title: l.title, kind: "link", enterMode: l.enterMode })),
].sort((a, b) => a.title.localeCompare(b.title));

export default function LandingPage({ onEnter }) {
  const [started, setStarted] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [footerPage, setFooterPage] = useState(null); // null | "about" | "contact" | "affiliations" | "donate"

  if (footerPage === "donate") return <DonatePage onBack={() => setFooterPage(null)} />;
  if (footerPage) return <FooterInfoPage pageKey={footerPage} onBack={() => setFooterPage(null)} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PAPER, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3" style={{ background: TEAL, fontFamily: "'Fraunces', serif" }}>C</div>
        <h1 className="text-4xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: INK }}>ClairMD</h1>
        <p className="text-sm mb-3" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: MARIGOLD }}>Clarity in care</p>
        <p className="text-sm text-[#5B6B63] mb-10 text-center max-w-md">
          An AI-assisted EHR for small clinics — encrypted on your own device before it ever reaches us.
        </p>

        {!started && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="px-8 py-2.5 rounded-sm text-sm font-medium text-white"
            style={{ background: TEAL }}
          >
            Start
          </button>
        )}

        {started && (
        <div className="w-full max-w-3xl">
          <div className="flex flex-col gap-3 mb-6 max-w-md mx-auto">
            {[...MAIN_ROLES, OTHERS_ROLE].map((r) => <RoleButton key={r.key} role={r} active={selectedRole === r.key} onClick={() => setSelectedRole(r.key)} />)}
          </div>

          {selectedRole && (
            <div className="bg-white border rounded-md p-5 max-w-md mx-auto" style={{ borderColor: HAIRLINE }}>
              <p className="text-xs text-[#8A958E] mb-4">{ROLES.find((r) => r.key === selectedRole).blurb}</p>
              {selectedRole === "doctor" && <DoctorAuth onEnter={onEnter} />}
              {(selectedRole === "hospitalStaff" || selectedRole === "patient") && <HandoffContinue role={selectedRole} onEnter={onEnter} />}
              {selectedRole === "medicalStudent" && <MedicalStudentForm />}
              {selectedRole === "others" && <OthersContact />}
            </div>
          )}
        </div>
        )}
      </main>

      <footer className="border-t px-6 py-6" style={{ borderColor: HAIRLINE }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5B6B63]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} /> © 2026 ClairMD (Ayodhya). All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            {FOOTER_ITEMS.map((item) =>
              item.key === "donate" ? (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFooterPage("donate")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-white font-medium"
                  style={{ background: MARIGOLD }}
                >
                  <Heart size={11} /> {item.title}
                </button>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => (item.kind === "page" ? setFooterPage(item.key) : onEnter(item.enterMode))}
                  className="hover:text-[#16241F] underline decoration-dotted"
                >
                  {item.title}
                </button>
              )
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
