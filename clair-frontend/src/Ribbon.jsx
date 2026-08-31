// ---------------------------------------------------------------------------
// Ribbon — a reusable, tabbed command toolbar in the spirit of MS Word's
// "Fluent" ribbon (tabs -> groups -> commands, an in-ribbon gallery, a
// contextual tab set, a dialog-box launcher, enhanced tooltips), but built
// from scratch for ClairMD: original layout code, ClairMD's own brand
// tokens (teal/marigold/ink, not Office blue/gold), and lucide-react's
// open-source icon set (already a dependency here) rather than any Word
// icon artwork. Nothing here is copied from Microsoft — only the general,
// long-since-industry-standard idea of a tabbed command ribbon (the same
// pattern Google Docs, LibreOffice, Canva, etc. all use in their own way).
//
// Fully data-driven: pass `tabs` (and optionally `contextualTabs`,
// `quickAccessCommands`) to describe your own commands — nothing about a
// specific ClairMD screen is hard-coded. DEFAULT_TABS below is just a
// ready-to-use example so the component renders something sensible with
// zero props.
// ---------------------------------------------------------------------------

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Save, Undo2, Redo2, FilePlus, FolderOpen, Printer, ChevronDown,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Indent, Outdent, Type, Palette, Highlighter,
  Table, Image, Link2, Search, ClipboardPaste, Copy, Scissors,
  HelpCircle, Sparkles, Tag, ChevronRight, RemoveFormatting,
  Stethoscope, BookOpen, Activity, Pill,
  Hammer, Tent, BarChart3, BedDouble, Package, CreditCard,
  Users2, CalendarDays, ClipboardList, GraduationCap, UserCircle2, Rss,
  UserPlus, ShieldAlert, AlertTriangle, Wind,
  Mail, Wrench, CircleHelp, Bug, MessagesSquare, LifeBuoy, Compass,
  Calculator, Scale, Ruler, Droplet,
} from "lucide-react";

// --- ClairMD brand tokens (see ClairMDEHR.jsx's own design-tokens comment)
const TEAL = "#0F5C56";
const TEAL_SOFT = "#E4EEEC";
const MARIGOLD = "#E8A33D";
const INK = "#16241F";
const PAPER = "#EFF3F0";
const HAIRLINE = "#D8DED9";

