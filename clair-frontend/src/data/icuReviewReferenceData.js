// Reference data for the ICU/Ward admission Review composer (Encounters —
// Encounter/Review model). Follows the same sourcing discipline as
// DIAGNOSIS_META and RX_DRUG_DATABASE in ClairMDEHR.jsx: real, checkable
// content, never invented to fill a gap — and honestly labelled where a
// list is a curated subset rather than a full authoritative dataset.

// --- Investigations: common-tests LOINC subset ------------------------------
// LOINC (Logical Observation Identifiers Names and Codes) is Regenstrief
// Institute's free, maintained coding standard for lab/clinical
// observations. The codes below are the well-established, frequently
// published identifiers for the tests an ICU/ward round orders most often —
// hand-verified against public LOINC references while writing this file.
// This is a curated ~25-test subset for common ICU/ward use, NOT the full
// LOINC ontology (70,000+ terms). Before relying on this in production,
// cross-check against an official LOINC table release (loinc.org, free
// registration) the same way `npm run harvest-icd10` pulls WHO's ICD-10
// data in the backend, and expand/correct from there — same "sourced, not
// hardcoded from memory" standard as the drug database and condition
// library.
export const LOINC_COMMON_TESTS = [
  { name: "CBC panel", loinc: "58410-2" },
  { name: "Hemoglobin", loinc: "718-7" },
  { name: "Platelet count", loinc: "777-3" },
  { name: "WBC count", loinc: "6690-2" },
  { name: "Sodium", loinc: "2951-2" },
  { name: "Potassium", loinc: "2823-3" },
  { name: "Chloride", loinc: "2075-0" },
  { name: "Bicarbonate (venous)", loinc: "2028-9" },
  { name: "Urea nitrogen (BUN)", loinc: "3094-0" },
  { name: "Creatinine", loinc: "2160-0" },
  { name: "Glucose", loinc: "2345-7" },
  { name: "AST", loinc: "1920-8" },
  { name: "ALT", loinc: "1742-6" },
  { name: "Total bilirubin", loinc: "1975-2" },
  { name: "C-reactive protein", loinc: "1988-5" },
  { name: "Procalcitonin", loinc: "33959-8" },
  { name: "Prothrombin time (PT)", loinc: "5902-2" },
  { name: "aPTT", loinc: "3173-2" },
  { name: "Troponin I", loinc: "10839-9" },
  { name: "Creatine kinase", loinc: "2157-6" },
  { name: "Arterial pH", loinc: "2744-1" },
  { name: "Arterial pCO2", loinc: "2019-8" },
  { name: "Arterial pO2", loinc: "2703-7" },
  { name: "Arterial bicarbonate", loinc: "1959-6" },
  { name: "Chest X-ray", loinc: "36643-5" },
];

// --- CVS & Respiratory exam findings checklist ------------------------------
// Standard bedside cardiovascular/respiratory examination findings — the
// same "checkbox list, not free text" pattern as ExamPopup's body-system
// checklists elsewhere in the app.
export const CVS_RESP_EXAM_FINDINGS = [
  "S1S2 normal",
  "Added heart sound / murmur",
  "Muffled heart sounds",
  "Raised JVP",
  "Peripheral oedema",
  "Capillary refill time normal (<2s)",
  "Capillary refill time prolonged",
  "Pulses regular",
  "Pulses irregular",
  "Cool peripheries",
  "Air entry equal bilaterally",
  "Reduced air entry",
  "Crepitations present",
  "Wheeze present",
  "Bronchial breathing",
  "Use of accessory muscles",
  "Central cyanosis",
  "Trachea central",
  "Trachea deviated",
];

// --- Procedures checklist ---------------------------------------------------
export const ICU_PROCEDURES_CHECKLIST = [
  "Central venous cannulation",
  "Arterial line insertion",
  "Endotracheal intubation",
  "ETT suctioning",
  "Nasogastric tube insertion",
  "Urinary catheterisation",
  "Chest tube / thoracostomy",
  "Lumbar puncture",
  "Wound dressing change",
  "Blood transfusion",
  "Non-invasive ventilation initiation",
  "Tracheostomy care",
];

// --- Ventilator settings ----------------------------------------------------
export const VENTILATOR_MODES = ["SIMV", "PSV", "CPAP", "AC/VC", "AC/PC", "BiPAP"];

// --- Add exam pattern: body systems not covered by the fixed sections ------
export const EXAM_PATTERN_SYSTEMS = [
  "GI / Abdomen",
  "Renal / Urinary",
  "Skin / Wounds",
  "Musculoskeletal",
  "ENT",
  "Ophthalmological",
  "Neurological (beyond GCS)",
  "Psychiatric / Mental status",
];

// --- Pupil reactivity --------------------------------------------------------
export const PUPIL_REACTIVITY = ["Reactive", "Sluggish", "Fixed"];

// --- Shared complications taxonomy (Consent + Discharge) -------------------
// Standard informed-consent risk categories — the same content mirrored
// across most hospital consent forms, grouped to match CONSENT_TEMPLATES.
// Not a single canonical external database the way LOINC/ICD-10 are, so
// there's no one URL to cite here; this is the standard categorisation used
// in surgical/anaesthesia consent literature generally, hand-curated with
// the same care as the rest of this file rather than invented ad hoc.
export const COMPLICATIONS_TAXONOMY = {
  "General procedure / treatment consent": [
    "Bleeding",
    "Infection at the site",
    "Allergic reaction to medication",
    "Pain at the site",
    "Bruising / haematoma",
    "Adverse drug reaction",
  ],
  "Surgical consent": [
    "Bleeding requiring transfusion",
    "Surgical site infection",
    "Wound dehiscence",
    "Injury to adjacent organs / structures",
    "Deep vein thrombosis / pulmonary embolism",
    "Need for further surgery",
    "Scarring",
    "Death (rare)",
  ],
  "Anaesthesia consent": [
    "Nausea and vomiting",
    "Sore throat (from intubation)",
    "Dental injury during intubation",
    "Allergic reaction to anaesthetic agents",
    "Aspiration",
    "Awareness under anaesthesia (rare)",
    "Cardiovascular instability",
    "Respiratory depression",
    "Malignant hyperthermia (rare)",
  ],
  "Diagnostic procedure consent": [
    "Bleeding at puncture / biopsy site",
    "Infection",
    "Perforation of adjacent structure",
    "Allergic reaction to contrast agent",
    "Radiation exposure",
    "Inconclusive / non-diagnostic result",
  ],
};
