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
import {
  Save, Undo2, Redo2, FilePlus, FolderOpen, Printer, ChevronDown,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Indent, Outdent, Type, Palette, Highlighter,
  Table, Image, Link2, Search, ClipboardPaste, Copy, Scissors,
  HelpCircle, Sparkles, Tag, ChevronRight, RemoveFormatting,
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

  const base =
    "relative flex items-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2";
  const activeStyle = active ? { background: TEAL_SOFT } : {};

  if (size === "large") {
    return (
      <button
        type="button"
        disabled={command.disabled}
        onClick={() => onRun?.(command)}
        onMouseEnter={showTooltipSoon}
        onMouseLeave={hideTooltip}
        className={`${base} flex-col justify-start gap-1 px-2 py-1.5 min-w-[64px] hover:bg-[#EDF4F3] disabled:opacity-40`}
        style={{ ...activeStyle, fontFamily: "IBM Plex Sans, sans-serif" }}
      >
        <Icon size={22} strokeWidth={1.75} style={{ color: command.accent ? MARIGOLD : TEAL }} />
        <span className="text-[11px] leading-tight text-center" style={{ color: INK }}>
          {command.label}
          {command.hasMenu && <ChevronDown size={10} className="inline ml-0.5 -mb-px" />}
        </span>
        <CommandTooltip command={command} visible={hovered} />
      </button>
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

// ---------------------------------------------------------------------------
// Default example config — Home / Insert / Review / View, sized for an
// EHR's own note-taking needs rather than a copy of Word's tab set.
// ---------------------------------------------------------------------------
export const DEFAULT_TABS = [
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
];

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