// ---------------------------------------------------------------------------
// Tooltip — the reference image's "enhanced tooltip" (bold title + a short
// description line beneath a toolbar button), built as a small floating
// panel shown after a brief hover delay.
// ---------------------------------------------------------------------------
function CommandTooltip({ command, anchorRef, visible }) {
  if (!visible || !command?.tooltip) return null;
  return (
    <div
      className="absolute z-50 top-full left-0 mt-1.5 w-56 rounded-md border shadow-lg p-2.5 pointer-events-none"
      style={{ background: "#FFFFFF", borderColor: HAIRLINE }}
    >
      <div className="text-xs font-semibold" style={{ color: INK, fontFamily: "IBM Plex Sans, sans-serif" }}>
        {command.tooltip.title || command.label}
      </div>
      {command.tooltip.description && (
        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: "#5B655F" }}>
          {command.tooltip.description}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single command button. `size` is "large" (icon over a label, like
// Word's Paste/Styles-launcher buttons) or "small" (compact icon row, like
// Word's Bold/Italic/Underline row).
// ---------------------------------------------------------------------------
function RibbonButton({ command, size = "small", active, onRun }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const menuTriggerRef = useRef(null);
  const timerRef = useRef(null);
  const Icon = command.icon || Type;

  const showTooltipSoon = () => {
    timerRef.current = setTimeout(() => setHovered(true), 500);
  };
  const hideTooltip = () => {
    clearTimeout(timerRef.current);
    setHovered(false);
  };
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Close a real dropdown (command.menuItems) on outside click/Escape —
  // same convention as the app-menu ("C" button) dropdown in Ribbon below.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = () => setMenuOpen(false);
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const base =
    "relative flex items-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2";
  const activeStyle = active ? { background: TEAL_SOFT } : {};

  if (size === "large") {
    // A real dropdown (command.menuItems) can't be a <button> wrapping more
    // <button>s (invalid, nested-interactive HTML) — wrap in a <div> instead
    // and keep the trigger and the menu as siblings inside it.
    const Wrapper = command.menuItems ? "div" : "button";
    return (
      <Wrapper
        type={command.menuItems ? undefined : "button"}
        disabled={command.menuItems ? undefined : command.disabled}
        onClick={command.menuItems ? undefined : () => onRun?.(command)}
        onMouseEnter={showTooltipSoon}
        onMouseLeave={hideTooltip}
        className={`${base} flex-col justify-start gap-1 px-2 py-1.5 min-w-[64px] hover:bg-[#EDF4F3] disabled:opacity-40`}
        style={{ ...activeStyle, fontFamily: "IBM Plex Sans, sans-serif" }}
      >
        {command.menuItems ? (
          <button
            ref={menuTriggerRef}
            type="button"
            disabled={command.disabled}
            onClick={(e) => {
              e.stopPropagation();
              // Positioned via a portal (see below), not CSS position:
              // absolute — the ribbon's own content row scrolls
              // horizontally (overflow-x-auto), which per the CSS spec
              // also forces overflow-y to auto, clipping anything tall
              // that tries to hang off an in-flow absolute box. A portal
              // to document.body sidesteps that entirely.
              const rect = menuTriggerRef.current?.getBoundingClientRect();
              if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left });
              setMenuOpen((v) => !v);
            }}
            className="flex flex-col items-center gap-1 bg-transparent"
          >
            <Icon size={22} strokeWidth={1.75} style={{ color: command.accent ? MARIGOLD : TEAL }} />
            <span className="text-[11px] leading-tight text-center" style={{ color: INK }}>
              {command.label}
              <ChevronDown size={10} className="inline ml-0.5 -mb-px" />
            </span>
          </button>
        ) : (
          <>
            <Icon size={22} strokeWidth={1.75} style={{ color: command.accent ? MARIGOLD : TEAL }} />
            <span className="text-[11px] leading-tight text-center" style={{ color: INK }}>
              {command.label}
              {command.hasMenu && <ChevronDown size={10} className="inline ml-0.5 -mb-px" />}
            </span>
          </>
        )}
        <CommandTooltip command={command} visible={hovered && !menuOpen} />
        {command.menuItems && menuOpen && menuRect && createPortal(
          <div
            className="fixed z-50 w-56 rounded-md border shadow-lg py-1 text-left"
            style={{ background: "#FFFFFF", borderColor: HAIRLINE, top: menuRect.top, left: menuRect.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {command.menuItems.map((item) => {
              const ItemIcon = item.icon || Type;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setMenuOpen(false); onRun?.(item); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#EDF4F3]"
                  style={{ color: INK, fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  <ItemIcon size={14} style={{ color: TEAL }} />
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </Wrapper>
    );
  }

  return (
    <button
      type="button"
      disabled={command.disabled}
      onClick={() => onRun?.(command)}
      onMouseEnter={showTooltipSoon}
      onMouseLeave={hideTooltip}
      title={undefined}
      className={`${base} gap-1 px-1.5 py-1 hover:bg-[#EDF4F3] disabled:opacity-40`}
      style={activeStyle}
    >
      <Icon size={15} strokeWidth={1.75} style={{ color: command.accent ? MARIGOLD : "#3A4A44" }} />
      {command.hasMenu && <ChevronDown size={10} style={{ color: "#3A4A44" }} />}
      <CommandTooltip command={command} visible={hovered} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// A group of commands (e.g. "Clipboard", "Font") with the reference
// image's bottom-centered group label and optional dialog-box-launcher
// (the small diagonal-arrow icon in a group's bottom-right corner).
// ---------------------------------------------------------------------------
function RibbonGroup({ group, onRun }) {
  return (
    <div className="flex flex-col h-full px-2 border-r last:border-r-0" style={{ borderColor: HAIRLINE }}>
      <div className="flex items-start gap-0.5 flex-1 py-1.5">
        {group.gallery ? (
          <InRibbonGallery gallery={group.gallery} onRun={onRun} />
        ) : (
          group.rows ? (
            // Stacked small-button rows (Word's Clipboard/Font-style layout)
            <div className="flex flex-col justify-center gap-0.5">
              {group.rows.map((row, ri) => (
                <div key={ri} className="flex items-center gap-0.5">
                  {row.map((cmd) => (
                    <RibbonButton key={cmd.id} command={cmd} size="small" onRun={onRun} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            group.commands.map((cmd) => (
              <RibbonButton key={cmd.id} command={cmd} size="large" onRun={onRun} />
            ))
          )
        )}
      </div>
      <div className="flex items-center justify-center gap-1 pb-1">
        <span className="text-[10px]" style={{ color: "#6C766F", fontFamily: "IBM Plex Sans, sans-serif" }}>
          {group.label}
        </span>
        {group.hasDialogLauncher && (
          <button
            type="button"
            title={`${group.label} options`}
            className="w-3 h-3 flex items-center justify-center rounded-sm hover:bg-[#EDF4F3]"
            onClick={() => onRun?.({ id: `${group.id}-launcher`, launcher: true, groupId: group.id })}
          >
            <ChevronRight size={9} style={{ color: "#6C766F" }} className="rotate-45" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// In-ribbon gallery — small preview swatches with a "More" chevron, in the
// spirit of Word's Styles gallery (Normal / No Spacing / Heading 1 …).
// ---------------------------------------------------------------------------
function InRibbonGallery({ gallery, onRun }) {
  return (
    <div className="flex items-stretch gap-1">
      {gallery.items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onRun?.({ ...item, galleryId: gallery.id })}
          className="flex flex-col items-center justify-center w-16 h-12 rounded-sm border hover:border-[#0F5C56]"
          style={{ borderColor: HAIRLINE, background: "#FFFFFF" }}
        >
          <span
            className="text-[11px]"
            style={{ color: INK, fontFamily: item.font || "IBM Plex Sans, sans-serif", fontWeight: item.bold ? 700 : 400 }}
          >
            {item.preview || "Aa"}
          </span>
          <span className="text-[8px] mt-0.5" style={{ color: "#6C766F" }}>{item.label}</span>
        </button>
      ))}
      <button
        type="button"
        title="More styles"
        onClick={() => onRun?.({ id: `${gallery.id}-more`, galleryMore: true })}
        className="flex flex-col items-center justify-center w-5 rounded-sm border hover:border-[#0F5C56]"
        style={{ borderColor: HAIRLINE, background: "#FFFFFF" }}
      >
        <ChevronDown size={12} style={{ color: "#6C766F" }} />
      </button>
    </div>
  );
}

// The app's real 11-body-system physical examination checklist keys/labels
// (mirrors EXAM_TEMPLATES in ClairMDEHR.jsx — same 11 systems, same order,
// same key names — so `onCommand`'s id like "exam-cardiovascular" maps
// directly onto that object's `cardiovascular` entry).
const EXAM_SYSTEM_TEMPLATES = [
  { key: "general", label: "General Examination" },
  { key: "cardiovascular", label: "Cardiovascular System" },
  { key: "respiratory", label: "Respiratory System" },
  { key: "gastrointestinal", label: "Gastrointestinal / Abdominal" },
  { key: "musculoskeletal", label: "Locomotor (Musculoskeletal)" },
  { key: "nervous", label: "Nervous System" },
  { key: "urogenital", label: "Urogenital System" },
  { key: "endocrine", label: "Endocrine & Metabolic" },
  { key: "skin", label: "Skin, Nails and Hair" },
  { key: "eyes", label: "Eyes" },
  { key: "ent", label: "Ear, Nose and Throat" },
];

// The app's real Library sections (mirrors LIBRARY_MODAL_CONFIG in
// ClairMDEHR.jsx) and its real sidebar/module views (mirrors
// SIDEBAR_VIEW_META there) — same keys, so onCommand ids like
// "lib-drugDatabase" / "mod-doctorProfile" map directly onto those.
const LIBRARY_SECTIONS = [
  { key: "medicalCondition", label: "Medical Condition", icon: BookOpen },
  { key: "symptoms", label: "Symptoms", icon: Activity },
  { key: "aetiology", label: "Aetiology", icon: BookOpen },
  { key: "drugDatabase", label: "Drug Database", icon: Pill },
];

// The app's real "special situation" clinical pickers, stacked together
// inside RecordsTab in ClairMDEHR.jsx (TraumaPicker, DisasterManagementPicker,
// PoisoningPicker, EnvironmentalInjuriesPicker, SpecialSituationsPicker) —
// same 5 categories, same real labels/icons each picker's own header uses.
const SPECIAL_SITUATION_SECTIONS = [
  { key: "trauma", label: "Trauma", icon: ShieldAlert },
  { key: "disasterManagement", label: "Disaster Management", icon: AlertTriangle },
  { key: "poisoning", label: "Poisoning", icon: Pill },
  { key: "environmentalInjuries", label: "Environmental Injuries", icon: Wind },
  { key: "specialSituations", label: "Special Situations", icon: ShieldAlert },
];

const MODULE_SECTIONS = {
  clinical: [
    { key: "planner", label: "Planner", icon: CalendarDays },
    { key: "followups", label: "Follow-ups", icon: ClipboardList },
    { key: "virtualOpd", label: "Virtual OPD", icon: GraduationCap },
    { key: "doctorProfile", label: "Doctor profile", icon: UserCircle2 },
    // "feed" (Specialty feed) deliberately NOT here — it has its own
    // top-level ribbon tab below (kept-separate per explicit request).
  ],
  hospitalOps: [
    { key: "buildHospital", label: "Build a hospital", icon: Hammer },
    { key: "campMode", label: "Camp / medical aid mode", icon: Tent },
    { key: "beds", label: "Bed availability", icon: BedDouble },
    { key: "inventory", label: "Inventory manager", icon: Package },
    { key: "hospitalBilling", label: "Billing & payment", icon: CreditCard },
    { key: "affiliatedDoctors", label: "Affiliated doctors", icon: Users2 },
  ],
  account: [
    // "hospitalAuth" (Account access, now labeled "Profile") deliberately
    // not here — moved to the left sidebar per explicit request, not
    // reachable from the ribbon anymore.
    { key: "statistics", label: "Statistics", icon: BarChart3 },
  ],
};

// ---------------------------------------------------------------------------
// Default example config — Administration / Home / Insert / Review /
// Library / Special Situations / Specialty Feed, sized for an EHR's own
// note-taking needs rather than a copy of Word's tab set. Library, Special
// Situations, and Administration all mirror ClairMD's real sections (see
// LIBRARY_SECTIONS/SPECIAL_SITUATION_SECTIONS/MODULE_SECTIONS above) so
// this isn't placeholder content — it's the app's actual reference
// library, clinical-scenario pickers, and admin/module list. Tabs are
// defined below in a convenient order, then reordered by TAB_ORDER so
// Administration renders first without needing to physically move the
// (large) tab blocks around in the source.
// ---------------------------------------------------------------------------
const TAB_DEFINITIONS = [
  {
    id: "home",
    label: "Home",
    groups: [
      {
        id: "clipboard",
        label: "Clipboard",
        hasDialogLauncher: true,
        rows: [
          [
            { id: "paste", label: "Paste", icon: ClipboardPaste, tooltip: { title: "Paste", description: "Insert the last copied text (Ctrl+V)." } },
          ],
          [
            { id: "cut", label: "Cut", icon: Scissors, tooltip: { title: "Cut", description: "Remove and copy the selection (Ctrl+X)." } },
            { id: "copy", label: "Copy", icon: Copy, tooltip: { title: "Copy", description: "Copy the selection (Ctrl+C)." } },
          ],
        ],
      },
      {
        id: "font",
        label: "Font",
        hasDialogLauncher: true,
        rows: [
          [
            { id: "bold", label: "Bold", icon: Bold, tooltip: { title: "Bold", description: "Make the selected text bold (Ctrl+B)." } },
            { id: "italic", label: "Italic", icon: Italic, tooltip: { title: "Italic", description: "Italicize the selected text (Ctrl+I)." } },
            { id: "underline", label: "Underline", icon: Underline, hasMenu: true, tooltip: { title: "Underline", description: "Underline the selected text (Ctrl+U)." } },
            { id: "strike", label: "Strikethrough", icon: Strikethrough, tooltip: { title: "Strikethrough", description: "Draw a line through the selected text." } },
          ],
          [
            { id: "highlight", label: "Highlight", icon: Highlighter, hasMenu: true, accent: true, tooltip: { title: "Text Highlight Color", description: "Make text look like it's marked with a highlighter." } },
            { id: "color", label: "Font Color", icon: Palette, hasMenu: true, tooltip: { title: "Font Color", description: "Change the color of the text." } },
            { id: "clear", label: "Clear Formatting", icon: RemoveFormatting, tooltip: { title: "Clear Formatting", description: "Remove all formatting from the selection, leaving only plain text." } },
          ],
        ],
      },
      {
        id: "paragraph",
        label: "Paragraph",
        hasDialogLauncher: true,
        rows: [
          [
            { id: "bullets", label: "Bullets", icon: List, hasMenu: true, tooltip: { title: "Bullets", description: "Start a bulleted list." } },
            { id: "numbering", label: "Numbering", icon: ListOrdered, hasMenu: true, tooltip: { title: "Numbering", description: "Start a numbered list." } },
            { id: "outdent", label: "Decrease Indent", icon: Outdent, tooltip: { title: "Decrease Indent" } },
            { id: "indent", label: "Increase Indent", icon: Indent, tooltip: { title: "Increase Indent" } },
          ],
          [
            { id: "align-left", label: "Align Left", icon: AlignLeft, tooltip: { title: "Align Left (Ctrl+L)" } },
            { id: "align-center", label: "Center", icon: AlignCenter, tooltip: { title: "Center (Ctrl+E)" } },
            { id: "align-right", label: "Align Right", icon: AlignRight, tooltip: { title: "Align Right (Ctrl+R)" } },
            { id: "align-justify", label: "Justify", icon: AlignJustify, tooltip: { title: "Justify (Ctrl+J)" } },
          ],
        ],
      },
      {
        id: "styles",
        label: "Styles",
        hasDialogLauncher: true,
        gallery: {
          id: "quick-styles",
          items: [
            { id: "style-normal", label: "Normal", preview: "Aa" },
            { id: "style-note", label: "Clinical Note", preview: "Aa", font: "IBM Plex Mono, monospace" },
            { id: "style-heading", label: "Heading 1", preview: "Aa", bold: true, font: "Fraunces, serif" },
          ],
        },
      },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    groups: [
      {
        id: "tables",
        label: "Tables",
        commands: [{ id: "table", label: "Table", icon: Table, hasMenu: true, tooltip: { title: "Table", description: "Insert a table into the note." } }],
      },
      {
        id: "illustrations",
        label: "Illustrations",
        commands: [
          { id: "image", label: "Image", icon: Image, tooltip: { title: "Pictures", description: "Insert a scan or photo from this device." } },
          { id: "tag", label: "Tag", icon: Tag, tooltip: { title: "Insert Tag", description: "Attach a coded reference (e.g. ICD-10, SNOMED)." } },
        ],
      },
      {
        id: "links",
        label: "Links",
        commands: [
          { id: "link", label: "Link", icon: Link2, tooltip: { title: "Link", description: "Insert a link to another record or reference." } },
        ],
      },
      {
        id: "exam-templates",
        label: "Examination Templates",
        hasDialogLauncher: true,
        // The app's real 11-body-system physical examination checklists
        // (EXAM_TEMPLATES in ClairMDEHR.jsx) — same 11 systems, same order.
        commands: EXAM_SYSTEM_TEMPLATES.map((sys) => ({
          id: `exam-${sys.key}`,
          label: sys.label,
          icon: Stethoscope,
          tooltip: { title: sys.label, description: "Insert this system's examination template." },
        })),
      },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [
      {
        id: "proofing",
        label: "Proofing",
        commands: [
          { id: "spelling", label: "Spelling", icon: Sparkles, tooltip: { title: "Check Spelling", description: "Check the note for spelling issues." } },
          { id: "find", label: "Find", icon: Search, hasMenu: true, tooltip: { title: "Find", description: "Search within this record (Ctrl+F)." } },
        ],
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    groups: [
      {
        id: "reference",
        label: "Reference",
        commands: LIBRARY_SECTIONS.map((sec) => ({
          id: `lib-${sec.key}`,
          label: sec.label,
          icon: sec.icon,
          tooltip: { title: sec.label, description: `Open the ${sec.label} library.` },
        })),
      },
    ],
  },
  {
    id: "special-situations",
    label: "Special Situations",
    groups: [
      {
        id: "scenarios",
        label: "Clinical Scenarios",
        commands: SPECIAL_SITUATION_SECTIONS.map((s) => ({
          id: `situ-${s.key}`,
          label: s.label,
          icon: s.icon,
          tooltip: { title: s.label, description: `Show/hide the ${s.label} section on the note's Records page.` },
        })),
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    groups: [
      {
        id: "mod-clinical",
        label: "Clinical",
        commands: MODULE_SECTIONS.clinical.map((m) => ({
          id: `mod-${m.key}`,
          label: m.label,
          icon: m.icon,
          tooltip: { title: m.label, description: `Open ${m.label}.` },
        })),
      },
      {
        id: "mod-hospital-ops",
        label: "Hospital Operations",
        commands: MODULE_SECTIONS.hospitalOps.map((m) => ({
          id: `mod-${m.key}`,
          label: m.label,
          icon: m.icon,
          tooltip: { title: m.label, description: `Open ${m.label}.` },
        })),
      },
      {
        id: "mod-account",
        label: "Account",
        commands: MODULE_SECTIONS.account.map((m) => ({
          id: `mod-${m.key}`,
          label: m.label,
          icon: m.icon,
          tooltip: { title: m.label, description: `Open ${m.label}.` },
        })),
      },
    ],
  },
  {
    // Kept as its own tab, separate from Administration, per explicit
    // request — same "mod-feed" id/action as before (setSidebarView),
    // just its own top-level destination instead of living inside
    // Administration's Clinical group.
    id: "specialty-feed",
    label: "Specialty Feed",
    groups: [
      {
        id: "feed-actions",
        label: "Feed",
        commands: [
          { id: "mod-feed", label: "Specialty feed", icon: Rss, tooltip: { title: "Specialty feed", description: "Open the specialty feed." } },
        ],
      },
    ],
  },
  {
    // Non-medical correspondence — a company, vendor, or member of the
    // public reaching the doctor for something other than a patient's
    // care — kept on its own tab, separate from the specialty feed and
    // from patient records (same "mod-" id/action as every other
    // sidebar-view command, see onCommand in ClairMDEHR.jsx).
    id: "mailings",
    label: "Mailings",
    groups: [
      {
        id: "mailings-actions",
        label: "Mailings",
        commands: [
          { id: "mod-mailings", label: "Mailings", icon: Mail, tooltip: { title: "Mailings", description: "Messages from companies, vendors, or the public — kept separate from patient records." } },
        ],
      },
    ],
  },
  {
    // Same real-dropdown pattern as Help below — five medical calculators
    // stack one below the other under a single Calculators button, per
    // explicit request. Each opens straight to that one calculator (see
    // onCommand's "calc-" routing in ClairMDEHR.jsx) rather than an
    // accordion of all five, matching how Help's own items each open one
    // specific destination.
    id: "calculators",
    label: "Calculators",
    groups: [
      {
        id: "calculators-actions",
        label: "Calculators",
        commands: [
          {
            id: "calculators-menu",
            label: "Calculators",
            icon: Calculator,
            menuItems: [
              { id: "calc-bmi", label: "BMI", icon: Scale },
              { id: "calc-ibw", label: "Ideal Body Weight (IBW)", icon: Scale },
              { id: "calc-pbw", label: "Predicted Body Weight (PBW)", icon: Droplet },
              { id: "calc-crcl", label: "Creatinine Clearance", icon: Droplet },
              { id: "calc-bsa", label: "Body Surface Area (BSA)", icon: Ruler },
            ],
          },
        ],
      },
    ],
  },
  {
    // A real dropdown (menuItems), not four separate ribbon buttons —
    // Tutorial / Troubleshooting / FAQs / Report a problem stack one below
    // the other when the Help button is clicked, per explicit request.
    id: "help",
    label: "Help",
    groups: [
      {
        id: "help-actions",
        label: "Help",
        commands: [
          {
            id: "help-menu",
            label: "Help",
            icon: LifeBuoy,
            menuItems: [
              { id: "mod-tutorial", label: "Tutorial (About App)", icon: Compass },
              { id: "mod-troubleshooting", label: "Troubleshooting", icon: Wrench },
              { id: "mod-faqs", label: "FAQs", icon: CircleHelp },
              { id: "mod-report", label: "Report a problem", icon: Bug },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    groups: [
      {
        id: "feedback-actions",
        label: "Feedback",
        commands: [
          { id: "mod-feedback", label: "Feedback", icon: MessagesSquare, tooltip: { title: "Feedback", description: "Send a suggestion to the ClairMD team." } },
        ],
      },
    ],
  },
];

// Administration first, then the rest in their original order.
const TAB_ORDER = ["administration", "home", "insert", "review", "library", "calculators", "special-situations", "specialty-feed", "mailings", "help", "feedback"];
export const DEFAULT_TABS = TAB_ORDER.map((id) => TAB_DEFINITIONS.find((t) => t.id === id)).filter(Boolean);

const DEFAULT_QUICK_ACCESS = [
  { id: "save", icon: Save, tooltip: { title: "Save", description: "Save changes (Ctrl+S)." } },
  { id: "undo", icon: Undo2, tooltip: { title: "Undo", description: "Undo the last action (Ctrl+Z)." } },
  { id: "redo", icon: Redo2, tooltip: { title: "Redo", description: "Redo the last undone action (Ctrl+Y)." } },
];

// ---------------------------------------------------------------------------
// Ribbon — the exported component.
//
// Props:
//   appName            — label shown next to the application button
//   tabs               — array of { id, label, groups } (see DEFAULT_TABS)
//   contextualTabs      — optional array of { id, tabSetLabel, accent, tabs }
//                         rendered only while active (the "Table Tools" /
//                         "Contextual tab set" pattern in the reference image)
//   activeContextualId  — id of the contextual tab set to show, or null
//   quickAccessCommands — array of small icon commands (see DEFAULT_QUICK_ACCESS)
//   documentLabel       — text shown centered in the title strip
//   onCommand(command)  — called with the command object when anything runs
//   onHelp()            — called when the Help (?) icon is clicked
// ---------------------------------------------------------------------------
export default function Ribbon({
  appName = "ClairMD",
  tabs = DEFAULT_TABS,
  contextualTabs = [],
  activeContextualId = null,
  quickAccessCommands = DEFAULT_QUICK_ACCESS,
  documentLabel = "",
  onCommand,
  onHelp,
}) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id);
  const [showAppMenu, setShowAppMenu] = useState(false);

  const activeContextual = contextualTabs.find((c) => c.id === activeContextualId) || null;
  const allVisibleTabs = activeContextual
    ? [...tabs, ...activeContextual.tabs]
    : tabs;
  const activeTab = allVisibleTabs.find((t) => t.id === activeTabId) || allVisibleTabs[0];

  return (
    <div
      className="w-full border-b select-none"
      style={{ background: PAPER, borderColor: HAIRLINE, fontFamily: "IBM Plex Sans, sans-serif" }}
    >
      {/* Title strip: application button, quick-access toolbar, document label, help */}
      <div className="flex items-center gap-2 px-2 pt-1.5 pb-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAppMenu((v) => !v)}
            title={`${appName} menu`}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: TEAL, fontFamily: "Fraunces, serif" }}
          >
            C
          </button>
          {showAppMenu && (
            <div
              className="absolute z-50 top-full left-0 mt-1 w-44 rounded-md border shadow-lg py-1"
              style={{ background: "#FFFFFF", borderColor: HAIRLINE }}
            >
              {[
                { id: "new", label: "New Record", icon: FilePlus },
                { id: "open", label: "Open Record", icon: FolderOpen },
                { id: "save-as", label: "Save a Copy", icon: Save },
                { id: "print-menu", label: "Print", icon: Printer },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setShowAppMenu(false); onCommand?.(item); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#EDF4F3]"
                  style={{ color: INK }}
                >
                  <item.icon size={14} style={{ color: TEAL }} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 pl-1 border-l" style={{ borderColor: HAIRLINE }}>
          {quickAccessCommands.map((cmd) => (
            <RibbonButton key={cmd.id} command={cmd} size="small" onRun={onCommand} />
          ))}
        </div>

        <div className="flex-1 text-center text-xs truncate" style={{ color: "#5B655F" }}>
          {documentLabel}
        </div>

        <button
          type="button"
          title="Help"
          onClick={onHelp}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#EDF4F3]"
        >
          <HelpCircle size={15} style={{ color: "#5B655F" }} />
        </button>
      </div>

      {/* Tab strip, with any active contextual tab set appended */}
      <div className="flex items-end px-2" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            className="px-3 py-1.5 text-xs -mb-px border-b-2"
            style={{
              color: activeTabId === tab.id ? TEAL : "#5B655F",
              fontWeight: activeTabId === tab.id ? 600 : 400,
              borderColor: activeTabId === tab.id ? TEAL : "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}

        {activeContextual && (
          <div className="ml-2 flex flex-col">
            <div
              className="text-[10px] px-2 pt-0.5 rounded-t-sm font-semibold tracking-wide uppercase"
              style={{ background: activeContextual.accent || MARIGOLD, color: "#FFFFFF" }}
            >
              {activeContextual.tabSetLabel}
            </div>
            <div className="flex">
              {activeContextual.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className="px-3 py-1 text-xs -mb-px border-b-2"
                  style={{
                    color: activeTabId === tab.id ? TEAL : "#5B655F",
                    fontWeight: activeTabId === tab.id ? 600 : 400,
                    borderColor: activeTabId === tab.id ? TEAL : "transparent",
                    background: TEAL_SOFT,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ribbon content: the active tab's groups */}
      <div className="flex items-stretch h-[86px] px-1 overflow-x-auto">
        {activeTab?.groups.map((group) => (
          <RibbonGroup key={group.id} group={group} onRun={onCommand} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NoteTypeToolbar — a separate, second-row sub-toolbar meant to sit directly
// below <Ribbon />, for picking which kind of note is being worked on. This
// is intentionally its own small component (not baked into Ribbon's tabs)
// since it addresses a different question — "which record type" rather than
// "which ribbon command" — the same way the reference image's document
// itself sits below the ribbon rather than being another tab.
//
// Mirrors the app's real OPD / ICU-Ward entry points (see the `newEntryMode`
// "OPD" / "ICU / Ward" tabs in ClairMDEHR.jsx, both icon={UserPlus}).
//
// Props:
//   activeType   — "opd" | "icuward" | null
//   onSelect(type) — called with "opd" or "icuward" when a button is clicked
// ---------------------------------------------------------------------------
export function NoteTypeToolbar({ activeType = null, onSelect }) {
  const items = [
    { type: "opd", label: "OPD Notes", icon: UserPlus },
    { type: "icuward", label: "ICU / Ward Notes", icon: UserPlus },
  ];
  return (
    <div
      className="w-full flex items-center gap-1 px-2 py-1 border-b select-none"
      style={{ background: "#FFFFFF", borderColor: HAIRLINE, fontFamily: "IBM Plex Sans, sans-serif" }}
    >
      {items.map((item) => {
        const active = activeType === item.type;
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelect?.(item.type)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs"
            style={{
              color: active ? TEAL : "#5B655F",
              fontWeight: active ? 600 : 400,
              background: active ? TEAL_SOFT : "transparent",
            }}
          >
            <item.icon size={13} style={{ color: active ? TEAL : "#8A958E" }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
