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
 * No commercial textbook is referenced anywhere in this file — not for
 * content, and not even as a chapter/topic pointer (earlier entries carried
 * a `chapterRef: "cf. Murtagh's General Practice, Ch. ..."` note the same
 * way DIFFERENTIAL_TEMPLATES in ClairMDEHR.jsx still does; that field has
 * been removed here per standing instruction — this file cites only free,
 * open-access sources). Every pathway is written independently and linked
 * to one of those sources directly.
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

  // ── Cluster 2: Acute breathlessness ──────────────────────────────────────
  // Two branches ("Pleuritic pain, risk factors for clot" and "Sudden
  // pleuritic pain, reduced breath sounds one side") deliberately target
  // med-pulmonary-embolism and med-spontaneous-pneumothorax from Cluster 1
  // rather than duplicating them — the two clusters are meant to interlink
  // exactly like the surgical library's entry pathways do.
  {
    id: "med-breathlessness-entry",
    condition: "Breathlessness (entry pathway)",
    region: "CHEST",
    synonyms: ["breathlessness", "dyspnoea", "dyspnea", "shortness of breath", "sob", "difficulty breathing"],
    status: "cited",
    redFlags: [
      "Silent chest, exhaustion or a reduced conscious level",
      "Cyanosis or a critically low oxygen saturation",
      "Stridor or audible upper airway obstruction",
      "Urticaria, angioedema or hypotension after a likely allergen exposure",
    ],
    algorithm: [
      {
        id: "h1",
        stage: "Presentation",
        title: "Breathlessness — establish the speed of onset",
        detail: "Sudden onset points toward pulmonary embolism, pneumothorax or anaphylaxis; onset over hours to days points toward infection or heart failure; a background of known airway disease points toward an exacerbation of it.",
        next: ["h2"],
      },
      {
        id: "h2",
        stage: "Stabilise first",
        title: "Assess airway, breathing, circulation; give oxygen while assessing",
        next: ["h3"],
      },
      {
        id: "h3",
        stage: "History and examination",
        title: "Wheeze, known asthma/COPD, orthopnoea and ankle swelling, fever, recent allergen exposure",
        branches: [
          { label: "Known asthma, widespread wheeze, reduced peak flow", to: "med-acute-severe-asthma" },
          { label: "Known COPD, more breathless or more sputum than baseline", to: "med-copd-exacerbation" },
          { label: "Orthopnoea, ankle oedema, bibasal crackles", to: "med-acute-heart-failure" },
          { label: "Fever, productive cough, focal chest signs", to: "med-community-acquired-pneumonia" },
          { label: "Pleuritic pain, risk factors for clot", to: "med-pulmonary-embolism" },
          { label: "Sudden pleuritic pain, reduced breath sounds one side", to: "med-spontaneous-pneumothorax" },
          { label: "Urticaria, angioedema, exposure to a known trigger", to: "med-anaphylaxis" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Breathing difficulty", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/003075.htm", licence: "US Government work — public domain" },
      { title: "Dyspnea", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK499965/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-acute-severe-asthma",
    condition: "Acute severe asthma",
    region: "CHEST",
    synonyms: ["asthma attack", "acute asthma", "status asthmaticus", "asthma exacerbation"],
    status: "cited",
    redFlags: [
      "Silent chest, exhaustion, confusion or a reduced conscious level",
      "Bradycardia or a new arrhythmia",
      "Inability to complete sentences in one breath",
    ],
    algorithm: [
      {
        id: "i1",
        stage: "History",
        title: "Progressive wheeze, cough and chest tightness, often with a known trigger",
        detail: "Ask about prior ICU admissions or near-fatal attacks — a strong predictor of severity this time too.",
        next: ["i2"],
      },
      {
        id: "i2",
        stage: "Examination",
        title: "Respiratory rate, accessory muscle use, ability to complete sentences, peak expiratory flow",
        next: ["i3"],
      },
      {
        id: "i3",
        stage: "Severity",
        title: "Named severity bands exist (moderate / acute severe / life-threatening) — name only",
        detail: "ClairMD does not grade severity. The clinician assesses and classifies using the named criteria.",
        next: ["i4"],
      },
      {
        id: "i4",
        stage: "Decision",
        title: "High-flow oxygen, nebulised bronchodilators and systemic corticosteroids",
        detail: "Escalate to critical care for life-threatening features or any sign of exhaustion — do not wait for deterioration on a ward.",
        next: [],
      },
    ],
    citations: [
      { title: "Asthma", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/asthma", licence: "US Government work — public domain" },
      { title: "Status Asthmaticus", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK526070/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-copd-exacerbation",
    condition: "COPD exacerbation",
    region: "CHEST",
    synonyms: ["copd exacerbation", "copd flare", "acute copd", "chronic bronchitis flare"],
    status: "cited",
    redFlags: [
      "Type 2 respiratory failure with worsening acidosis on blood gas",
      "A reduced conscious level",
      "Haemodynamic instability",
    ],
    algorithm: [
      {
        id: "j1",
        stage: "History",
        title: "Increased breathlessness, sputum volume or sputum purulence from baseline",
        detail: "Establish the patient's usual baseline function and home oxygen/inhaler regimen for comparison.",
        next: ["j2"],
      },
      {
        id: "j2",
        stage: "Investigate",
        title: "Arterial blood gas, chest X-ray, sputum culture if purulent",
        detail: "Blood gas identifies type 2 respiratory failure and guides safe oxygen targets.",
        next: ["j3"],
      },
      {
        id: "j3",
        stage: "Decision",
        title: "Controlled oxygen therapy, bronchodilators, corticosteroids; antibiotics if features of infection",
        detail: "Non-invasive ventilation is considered for persistent respiratory acidosis despite initial medical therapy.",
        next: [],
      },
    ],
    citations: [
      { title: "COPD", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/copd", licence: "US Government work — public domain" },
      { title: "Chronic Obstructive Pulmonary Disease (COPD)", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK559281/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-acute-heart-failure",
    condition: "Acute heart failure / acute pulmonary oedema",
    region: "CHEST",
    synonyms: ["acute heart failure", "pulmonary oedema", "pulmonary edema", "decompensated heart failure"],
    status: "cited",
    redFlags: [
      "Cardiogenic shock",
      "Severe hypoxia despite high-flow oxygen",
    ],
    algorithm: [
      {
        id: "k1",
        stage: "History",
        title: "Orthopnoea, paroxysmal nocturnal dyspnoea, ankle swelling",
        detail: "Ask about a known cardiac history, medication adherence and any recent dietary salt/fluid indiscretion.",
        next: ["k2"],
      },
      {
        id: "k2",
        stage: "Examination",
        title: "Bibasal crackles, raised jugular venous pressure, peripheral oedema, gallop rhythm",
        next: ["k3"],
      },
      {
        id: "k3",
        stage: "Investigate",
        title: "BNP/NT-proBNP, chest X-ray, echocardiography",
        detail: "A normal natriuretic peptide makes acute heart failure unlikely; chest X-ray and echo characterise the picture further.",
        next: ["k4"],
      },
      {
        id: "k4",
        stage: "Decision",
        title: "Sit the patient up, oxygen if hypoxic, intravenous diuretic",
        detail: "Identify and treat a precipitant (arrhythmia, ischaemia, infection, non-adherence) alongside symptomatic treatment.",
        next: [],
      },
    ],
    citations: [
      { title: "Heart Failure", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/heart-failure", licence: "US Government work — public domain" },
      { title: "Heart Failure — Diagnosis", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/heart-failure/diagnosis", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-community-acquired-pneumonia",
    condition: "Community-acquired pneumonia",
    region: "CHEST",
    synonyms: ["pneumonia", "community acquired pneumonia", "cap", "chest infection"],
    status: "cited",
    redFlags: [
      "Confusion, hypotension or a high respiratory rate — features of severe pneumonia",
      "Multilobar involvement on imaging",
    ],
    algorithm: [
      {
        id: "l1",
        stage: "History",
        title: "Fever, productive cough, pleuritic chest pain, breathlessness",
        next: ["l2"],
      },
      {
        id: "l2",
        stage: "Examination",
        title: "Focal crackles or bronchial breathing, reduced oxygen saturation",
        next: ["l3"],
      },
      {
        id: "l3",
        stage: "Severity",
        title: "Named severity score (CURB-65) exists — name only",
        detail: "ClairMD does not compute the score. The clinician calculates it and uses it to guide the site of care.",
        next: ["l4"],
      },
      {
        id: "l4",
        stage: "Investigate",
        title: "Chest X-ray, blood cultures and sputum culture before antibiotics where possible",
        next: ["l5"],
      },
      {
        id: "l5",
        stage: "Decision",
        title: "Empirical antibiotics per local guidance; escalate care setting according to severity",
        next: [],
      },
    ],
    citations: [
      { title: "Pneumonia", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/pneumonia", licence: "US Government work — public domain" },
      { title: "Community-Acquired Pneumonia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430749/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-anaphylaxis",
    condition: "Anaphylaxis",
    region: "CHEST",
    synonyms: ["anaphylaxis", "anaphylactic reaction", "severe allergic reaction"],
    status: "cited",
    redFlags: [
      "Airway swelling or stridor",
      "Hypotension or a reduced conscious level",
      "Rapidly progressive symptoms after a known allergen exposure",
    ],
    algorithm: [
      {
        id: "m1",
        stage: "Recognise it",
        title: "Sudden onset with airway, breathing or circulation compromise, usually with skin/mucosal changes",
        detail: "Urticaria, angioedema or flushing support the diagnosis but are not always present — do not wait for a rash before treating.",
        next: ["m2"],
      },
      {
        id: "m2",
        stage: "Decision",
        title: "Intramuscular adrenaline (epinephrine) as first-line treatment, given promptly",
        detail: "Remove the trigger if still present, lie the patient flat with legs raised (or sitting if breathless) and call for help early — do not delay adrenaline waiting for other treatments.",
        next: ["m3"],
      },
      {
        id: "m3",
        stage: "Supportive care",
        title: "Oxygen, IV fluids for hypotension, monitor for a biphasic reaction",
        detail: "A biphasic reaction can occur hours after apparent resolution, so observation after treatment is part of the pathway, not an afterthought.",
        next: [],
      },
    ],
    citations: [
      { title: "Anaphylaxis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/anaphylaxis.html", licence: "US Government work — public domain" },
      { title: "Anaphylaxis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482124/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 3: Headache ───────────────────────────────────────────────────
  {
    id: "med-headache-entry",
    condition: "Headache (entry pathway)",
    region: "HEAD",
    synonyms: ["headache", "head pain", "cephalgia"],
    status: "cited",
    redFlags: [
      "Thunderclap headache — maximal intensity within seconds to minutes",
      "Fever with neck stiffness or photophobia",
      "New headache in a patient over 50, especially with jaw claudication or visual disturbance",
      "Headache with a new focal neurological deficit, seizure or reduced consciousness",
      "Headache worse lying down, on straining, or waking the patient from sleep",
    ],
    algorithm: [
      {
        id: "n1",
        stage: "Presentation",
        title: "Headache — establish speed of onset and whether it is the worst or first of its kind",
        detail: "A genuinely new pattern in a known headache sufferer is treated with the same caution as a first presentation.",
        next: ["n2"],
      },
      {
        id: "n2",
        stage: "Stabilise first",
        title: "Assess conscious level and look for focal neurological signs before further workup",
        next: ["n3"],
      },
      {
        id: "n3",
        stage: "History and examination",
        title: "Onset pattern, associated symptoms, age, and examination findings",
        branches: [
          { label: "Thunderclap onset, worst headache of life", to: "med-subarachnoid-haemorrhage" },
          { label: "Fever, neck stiffness, photophobia", to: "med-bacterial-meningitis" },
          { label: "Age over 50, jaw claudication, scalp tenderness or visual symptoms", to: "med-giant-cell-arteritis" },
          { label: "Episodic, unilateral, with nausea and photophobia, +/- aura", to: "med-migraine" },
          { label: "Bilateral, pressing or tightening, no red flags", to: "med-tension-headache" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Headache", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/headache", licence: "US Government work — public domain" },
      { title: "Headache", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/headache.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-migraine",
    condition: "Migraine",
    region: "HEAD",
    synonyms: ["migraine", "migraine headache", "migraine with aura", "migraine without aura"],
    status: "cited",
    redFlags: [
      "A sudden change in the usual pattern, or a genuinely new type of headache, in a known migraine sufferer",
      "Aura lasting longer than an hour, or with focal weakness",
    ],
    algorithm: [
      {
        id: "o1",
        stage: "History",
        title: "Episodic, often unilateral, throbbing headache with nausea, photophobia and phonophobia",
        detail: "Ask specifically about aura (visual, sensory or speech disturbance preceding or accompanying the headache) and typical attack frequency.",
        next: ["o2"],
      },
      {
        id: "o2",
        stage: "Diagnostic criteria",
        title: "Named diagnostic criteria exist (ICHD) — name only",
        detail: "ClairMD does not apply the criteria itself. Diagnosis is clinical, based on the pattern of attacks over time.",
        next: ["o3"],
      },
      {
        id: "o3",
        stage: "Decision",
        title: "Acute treatment for individual attacks; consider preventive therapy if attacks are frequent or disabling",
        next: [],
      },
    ],
    citations: [
      { title: "Migraine", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/migraine", licence: "US Government work — public domain" },
      { title: "Migraine", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/migraine.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-tension-headache",
    condition: "Tension-type headache",
    region: "HEAD",
    synonyms: ["tension headache", "tension-type headache", "stress headache"],
    status: "cited",
    redFlags: [
      "Any red flag feature from the headache entry pathway should prompt reconsidering this diagnosis, not defaulting to it",
    ],
    algorithm: [
      {
        id: "p1",
        stage: "History",
        title: "Bilateral, pressing or tightening headache, mild-to-moderate intensity",
        detail: "Typically not aggravated by routine physical activity, and without significant nausea.",
        next: ["p2"],
      },
      {
        id: "p2",
        stage: "Examination",
        title: "Normal neurological examination; pericranial muscle tenderness may be present",
        next: ["p3"],
      },
      {
        id: "p3",
        stage: "Decision",
        title: "Simple analgesia and addressing likely triggers (stress, posture, sleep, eye strain)",
        detail: "Watch for medication-overuse headache with frequent analgesic use — a common cause of chronic daily headache.",
        next: [],
      },
    ],
    citations: [
      { title: "Tension headache", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000797.htm", licence: "US Government work — public domain" },
      { title: "Muscle Contraction Tension Headache", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK562274/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-subarachnoid-haemorrhage",
    condition: "Subarachnoid haemorrhage",
    region: "HEAD",
    synonyms: ["subarachnoid haemorrhage", "subarachnoid hemorrhage", "sah", "thunderclap headache"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or a new focal neurological deficit",
      "Recurrent thunderclap episodes",
    ],
    algorithm: [
      {
        id: "q1",
        stage: "History",
        title: "Sudden, severe headache, maximal at onset — the \"worst headache of my life\"",
        next: ["q2"],
      },
      {
        id: "q2",
        stage: "Imaging",
        title: "Non-contrast CT head — most sensitive within the first 6 hours of onset",
        next: ["q3"],
      },
      {
        id: "q3",
        stage: "Further test",
        title: "Lumbar puncture if CT is negative and clinical suspicion remains",
        detail: "Looking for xanthochromia; timed appropriately after the headache onset per local protocol.",
        next: ["q4"],
      },
      {
        id: "q4",
        stage: "Decision",
        title: "Urgent neurosurgical or neurointerventional referral once confirmed",
        detail: "Aneurysm securing (coiling or clipping) prevents re-bleeding, which carries a high mortality if it occurs.",
        next: [],
      },
    ],
    citations: [
      { title: "Subarachnoid Hemorrhage", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441958/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Cerebral Aneurysms", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/cerebral-aneurysms", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-bacterial-meningitis",
    condition: "Bacterial meningitis",
    region: "HEAD",
    synonyms: ["meningitis", "bacterial meningitis", "meningococcal disease"],
    status: "cited",
    redFlags: [
      "A non-blanching rash (suggests meningococcaemia)",
      "Reduced consciousness or focal neurological signs",
      "Signs of septic shock",
    ],
    algorithm: [
      {
        id: "r1",
        stage: "History and examination",
        title: "Fever, headache, neck stiffness, photophobia",
        detail: "Classic signs (Kernig's, Brudzinski's) support the diagnosis when present but their absence does not exclude it.",
        next: ["r2"],
      },
      {
        id: "r2",
        stage: "Decision",
        title: "Give empirical antibiotics without delay once bacterial meningitis is suspected",
        detail: "Do not wait for lumbar puncture or imaging to give the first dose of antibiotics — treatment delay measurably worsens outcome.",
        next: ["r3"],
      },
      {
        id: "r3",
        stage: "Investigate",
        title: "Blood cultures, lumbar puncture once safe to do so",
        detail: "CT head first if there are signs of raised intracranial pressure or a focal deficit, to check it is safe to proceed to lumbar puncture.",
        next: [],
      },
    ],
    citations: [
      { title: "About Meningitis", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/meningitis/about/index.html", licence: "US Government work — public domain" },
      { title: "Clinical Guidance for Meningococcal Disease", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/meningococcal/hcp/clinical-guidance/index.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-giant-cell-arteritis",
    condition: "Giant cell arteritis",
    region: "HEAD",
    synonyms: ["giant cell arteritis", "temporal arteritis", "gca"],
    status: "cited",
    redFlags: [
      "Any visual disturbance — needs urgent same-day assessment, since untreated GCA can cause sudden, irreversible vision loss",
    ],
    algorithm: [
      {
        id: "s1",
        stage: "History",
        title: "New headache in a patient over 50, scalp tenderness, jaw claudication",
        detail: "Ask about associated polymyalgia rheumatica symptoms (proximal shoulder and hip girdle stiffness) — the two conditions frequently overlap.",
        next: ["s2"],
      },
      {
        id: "s2",
        stage: "Bloods",
        title: "ESR and CRP — typically markedly elevated",
        next: ["s3"],
      },
      {
        id: "s3",
        stage: "Decision",
        title: "Start high-dose corticosteroids immediately on clinical suspicion",
        detail: "Do not wait for biopsy confirmation before treating — the risk of vision loss outweighs the risk of a short delay to biopsy.",
        next: ["s4"],
      },
      {
        id: "s4",
        stage: "Confirm",
        title: "Temporal artery biopsy, ideally within one to two weeks of starting steroids",
        detail: "A negative biopsy does not fully exclude the diagnosis given \"skip lesions\" in the artery — clinical judgement remains central.",
        next: [],
      },
    ],
    citations: [
      { title: "Polymyalgia Rheumatica and Giant Cell Arteritis", publisher: "National Institute of Arthritis and Musculoskeletal and Skin Diseases (NIAMS), NIH, USA", url: "https://www.niams.nih.gov/health-topics/polymyalgia-rheumatica-giant-cell-arteritis", licence: "US Government work — public domain" },
      { title: "Giant Cell Arteritis (Temporal Arteritis)", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459376/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 4: Acute confusion / delirium ─────────────────────────────────
  {
    id: "med-acute-confusion-entry",
    condition: "Acute confusion (entry pathway)",
    region: "HEAD",
    synonyms: ["confusion", "acute confusion", "delirium", "altered mental status", "new confusion"],
    status: "cited",
    redFlags: [
      "A reduced Glasgow Coma Scale or airway compromise",
      "A new focal neurological deficit",
      "Fever with neck stiffness",
      "Pinpoint pupils with a reduced respiratory rate",
    ],
    algorithm: [
      {
        id: "t1",
        stage: "Presentation",
        title: "New confusion — establish onset and the patient's baseline cognition",
        detail: "Acute onset over hours to days, with a fluctuating course, is the hallmark of delirium rather than an underlying dementia.",
        next: ["t2"],
      },
      {
        id: "t2",
        stage: "Stabilise first",
        title: "Check airway, breathing, circulation and blood glucose immediately",
        detail: "A fingerprick glucose takes seconds and hypoglycaemia is rapidly reversible — check it before anything else.",
        next: ["t3"],
      },
      {
        id: "t3",
        stage: "Screen for reversible causes",
        title: "Look for the common reversible precipitants before assuming an irreversible cause",
        branches: [
          { label: "Low blood glucose on fingerprick testing", to: "med-hypoglycaemia" },
          { label: "Known heavy alcohol use, tremor, autonomic hyperactivity", to: "med-alcohol-withdrawal-delirium" },
          { label: "Known liver disease, asterixis, jaundice", to: "med-hepatic-encephalopathy" },
          { label: "Pinpoint pupils, reduced respiratory rate, known or suspected opioid/sedative use", to: "med-opioid-toxicity" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Delirium", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/delirium.html", licence: "US Government work — public domain" },
      { title: "Delirium", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470399/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-hypoglycaemia",
    condition: "Hypoglycaemia",
    region: "HEAD",
    synonyms: ["hypoglycaemia", "hypoglycemia", "low blood sugar", "low blood glucose"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or seizure",
      "Recurrent hypoglycaemia despite treatment — needs further workup for the underlying cause",
    ],
    algorithm: [
      {
        id: "u1",
        stage: "Recognise it",
        title: "Confusion, sweating, tremor or reduced consciousness, especially in a patient on insulin or a sulfonylurea",
        next: ["u2"],
      },
      {
        id: "u2",
        stage: "Confirm",
        title: "Fingerprick blood glucose",
        detail: "Treat on clinical suspicion in a severely affected patient rather than waiting on testing if that would delay treatment.",
        next: ["u3"],
      },
      {
        id: "u3",
        stage: "Decision",
        title: "Oral fast-acting carbohydrate if able to swallow safely; intravenous glucose or intramuscular glucagon if not",
        detail: "Recheck glucose after treatment and look for the precipitant — a missed meal, exercise, a medication error, or insulin/sulfonylurea excess.",
        next: [],
      },
    ],
    citations: [
      { title: "Low Blood Glucose (Hypoglycemia)", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia", licence: "US Government work — public domain" },
      { title: "Hypoglycemia", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/hypoglycemia.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-alcohol-withdrawal-delirium",
    condition: "Alcohol withdrawal delirium (delirium tremens)",
    region: "HEAD",
    synonyms: ["delirium tremens", "alcohol withdrawal", "dts", "alcohol withdrawal delirium"],
    status: "cited",
    redFlags: [
      "Seizure",
      "Hallucinations with autonomic instability (fever, tachycardia, hypertension) — the hallmark of delirium tremens",
      "Features suggesting Wernicke's encephalopathy (confusion, ataxia, an eye movement abnormality) — give thiamine before or with any glucose",
    ],
    algorithm: [
      {
        id: "v1",
        stage: "History",
        title: "Reduction or cessation of heavy, regular alcohol use, typically 48 to 96 hours before symptom onset",
        next: ["v2"],
      },
      {
        id: "v2",
        stage: "Examination",
        title: "Tremor, sweating, tachycardia and agitation; hallucinations and disorientation in severe cases",
        next: ["v3"],
      },
      {
        id: "v3",
        stage: "Decision",
        title: "Benzodiazepines are the standard treatment, using a symptom-triggered or fixed-schedule regimen",
        detail: "ClairMD does not select a dose or regimen — the clinician chooses and titrates it. Give thiamine before or with any glucose to reduce the risk of precipitating Wernicke's encephalopathy.",
        next: [],
      },
    ],
    citations: [
      { title: "Alcohol Withdrawal Syndrome", publisher: "National Institute on Alcohol Abuse and Alcoholism (NIAAA), NIH, USA", url: "https://pubs.niaaa.nih.gov/publications/aa05.htm", licence: "US Government work — public domain" },
      { title: "Delirium tremens", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000766.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-hepatic-encephalopathy",
    condition: "Hepatic encephalopathy",
    region: "HEAD",
    synonyms: ["hepatic encephalopathy", "liver failure confusion", "portosystemic encephalopathy"],
    status: "cited",
    redFlags: [
      "Stupor or coma (grade III-IV encephalopathy) — needs urgent escalation and airway protection",
      "Signs of an acute precipitant needing urgent treatment in its own right (GI bleeding, infection)",
    ],
    algorithm: [
      {
        id: "w1",
        stage: "History",
        title: "Known cirrhosis or chronic liver disease, with new confusion or altered behaviour",
        next: ["w2"],
      },
      {
        id: "w2",
        stage: "Examination",
        title: "Asterixis (flapping tremor), jaundice, other signs of chronic liver disease",
        next: ["w3"],
      },
      {
        id: "w3",
        stage: "Search for a precipitant",
        title: "Gastrointestinal bleeding, infection (including spontaneous bacterial peritonitis), constipation, electrolyte disturbance, non-adherence or a new sedative",
        detail: "Treating the precipitant is usually more important than any single test result.",
        next: ["w4"],
      },
      {
        id: "w4",
        stage: "Decision",
        title: "Lactulose as first-line treatment, titrated to soft stool frequency; treat the identified precipitant",
        next: [],
      },
    ],
    citations: [
      { title: "Symptoms & Causes of Cirrhosis", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/liver-disease/cirrhosis", licence: "US Government work — public domain" },
      { title: "Loss of brain function - liver disease", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000302.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-opioid-toxicity",
    condition: "Opioid or sedative toxicity",
    region: "HEAD",
    synonyms: ["opioid overdose", "opioid toxicity", "sedative toxicity", "opioid poisoning"],
    status: "cited",
    redFlags: [
      "A critically low or absent respiratory rate",
      "Cyanosis or a critically low oxygen saturation",
    ],
    algorithm: [
      {
        id: "x1",
        stage: "Recognise it",
        title: "Reduced consciousness, pinpoint pupils, and slow or shallow breathing",
        detail: "Consider it in any unexplained reduced consciousness, not only when opioid use is already known.",
        next: ["x2"],
      },
      {
        id: "x2",
        stage: "Stabilise first",
        title: "Support airway and breathing; give oxygen",
        next: ["x3"],
      },
      {
        id: "x3",
        stage: "Decision",
        title: "Naloxone reverses opioid-induced respiratory depression",
        detail: "Its effects are shorter-acting than many opioids, so re-sedation can occur — monitor closely after reversal and repeat doses as needed per local protocol.",
        next: [],
      },
    ],
    citations: [
      { title: "Naloxone DrugFacts", publisher: "National Institute on Drug Abuse (NIDA), NIH, USA", url: "https://nida.nih.gov/publications/drugfacts/naloxone", licence: "US Government work — public domain" },
      { title: "Naloxone", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441910/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 5: Jaundice ────────────────────────────────────────────────────
  {
    id: "med-jaundice-entry",
    condition: "Jaundice (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["jaundice", "yellow skin", "yellow eyes", "icterus", "hyperbilirubinaemia"],
    status: "cited",
    redFlags: [
      "Signs of acute liver failure (encephalopathy, coagulopathy)",
      "Fever, jaundice and right upper quadrant pain together — suggests ascending cholangitis and needs urgent biliary drainage",
      "Signs of decompensated chronic liver disease (ascites, variceal bleeding, encephalopathy)",
    ],
    algorithm: [
      {
        id: "y1",
        stage: "Presentation",
        title: "New jaundice — establish onset and associated symptoms",
        detail: "Ask about pain, fever, pale stools/dark urine, itching, alcohol use, medications, and travel or exposure history.",
        next: ["y2"],
      },
      {
        id: "y2",
        stage: "Investigate",
        title: "Split bilirubin (conjugated vs unconjugated) and liver function tests",
        detail: "The pattern of bilirubin, ALT/AST and ALP/GGT does most of the work in narrowing the differential before imaging is needed.",
        branches: [
          { label: "Unconjugated bilirubin predominates, normal liver enzymes", to: "med-haemolytic-jaundice" },
          { label: "Hepatocellular pattern — ALT/AST much higher than ALP", to: "med-acute-viral-hepatitis" },
          { label: "Cholestatic pattern — ALP/GGT much higher than ALT/AST, or duct dilatation", to: "med-obstructive-jaundice" },
          { label: "New medication started before the jaundice began", to: "med-drug-induced-liver-injury" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Jaundice", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000210.htm", licence: "US Government work — public domain" },
      { title: "Jaundice", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK544252/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-haemolytic-jaundice",
    condition: "Haemolytic jaundice",
    region: "ABDOMEN",
    synonyms: ["haemolytic jaundice", "hemolytic jaundice", "haemolysis", "hemolysis"],
    status: "cited",
    redFlags: [
      "Severe anaemia with haemodynamic compromise",
      "An acute haemolytic crisis (e.g. in G6PD deficiency or sickle cell disease)",
    ],
    algorithm: [
      {
        id: "z1",
        stage: "History",
        title: "Pallor, fatigue, and dark urine without pale stools",
        detail: "Ask about a known haemolytic condition or a recent trigger — infection, a new medication, or fava bean ingestion in G6PD deficiency.",
        next: ["z2"],
      },
      {
        id: "z2",
        stage: "Bloods",
        title: "Reticulocyte count, LDH, haptoglobin, blood film",
        detail: "A raised reticulocyte count and LDH with a low haptoglobin support haemolysis; the blood film often points to the specific cause (spherocytes, sickle cells, schistocytes).",
        next: ["z3"],
      },
      {
        id: "z3",
        stage: "Decision",
        title: "Identify and treat the underlying cause",
        detail: "Supportive transfusion if anaemia is severe or symptomatic.",
        next: [],
      },
    ],
    citations: [
      { title: "Immune hemolytic anemia", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000576.htm", licence: "US Government work — public domain" },
      { title: "Hemolytic Anemia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK558904/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-acute-viral-hepatitis",
    condition: "Acute viral hepatitis",
    region: "ABDOMEN",
    synonyms: ["viral hepatitis", "acute hepatitis", "hepatitis a", "hepatitis b", "hepatitis c", "hepatitis e"],
    status: "cited",
    redFlags: [
      "Signs of acute liver failure — encephalopathy or a rising INR",
      "Persistently worsening liver function despite supportive care",
    ],
    algorithm: [
      {
        id: "aa1",
        stage: "History",
        title: "Jaundice with malaise, nausea and right upper quadrant discomfort",
        detail: "Ask about exposure risk — travel, contaminated food or water, injection drug use, sexual exposure.",
        next: ["aa2"],
      },
      {
        id: "aa2",
        stage: "Bloods",
        title: "Markedly elevated ALT and AST (hepatocellular pattern), hepatitis serology",
        detail: "Serology identifies the specific virus and distinguishes acute from chronic infection.",
        next: ["aa3"],
      },
      {
        id: "aa3",
        stage: "Decision",
        title: "Mostly supportive care for self-limiting viral hepatitis",
        detail: "Monitor liver function and coagulation for signs of progression to acute liver failure.",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Overview of Viral Hepatitis", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/hepatitis/hcp/clinical-overview/index.html", licence: "US Government work — public domain" },
      { title: "Hepatitis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/hepatitis.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-obstructive-jaundice",
    condition: "Obstructive (cholestatic) jaundice",
    region: "ABDOMEN",
    synonyms: ["obstructive jaundice", "cholestatic jaundice", "biliary obstruction", "cholestasis"],
    status: "cited",
    redFlags: [
      "Fever with jaundice and right upper quadrant pain together (Charcot's triad) — suggests ascending cholangitis, needing urgent drainage",
      "Painless jaundice with weight loss in an older patient — consider malignant biliary obstruction",
    ],
    algorithm: [
      {
        id: "ab1",
        stage: "History",
        title: "Pale stools, dark urine, itching, with or without pain",
        next: ["ab2"],
      },
      {
        id: "ab2",
        stage: "Bloods",
        title: "Conjugated hyperbilirubinaemia with a disproportionately raised ALP and GGT",
        next: ["ab3"],
      },
      {
        id: "ab3",
        stage: "Imaging",
        title: "Abdominal ultrasound first-line, looking for bile duct dilatation and its cause",
        detail: "Further imaging (MRCP, CT) or endoscopic assessment (ERCP) is guided by the ultrasound findings.",
        next: ["ab4"],
      },
      {
        id: "ab4",
        stage: "Decision",
        title: "Biliary drainage (endoscopic, percutaneous or surgical) for confirmed obstruction",
        detail: "Urgent drainage if cholangitis is present.",
        next: [],
      },
    ],
    citations: [
      { title: "Gallstones", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/gallstones", licence: "US Government work — public domain" },
      { title: "Cholestatic Jaundice", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482279/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-drug-induced-liver-injury",
    condition: "Drug-induced liver injury",
    region: "ABDOMEN",
    synonyms: ["drug induced liver injury", "dili", "drug induced hepatotoxicity"],
    status: "cited",
    redFlags: [
      "Signs of acute liver failure",
      "Jaundice with a hepatocellular pattern and a rising INR — a poor prognostic combination",
    ],
    algorithm: [
      {
        id: "ac1",
        stage: "History",
        title: "A temporal relationship between starting a new medication and the onset of liver injury",
        detail: "Ask specifically about over-the-counter medications, herbal remedies and supplements, which are easily overlooked.",
        next: ["ac2"],
      },
      {
        id: "ac2",
        stage: "Pattern",
        title: "Classify the injury as hepatocellular, cholestatic, or mixed using the ALT:ALP ratio",
        next: ["ac3"],
      },
      {
        id: "ac3",
        stage: "Causality",
        title: "Named causality assessment tools exist (e.g. RUCAM) — name only",
        detail: "ClairMD does not score causality. The clinician assesses it using the named tool, alongside excluding other causes.",
        next: ["ac4"],
      },
      {
        id: "ac4",
        stage: "Decision",
        title: "Stop the suspected drug and monitor liver function to resolution",
        next: [],
      },
    ],
    citations: [
      { title: "Drug-Induced Hepatotoxicity", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK557535/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Categorization of the Likelihood of Drug Induced Liver Injury", publisher: "LiverTox, NIDDK/National Library of Medicine, NIH, USA", url: "https://www.ncbi.nlm.nih.gov/books/NBK548392/", licence: "US Government work — public domain" },
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
