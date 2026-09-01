/**
 * ClairMD — General-medicine diagnostic workflow library (pilot batch).
 *
 * Mirrors the shape and provenance rules of ./surgicalWorkflows.js exactly,
 * as a separate, independently-maintained file — the surgical library is
 * left untouched per standing instruction, so general-medicine pathways
 * live here instead and are combined with it only in the UI layer
 * (ClairMDEHR.jsx), never by editing surgicalWorkflows.js.
 *
 * This is a pilot: one coherent cluster (chest pain and its differentials)
 * built to show the shape of the thing before deciding whether to build
 * the same depth of branching diagnostic algorithm for the rest of
 * DIAGNOSIS_META's ~500 general-medicine conditions.
 *
 * ── PROVENANCE ────────────────────────────────────────────────────────────
 * Murtagh's General Practice supplied a chapter/topic REFERENCE only (the
 * `chapterRef` field below), the same practice already established for
 * DIFFERENTIAL_TEMPLATES in ClairMDEHR.jsx. No text, table or figure from
 * any commercial textbook is reproduced anywhere in this file. Every
 * pathway is written independently and linked to a freely accessible
 * source.
 *
 * ── SOURCING RULE ─────────────────────────────────────────────────────────
 * Prefer public-domain/NIH-affiliated sources (NHLBI / NIDDK / NCI / CDC /
 * MedlinePlus) wherever one covers the condition at clinical depth. Fall
 * back to CC-licensed sources (StatPearls) only for the tail, and then as
 * link-and-credit citations only. NEVER copy source text into the product.
 *
 * ── CDSCO CLASS A BOUNDARY ────────────────────────────────────────────────
 * Display-only reference material — the identical constraint the surgical
 * library holds itself to. Nothing here reads patient data, computes a
 * score, applies a decision rule, or emits a patient-specific conclusion.
 * Named clinical prediction tools (Wells, HEART, TIMI, GRACE, BTS/ACCP
 * pneumothorax size criteria, etc.) appear as NAMES ONLY — the clinician
 * calculates and interprets them outside the app. Branch links navigate
 * between reference pages; they are not a diagnostic decision tree.
 *
 * ── ID NAMESPACE ──────────────────────────────────────────────────────────
 * Every id is prefixed "med-" so it can never collide with a WORKFLOWS id
 * or a DIAGNOSIS_META key once combined in the UI — the exact class of bug
 * fixed for the DIAGNOSIS_META/WORKFLOWS merge in ClairMDEHR.jsx's Library
 * modal (nine keys, e.g. "erysipelas", existed identically in both
 * libraries and collided as React keys). Branches in this pilot only ever
 * target ids within this same file, to keep cross-library navigation logic
 * out of this pilot's scope.
 */

export const MEDICAL_WORKFLOWS = [
  {
    id: "med-chest-pain-entry",
    condition: "Chest pain (entry pathway)",
    chapterRef: "cf. Murtagh's General Practice, Ch. 30 \"Chest pain\"",
    region: "CHEST",
    synonyms: ["chest pain", "chest discomfort", "central chest pain", "chest tightness"],
    status: "cited",
    redFlags: [
      "Haemodynamic instability or altered consciousness",
      "Pain radiating to the jaw, arm or back with sweating or nausea",
      "Tearing or ripping pain, or unequal pulses/blood pressure between limbs",
      "Sudden breathlessness with pleuritic pain, especially with risk factors for venous thromboembolism",
    ],
    algorithm: [
      {
        id: "a1",
        stage: "Presentation",
        title: "Chest pain, any duration",
        detail: "Establish onset, character, radiation and associated symptoms before anything else — the pattern of pain narrows the differential faster than any single test.",
        next: ["a2"],
      },
      {
        id: "a2",
        stage: "Stabilise first",
        title: "Assess airway, breathing, circulation before diagnosis",
        detail: "An unstable patient is resuscitated and investigated in parallel, not investigated before treatment starts.",
        next: ["a3"],
      },
      {
        id: "a3",
        stage: "ECG",
        title: "12-lead ECG as early as possible",
        detail: "Time-critical — look first for changes suggesting acute coronary occlusion, then work through the rest of the differential.",
        branches: [
          { label: "ST-elevation or new left bundle branch block", to: "med-acute-coronary-syndrome" },
          { label: "Pleuritic pain with breathlessness, risk factors for clot", to: "med-pulmonary-embolism" },
          { label: "Tearing pain, unequal pulses or blood pressures", to: "med-aortic-dissection" },
          { label: "Pleuritic pain relieved by leaning forward", to: "med-acute-pericarditis" },
          { label: "Sudden pleuritic pain, reduced breath sounds one side", to: "med-spontaneous-pneumothorax" },
          { label: "Burning retrosternal pain related to meals or lying flat", to: "med-gerd-chest-pain" },
        ],
        next: ["a4"],
      },
      {
        id: "a4",
        stage: "Reconsider",
        title: "No red flags, pain reproducible on palpation",
        detail: "Musculoskeletal chest wall pain is a diagnosis of exclusion once the causes above have been genuinely considered, not a default when the picture is simply unclear.",
        next: [],
      },
    ],
    citations: [
      { title: "Chest pain", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/003079.htm", licence: "US Government work — public domain" },
      { title: "Chest Pain", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470557/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-acute-coronary-syndrome",
    condition: "Acute coronary syndrome",
    chapterRef: "cf. Murtagh's General Practice, Ch. 30 \"Chest pain\"",
    region: "CHEST",
    synonyms: ["acs", "heart attack", "myocardial infarction", "unstable angina", "stemi", "nstemi"],
    status: "cited",
    redFlags: [
      "Ongoing pain despite initial treatment",
      "Haemodynamic instability or a new arrhythmia",
      "Signs of cardiogenic shock",
    ],
    algorithm: [
      {
        id: "b1",
        stage: "History",
        title: "Central crushing chest pain, often with radiation and autonomic symptoms",
        detail: "Sweating, nausea and breathlessness commonly accompany the pain; presentation can be atypical in older patients, women, and people with diabetes.",
        next: ["b2"],
      },
      {
        id: "b2",
        stage: "ECG",
        title: "12-lead ECG — ST-elevation, new LBBB, or ST depression/T-wave inversion",
        detail: "ST-elevation or new LBBB is treated as an emergency reperfusion pathway; repeat the ECG if pain continues and the first trace is unremarkable.",
        next: ["b3"],
      },
      {
        id: "b3",
        stage: "Bloods",
        title: "High-sensitivity troponin, taken serially",
        detail: "A single normal early troponin does not exclude ACS — repeat per local protocol timing.",
        next: ["b4"],
      },
      {
        id: "b4",
        stage: "Risk stratification",
        title: "Named risk scores exist (HEART, TIMI, GRACE) — name only",
        detail: "ClairMD does not compute a score. The clinician calculates and interprets it outside the app.",
        next: ["b5"],
      },
      {
        id: "b5",
        stage: "Decision",
        title: "Urgent cardiology referral; reperfusion pathway for STEMI/new LBBB",
        detail: "Antiplatelet and anticoagulant therapy per local protocol; primary PCI or thrombolysis for STEMI depending on service availability and time from symptom onset.",
        next: [],
      },
    ],
    citations: [
      { title: "Heart Attack", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/heart-attack", licence: "US Government work — public domain" },
      { title: "Acute Coronary Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459157/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-pulmonary-embolism",
    condition: "Pulmonary embolism",
    chapterRef: "cf. Murtagh's General Practice, Ch. 38 \"Dyspnoea\"",
    region: "CHEST",
    synonyms: ["pe", "pulmonary embolism", "blood clot lung", "pulmonary embolus"],
    status: "cited",
    redFlags: [
      "Hypotension or syncope (suggests a massive PE)",
      "Clinical signs of right heart strain",
      "Cardiac arrest with PE as a suspected cause — consider thrombolysis",
    ],
    algorithm: [
      {
        id: "c1",
        stage: "History",
        title: "Pleuritic chest pain, breathlessness, sometimes haemoptysis",
        detail: "Ask about risk factors: recent surgery, immobility, active malignancy, prior VTE, oestrogen-containing therapy, or a long journey.",
        next: ["c2"],
      },
      {
        id: "c2",
        stage: "Pre-test probability",
        title: "Named clinical prediction rules exist (Wells, Geneva) — name only",
        detail: "ClairMD does not calculate the score; the clinician applies their own judgement using the named tool.",
        next: ["c3"],
      },
      {
        id: "c3",
        stage: "Investigate",
        title: "D-dimer if pre-test probability is low/intermediate; CT pulmonary angiography if high probability or D-dimer positive",
        detail: "A V/Q scan is an alternative where CTPA is contraindicated, such as significant renal impairment or contrast allergy.",
        next: ["c4"],
      },
      {
        id: "c4",
        stage: "Decision",
        title: "Anticoagulation; consider thrombolysis in massive PE with haemodynamic compromise",
        detail: "Risk-stratify severity (name only) to decide between inpatient and outpatient management once PE is confirmed.",
        next: [],
      },
    ],
    citations: [
      { title: "Pulmonary Embolism (PE)", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/pulmonary-embolism", licence: "US Government work — public domain" },
      { title: "Venous Thromboembolism — Diagnosis", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/venous-thromboembolism/diagnosis", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-aortic-dissection",
    condition: "Aortic dissection",
    chapterRef: "cf. Murtagh's General Practice, Ch. 30 \"Chest pain\"",
    region: "CHEST",
    synonyms: ["aortic dissection", "tearing chest pain", "dissecting aneurysm"],
    status: "cited",
    redFlags: [
      "Unequal pulses or blood pressure between limbs",
      "A new aortic regurgitation murmur",
      "Neurological deficit or limb ischaemia (malperfusion)",
    ],
    algorithm: [
      {
        id: "d1",
        stage: "History",
        title: "Sudden, severe tearing or ripping pain, often radiating to the back",
        detail: "Maximal at onset, unlike the crescendo pattern more typical of ischaemic cardiac pain.",
        next: ["d2"],
      },
      {
        id: "d2",
        stage: "Examination",
        title: "Compare blood pressure and pulses in both arms; listen for a new diastolic murmur",
        next: ["d3"],
      },
      {
        id: "d3",
        stage: "Imaging",
        title: "CT angiography of the chest (or transoesophageal echocardiography if too unstable for CT) — diagnostic",
        detail: "Do not let a normal chest X-ray or ECG delay definitive imaging — both can be normal in true dissection.",
        next: ["d4"],
      },
      {
        id: "d4",
        stage: "Decision",
        title: "Urgent cardiothoracic/vascular surgical referral",
        detail: "Type A dissection (involving the ascending aorta) is a surgical emergency; type B is often managed medically first, with surgery reserved for complications.",
        next: [],
      },
    ],
    citations: [
      { title: "Aortic dissection", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000181.htm", licence: "US Government work — public domain" },
      { title: "Aortic Dissection", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441963/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-acute-pericarditis",
    condition: "Acute pericarditis",
    chapterRef: "cf. Murtagh's General Practice, Ch. 30 \"Chest pain\"",
    region: "CHEST",
    synonyms: ["pericarditis", "pericardial pain"],
    status: "cited",
    redFlags: [
      "Pulsus paradoxus, distended neck veins or muffled heart sounds (suggests tamponade)",
      "Haemodynamic instability",
    ],
    algorithm: [
      {
        id: "e1",
        stage: "History",
        title: "Sharp pleuritic chest pain, relieved by sitting forward, worse lying flat",
        next: ["e2"],
      },
      {
        id: "e2",
        stage: "Examination",
        title: "Listen for a pericardial friction rub",
        detail: "The rub can be intermittent and positional — a normal examination does not exclude pericarditis.",
        next: ["e3"],
      },
      {
        id: "e3",
        stage: "ECG",
        title: "Diffuse concave ST-elevation and PR depression, without a single-territory pattern",
        detail: "The diffuse distribution and PR depression help distinguish pericarditis from an acute coronary event.",
        next: ["e4"],
      },
      {
        id: "e4",
        stage: "Decision",
        title: "Echocardiography to assess for an effusion; treat with NSAIDs and colchicine",
        detail: "Escalate urgently to pericardiocentesis if tamponade physiology develops on examination or echo.",
        next: [],
      },
    ],
    citations: [
      { title: "Pericarditis", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/heart-inflammation/pericarditis", licence: "US Government work — public domain" },
      { title: "Pericarditis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK431080/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-spontaneous-pneumothorax",
    condition: "Spontaneous pneumothorax",
    chapterRef: "cf. Murtagh's General Practice, Ch. 38 \"Dyspnoea\"",
    region: "CHEST",
    synonyms: ["pneumothorax", "collapsed lung"],
    status: "cited",
    redFlags: [
      "Tracheal deviation, hypotension or distended neck veins — tension pneumothorax needs immediate decompression, not imaging first",
    ],
    algorithm: [
      {
        id: "f1",
        stage: "History",
        title: "Sudden pleuritic chest pain and breathlessness",
        detail: "Classically a tall, thin young person (primary spontaneous pneumothorax) or someone with underlying lung disease (secondary).",
        next: ["f2"],
      },
      {
        id: "f2",
        stage: "Examination",
        title: "Reduced breath sounds and hyper-resonance on the affected side",
        branches: [{ label: "Tension physiology (tracheal deviation, haemodynamic compromise)", to: "f4" }],
        next: ["f3"],
      },
      {
        id: "f3",
        stage: "Imaging",
        title: "Erect chest X-ray to confirm and estimate size",
        next: ["f4"],
      },
      {
        id: "f4",
        stage: "Decision",
        title: "Size/severity criteria exist (e.g. BTS/ACCP) — name only",
        detail: "ClairMD does not classify size. Observation may suit a small, stable primary pneumothorax; needle aspiration or a chest drain for larger or symptomatic ones; immediate needle decompression for tension pneumothorax without waiting for imaging.",
        next: [],
      },
    ],
    citations: [
      { title: "Pleural Disorders", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/pleural-disorders", licence: "US Government work — public domain" },
      { title: "Spontaneous Pneumothorax", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459302/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-gerd-chest-pain",
    condition: "GERD-related (non-cardiac) chest pain",
    chapterRef: "cf. Murtagh's General Practice, Ch. 30 \"Chest pain\"",
    region: "CHEST",
    synonyms: ["gerd chest pain", "non-cardiac chest pain", "reflux chest pain", "heartburn"],
    status: "cited",
    redFlags: [
      "Dysphagia, odynophagia, unintentional weight loss or gastrointestinal bleeding — investigate directly rather than trialling reflux treatment",
      "Any cardiac red flag not yet excluded",
    ],
    algorithm: [
      {
        id: "g1",
        stage: "History",
        title: "Burning retrosternal pain related to meals, lying flat, or bending",
        detail: "Only consider this pathway once a cardiac and other serious cause has genuinely been excluded, not as a default when pain is atypical.",
        next: ["g2"],
      },
      {
        id: "g2",
        stage: "Trial of therapy",
        title: "Empirical proton pump inhibitor trial",
        detail: "A reasonable first step once serious causes are excluded — symptom response supports but does not itself confirm the diagnosis.",
        next: ["g3"],
      },
      {
        id: "g3",
        stage: "Investigate",
        title: "Upper endoscopy if red flags are present or symptoms persist despite treatment",
        next: [],
      },
    ],
    citations: [
      { title: "Acid Reflux (GER & GERD) in Adults", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults", licence: "US Government work — public domain" },
      { title: "Diagnosis of GER & GERD", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/diagnosis", licence: "US Government work — public domain" },
    ],
  },
];

export const MEDICAL_WORKFLOWS_BY_ID = MEDICAL_WORKFLOWS.reduce(function (acc, w) {
  acc[w.id] = w;
  return acc;
}, {});

/**
 * Structural validation — same checks as surgicalWorkflows.js's
 * validateWorkflows, adapted to this file's own id space. Safe to call at
 * boot or in CI.
 */
export function validateMedicalWorkflows(list) {
  const items = list || MEDICAL_WORKFLOWS;
  const problems = [];
  const seen = {};
  items.forEach(function (w) {
    if (seen[w.id]) problems.push("duplicate id: " + w.id);
    seen[w.id] = true;
    if (!w.condition) problems.push(w.id + ": missing condition name");
    if (!w.algorithm || !w.algorithm.length) problems.push(w.id + ": empty algorithm");
    if (w.status === "cited" && (!w.citations || !w.citations.length)) {
      problems.push(w.id + ": marked cited but has no citations");
    }
    (w.citations || []).forEach(function (c) {
      if (!/^https:\/\//.test(c.url || "")) problems.push(w.id + ": citation url not https — " + c.url);
      if (!c.licence) problems.push(w.id + ": citation missing licence — " + c.title);
    });
    const nodeIds = {};
    (w.algorithm || []).forEach(function (n) { nodeIds[n.id] = true; });
    (w.algorithm || []).forEach(function (n) {
      (n.next || []).forEach(function (t) {
        if (!nodeIds[t]) problems.push(w.id + ": node " + n.id + " points to missing node " + t);
      });
      (n.branches || []).forEach(function (b) {
        if (!nodeIds[b.to] && !Object.prototype.hasOwnProperty.call(MEDICAL_WORKFLOWS_BY_ID, b.to)) {
          problems.push(w.id + ": branch \"" + b.label + "\" points to unknown target " + b.to);
        }
      });
    });
  });
  return problems;
}
