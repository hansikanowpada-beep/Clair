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

  // ── Cluster 6: Palpitations ────────────────────────────────────────────────
  {
    id: "med-palpitations-entry",
    condition: "Palpitations (entry pathway)",
    region: "CHEST",
    synonyms: ["palpitations", "heart racing", "irregular heartbeat", "fluttering heart"],
    status: "cited",
    redFlags: [
      "Syncope or presyncope with the palpitations",
      "Chest pain or breathlessness accompanying the palpitations",
      "A pulse rate too fast or too irregular to count reliably",
      "Known structural heart disease or a family history of sudden cardiac death",
    ],
    algorithm: [
      {
        id: "ad1",
        stage: "Presentation",
        title: "Palpitations — establish onset, duration and any associated symptoms",
        detail: "Ask the patient to tap out the rhythm they felt if possible — regular vs irregular is often more informative than the rate alone.",
        next: ["ad2"],
      },
      {
        id: "ad2",
        stage: "Stabilise first",
        title: "Assess haemodynamic stability; obtain a 12-lead ECG as soon as possible, ideally during symptoms",
        next: ["ad3"],
      },
      {
        id: "ad3",
        stage: "Characterise the rhythm",
        title: "Use the ECG (or a rhythm strip during symptoms) to classify the rhythm",
        branches: [
          { label: "Irregularly irregular pulse and ECG", to: "med-atrial-fibrillation" },
          { label: "Regular narrow-complex tachycardia", to: "med-supraventricular-tachycardia" },
          { label: "Regular broad-complex tachycardia", to: "med-ventricular-tachycardia" },
          { label: "Slow pulse or a conduction abnormality on ECG", to: "med-bradyarrhythmia" },
          { label: "Normal ECG, situational trigger, no red flags", to: "med-anxiety-palpitations" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Arrhythmia", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/arrhythmia.html", licence: "US Government work — public domain" },
      { title: "Evaluation of Suspected Cardiac Arrhythmia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK585054/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-atrial-fibrillation",
    condition: "Atrial fibrillation",
    region: "CHEST",
    synonyms: ["atrial fibrillation", "af", "afib", "irregular heart rhythm"],
    status: "cited",
    redFlags: [
      "Haemodynamic instability — needs urgent rhythm control",
      "Signs of an acute stroke or systemic embolism",
    ],
    algorithm: [
      {
        id: "ae1",
        stage: "History and examination",
        title: "Irregularly irregular pulse",
        detail: "Ask about the duration of symptoms (relevant to anticoagulation decisions) and precipitants — alcohol, thyrotoxicosis, sepsis, hypoxia.",
        next: ["ae2"],
      },
      {
        id: "ae2",
        stage: "ECG",
        title: "Diagnostic — absent P waves, irregularly irregular QRS complexes",
        next: ["ae3"],
      },
      {
        id: "ae3",
        stage: "Decision",
        title: "Rate or rhythm control, and thromboembolism risk assessment",
        detail: "Named stroke-risk and bleeding-risk scoring tools exist (e.g. CHA2DS2-VASc). ClairMD does not compute them — the clinician calculates the score and decides on anticoagulation.",
        next: [],
      },
    ],
    citations: [
      { title: "Atrial Fibrillation - Diagnosis", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/atrial-fibrillation/diagnosis", licence: "US Government work — public domain" },
      { title: "Atrial Fibrillation - Treatment", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/atrial-fibrillation/treatment", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-supraventricular-tachycardia",
    condition: "Supraventricular tachycardia",
    region: "CHEST",
    synonyms: ["svt", "supraventricular tachycardia", "paroxysmal svt", "psvt"],
    status: "cited",
    redFlags: [
      "Haemodynamic instability — needs urgent synchronised cardioversion rather than medical treatment",
    ],
    algorithm: [
      {
        id: "af1",
        stage: "History",
        title: "Sudden-onset, sudden-offset rapid regular palpitations",
        detail: "Ask about prior similar episodes and how they were terminated previously.",
        next: ["af2"],
      },
      {
        id: "af2",
        stage: "ECG",
        title: "Regular narrow-complex tachycardia, usually without clearly visible P waves",
        next: ["af3"],
      },
      {
        id: "af3",
        stage: "Decision",
        title: "Vagal manoeuvres first if the patient is stable; intravenous adenosine if vagal manoeuvres fail",
        detail: "Synchronised cardioversion is reserved for the haemodynamically unstable patient.",
        next: [],
      },
    ],
    citations: [
      { title: "Paroxysmal Supraventricular Tachycardia (PSVT)", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000183.htm", licence: "US Government work — public domain" },
      { title: "Supraventricular Tachycardia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441972/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-ventricular-tachycardia",
    condition: "Ventricular tachycardia",
    region: "CHEST",
    synonyms: ["vt", "ventricular tachycardia", "wide complex tachycardia"],
    status: "cited",
    redFlags: [
      "Pulseless VT — treat as cardiac arrest, following resuscitation protocols",
      "Haemodynamic instability with a pulse — needs urgent synchronised cardioversion",
    ],
    algorithm: [
      {
        id: "ag1",
        stage: "Recognise it",
        title: "Regular broad-complex tachycardia",
        detail: "Treat any broad-complex tachycardia as VT until proven otherwise, especially with known structural heart disease.",
        next: ["ag2"],
      },
      {
        id: "ag2",
        stage: "Assess stability",
        title: "Check for a pulse and haemodynamic stability",
        next: ["ag3"],
      },
      {
        id: "ag3",
        stage: "Decision",
        title: "Synchronised cardioversion if haemodynamically unstable; antiarrhythmic therapy if stable, per local protocol",
        detail: "Correct reversible causes in parallel — electrolyte disturbance, ischaemia, drug toxicity.",
        next: [],
      },
    ],
    citations: [
      { title: "Arrhythmias - Types", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/arrhythmias/types", licence: "US Government work — public domain" },
      { title: "Ventricular Tachycardia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK532954/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-bradyarrhythmia",
    condition: "Bradyarrhythmia (heart block)",
    region: "CHEST",
    synonyms: ["bradyarrhythmia", "heart block", "bradycardia", "slow heart rate", "av block"],
    status: "cited",
    redFlags: [
      "Haemodynamic instability, syncope or a very slow ventricular rate — needs urgent pacing",
    ],
    algorithm: [
      {
        id: "ah1",
        stage: "History and examination",
        title: "Slow pulse, with or without dizziness, fatigue or syncope",
        next: ["ah2"],
      },
      {
        id: "ah2",
        stage: "ECG",
        title: "Classify the conduction pattern",
        detail: "Named degrees of AV block and other conduction abnormalities exist. ClairMD does not classify the block itself — the clinician interprets the ECG and applies the named classification.",
        next: ["ah3"],
      },
      {
        id: "ah3",
        stage: "Decision",
        title: "Identify and correct a reversible cause; temporary or permanent pacing if symptomatic or high-risk",
        detail: "Reversible causes include medication effect, electrolyte disturbance, ischaemia, and hypothyroidism.",
        next: [],
      },
    ],
    citations: [
      { title: "Arrhythmias - Conduction Disorders", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/conduction-disorders", licence: "US Government work — public domain" },
      { title: "Atrioventricular Block", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459147/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-anxiety-palpitations",
    condition: "Anxiety-related palpitations",
    region: "CHEST",
    synonyms: ["anxiety palpitations", "panic attack palpitations", "stress palpitations"],
    status: "cited",
    redFlags: [
      "Any red flag feature from the palpitations entry pathway should prompt reconsidering this diagnosis",
    ],
    algorithm: [
      {
        id: "ai1",
        stage: "History",
        title: "Palpitations associated with a situational trigger, often with other anxiety symptoms",
        detail: "Sweating, trembling, or a sense of impending doom commonly accompany the palpitations.",
        next: ["ai2"],
      },
      {
        id: "ai2",
        stage: "Investigate",
        title: "12-lead ECG and basic bloods (thyroid function, full blood count) to exclude an organic cause",
        detail: "A normal ECG during symptoms is reassuring, but a normal resting ECG between episodes does not fully exclude an arrhythmia — consider ambulatory monitoring if episodes recur.",
        next: ["ai3"],
      },
      {
        id: "ai3",
        stage: "Decision",
        title: "Reassurance, addressing the underlying anxiety, and treating any confirmed anxiety disorder",
        next: [],
      },
    ],
    citations: [
      { title: "Anxiety Disorders", publisher: "National Institute of Mental Health (NIMH), NIH, USA", url: "https://www.nimh.nih.gov/health/topics/anxiety-disorders", licence: "US Government work — public domain" },
      { title: "Anxiety", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/anxiety.html", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 7: Acute diarrhoea ─────────────────────────────────────────────
  {
    id: "med-acute-diarrhoea-entry",
    condition: "Acute diarrhoea (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["diarrhoea", "diarrhea", "loose stools", "acute diarrhoea"],
    status: "cited",
    redFlags: [
      "Signs of severe dehydration (reduced consciousness, very low blood pressure, minimal urine output)",
      "Bloody diarrhoea with high fever or systemic toxicity",
      "Severe abdominal pain out of proportion to the diarrhoea",
      "New diarrhoea following recent antibiotic use",
    ],
    algorithm: [
      {
        id: "aj1",
        stage: "Presentation",
        title: "New diarrhoea — establish onset, frequency, and whether blood or mucus is present",
        next: ["aj2"],
      },
      {
        id: "aj2",
        stage: "Assess hydration",
        title: "Check for signs of dehydration and correct fluid losses",
        detail: "Oral rehydration is sufficient for most patients; intravenous fluids are needed for those who can't keep up with losses or are significantly dehydrated.",
        next: ["aj3"],
      },
      {
        id: "aj3",
        stage: "Characterise it",
        title: "Use the pattern of symptoms and history to narrow the cause",
        branches: [
          { label: "Watery diarrhoea with vomiting, no blood", to: "med-viral-gastroenteritis" },
          { label: "Bloody diarrhoea with fever", to: "med-bacterial-dysentery" },
          { label: "Diarrhoea following recent antibiotic use", to: "med-c-diff-diarrhoea" },
          { label: "Known inflammatory bowel disease with a flare of symptoms", to: "med-ibd-flare" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Diagnosis of Diarrhea", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/diarrhea/diagnosis", licence: "US Government work — public domain" },
      { title: "Diarrhea", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/diarrhea.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-viral-gastroenteritis",
    condition: "Viral gastroenteritis",
    region: "ABDOMEN",
    synonyms: ["viral gastroenteritis", "stomach flu", "norovirus", "rotavirus"],
    status: "cited",
    redFlags: [
      "Significant dehydration unresponsive to oral rehydration",
      "Symptoms lasting beyond the typical few days for a viral illness",
    ],
    algorithm: [
      {
        id: "ak1",
        stage: "History",
        title: "Watery diarrhoea, often with vomiting and cramping, usually self-limiting over a few days",
        detail: "Ask about sick contacts and shared meals — outbreaks are common.",
        next: ["ak2"],
      },
      {
        id: "ak2",
        stage: "Examination",
        title: "Assess hydration status; examination is otherwise usually unremarkable",
        next: ["ak3"],
      },
      {
        id: "ak3",
        stage: "Decision",
        title: "Supportive care — oral rehydration, antiemetics if needed",
        detail: "Testing is not usually needed for a typical, self-limiting presentation; reserve stool studies for severe, prolonged, or outbreak-associated cases.",
        next: [],
      },
    ],
    citations: [
      { title: "About Norovirus", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/norovirus/about/index.html", licence: "US Government work — public domain" },
      { title: "Gastroenteritis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/gastroenteritis.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-bacterial-dysentery",
    condition: "Bacterial dysentery",
    region: "ABDOMEN",
    synonyms: ["dysentery", "bacterial dysentery", "shigellosis", "bloody diarrhoea"],
    status: "cited",
    redFlags: [
      "Signs of systemic sepsis",
      "Features of haemolytic uraemic syndrome (reduced urine output, pallor, bruising) — particularly relevant with Shiga toxin-producing organisms, where antibiotics can worsen the risk",
    ],
    algorithm: [
      {
        id: "al1",
        stage: "History",
        title: "Bloody or mucoid diarrhoea with fever and abdominal cramping",
        detail: "Ask about travel, food and water exposure, and sick contacts.",
        next: ["al2"],
      },
      {
        id: "al2",
        stage: "Investigate",
        title: "Stool culture and sensitivity, or a stool PCR panel where available",
        next: ["al3"],
      },
      {
        id: "al3",
        stage: "Decision",
        title: "Antibiotics are not always required and can be harmful in some Shiga toxin-producing infections",
        detail: "ClairMD does not select an antibiotic. Decide with local guidance and the specific organism/severity in mind — supportive rehydration is appropriate for most cases regardless.",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Overview of Shigellosis", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/shigella/hcp/clinical-overview/index.html", licence: "US Government work — public domain" },
      { title: "Bacterial Diarrhea", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK551643/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-c-diff-diarrhoea",
    condition: "Clostridioides difficile-associated diarrhoea",
    region: "ABDOMEN",
    synonyms: ["c diff", "clostridioides difficile", "clostridium difficile", "c diff colitis"],
    status: "cited",
    redFlags: [
      "Signs of severe or fulminant colitis (marked abdominal distension, systemic toxicity)",
      "Suspected toxic megacolon",
    ],
    algorithm: [
      {
        id: "am1",
        stage: "History",
        title: "New diarrhoea following recent antibiotic use (or a healthcare exposure)",
        next: ["am2"],
      },
      {
        id: "am2",
        stage: "Investigate",
        title: "Stool testing for C. difficile toxin or the toxin gene (PCR)",
        detail: "Test only patients with clinically significant diarrhoea — testing an asymptomatic patient, or one already improving, is not useful.",
        next: ["am3"],
      },
      {
        id: "am3",
        stage: "Decision",
        title: "Stop the precipitating antibiotic if possible",
        detail: "Specific first-line antimicrobial therapy for C. difficile is given per current guidance.",
        next: [],
      },
    ],
    citations: [
      { title: "C. diff: Facts for Clinicians", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/c-diff/hcp/clinical-overview/index.html", licence: "US Government work — public domain" },
      { title: "Clinical Testing and Diagnosis for C. diff Infection", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/c-diff/hcp/diagnosis-testing/index.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-ibd-flare",
    condition: "Inflammatory bowel disease flare",
    region: "ABDOMEN",
    synonyms: ["ibd flare", "ulcerative colitis flare", "crohn's flare", "inflammatory bowel disease flare"],
    status: "cited",
    redFlags: [
      "Signs of toxic megacolon or severe colitis (fever, tachycardia, marked abdominal tenderness)",
      "Significant rectal bleeding with haemodynamic compromise",
    ],
    algorithm: [
      {
        id: "an1",
        stage: "History",
        title: "Known inflammatory bowel disease with worsening bloody diarrhoea, abdominal pain, or urgency",
        detail: "Ask about medication adherence and any recent trigger — infection, NSAID use, antibiotic use.",
        next: ["an2"],
      },
      {
        id: "an2",
        stage: "Investigate",
        title: "Faecal calprotectin, stool studies to exclude a superimposed infection, bloods including inflammatory markers",
        next: ["an3"],
      },
      {
        id: "an3",
        stage: "Decision",
        title: "Escalate anti-inflammatory therapy per the patient's existing IBD management plan",
        detail: "Involve gastroenterology for a significant flare.",
        next: [],
      },
    ],
    citations: [
      { title: "Ulcerative Colitis", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/ulcerative-colitis", licence: "US Government work — public domain" },
      { title: "Inflammatory Bowel Disease", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470312/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 8: Acute leg swelling ──────────────────────────────────────────
  // The bilateral-swelling branch deliberately targets the existing
  // med-acute-heart-failure entry from Cluster 2 instead of duplicating it.
  {
    id: "med-leg-swelling-entry",
    condition: "Leg swelling (entry pathway)",
    region: "LEG",
    synonyms: ["leg swelling", "leg oedema", "leg edema", "swollen leg", "calf swelling"],
    status: "cited",
    redFlags: [
      "Signs of compartment syndrome (severe pain out of proportion, tense swelling)",
      "Suspected cellulitis with systemic sepsis",
      "Breathlessness or pleuritic chest pain alongside the leg swelling",
    ],
    algorithm: [
      {
        id: "ao1",
        stage: "Presentation",
        title: "Leg swelling — establish whether it is unilateral or bilateral, and how quickly it developed",
        detail: "Bilateral swelling more often points to a systemic cause (heart failure, renal or liver disease, medication); unilateral swelling more often points to a local cause.",
        next: ["ao2"],
      },
      {
        id: "ao2",
        stage: "Characterise it",
        title: "Use the pattern and associated findings to narrow the cause",
        branches: [
          { label: "Unilateral swelling, pain, warmth — possible clot", to: "med-deep-vein-thrombosis" },
          { label: "Unilateral erythema, warmth, tenderness, fever", to: "med-cellulitis-leg" },
          { label: "Chronic swelling, varicose veins, skin pigmentation change", to: "med-chronic-venous-insufficiency" },
          { label: "Sudden calf pain and swelling, or a known lump behind the knee", to: "med-ruptured-bakers-cyst" },
          { label: "Bilateral swelling with orthopnoea and a known cardiac history", to: "med-acute-heart-failure" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Swelling", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/003103.htm", licence: "US Government work — public domain" },
      { title: "Peripheral Edema", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK554452/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-deep-vein-thrombosis",
    condition: "Deep vein thrombosis",
    region: "LEG",
    synonyms: ["deep vein thrombosis", "dvt", "blood clot leg", "venous thrombosis"],
    status: "cited",
    redFlags: [
      "Signs of pulmonary embolism accompanying the leg symptoms",
      "Phlegmasia (a severely swollen, painful, discoloured limb) — a vascular emergency",
    ],
    algorithm: [
      {
        id: "ap1",
        stage: "History and examination",
        title: "Unilateral leg swelling, pain, warmth, and sometimes calf tenderness",
        next: ["ap2"],
      },
      {
        id: "ap2",
        stage: "Pre-test probability",
        title: "A named clinical prediction rule exists (Wells score) — name only",
        detail: "ClairMD does not calculate the score; the clinician applies their own judgement using the named tool.",
        next: ["ap3"],
      },
      {
        id: "ap3",
        stage: "Investigate",
        title: "D-dimer if pre-test probability is low; compression ultrasound if probability is higher or D-dimer is positive",
        next: ["ap4"],
      },
      {
        id: "ap4",
        stage: "Decision",
        title: "Anticoagulation once confirmed",
        detail: "Duration and choice of agent depend on the provoking factor and bleeding risk, decided by the clinician.",
        next: [],
      },
    ],
    citations: [
      { title: "Venous Thromboembolism - Diagnosis", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/venous-thromboembolism/diagnosis", licence: "US Government work — public domain" },
      { title: "Deep Venous Thrombosis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK507708/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-cellulitis-leg",
    condition: "Cellulitis of the leg",
    region: "LEG",
    synonyms: ["cellulitis", "leg cellulitis", "skin infection leg"],
    status: "cited",
    redFlags: [
      "Rapidly spreading erythema, pain out of proportion to examination findings, or skin necrosis — consider necrotising fasciitis",
      "Systemic sepsis",
    ],
    algorithm: [
      {
        id: "aq1",
        stage: "History and examination",
        title: "Unilateral erythema, warmth, swelling and tenderness, often with fever",
        detail: "Mark the border of the erythema to help track progression or response to treatment.",
        next: ["aq2"],
      },
      {
        id: "aq2",
        stage: "Decision",
        title: "Antibiotics targeting the likely organisms, chosen per local guidance",
        detail: "Mild cases can often be managed with oral antibiotics; systemic toxicity or failure to improve warrants escalation and reassessment.",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Guidance for Group A Streptococcal Cellulitis", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/cellulitis.html", licence: "US Government work — public domain" },
      { title: "Cellulitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK549770/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-chronic-venous-insufficiency",
    condition: "Chronic venous insufficiency",
    region: "LEG",
    synonyms: ["chronic venous insufficiency", "venous insufficiency", "venous oedema", "venous stasis"],
    status: "cited",
    redFlags: [
      "A new venous leg ulcer with signs of infection",
      "Sudden worsening of chronic swelling — reconsider an acute cause such as DVT",
    ],
    algorithm: [
      {
        id: "ar1",
        stage: "History",
        title: "Chronic, often bilateral, swelling that worsens through the day and improves with elevation",
        next: ["ar2"],
      },
      {
        id: "ar2",
        stage: "Examination",
        title: "Varicose veins, skin pigmentation (haemosiderin staining), lipodermatosclerosis, or a venous ulcer in advanced disease",
        next: ["ar3"],
      },
      {
        id: "ar3",
        stage: "Decision",
        title: "Compression therapy is the mainstay of management once significant arterial disease has been excluded",
        detail: "Check ankle-brachial pressure index before compression if arterial disease is a concern.",
        next: [],
      },
    ],
    citations: [
      { title: "Venous insufficiency", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000203.htm", licence: "US Government work — public domain" },
      { title: "Venous Insufficiency", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430975/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-ruptured-bakers-cyst",
    condition: "Ruptured Baker's cyst",
    region: "LEG",
    synonyms: ["baker's cyst", "bakers cyst", "popliteal cyst", "ruptured baker's cyst"],
    status: "cited",
    redFlags: [
      "Clinical features alone cannot reliably distinguish a ruptured Baker's cyst from DVT — both need imaging",
    ],
    algorithm: [
      {
        id: "as1",
        stage: "History",
        title: "Sudden calf pain and swelling, sometimes with bruising tracking down towards the ankle",
        detail: "Ask about a known lump behind the knee (the intact cyst) predating the acute episode.",
        next: ["as2"],
      },
      {
        id: "as2",
        stage: "Investigate",
        title: "Ultrasound distinguishes a ruptured Baker's cyst from DVT",
        detail: "The two can coexist, and a ruptured cyst can itself cause a DVT through compression — ultrasound findings guide management either way.",
        next: ["as3"],
      },
      {
        id: "as3",
        stage: "Decision",
        title: "Supportive management (rest, analgesia) once DVT has been excluded, or treated if also present",
        next: [],
      },
    ],
    citations: [
      { title: "Baker's Cyst", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430774/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 9: Upper gastrointestinal bleeding ────────────────────────────
  {
    id: "med-upper-gi-bleeding-entry",
    condition: "Upper gastrointestinal bleeding (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["upper gi bleed", "haematemesis", "hematemesis", "melaena", "melena", "vomiting blood"],
    status: "cited",
    redFlags: [
      "Haemodynamic instability (hypotension, tachycardia)",
      "Ongoing large-volume bleeding",
      "Reduced consciousness",
    ],
    algorithm: [
      {
        id: "at1",
        stage: "Presentation",
        title: "Haematemesis or melaena — establish volume, duration, and associated symptoms",
        next: ["at2"],
      },
      {
        id: "at2",
        stage: "Stabilise first",
        title: "Assess haemodynamic status; secure IV access and begin fluid resuscitation if unstable",
        next: ["at3"],
      },
      {
        id: "at3",
        stage: "Risk stratify",
        title: "A named risk score exists (Glasgow-Blatchford score) — name only",
        detail: "ClairMD does not calculate the score. The clinician calculates it to help decide on timing of endoscopy and the safety of outpatient management for low-risk patients.",
        next: ["at4"],
      },
      {
        id: "at4",
        stage: "Characterise the likely source",
        title: "History and examination findings point towards the likely cause",
        branches: [
          { label: "History of peptic ulcer disease, NSAID or aspirin use", to: "med-peptic-ulcer-bleeding" },
          { label: "Known or suspected cirrhosis, or signs of chronic liver disease", to: "med-variceal-bleeding" },
          { label: "Forceful vomiting or retching immediately before the bleeding began", to: "med-mallory-weiss-tear" },
        ],
        next: ["at5"],
      },
      {
        id: "at5",
        stage: "Decision",
        title: "Urgent upper endoscopy, timed according to risk stratification and response to resuscitation",
        next: [],
      },
    ],
    citations: [
      { title: "Diagnosis of GI Bleeding", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/gastrointestinal-bleeding/diagnosis", licence: "US Government work — public domain" },
      { title: "Upper Gastrointestinal Bleeding", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470300/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-peptic-ulcer-bleeding",
    condition: "Peptic ulcer bleeding",
    region: "ABDOMEN",
    synonyms: ["peptic ulcer bleeding", "bleeding ulcer", "gastric ulcer bleeding", "duodenal ulcer bleeding"],
    status: "cited",
    redFlags: [
      "Rebleeding after initial endoscopic control",
      "Perforation (sudden severe pain, peritonism)",
    ],
    algorithm: [
      {
        id: "au1",
        stage: "History",
        title: "Known peptic ulcer disease, or a history of NSAID, aspirin or anticoagulant use",
        next: ["au2"],
      },
      {
        id: "au2",
        stage: "Decision",
        title: "Start a proton pump inhibitor and proceed to endoscopy",
        detail: "Endoscopic haemostasis (injection, thermal, or mechanical) is used for high-risk stigmata of bleeding.",
        next: ["au3"],
      },
      {
        id: "au3",
        stage: "Stratify",
        title: "Named endoscopic classifications exist (e.g. Forrest classification) — name only",
        detail: "ClairMD does not classify the ulcer appearance itself; the endoscopist does, and this guides the need for endoscopic therapy and follow-up.",
        next: [],
      },
    ],
    citations: [
      { title: "Stomach Ulcer (Peptic Ulcer)", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/pepticulcer.html", licence: "US Government work — public domain" },
      { title: "Peptic Ulcer Disease", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK534792/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-variceal-bleeding",
    condition: "Variceal bleeding",
    region: "ABDOMEN",
    synonyms: ["variceal bleeding", "oesophageal varices", "esophageal varices bleeding", "variceal haemorrhage"],
    status: "cited",
    redFlags: [
      "Massive haemorrhage with haemodynamic collapse",
      "Signs of hepatic encephalopathy developing alongside the bleed",
    ],
    algorithm: [
      {
        id: "av1",
        stage: "History",
        title: "Known or suspected cirrhosis, with haematemesis or melaena",
        next: ["av2"],
      },
      {
        id: "av2",
        stage: "Decision",
        title: "Start a vasoactive drug (e.g. terlipressin) and prophylactic antibiotics as soon as variceal bleeding is suspected",
        detail: "ClairMD does not select the specific agent or dose — start per local protocol without waiting for endoscopic confirmation.",
        next: ["av3"],
      },
      {
        id: "av3",
        stage: "Definitive treatment",
        title: "Urgent endoscopy with band ligation",
        detail: "A Sengstaken-Blakemore tube (or similar balloon tamponade device) is a named rescue option for uncontrolled bleeding while arranging definitive treatment.",
        next: [],
      },
    ],
    citations: [
      { title: "Cirrhosis", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/liver-disease/cirrhosis", licence: "US Government work — public domain" },
      { title: "Esophageal Varices", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK448078/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-mallory-weiss-tear",
    condition: "Mallory-Weiss tear",
    region: "ABDOMEN",
    synonyms: ["mallory-weiss tear", "mallory weiss syndrome", "retching tear"],
    status: "cited",
    redFlags: [
      "Ongoing significant bleeding despite the usually self-limiting nature of this condition",
    ],
    algorithm: [
      {
        id: "aw1",
        stage: "History",
        title: "Forceful vomiting or retching immediately before the onset of haematemesis",
        detail: "Often follows a bout of alcohol excess, but can follow any cause of forceful vomiting.",
        next: ["aw2"],
      },
      {
        id: "aw2",
        stage: "Decision",
        title: "Usually self-limiting",
        detail: "Endoscopy confirms the diagnosis and can provide haemostasis if bleeding continues.",
        next: [],
      },
    ],
    citations: [
      { title: "Mallory-Weiss tear", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000269.htm", licence: "US Government work — public domain" },
      { title: "Mallory-Weiss Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK538190/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 10: Syncope / collapse ─────────────────────────────────────────
  // Cardiac syncope branches into the existing med-ventricular-tachycardia
  // and med-bradyarrhythmia entries from the palpitations cluster instead
  // of duplicating them.
  {
    id: "med-syncope-entry",
    condition: "Syncope (entry pathway)",
    region: "HEAD",
    synonyms: ["syncope", "fainting", "collapse", "passing out", "blackout", "loss of consciousness"],
    status: "cited",
    redFlags: [
      "Syncope during exertion",
      "Syncope while supine (lying down)",
      "Chest pain or palpitations preceding the episode",
      "A family history of sudden cardiac death, or known structural heart disease",
      "An abnormal ECG",
    ],
    algorithm: [
      {
        id: "ax1",
        stage: "Presentation",
        title: "Transient loss of consciousness with spontaneous full recovery",
        detail: "A witnessed account is invaluable — ask specifically about any warning symptoms, the duration of unconsciousness, and how the patient felt afterwards.",
        next: ["ax2"],
      },
      {
        id: "ax2",
        stage: "Stabilise and investigate",
        title: "12-lead ECG in every patient with syncope",
        detail: "Named risk-stratification tools exist (e.g. San Francisco Syncope Rule). ClairMD does not calculate them — the clinician applies the named tool to help decide on admission and further workup.",
        next: ["ax3"],
      },
      {
        id: "ax3",
        stage: "Characterise it",
        title: "Use the history and ECG findings to identify the likely cause",
        branches: [
          { label: "Exertional or supine syncope, an abnormal ECG, or known structural heart disease", to: "med-cardiac-syncope" },
          { label: "Typical prodrome (nausea, sweating, tunnel vision) with a clear trigger", to: "med-vasovagal-syncope" },
          { label: "Occurs on standing, especially after a meal or with certain medications", to: "med-orthostatic-hypotension" },
          { label: "Tongue biting, prolonged confusion afterwards, or a witnessed convulsion", to: "med-seizure-vs-syncope" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Syncope (Fainting)", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/syncope-fainting", licence: "US Government work — public domain" },
      { title: "Fainting", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/fainting.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-cardiac-syncope",
    condition: "Cardiac syncope",
    region: "HEAD",
    synonyms: ["cardiac syncope", "arrhythmic syncope", "cardiogenic syncope"],
    status: "cited",
    redFlags: [
      "Any red flag from the syncope entry pathway strengthens the case for urgent cardiac workup",
    ],
    algorithm: [
      {
        id: "ay1",
        stage: "History",
        title: "Syncope during exertion or while supine, sometimes with preceding palpitations or chest pain",
        next: ["ay2"],
      },
      {
        id: "ay2",
        stage: "ECG",
        title: "Look specifically for arrhythmia, a conduction abnormality, or signs of structural heart disease",
        branches: [
          { label: "Broad-complex tachycardia on the rhythm strip", to: "med-ventricular-tachycardia" },
          { label: "Slow rate or a conduction abnormality", to: "med-bradyarrhythmia" },
        ],
        next: ["ay3"],
      },
      {
        id: "ay3",
        stage: "Decision",
        title: "Admit for cardiac monitoring and further investigation if a cardiac cause is suspected",
        detail: "Echocardiography and ambulatory ECG monitoring are commonly used to look for a structural or intermittent rhythm cause.",
        next: [],
      },
    ],
    citations: [
      { title: "Arrhythmias", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/arrhythmias", licence: "US Government work — public domain" },
      { title: "Cardiac Syncope", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK526027/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-vasovagal-syncope",
    condition: "Vasovagal (reflex) syncope",
    region: "HEAD",
    synonyms: ["vasovagal syncope", "reflex syncope", "neurocardiogenic syncope"],
    status: "cited",
    redFlags: [
      "Any atypical feature (no prodrome, injury from the fall, an exertional trigger) should prompt reconsidering this diagnosis",
    ],
    algorithm: [
      {
        id: "az1",
        stage: "History",
        title: "A typical prodrome — nausea, sweating, light-headedness, tunnel vision — followed by loss of consciousness",
        detail: "Common triggers include prolonged standing, a hot environment, pain, fear, or the sight of blood.",
        next: ["az2"],
      },
      {
        id: "az2",
        stage: "Decision",
        title: "Reassurance and trigger avoidance for a typical, isolated episode",
        detail: "Investigate further if episodes are frequent, atypical, or associated with injury.",
        next: [],
      },
    ],
    citations: [
      { title: "Vasovagal Episode", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470277/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-orthostatic-hypotension",
    condition: "Orthostatic hypotension",
    region: "HEAD",
    synonyms: ["orthostatic hypotension", "postural hypotension", "orthostatic syncope"],
    status: "cited",
    redFlags: [
      "Persistent hypotension despite simple measures, or syncope causing significant injury",
    ],
    algorithm: [
      {
        id: "ba1",
        stage: "History",
        title: "Symptoms on standing — light-headedness, dimming vision, or syncope — often worse after meals or in the morning",
        detail: "Review medications known to contribute (antihypertensives, diuretics, some psychiatric medications) and screen for dehydration and autonomic conditions.",
        next: ["ba2"],
      },
      {
        id: "ba2",
        stage: "Confirm",
        title: "Lying and standing blood pressure measurement",
        detail: "A significant drop in blood pressure on standing, reproducing the patient's symptoms, supports the diagnosis.",
        next: ["ba3"],
      },
      {
        id: "ba3",
        stage: "Decision",
        title: "Address reversible contributors first — review medications, correct dehydration",
        detail: "Consider specific pharmacological treatment only after simple measures have been tried.",
        next: [],
      },
    ],
    citations: [
      { title: "Falls and Fractures in Older Adults: Causes and Prevention", publisher: "National Institute on Aging (NIA), NIH, USA", url: "https://www.nia.nih.gov/health/falls-and-falls-prevention/falls-and-fractures-older-adults-causes-and-prevention", licence: "US Government work — public domain" },
      { title: "Orthostatic Hypotension", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK448192/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-seizure-vs-syncope",
    condition: "Differentiating seizure from syncope",
    region: "HEAD",
    synonyms: ["seizure vs syncope", "convulsive syncope", "differentiating seizure from syncope"],
    status: "cited",
    redFlags: [
      "A prolonged convulsion, or a first seizure in an adult — needs further neurological assessment regardless of the syncope/seizure distinction",
    ],
    algorithm: [
      {
        id: "bb1",
        stage: "History",
        title: "Use witness accounts and specific features to distinguish the two",
        detail: "Tongue biting (especially lateral), prolonged post-ictal confusion, and a longer duration of abnormal movements favour seizure; a brief prodrome with rapid full recovery favours syncope.",
        next: ["bb2"],
      },
      {
        id: "bb2",
        stage: "Note",
        title: "Brief myoclonic jerks can occur in convulsive syncope too",
        detail: "Jerking movements alone don't confirm seizure — the overall pattern matters more than any single feature.",
        next: ["bb3"],
      },
      {
        id: "bb3",
        stage: "Decision",
        title: "Refer for neurological assessment if seizure is suspected; refer for cardiac/syncope workup if syncope is more likely",
        next: [],
      },
    ],
    citations: [
      { title: "Epilepsy and Seizures", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/epilepsy-and-seizures", licence: "US Government work — public domain" },
      { title: "Syncope and Related Paroxysmal Spells", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459292/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 11: Acute kidney injury ────────────────────────────────────────
  {
    id: "med-aki-entry",
    condition: "Acute kidney injury (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["acute kidney injury", "aki", "acute renal failure", "kidney failure"],
    status: "cited",
    redFlags: [
      "Anuria or a rapidly rising creatinine",
      "Life-threatening hyperkalaemia (arrhythmia risk)",
      "Fluid overload with pulmonary oedema unresponsive to diuretics",
      "Severe metabolic acidosis",
    ],
    algorithm: [
      {
        id: "bc1",
        stage: "Presentation",
        title: "A new rise in creatinine or fall in urine output — confirm this represents a genuine acute change",
        detail: "Named staging criteria exist (e.g. KDIGO). ClairMD does not stage the AKI itself — the clinician applies the criteria using the creatinine trend and urine output.",
        next: ["bc2"],
      },
      {
        id: "bc2",
        stage: "Screen for reversible causes and complications",
        title: "Check potassium, bicarbonate, and fluid status urgently",
        detail: "These can be immediately life-threatening independent of the underlying cause.",
        next: ["bc3"],
      },
      {
        id: "bc3",
        stage: "Categorise it",
        title: "Use the history, examination and initial investigations to localise the cause",
        branches: [
          { label: "History of volume loss, hypotension, or heart failure", to: "med-pre-renal-aki" },
          { label: "Known nephrotoxic exposure, or urinalysis suggesting intrinsic renal disease", to: "med-intrinsic-renal-aki" },
          { label: "Anuria, a palpable bladder, or hydronephrosis on imaging", to: "med-post-renal-aki" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Acute kidney failure", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000501.htm", licence: "US Government work — public domain" },
      { title: "Acute Kidney Injury", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441896/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-pre-renal-aki",
    condition: "Pre-renal acute kidney injury",
    region: "ABDOMEN",
    synonyms: ["pre-renal aki", "prerenal acute kidney injury", "prerenal failure"],
    status: "cited",
    redFlags: [
      "Ongoing haemodynamic instability despite initial fluid resuscitation — reconsider the diagnosis or look for a complicating intrinsic injury",
    ],
    algorithm: [
      {
        id: "bd1",
        stage: "History",
        title: "Volume loss (vomiting, diarrhoea, haemorrhage, poor oral intake), hypotension, or reduced cardiac output",
        detail: "Reduced cardiac output can come from heart failure or sepsis, not only primary blood or fluid loss.",
        next: ["bd2"],
      },
      {
        id: "bd2",
        stage: "Investigate",
        title: "Urea:creatinine ratio and, where relevant, fractional excretion of sodium (name only) support the diagnosis",
        detail: "ClairMD does not calculate the fractional excretion of sodium — the clinician calculates it from paired blood and urine sodium/creatinine.",
        next: ["bd3"],
      },
      {
        id: "bd3",
        stage: "Decision",
        title: "Careful fluid resuscitation and treatment of the underlying cause",
        detail: "A prompt improvement in renal function with adequate volume replacement supports a pre-renal cause; failure to improve raises the possibility of established intrinsic injury.",
        next: [],
      },
    ],
    citations: [
      { title: "Prerenal Kidney Failure", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK560678/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Kidney Tests", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/kidneytests.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-intrinsic-renal-aki",
    condition: "Intrinsic renal acute kidney injury",
    region: "ABDOMEN",
    synonyms: ["intrinsic aki", "acute tubular necrosis", "atn", "intrinsic renal failure"],
    status: "cited",
    redFlags: [
      "Rapidly progressive glomerulonephritis features (haematuria, red cell casts, rapidly worsening function) — needs urgent nephrology involvement",
    ],
    algorithm: [
      {
        id: "be1",
        stage: "History",
        title: "Prolonged hypotension or sepsis, nephrotoxic drug exposure, or features suggesting glomerulonephritis or interstitial nephritis",
        detail: "Common nephrotoxic exposures include NSAIDs, iodinated contrast, and aminoglycosides.",
        next: ["be2"],
      },
      {
        id: "be2",
        stage: "Investigate",
        title: "Urinalysis and urine microscopy",
        detail: "Muddy brown granular casts suggest acute tubular necrosis; red cell casts suggest glomerulonephritis; eosinophiluria may suggest interstitial nephritis, though this finding is not always reliable.",
        next: ["be3"],
      },
      {
        id: "be3",
        stage: "Decision",
        title: "Stop nephrotoxic drugs, treat the underlying cause, and involve nephrology",
        detail: "Nephrology involvement is particularly important for suspected glomerulonephritis or when the diagnosis remains unclear.",
        next: [],
      },
    ],
    citations: [
      { title: "Acute tubular necrosis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000512.htm", licence: "US Government work — public domain" },
      { title: "Acute Renal Tubular Necrosis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK507815/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-post-renal-aki",
    condition: "Post-renal (obstructive) acute kidney injury",
    region: "ABDOMEN",
    synonyms: ["post-renal aki", "obstructive uropathy", "obstructive aki", "urinary obstruction"],
    status: "cited",
    redFlags: [
      "Anuria with a palpable bladder — needs urgent catheterisation",
      "Bilateral obstruction, or obstruction of a single functioning kidney",
    ],
    algorithm: [
      {
        id: "bf1",
        stage: "History and examination",
        title: "Urinary retention symptoms, anuria, or a palpable bladder",
        detail: "Consider causes such as benign prostatic hyperplasia, pelvic malignancy, or ureteric stones, depending on the clinical context.",
        next: ["bf2"],
      },
      {
        id: "bf2",
        stage: "Investigate",
        title: "Bladder scan and renal ultrasound, looking for hydronephrosis",
        next: ["bf3"],
      },
      {
        id: "bf3",
        stage: "Decision",
        title: "Relieve the obstruction",
        detail: "Urinary catheterisation for bladder outlet obstruction, or nephrostomy for upper tract obstruction. Renal function often improves rapidly once the obstruction is relieved, though a post-obstructive diuresis needs monitoring.",
        next: [],
      },
    ],
    citations: [
      { title: "Obstructive uropathy", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000507.htm", licence: "US Government work — public domain" },
      { title: "Obstructive Uropathy", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK558921/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 12: Acute sore throat ─────────────────────────────────────────
  {
    id: "med-sore-throat-entry",
    condition: "Sore throat (entry pathway)",
    region: "NECK",
    synonyms: ["sore throat", "throat pain", "pharyngitis", "acute pharyngitis"],
    status: "cited",
    redFlags: [
      "Stridor, drooling, or tripod positioning — think epiglottitis and do not examine the throat",
      "Trismus (difficulty opening the mouth) or a muffled voice",
      "Significant difficulty breathing or swallowing secretions",
      "Neck swelling or stiffness",
    ],
    algorithm: [
      {
        id: "bg1",
        stage: "Presentation",
        title: "Acute sore throat — establish severity, duration and associated symptoms",
        detail: "In a child with stridor and drooling, avoid examining the throat or agitating the child — this can precipitate complete airway obstruction in epiglottitis.",
        next: ["bg2"],
      },
      {
        id: "bg2",
        stage: "Characterise it",
        title: "Use the pattern of symptoms and examination findings to narrow the cause",
        branches: [
          { label: "Coryzal symptoms, cough, mild illness", to: "med-viral-pharyngitis" },
          { label: "Sudden onset, fever, tonsillar exudate, no cough", to: "med-strep-pharyngitis" },
          { label: "Trismus, uvular deviation, muffled voice", to: "med-peritonsillar-abscess" },
          { label: "Prominent lymphadenopathy and fatigue, especially in a teenager or young adult", to: "med-infectious-mononucleosis" },
          { label: "Stridor, drooling, tripod positioning", to: "med-epiglottitis" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Sore Throat Basics", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/sore-throat/about/index.html", licence: "US Government work — public domain" },
      { title: "Sore Throat", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/sorethroat.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-viral-pharyngitis",
    condition: "Viral pharyngitis",
    region: "NECK",
    synonyms: ["viral pharyngitis", "viral sore throat", "common cold sore throat"],
    status: "cited",
    redFlags: [
      "Symptoms significantly worse than expected for a viral illness, or failing to improve as expected",
    ],
    algorithm: [
      {
        id: "bh1",
        stage: "History",
        title: "Sore throat with coryzal symptoms — runny nose, cough, mild fever",
        next: ["bh2"],
      },
      {
        id: "bh2",
        stage: "Decision",
        title: "Supportive care — analgesia, fluids, rest",
        detail: "Antibiotics are not indicated; most cases resolve within a week.",
        next: [],
      },
    ],
    citations: [
      { title: "About Common Cold", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/common-cold/about/index.html", licence: "US Government work — public domain" },
      { title: "Pharyngitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK519550/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-strep-pharyngitis",
    condition: "Streptococcal (bacterial) pharyngitis",
    region: "NECK",
    synonyms: ["strep throat", "streptococcal pharyngitis", "bacterial pharyngitis", "group a strep"],
    status: "cited",
    redFlags: [
      "Signs of a peritonsillar or retropharyngeal abscess",
      "Signs of rheumatic fever or post-streptococcal glomerulonephritis appearing during recovery",
    ],
    algorithm: [
      {
        id: "bi1",
        stage: "History and examination",
        title: "Sudden-onset sore throat, fever, tonsillar exudate, tender anterior cervical nodes, absence of cough",
        detail: "A named clinical prediction rule (Centor/McIsaac criteria) exists — name only. ClairMD does not calculate the score; the clinician uses it to decide who needs testing.",
        next: ["bi2"],
      },
      {
        id: "bi2",
        stage: "Investigate",
        title: "Rapid antigen detection test or throat culture in patients selected by the clinical score",
        next: ["bi3"],
      },
      {
        id: "bi3",
        stage: "Decision",
        title: "Antibiotics for confirmed streptococcal pharyngitis, per local guidance",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Guidance for Group A Streptococcal Pharyngitis", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/strep-throat.html", licence: "US Government work — public domain" },
      { title: "Testing for Strep Throat or Scarlet Fever", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/group-a-strep/testing/index.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-peritonsillar-abscess",
    condition: "Peritonsillar abscess (quinsy)",
    region: "NECK",
    synonyms: ["peritonsillar abscess", "quinsy", "peritonsillar cellulitis"],
    status: "cited",
    redFlags: [
      "Airway compromise",
      "A spreading deep neck space infection",
    ],
    algorithm: [
      {
        id: "bj1",
        stage: "History and examination",
        title: "Severe unilateral throat pain, trismus, uvular deviation away from the affected side, muffled (\"hot potato\") voice",
        next: ["bj2"],
      },
      {
        id: "bj2",
        stage: "Decision",
        title: "Needle aspiration or incision and drainage, plus antibiotics",
        detail: "Involve ENT for drainage and consider admission, particularly if airway compromise is a concern.",
        next: [],
      },
    ],
    citations: [
      { title: "Peritonsillar Abscess", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK519520/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Tonsillitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK544342/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-infectious-mononucleosis",
    condition: "Infectious mononucleosis",
    region: "NECK",
    synonyms: ["infectious mononucleosis", "glandular fever", "mono", "ebv infection"],
    status: "cited",
    redFlags: [
      "Splenic rupture (severe abdominal pain, especially after trauma or exertion) — avoid contact sports while the spleen is enlarged",
      "Airway compromise from severe tonsillar swelling",
    ],
    algorithm: [
      {
        id: "bk1",
        stage: "History and examination",
        title: "Sore throat, prominent lymphadenopathy, and fatigue, sometimes with splenomegaly",
        detail: "Most common in teenagers and young adults.",
        next: ["bk2"],
      },
      {
        id: "bk2",
        stage: "Investigate",
        title: "Full blood count with atypical lymphocytes, monospot test or EBV serology",
        next: ["bk3"],
      },
      {
        id: "bk3",
        stage: "Decision",
        title: "Supportive care",
        detail: "Avoid ampicillin or amoxicillin if streptococcal co-infection is suspected — these can cause a characteristic non-allergic rash in infectious mononucleosis.",
        next: [],
      },
    ],
    citations: [
      { title: "Infectious Mononucleosis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/infectiousmononucleosis.html", licence: "US Government work — public domain" },
      { title: "Mononucleosis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470387/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-epiglottitis",
    condition: "Epiglottitis",
    region: "NECK",
    synonyms: ["epiglottitis", "supraglottitis"],
    status: "cited",
    redFlags: [
      "Any sign of impending airway obstruction — do not examine the throat or agitate the patient; secure the airway with the most experienced available team",
    ],
    algorithm: [
      {
        id: "bl1",
        stage: "Recognise it",
        title: "Stridor, drooling, a muffled voice, and a preference for sitting forward (tripod positioning)",
        detail: "Do not lie the patient down, examine the throat, or attempt IV access before airway expertise is available — agitation can precipitate complete obstruction.",
        next: ["bl2"],
      },
      {
        id: "bl2",
        stage: "Decision",
        title: "Urgent airway management by the most experienced available team, in a controlled setting",
        detail: "Antibiotics are given once the airway is secured.",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Overview of Haemophilus influenzae Disease", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/hi-disease/hcp/clinicians/index.html", licence: "US Government work — public domain" },
      { title: "Epiglottitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430960/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 13: Hyperglycaemic emergencies ────────────────────────────────
  {
    id: "med-hyperglycaemic-emergency-entry",
    condition: "Hyperglycaemic emergency (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["hyperglycaemic emergency", "hyperglycemic emergency", "very high blood sugar", "dka", "hhs"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Severe dehydration or haemodynamic instability",
      "Very low pH or bicarbonate on blood gas",
      "Significant hypokalaemia or hyperkalaemia",
    ],
    algorithm: [
      {
        id: "bm1",
        stage: "Presentation",
        title: "Very high blood glucose — assess conscious level, hydration status and vital signs urgently",
        next: ["bm2"],
      },
      {
        id: "bm2",
        stage: "Stabilise first",
        title: "Secure IV access, begin fluid resuscitation, and check blood ketones and pH promptly",
        detail: "Named diagnostic criteria exist for both DKA and HHS. ClairMD does not apply the criteria itself — the clinician uses glucose, ketones, pH/bicarbonate and osmolality together to differentiate the two.",
        next: ["bm3"],
      },
      {
        id: "bm3",
        stage: "Differentiate",
        title: "Use the ketone and acid-base picture to distinguish DKA from HHS",
        branches: [
          { label: "Significant ketosis and acidosis (low pH/bicarbonate)", to: "med-diabetic-ketoacidosis" },
          { label: "Very high glucose and osmolality without significant ketosis or acidosis", to: "med-hyperosmolar-hyperglycaemic-state" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Hyperglycemia", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/hyperglycemia.html", licence: "US Government work — public domain" },
      { title: "Hyperglycemia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430900/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-diabetic-ketoacidosis",
    condition: "Diabetic ketoacidosis",
    region: "ABDOMEN",
    synonyms: ["diabetic ketoacidosis", "dka", "ketoacidosis"],
    status: "cited",
    redFlags: [
      "Reduced consciousness",
      "Severe acidosis (very low pH or bicarbonate)",
      "Hypokalaemia or hyperkalaemia — potassium needs urgent monitoring throughout treatment",
    ],
    algorithm: [
      {
        id: "bn1",
        stage: "Confirm",
        title: "Hyperglycaemia, ketosis (blood or urine ketones), and acidosis (low pH/bicarbonate) together confirm the diagnosis",
        next: ["bn2"],
      },
      {
        id: "bn2",
        stage: "Decision",
        title: "Fluid resuscitation, fixed-rate intravenous insulin, and close potassium monitoring and replacement",
        detail: "ClairMD does not calculate fluid or insulin rates — these are set and titrated by the clinician per local protocol. Look for and treat the precipitant (infection, missed insulin, new-onset diabetes).",
        next: ["bn3"],
      },
      {
        id: "bn3",
        stage: "Monitor",
        title: "Recheck glucose, ketones and potassium regularly until resolution criteria are met",
        next: [],
      },
    ],
    citations: [
      { title: "Diabetic ketoacidosis", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000320.htm", licence: "US Government work — public domain" },
      { title: "Adult Diabetic Ketoacidosis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK560723/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-hyperosmolar-hyperglycaemic-state",
    condition: "Hyperosmolar hyperglycaemic state",
    region: "ABDOMEN",
    synonyms: ["hyperosmolar hyperglycaemic state", "hhs", "hyperosmolar hyperglycemic state", "hyperosmolar coma"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Significant haemodynamic instability from profound dehydration",
      "Thromboembolic complications — HHS carries a high risk of venous thromboembolism",
    ],
    algorithm: [
      {
        id: "bo1",
        stage: "Confirm",
        title: "Very high glucose and high serum osmolality, without significant ketosis or acidosis",
        next: ["bo2"],
      },
      {
        id: "bo2",
        stage: "Decision",
        title: "Cautious, slower fluid replacement than DKA",
        detail: "Insulin is often started only once glucose stops falling with fluids alone. ClairMD does not calculate fluid or insulin rates — correcting the profound fluid deficit too quickly risks cerebral oedema and other complications, so the clinician titrates carefully.",
        next: ["bo3"],
      },
      {
        id: "bo3",
        stage: "Note",
        title: "Consider prophylactic anticoagulation given the significant thromboembolic risk in HHS",
        next: [],
      },
    ],
    citations: [
      { title: "Diabetic hyperglycemic hyperosmolar syndrome", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000304.htm", licence: "US Government work — public domain" },
      { title: "Hyperosmolar Hyperglycemic Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482142/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 14: Red eye ────────────────────────────────────────────────────
  {
    id: "med-red-eye-entry",
    condition: "Red eye (entry pathway)",
    region: "HEAD",
    synonyms: ["red eye", "eye redness", "painful eye", "conjunctival injection"],
    status: "cited",
    redFlags: [
      "Severe eye pain, especially with haloes around lights or a fixed, mid-dilated pupil",
      "Reduced visual acuity",
      "Photophobia with a small, irregular pupil",
      "A corneal opacity or infiltrate, particularly in a contact lens wearer",
      "Recent eye trauma or a penetrating injury",
    ],
    algorithm: [
      {
        id: "bp1",
        stage: "Presentation",
        title: "Red eye — establish pain severity, vision, discharge pattern, and any history of trauma or contact lens use",
        detail: "Vision-threatening causes need urgent same-day ophthalmology assessment; most causes of red eye are benign, but the exceptions matter.",
        next: ["bp2"],
      },
      {
        id: "bp2",
        stage: "Characterise it",
        title: "Use the pattern of symptoms and examination findings to narrow the cause",
        branches: [
          { label: "Discharge, mild irritation, normal vision", to: "med-conjunctivitis" },
          { label: "Severe pain, haloes around lights, a fixed mid-dilated pupil", to: "med-acute-angle-closure-glaucoma" },
          { label: "Photophobia, ciliary flush, a small or irregular pupil", to: "med-anterior-uveitis" },
          { label: "Corneal opacity or infiltrate, especially with contact lens use", to: "med-microbial-keratitis" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Conjunctivitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK541034/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Subconjunctival Hemorrhage", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK551666/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-conjunctivitis",
    condition: "Conjunctivitis",
    region: "HEAD",
    synonyms: ["conjunctivitis", "pink eye", "viral conjunctivitis", "bacterial conjunctivitis"],
    status: "cited",
    redFlags: [
      "Reduced vision, significant pain, or a corneal abnormality — reconsider the diagnosis",
    ],
    algorithm: [
      {
        id: "bq1",
        stage: "History and examination",
        title: "Discharge (watery for viral, purulent for bacterial), mild irritation, normal vision",
        detail: "Viral conjunctivitis is highly contagious and often accompanies an upper respiratory infection.",
        next: ["bq2"],
      },
      {
        id: "bq2",
        stage: "Decision",
        title: "Supportive care for viral conjunctivitis; topical antibiotics for confirmed or clinically likely bacterial conjunctivitis",
        next: [],
      },
    ],
    citations: [
      { title: "Conjunctivitis (Pink Eye)", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/conjunctivitis/index.html", licence: "US Government work — public domain" },
      { title: "Pink Eye", publisher: "National Eye Institute (NEI), NIH, USA", url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/pink-eye", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-acute-angle-closure-glaucoma",
    condition: "Acute angle-closure glaucoma",
    region: "HEAD",
    synonyms: ["acute angle-closure glaucoma", "angle closure glaucoma", "acute glaucoma"],
    status: "cited",
    redFlags: [
      "Any delay in treatment risks permanent vision loss — this is an ophthalmic emergency",
    ],
    algorithm: [
      {
        id: "br1",
        stage: "History and examination",
        title: "Severe eye pain, headache, nausea and vomiting, haloes around lights, and a red eye with a hazy cornea",
        next: ["br2"],
      },
      {
        id: "br2",
        stage: "Examine",
        title: "A fixed, mid-dilated pupil and a firm eye on gentle palpation support the diagnosis",
        next: ["br3"],
      },
      {
        id: "br3",
        stage: "Decision",
        title: "Urgent intraocular pressure reduction and same-day ophthalmology referral",
        detail: "ClairMD does not select specific medications or doses — treatment is directed by the treating clinician/ophthalmologist.",
        next: [],
      },
    ],
    citations: [
      { title: "Types of Glaucoma", publisher: "National Eye Institute (NEI), NIH, USA", url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma/types-glaucoma", licence: "US Government work — public domain" },
      { title: "Acute Angle-Closure Glaucoma", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430857/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-anterior-uveitis",
    condition: "Anterior uveitis (iritis)",
    region: "HEAD",
    synonyms: ["anterior uveitis", "iritis", "uveitis"],
    status: "cited",
    redFlags: [
      "Reduced vision or hypopyon (pus in the anterior chamber) — needs urgent assessment",
    ],
    algorithm: [
      {
        id: "bs1",
        stage: "History and examination",
        title: "Photophobia, aching eye pain, and a red eye especially around the cornea (ciliary flush)",
        next: ["bs2"],
      },
      {
        id: "bs2",
        stage: "Examine",
        title: "A small or irregularly shaped pupil supports the diagnosis",
        detail: "Consider an association with systemic inflammatory or autoimmune conditions, particularly with recurrent episodes.",
        next: ["bs3"],
      },
      {
        id: "bs3",
        stage: "Decision",
        title: "Urgent ophthalmology referral for slit-lamp examination and treatment",
        next: [],
      },
    ],
    citations: [
      { title: "Uveitis", publisher: "National Eye Institute (NEI), NIH, USA", url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/uveitis", licence: "US Government work — public domain" },
      { title: "Iritis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430909/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-microbial-keratitis",
    condition: "Microbial keratitis (corneal ulcer)",
    region: "HEAD",
    synonyms: ["microbial keratitis", "corneal ulcer", "bacterial keratitis", "contact lens keratitis"],
    status: "cited",
    redFlags: [
      "Rapidly progressive symptoms, especially in a contact lens wearer — same-day ophthalmology assessment is needed",
    ],
    algorithm: [
      {
        id: "bt1",
        stage: "History and examination",
        title: "Eye pain, redness, discharge, and reduced vision",
        detail: "Often with a history of contact lens use or corneal trauma.",
        next: ["bt2"],
      },
      {
        id: "bt2",
        stage: "Examine",
        title: "Fluorescein staining highlights a corneal defect; a visible corneal infiltrate or opacity supports the diagnosis",
        next: ["bt3"],
      },
      {
        id: "bt3",
        stage: "Decision",
        title: "Urgent ophthalmology referral for corneal scraping and targeted antimicrobial therapy",
        detail: "Avoid topical steroids until infection has been excluded or is being treated — steroids can worsen an untreated infective keratitis.",
        next: [],
      },
    ],
    citations: [
      { title: "Corneal Conditions", publisher: "National Eye Institute (NEI), NIH, USA", url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/corneal-conditions", licence: "US Government work — public domain" },
      { title: "Bacterial Keratitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK574509/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 15: Fever in the returning traveller ───────────────────────────
  {
    id: "med-fever-returning-traveller-entry",
    condition: "Fever in the returning traveller (entry pathway)",
    region: "SYSTEMIC",
    synonyms: ["fever in the returning traveller", "fever after travel", "fever in returning traveler", "travel-related fever", "post-travel fever"],
    status: "cited",
    redFlags: [
      "Reduced consciousness, confusion or seizures",
      "Signs of shock or marked hypotension",
      "Bleeding or widespread bruising",
      "Jaundice with marked abdominal pain",
      "Breathlessness or hypoxia",
    ],
    algorithm: [
      {
        id: "bu1",
        stage: "Presentation",
        title: "Fever within weeks of travel — establish exact itinerary, dates, malaria prophylaxis and vaccination history, and any high-risk exposures",
        detail: "Ask specifically about mosquito bites, unsafe food or water, freshwater contact, and animal or insect bites.",
        next: ["bu2"],
      },
      {
        id: "bu2",
        stage: "Stabilise and test",
        title: "Actively exclude malaria first in anyone with fever after travel to an endemic area — request thick and thin blood films or a rapid antigen test urgently, alongside routine blood tests",
        detail: "Several tropical fevers overlap closely in their early presentation; a specific travel and exposure history is what narrows the differential most.",
        next: ["bu3"],
      },
      {
        id: "bu3",
        stage: "Differentiate",
        title: "Use exposure pattern and fever character to narrow the likely cause",
        branches: [
          { label: "Travel to a malaria-endemic area, cyclical fever with rigors", to: "med-malaria" },
          { label: "Contaminated food or water exposure, stepwise fever with relative bradycardia", to: "med-typhoid-fever" },
          { label: "Mosquito-endemic area, severe headache with retro-orbital pain, myalgia and rash", to: "med-dengue-fever" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Features of Malaria", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/malaria/hcp/clinical-features/index.html", licence: "US Government work — public domain" },
      { title: "Clinical Features of Dengue", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/dengue/hcp/clinical-signs/index.html", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-malaria",
    condition: "Malaria",
    region: "SYSTEMIC",
    synonyms: ["malaria", "plasmodium falciparum", "plasmodium vivax", "cyclical fever with rigors"],
    status: "cited",
    redFlags: [
      "Impaired consciousness or seizures (cerebral malaria)",
      "Severe anaemia",
      "Jaundice or acute kidney injury",
      "Hypoglycaemia",
      "Respiratory distress or acidosis",
      "High parasitaemia — used by the clinician, alongside the features above, to help distinguish uncomplicated from severe disease",
    ],
    algorithm: [
      {
        id: "bv1",
        stage: "Confirm",
        title: "Thick and thin blood films, or a rapid diagnostic test, confirm the diagnosis and identify the Plasmodium species",
        next: ["bv2"],
      },
      {
        id: "bv2",
        stage: "Decision",
        title: "Malaria is a medical emergency — species and severity determine treatment",
        detail: "ClairMD does not select or dose antimalarial therapy — this is set by the clinician per current national or WHO guidance. Any feature of severe malaria warrants urgent parenteral treatment and same-day escalation.",
        next: ["bv3"],
      },
      {
        id: "bv3",
        stage: "Note",
        title: "P. vivax and P. ovale can relapse from dormant liver-stage parasites — the clinician manages radical cure separately",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Features of Malaria", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/malaria/hcp/clinical-features/index.html", licence: "US Government work — public domain" },
      { title: "Malaria", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK551711/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-typhoid-fever",
    condition: "Typhoid fever",
    region: "SYSTEMIC",
    synonyms: ["typhoid fever", "enteric fever", "paratyphoid fever", "salmonella typhi"],
    status: "cited",
    redFlags: [
      "Severe abdominal pain or peritonism — possible intestinal perforation",
      "Gastrointestinal bleeding",
      "Marked abdominal distension",
      "Altered consciousness (the 'typhoid state')",
    ],
    algorithm: [
      {
        id: "bw1",
        stage: "Confirm",
        title: "Sustained high fever, headache and malaise, often with relative bradycardia and abdominal discomfort; blood culture is the key confirmatory test",
        detail: "Ask specifically about a rash of rose-coloured spots and any household history of typhoid or a chronic carrier state.",
        next: ["bw2"],
      },
      {
        id: "bw2",
        stage: "Decision",
        title: "Empirical antibiotics are started once cultures are sent, guided by local resistance patterns",
        detail: "ClairMD does not select antibiotic choice or dose — this is set by the clinician.",
        next: ["bw3"],
      },
      {
        id: "bw3",
        stage: "Monitor",
        title: "Watch closely for intestinal perforation and gastrointestinal bleeding, which typically appear in the second to third week of untreated illness",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Overview of Typhoid Fever and Paratyphoid Fever", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/typhoid-fever/hcp/clinical-overview/index.html", licence: "US Government work — public domain" },
      { title: "Typhoid Fever", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK557513/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-dengue-fever",
    condition: "Dengue fever",
    region: "SYSTEMIC",
    synonyms: ["dengue fever", "dengue", "breakbone fever"],
    status: "cited",
    redFlags: [
      "Abdominal pain or tenderness",
      "Persistent vomiting",
      "Mucosal bleeding",
      "Lethargy or restlessness",
      "Liver enlargement",
      "Rising haematocrit with a rapidly falling platelet count — dengue warning signs, named by the WHO classification; ClairMD does not calculate the classification itself",
    ],
    algorithm: [
      {
        id: "bx1",
        stage: "Confirm",
        title: "Fever with severe headache, retro-orbital pain, myalgia/arthralgia and a macular or maculopapular rash, in someone from or recently in a dengue-endemic area",
        next: ["bx2"],
      },
      {
        id: "bx2",
        stage: "Decision",
        title: "Watch closely for warning signs, especially around defervescence — this is when the critical, high-risk phase of plasma leakage often begins",
        detail: "There is no specific antiviral treatment; management is supportive. ClairMD does not select or titrate fluid regimens — this is set by the clinician.",
        next: ["bx3"],
      },
      {
        id: "bx3",
        stage: "Note",
        title: "Avoid NSAIDs and other drugs that increase bleeding risk once dengue is suspected",
        next: [],
      },
    ],
    citations: [
      { title: "Clinical Features of Dengue", publisher: "Centers for Disease Control and Prevention (CDC), USA", url: "https://www.cdc.gov/dengue/hcp/clinical-signs/index.html", licence: "US Government work — public domain" },
      { title: "Dengue Fever", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430732/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 16: Acute vertigo ───────────────────────────────────────────────
  {
    id: "med-acute-vertigo-entry",
    condition: "Acute vertigo (entry pathway)",
    region: "NEURO",
    synonyms: ["vertigo", "acute vertigo", "dizziness", "spinning sensation", "room spinning"],
    status: "cited",
    redFlags: [
      "New-onset severe headache or neck pain",
      "New diplopia, dysarthria, dysphagia, facial weakness or numbness",
      "Limb weakness, numbness or ataxia",
      "Inability to stand or walk unsupported",
      "Direction-changing or purely vertical nystagmus",
      "Cardiovascular risk factors (hypertension, atrial fibrillation, prior stroke) in someone with acute continuous vertigo",
    ],
    algorithm: [
      {
        id: "by1",
        stage: "Presentation",
        title: "Vertigo — establish onset (sudden vs gradual), duration and triggers (positional vs continuous), and any associated hearing loss, headache or neurological symptoms",
        next: ["by2"],
      },
      {
        id: "by2",
        stage: "Screen for central causes",
        title: "Any red flag needs urgent neuroimaging and stroke-pathway assessment",
        detail: "A bedside test such as the HINTS exam may be used by the clinician to help distinguish a peripheral from a central cause in acute continuous vertigo with nystagmus — ClairMD does not perform or score this examination.",
        next: ["by3"],
      },
      {
        id: "by3",
        stage: "Characterise it",
        title: "Use the pattern of onset, duration and associated features to narrow the cause",
        branches: [
          { label: "Brief, positional episodes triggered by head movement, lasting seconds", to: "med-bppv" },
          { label: "Continuous vertigo over days, often with nausea and unsteady gait, following a viral illness", to: "med-vestibular-neuritis" },
          { label: "Continuous vertigo with any red flag or new focal neurological sign", to: "med-central-vertigo" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Balance Disorders", publisher: "National Institute on Deafness and Other Communication Disorders (NIDCD), NIH, USA", url: "https://www.nidcd.nih.gov/health/balance-disorders", licence: "US Government work — public domain" },
      { title: "Peripheral Vertigo", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430797/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-bppv",
    condition: "Benign paroxysmal positional vertigo (BPPV)",
    region: "NEURO",
    synonyms: ["bppv", "benign paroxysmal positional vertigo", "positional vertigo"],
    status: "cited",
    redFlags: [
      "Any associated new neurological deficit — atypical for BPPV, reassess for a central cause",
      "Hearing loss or tinnitus — atypical for BPPV, reconsider the diagnosis",
    ],
    algorithm: [
      {
        id: "bz1",
        stage: "Confirm",
        title: "Brief (seconds) episodes of vertigo triggered by specific head movements such as rolling over in bed or looking up",
        detail: "The Dix-Hallpike test is the standard bedside diagnostic manoeuvre. ClairMD names it for reference only — it is performed and interpreted by the clinician, not by the app.",
        next: ["bz2"],
      },
      {
        id: "bz2",
        stage: "Decision",
        title: "Canalith repositioning manoeuvres (e.g. the Epley manoeuvre) are first-line treatment and are usually curative",
        detail: "Vestibular sedatives are not routinely needed and can slow central compensation.",
        next: [],
      },
    ],
    citations: [
      { title: "Benign Paroxysmal Positional Vertigo", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470308/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Epley Maneuver", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK563287/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-vestibular-neuritis",
    condition: "Vestibular neuritis",
    region: "NEURO",
    synonyms: ["vestibular neuritis", "vestibular neuronitis", "labyrinthitis"],
    status: "cited",
    redFlags: [
      "New hearing loss — suggests labyrinthitis or an alternative diagnosis rather than isolated vestibular neuritis",
      "Any focal neurological deficit — reassess for a central cause",
      "Inability to walk even with support",
    ],
    algorithm: [
      {
        id: "ca1",
        stage: "Confirm",
        title: "Continuous vertigo over days with nausea, vomiting and unsteady gait, often preceded by a viral illness",
        detail: "Examination typically shows a unidirectional horizontal nystagmus that suppresses with visual fixation.",
        next: ["ca2"],
      },
      {
        id: "ca2",
        stage: "Decision",
        title: "Treatment is supportive — short courses of vestibular sedatives for the first day or two only, followed by early mobilisation",
        detail: "ClairMD does not select or dose medication — this is set by the clinician. Vestibular rehabilitation exercises encourage central compensation.",
        next: [],
      },
    ],
    citations: [
      { title: "Vestibular Neuronitis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK549866/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Vestibular Rehabilitation", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK572153/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-central-vertigo",
    condition: "Central vertigo (posterior circulation stroke)",
    region: "NEURO",
    synonyms: ["central vertigo", "posterior circulation stroke", "cerebellar stroke", "vertebrobasilar stroke"],
    status: "cited",
    redFlags: [
      "Severe imbalance — inability to stand or walk unsupported",
      "New diplopia, dysarthria, dysphagia, or facial or limb weakness or numbness",
      "Direction-changing or purely vertical nystagmus",
      "Sudden severe headache or neck pain",
    ],
    algorithm: [
      {
        id: "cb1",
        stage: "Confirm",
        title: "Continuous vertigo with any red flag raises concern for a posterior circulation stroke",
        detail: "Urgent neuroimaging (with sequences that reliably show early cerebellar or brainstem infarcts) and stroke team involvement are needed.",
        next: ["cb2"],
      },
      {
        id: "cb2",
        stage: "Decision",
        title: "Manage on the acute stroke pathway once confirmed or strongly suspected",
        detail: "ClairMD does not select thrombolysis or thrombectomy eligibility or dosing — this is a time-critical clinician decision.",
        next: [],
      },
    ],
    citations: [
      { title: "Central Vertigo", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441861/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Cerebellar Infarction", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470416/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 17: Thyroid emergencies ─────────────────────────────────────────
  {
    id: "med-thyroid-emergency-entry",
    condition: "Thyroid emergency (entry pathway)",
    region: "NECK",
    synonyms: ["thyroid emergency", "thyroid crisis", "thyrotoxic crisis", "myxedema crisis"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Very high fever or marked hypothermia",
      "Severe tachycardia, arrhythmia or heart failure",
      "Marked agitation, delirium or psychosis",
      "A clear precipitant — infection, recent thyroid or other surgery, iodine load, or medication non-adherence",
    ],
    algorithm: [
      {
        id: "cc1",
        stage: "Presentation",
        title: "Known or suspected thyroid disease with an acute, severe systemic deterioration",
        detail: "Establish baseline thyroid status, medication adherence, and any precipitant (infection, surgery, trauma, iodine load, drug withdrawal).",
        next: ["cc2"],
      },
      {
        id: "cc2",
        stage: "Differentiate",
        title: "Use the direction of thyroid dysfunction and systemic features to identify which crisis this is",
        branches: [
          { label: "High fever, marked tachycardia, agitation or delirium, on a background of hyperthyroidism", to: "med-thyroid-storm" },
          { label: "Hypothermia, bradycardia, reduced consciousness, on a background of hypothyroidism", to: "med-myxedema-coma" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Hyperthyroidism (Overactive Thyroid)", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/endocrine-diseases/hyperthyroidism", licence: "US Government work — public domain" },
      { title: "Hypothyroidism (Underactive Thyroid)", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/endocrine-diseases/hypothyroidism", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-thyroid-storm",
    condition: "Thyroid storm",
    region: "NECK",
    synonyms: ["thyroid storm", "thyrotoxic crisis", "thyrotoxicosis crisis"],
    status: "cited",
    redFlags: [
      "Hyperthermia, often above 40°C",
      "Severe tachycardia, atrial fibrillation or heart failure",
      "Marked agitation, delirium, psychosis or coma",
      "Severe vomiting, diarrhoea or jaundice",
    ],
    algorithm: [
      {
        id: "cd1",
        stage: "Confirm",
        title: "Diagnosis is clinical, on a background of thyrotoxicosis with multi-system decompensation",
        detail: "A named scoring system (the Burch-Wartofsky Point Scale) may be used by the clinician to support the diagnosis — ClairMD does not calculate or apply this score.",
        next: ["cd2"],
      },
      {
        id: "cd2",
        stage: "Decision",
        title: "Treatment targets hormone synthesis, release and peripheral conversion together, alongside adrenergic control and aggressive supportive care",
        detail: "ClairMD does not select or dose antithyroid drugs, iodine, beta-blockers or corticosteroids — these are set by the clinician. Treating the precipitant is essential.",
        next: ["cd3"],
      },
      {
        id: "cd3",
        stage: "Note",
        title: "Mortality remains high even with treatment — early recognition and same-day escalation to critical care are essential",
        next: [],
      },
    ],
    citations: [
      { title: "Thyroid Storm", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK448095/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Hyperthyroidism (Overactive Thyroid)", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/endocrine-diseases/hyperthyroidism", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-myxedema-coma",
    condition: "Myxedema coma",
    region: "NECK",
    synonyms: ["myxedema coma", "myxoedema coma", "severe hypothyroidism crisis"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Hypothermia",
      "Bradycardia or hypotension",
      "Hypoventilation with CO2 retention",
      "Hyponatraemia",
      "Hypoglycaemia",
    ],
    algorithm: [
      {
        id: "ce1",
        stage: "Confirm",
        title: "Severe hypothyroidism with altered mentation, hypothermia and multi-organ dysfunction, usually with an identifiable precipitant",
        detail: "Common precipitants include infection, cold exposure, sedating drugs, and surgery.",
        next: ["ce2"],
      },
      {
        id: "ce2",
        stage: "Decision",
        title: "IV thyroid hormone replacement plus stress-dose corticosteroids, alongside aggressive supportive care",
        detail: "Corticosteroids are given before or with thyroid hormone, since replacement can unmask underlying adrenal insufficiency. ClairMD does not select or dose thyroid hormone or corticosteroids — these are set by the clinician.",
        next: ["ce3"],
      },
      {
        id: "ce3",
        stage: "Note",
        title: "Passive rewarming is preferred over rapid active rewarming, which can worsen cardiovascular collapse",
        next: [],
      },
    ],
    citations: [
      { title: "Myxedema Coma", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK545193/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Hypothyroidism (Underactive Thyroid)", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/endocrine-diseases/hypothyroidism", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 18: Hypertensive emergency ──────────────────────────────────────
  {
    id: "med-hypertensive-emergency-entry",
    condition: "Hypertensive emergency (entry pathway)",
    region: "CHEST",
    synonyms: ["hypertensive emergency", "hypertensive crisis", "malignant hypertension", "very high blood pressure with symptoms"],
    status: "cited",
    redFlags: [
      "Chest or back pain, or unequal pulses/blood pressures — possible aortic dissection",
      "Breathlessness, crackles or low oxygen saturation — possible acute pulmonary oedema",
      "New neurological deficit, severe headache, seizures or reduced consciousness",
      "Visual disturbance or papilloedema",
      "Reduced urine output or acute kidney injury",
      "Pregnant or postpartum, with headache, visual change or epigastric pain",
    ],
    algorithm: [
      {
        id: "cf1",
        stage: "Presentation",
        title: "Very high blood pressure — the diagnosis of a hypertensive emergency rests on evidence of new or worsening target-organ damage, not on the blood pressure number alone",
        detail: "Without target-organ damage, this is hypertensive urgency, which is managed with gradual oral treatment rather than an emergency parenteral pathway.",
        next: ["cf2"],
      },
      {
        id: "cf2",
        stage: "Identify the organ affected",
        title: "Look specifically for the affected organ system — this determines the treatment pathway and how quickly blood pressure should be lowered",
        branches: [
          { label: "Chest/back pain radiating through, unequal pulses or blood pressures", to: "med-aortic-dissection" },
          { label: "Breathlessness, crackles, low oxygen saturation — acute pulmonary oedema", to: "med-acute-heart-failure" },
          { label: "Severe headache, seizures, reduced consciousness or visual disturbance, without a clear alternative cause", to: "med-hypertensive-encephalopathy" },
          { label: "Pregnant or postpartum, with headache, visual change, epigastric pain or oedema", to: "med-pre-eclampsia-eclampsia" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "High Blood Pressure — Symptoms", publisher: "National Heart, Lung, and Blood Institute (NHLBI), NIH, USA", url: "https://www.nhlbi.nih.gov/health/high-blood-pressure/symptoms", licence: "US Government work — public domain" },
      { title: "Hypertensive Emergency", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470371/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-hypertensive-encephalopathy",
    condition: "Hypertensive encephalopathy",
    region: "HEAD",
    synonyms: ["hypertensive encephalopathy", "malignant hypertension with encephalopathy"],
    status: "cited",
    redFlags: [
      "Reduced consciousness, confusion or coma",
      "Seizures",
      "Visual disturbance or papilloedema",
      "Any focal neurological deficit — reassess for stroke as an alternative or coexisting diagnosis",
    ],
    algorithm: [
      {
        id: "cg1",
        stage: "Confirm",
        title: "Very high blood pressure with headache, confusion, visual disturbance or seizures, which improve as blood pressure is controlled",
        detail: "Neuroimaging helps exclude stroke and haemorrhage, which can coexist with or mimic hypertensive encephalopathy.",
        next: ["cg2"],
      },
      {
        id: "cg2",
        stage: "Decision",
        title: "Controlled, gradual reduction in blood pressure using IV agents, with close neurological monitoring",
        detail: "ClairMD does not select or dose antihypertensive agents — this is set and titrated by the clinician, since lowering blood pressure too quickly risks cerebral hypoperfusion.",
        next: [],
      },
    ],
    citations: [
      { title: "Hypertensive Encephalopathy", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK554499/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Hypertensive Emergency", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470371/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-pre-eclampsia-eclampsia",
    condition: "Pre-eclampsia and eclampsia",
    region: "ABDOMEN",
    synonyms: ["pre-eclampsia", "preeclampsia", "eclampsia", "pregnancy-induced hypertension with seizures"],
    status: "cited",
    redFlags: [
      "Seizures (eclampsia)",
      "Severe headache or visual disturbance",
      "Epigastric or right upper quadrant pain",
      "Reduced urine output",
      "Signs of HELLP syndrome — haemolysis, elevated liver enzymes, low platelets, named here for reference only",
    ],
    algorithm: [
      {
        id: "ch1",
        stage: "Confirm",
        title: "New hypertension after 20 weeks of pregnancy (or postpartum), usually with proteinuria or other features of organ involvement",
        detail: "A seizure in this setting, not explained by another cause, defines eclampsia.",
        next: ["ch2"],
      },
      {
        id: "ch2",
        stage: "Decision",
        title: "Magnesium sulfate for seizure prophylaxis or treatment, blood pressure control, and involvement of obstetric and anaesthetic teams without delay",
        detail: "ClairMD does not select or dose magnesium sulfate or antihypertensive agents — these are set by the clinician. Definitive treatment is delivery, timed against maternal and fetal status.",
        next: [],
      },
    ],
    citations: [
      { title: "Preeclampsia and Eclampsia", publisher: "Eunice Kennedy Shriver National Institute of Child Health and Human Development (NICHD), NIH, USA", url: "https://www.nichd.nih.gov/health/topics/preeclampsia", licence: "US Government work — public domain" },
      { title: "Preeclampsia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK570611/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 19: Seizure / status epilepticus ────────────────────────────────
  {
    id: "med-seizure-entry",
    condition: "Seizure (entry pathway)",
    region: "HEAD",
    synonyms: ["seizure", "fit", "convulsion", "first seizure", "seizure activity"],
    status: "cited",
    redFlags: [
      "Seizure lasting 5 minutes or longer, or repeated seizures without recovery in between",
      "Failure to regain consciousness after the seizure stops",
      "Fever with the seizure, especially in an adult or a child outside the typical febrile-seizure age range",
      "A focal neurological deficit after the seizure that does not resolve",
      "Head injury, pregnancy, or known malignancy",
    ],
    algorithm: [
      {
        id: "ci1",
        stage: "Presentation",
        title: "Seizure — establish whether it is ongoing, how long it has lasted, and whether consciousness has been regained between or after episodes",
        next: ["ci2"],
      },
      {
        id: "ci2",
        stage: "Differentiate",
        title: "Use duration and recovery to identify which pathway this is",
        branches: [
          { label: "Ongoing seizure activity 5 minutes or longer, or recurrent seizures without recovery between them", to: "med-status-epilepticus" },
          { label: "A single, brief, self-terminating seizure with a return to baseline", to: "med-first-unprovoked-seizure" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Epilepsy and Seizures", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/epilepsy-and-seizures", licence: "US Government work — public domain" },
      { title: "Seizure", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430765/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-status-epilepticus",
    condition: "Status epilepticus",
    region: "HEAD",
    synonyms: ["status epilepticus", "prolonged seizure", "continuous seizure"],
    status: "cited",
    redFlags: [
      "Ongoing convulsive activity beyond 5 minutes",
      "Hypoxia or airway compromise during the seizure",
      "Recurrent seizures without full recovery of consciousness between them",
      "Seizure activity continuing despite first- and second-line treatment (refractory status epilepticus)",
    ],
    algorithm: [
      {
        id: "cj1",
        stage: "Confirm",
        title: "A seizure lasting 5 minutes or more, or recurrent seizures without recovery of consciousness in between, defines status epilepticus and needs immediate treatment",
        detail: "Do not wait for a fixed time cut-off if activity is clearly ongoing and not self-terminating.",
        next: ["cj2"],
      },
      {
        id: "cj2",
        stage: "Decision",
        title: "Protect the airway, give oxygen, check glucose, and treat with a benzodiazepine first, escalating to a second-line anti-seizure medication if seizures continue",
        detail: "ClairMD does not select or dose anti-seizure medication — this is set by the clinician following a stepwise emergency protocol.",
        next: ["cj3"],
      },
      {
        id: "cj3",
        stage: "Note",
        title: "Seizures continuing despite first- and second-line treatment need urgent anaesthesia or intensive care involvement",
        next: [],
      },
    ],
    citations: [
      { title: "Status Epilepticus", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430686/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Epilepsy and Seizures", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/epilepsy-and-seizures", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-first-unprovoked-seizure",
    condition: "First unprovoked seizure",
    region: "HEAD",
    synonyms: ["first unprovoked seizure", "first seizure", "new onset seizure"],
    status: "cited",
    redFlags: [
      "Incomplete recovery of consciousness or a persistent focal deficit",
      "Fever or signs of infection",
      "Head injury preceding the seizure",
      "Pregnancy",
    ],
    algorithm: [
      {
        id: "ck1",
        stage: "Confirm",
        title: "A single seizure with no clear provoking cause (e.g. fever, hypoglycaemia, alcohol withdrawal, drug toxicity), after the episode has fully resolved",
        next: ["ck2"],
      },
      {
        id: "ck2",
        stage: "Decision",
        title: "Look for risk factors that predict recurrence — abnormal brain imaging, an abnormal EEG, or nocturnal seizures",
        detail: "These inform, but do not replace, an individualised discussion about starting anti-seizure medication. ClairMD does not select or dose anti-seizure medication — this decision is made by the clinician together with the patient.",
        next: ["ck3"],
      },
      {
        id: "ck3",
        stage: "Note",
        title: "A provoked seizure needs the underlying cause identified and treated, rather than anti-seizure medication",
        next: [],
      },
    ],
    citations: [
      { title: "Seizure", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430765/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Epilepsy and Seizures", publisher: "National Institute of Neurological Disorders and Stroke (NINDS), NIH, USA", url: "https://www.ninds.nih.gov/health-information/disorders/epilepsy-and-seizures", licence: "US Government work — public domain" },
    ],
  },

  // ── Adrenal crisis and febrile neutropenia (standalone additions) ──────────
  {
    id: "med-adrenal-crisis",
    condition: "Adrenal crisis (Addisonian crisis)",
    region: "ABDOMEN",
    synonyms: ["adrenal crisis", "addisonian crisis", "acute adrenal insufficiency", "adrenal insufficiency crisis"],
    status: "cited",
    redFlags: [
      "Hypotension or shock unresponsive to fluids",
      "Hypoglycaemia",
      "Hyperkalaemia with ECG changes",
      "Reduced consciousness",
      "Severe abdominal pain, vomiting or diarrhoea",
    ],
    algorithm: [
      {
        id: "cl1",
        stage: "Confirm",
        title: "Sudden deterioration in someone with known or unrecognised adrenal insufficiency, often triggered by infection, trauma, surgery or missed steroid doses",
        next: ["cl2"],
      },
      {
        id: "cl2",
        stage: "Decision",
        title: "Treat before biochemical confirmation if adrenal crisis is suspected — do not delay hydrocortisone while awaiting cortisol results",
        detail: "ClairMD does not select or dose hydrocortisone or IV fluids — these are set by the clinician. A random cortisol and ACTH sample is ideally taken before the first dose, but treatment should never be delayed for this.",
        next: ["cl3"],
      },
      {
        id: "cl3",
        stage: "Note",
        title: "Look for and treat the precipitant, and arrange same-day endocrinology input for ongoing steroid dosing and a sick-day plan",
        next: [],
      },
    ],
    citations: [
      { title: "Definition & Facts of Adrenal Insufficiency & Addison's Disease", publisher: "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), NIH, USA", url: "https://www.niddk.nih.gov/health-information/endocrine-diseases/adrenal-insufficiency-addisons-disease/definition-facts", licence: "US Government work — public domain" },
      { title: "Adrenal Crisis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK499968/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-febrile-neutropenia",
    condition: "Febrile neutropenia",
    region: "SYSTEMIC",
    synonyms: ["febrile neutropenia", "neutropenic fever", "neutropenic sepsis"],
    status: "cited",
    redFlags: [
      "Hypotension or signs of septic shock",
      "Reduced consciousness",
      "Severe mucositis or an obvious focus of infection",
      "Very low neutrophil count (profound neutropenia)",
    ],
    algorithm: [
      {
        id: "cm1",
        stage: "Confirm",
        title: "Fever in someone with chemotherapy-induced or other significant neutropenia is a medical emergency until proven otherwise, even without an obvious source of infection",
        next: ["cm2"],
      },
      {
        id: "cm2",
        stage: "Decision",
        title: "Empirical broad-spectrum antibiotics are given within one hour of recognition, after cultures are taken — do not wait for the neutrophil count or a source to be confirmed",
        detail: "ClairMD does not select or dose antibiotics — this is set by the clinician per local protocol. A risk-stratification tool such as the MASCC score may be used by the clinician to help guide the safety of outpatient management in stable patients; ClairMD does not calculate this score.",
        next: ["cm3"],
      },
      {
        id: "cm3",
        stage: "Note",
        title: "Reassess closely — clinical deterioration in neutropenic sepsis can be rapid and may lack the usual signs of infection",
        next: [],
      },
    ],
    citations: [
      { title: "Febrile Neutropenia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK541102/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Infection and Neutropenia During Cancer Treatment", publisher: "National Cancer Institute (NCI), NIH, USA", url: "https://www.cancer.gov/about-cancer/treatment/side-effects/infection", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 21: Severe electrolyte emergency ────────────────────────────────
  {
    id: "med-electrolyte-emergency-entry",
    condition: "Severe electrolyte emergency (entry pathway)",
    region: "ABDOMEN",
    synonyms: ["electrolyte emergency", "severe electrolyte disturbance", "electrolyte imbalance"],
    status: "cited",
    redFlags: [
      "Cardiac arrhythmia or significant ECG changes",
      "Reduced consciousness or seizures",
      "Severe muscle weakness or paralysis",
      "Cardiac arrest risk",
    ],
    algorithm: [
      {
        id: "cn1",
        stage: "Presentation",
        title: "Nonspecific weakness, confusion, cardiac or neuromuscular symptoms — a blood test showing a significantly abnormal electrolyte is what confirms the cause",
        next: ["cn2"],
      },
      {
        id: "cn2",
        stage: "Differentiate",
        title: "Use the abnormal result to identify which electrolyte emergency this is",
        branches: [
          { label: "High serum potassium, especially with ECG changes", to: "med-hyperkalaemia" },
          { label: "Low serum sodium with confusion, seizures or reduced consciousness", to: "med-severe-hyponatraemia" },
          { label: "High serum calcium with confusion, abdominal pain, constipation or polyuria", to: "med-severe-hypercalcaemia" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "High Potassium Level", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/001179.htm", licence: "US Government work — public domain" },
      { title: "Low Blood Sodium", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000394.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-hyperkalaemia",
    condition: "Hyperkalaemia",
    region: "ABDOMEN",
    synonyms: ["hyperkalaemia", "hyperkalemia", "high potassium"],
    status: "cited",
    redFlags: [
      "ECG changes — peaked T waves, widened QRS, or a sine-wave pattern",
      "Very high serum potassium",
      "Cardiac arrhythmia or arrest",
      "Severe muscle weakness or paralysis",
    ],
    algorithm: [
      {
        id: "co1",
        stage: "Confirm",
        title: "A raised serum potassium, cross-checked against the ECG for signs of cardiac toxicity",
        detail: "A haemolysed sample can falsely raise the result — repeat testing if the result is unexpected and the patient is well.",
        next: ["co2"],
      },
      {
        id: "co2",
        stage: "Decision",
        title: "Any ECG change or a very high level needs immediate cardiac membrane stabilisation, followed by measures that shift potassium into cells and then remove it from the body",
        detail: "ClairMD does not select or dose calcium, insulin/dextrose, or other potassium-lowering treatments — these are set by the clinician. Identify and stop any contributing medication or cause.",
        next: ["co3"],
      },
      {
        id: "co3",
        stage: "Note",
        title: "Continuous cardiac monitoring and repeat potassium levels are needed until the level and ECG have normalised",
        next: [],
      },
    ],
    citations: [
      { title: "High Potassium Level", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/001179.htm", licence: "US Government work — public domain" },
      { title: "Hyperkalemia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470284/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-severe-hyponatraemia",
    condition: "Severe hyponatraemia",
    region: "ABDOMEN",
    synonyms: ["severe hyponatraemia", "severe hyponatremia", "low sodium"],
    status: "cited",
    redFlags: [
      "Seizures",
      "Reduced consciousness or coma",
      "Very low or rapidly falling serum sodium",
      "Respiratory arrest",
    ],
    algorithm: [
      {
        id: "cp1",
        stage: "Confirm",
        title: "A low serum sodium, assessed alongside volume status, serum and urine osmolality, and symptom severity",
        detail: "Severity of symptoms — not the sodium number alone — determines urgency of correction.",
        next: ["cp2"],
      },
      {
        id: "cp2",
        stage: "Decision",
        title: "Severe symptoms need urgent, carefully controlled correction; asymptomatic or chronic hyponatraemia is corrected more cautiously",
        detail: "ClairMD does not select or dose hypertonic saline or fluid restriction — these are set and closely monitored by the clinician. Correcting sodium too quickly risks osmotic demyelination syndrome.",
        next: ["cp3"],
      },
      {
        id: "cp3",
        stage: "Note",
        title: "Identify the underlying cause (e.g. SIADH, diuretics, adrenal or thyroid disease, heart/liver/kidney failure) to guide ongoing management",
        next: [],
      },
    ],
    citations: [
      { title: "Low Blood Sodium", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000394.htm", licence: "US Government work — public domain" },
      { title: "Hyponatremia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470386/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-severe-hypercalcaemia",
    condition: "Severe hypercalcaemia",
    region: "ABDOMEN",
    synonyms: ["severe hypercalcaemia", "severe hypercalcemia", "high calcium"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Very high serum calcium",
      "Marked dehydration or acute kidney injury",
      "Cardiac arrhythmia or a shortened QT interval",
    ],
    algorithm: [
      {
        id: "cq1",
        stage: "Confirm",
        title: "A raised corrected serum calcium — malignancy and primary hyperparathyroidism together account for most cases",
        next: ["cq2"],
      },
      {
        id: "cq2",
        stage: "Decision",
        title: "IV fluid rehydration first, followed by a bone-resorption-inhibiting agent for levels that remain significantly raised",
        detail: "ClairMD does not select or dose IV fluids or bisphosphonates — these are set by the clinician. Identify and treat the underlying cause once the patient is stabilised.",
        next: ["cq3"],
      },
      {
        id: "cq3",
        stage: "Note",
        title: "Stop any contributing medication or supplement (e.g. calcium, vitamin D, thiazide diuretics, lithium)",
        next: [],
      },
    ],
    citations: [
      { title: "High Blood Calcium", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/000365.htm", licence: "US Government work — public domain" },
      { title: "Hypercalcemia", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK430714/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 22: Drug-induced hyperthermia and rigidity ──────────────────────
  {
    id: "med-drug-induced-hyperthermia-entry",
    condition: "Drug-induced hyperthermia and rigidity (entry pathway)",
    region: "NEURO",
    synonyms: ["drug-induced hyperthermia", "drug-induced rigidity", "serotonin toxicity", "neuroleptic malignant syndrome"],
    status: "cited",
    redFlags: [
      "Temperature above 38.5°C in this setting",
      "Muscle rigidity",
      "Autonomic instability — labile blood pressure, tachycardia, sweating",
      "Rhabdomyolysis",
      "Reduced consciousness or seizures",
    ],
    algorithm: [
      {
        id: "cr1",
        stage: "Presentation",
        title: "Fever, altered mental status and muscle abnormalities after starting, stopping or changing a psychiatric or serotonergic medication",
        detail: "The specific drug history and time course are what separate these syndromes from each other and from other causes.",
        next: ["cr2"],
      },
      {
        id: "cr2",
        stage: "Differentiate",
        title: "Use the causative drug class, examination findings and time course to identify which syndrome this is",
        branches: [
          { label: "Recent serotonergic drug (SSRI/SNRI, triptan, tramadol, MAOI) — hyperreflexia and clonus, more marked in the legs, rapid onset over hours", to: "med-serotonin-syndrome" },
          { label: "Recent antipsychotic, or abrupt withdrawal of a dopaminergic drug — severe 'lead-pipe' rigidity, slower onset over 1-3 days", to: "med-neuroleptic-malignant-syndrome" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Serotonin Syndrome", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/007272.htm", licence: "US Government work — public domain" },
      { title: "Neuroleptic Malignant Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482282/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-serotonin-syndrome",
    condition: "Serotonin syndrome",
    region: "NEURO",
    synonyms: ["serotonin syndrome", "serotonin toxicity"],
    status: "cited",
    redFlags: [
      "Hyperthermia above 41°C",
      "Marked autonomic instability",
      "Seizures",
      "Rhabdomyolysis with acute kidney injury",
    ],
    algorithm: [
      {
        id: "cs1",
        stage: "Confirm",
        title: "Diagnosis is clinical — a history of a serotonergic drug together with hyperreflexia, clonus (most marked in the lower limbs), agitation, diaphoresis and tachycardia",
        next: ["cs2"],
      },
      {
        id: "cs2",
        stage: "Decision",
        title: "Stop the causative drug(s), give supportive care and benzodiazepines for agitation",
        detail: "A specific serotonin antagonist may be used in more severe cases. ClairMD does not select or dose medication — this is set by the clinician. Most cases resolve within 24 hours of stopping the causative drug.",
        next: [],
      },
    ],
    citations: [
      { title: "Serotonin Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482377/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Serotonin Syndrome", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/007272.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-neuroleptic-malignant-syndrome",
    condition: "Neuroleptic malignant syndrome (NMS)",
    region: "NEURO",
    synonyms: ["neuroleptic malignant syndrome", "nms"],
    status: "cited",
    redFlags: [
      "Hyperthermia",
      "Severe generalised rigidity",
      "Autonomic instability",
      "Reduced consciousness",
      "Rhabdomyolysis with acute kidney injury",
    ],
    algorithm: [
      {
        id: "ct1",
        stage: "Confirm",
        title: "Diagnosis is clinical — a history of a dopamine-blocking drug (or abrupt withdrawal of a dopaminergic drug) together with fever, severe rigidity, autonomic instability and altered mental status, usually developing over 1-3 days",
        next: ["ct2"],
      },
      {
        id: "ct2",
        stage: "Decision",
        title: "Stop the causative drug immediately, provide aggressive supportive care and active cooling",
        detail: "Specific pharmacological treatment (e.g. a dopamine agonist or a muscle relaxant) may be used in severe cases. ClairMD does not select or dose medication — this is set by the clinician.",
        next: [],
      },
    ],
    citations: [
      { title: "Neuroleptic Malignant Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482282/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Serotonin Syndrome", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482377/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },

  // ── Cluster 23: Severe cutaneous adverse drug reaction ──────────────────────
  {
    id: "med-severe-drug-reaction-entry",
    condition: "Severe cutaneous adverse drug reaction (entry pathway)",
    region: "SURFACE",
    synonyms: ["severe drug reaction", "severe cutaneous adverse reaction", "drug-induced skin reaction"],
    status: "cited",
    redFlags: [
      "Skin pain out of proportion to visible changes",
      "Mucosal involvement (eyes, mouth, genitals)",
      "Skin blistering, detachment, or a positive Nikolsky sign",
      "Fever with facial swelling and lymphadenopathy",
      "A rapidly progressive rash",
    ],
    algorithm: [
      {
        id: "cu1",
        stage: "Presentation",
        title: "A widespread new skin eruption, typically 1-6 weeks after starting a new medication",
        detail: "The specific pattern, mucosal involvement and systemic features are what separate these reactions from each other and from milder drug rashes.",
        next: ["cu2"],
      },
      {
        id: "cu2",
        stage: "Differentiate",
        title: "Use the pattern of skin, mucosal and systemic involvement to identify which reaction this is",
        branches: [
          { label: "Skin pain, mucosal erosions, blistering and skin detachment (positive Nikolsky sign)", to: "med-sjs-ten" },
          { label: "Facial oedema, widespread rash with fever, lymphadenopathy and organ involvement, onset 2-6 weeks after the drug", to: "med-dress-syndrome" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Stevens-Johnson syndrome/toxic epidermal necrolysis", publisher: "MedlinePlus Genetics, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/genetics/condition/stevens-johnson-syndrome-toxic-epidermal-necrolysis/", licence: "US Government work — public domain" },
      { title: "Cutaneous Adverse Drug Reaction", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK533000/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-sjs-ten",
    condition: "Stevens-Johnson syndrome / toxic epidermal necrolysis (SJS/TEN)",
    region: "SURFACE",
    synonyms: ["stevens-johnson syndrome", "toxic epidermal necrolysis", "sjs", "ten", "sjs/ten"],
    status: "cited",
    redFlags: [
      "Skin detachment involving a large body surface area",
      "Mucosal involvement — ocular, oral or genital",
      "Sepsis or multi-organ failure",
      "A positive Nikolsky sign",
    ],
    algorithm: [
      {
        id: "cv1",
        stage: "Confirm",
        title: "A drug-induced reaction (implicated in over 80% of cases) with skin pain, a spreading erythematous or purpuric rash, mucosal erosions, and blistering with skin detachment",
        detail: "The extent of detachment defines SJS (under 10% of body surface area), SJS/TEN overlap (10-30%), and TEN (over 30%).",
        next: ["cv2"],
      },
      {
        id: "cv2",
        stage: "Decision",
        title: "Stop the causative drug immediately and manage in a burns unit or intensive care setting, with early ophthalmology and dermatology involvement",
        detail: "ClairMD does not select or dose immunomodulatory or supportive therapies — these are set by the specialist team. Fluid and temperature management follow a burns-style approach given the extent of skin loss.",
        next: ["cv3"],
      },
      {
        id: "cv3",
        stage: "Note",
        title: "Mortality and long-term morbidity, especially ocular, are significant — early recognition and same-day escalation are essential",
        next: [],
      },
    ],
    citations: [
      { title: "Stevens-Johnson Syndrome and Toxic Epidermal Necrolysis", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK459323/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Stevens-Johnson syndrome/toxic epidermal necrolysis", publisher: "MedlinePlus Genetics, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/genetics/condition/stevens-johnson-syndrome-toxic-epidermal-necrolysis/", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-dress-syndrome",
    condition: "DRESS syndrome (drug reaction with eosinophilia and systemic symptoms)",
    region: "SURFACE",
    synonyms: ["dress syndrome", "drug reaction with eosinophilia and systemic symptoms", "drug-induced hypersensitivity syndrome"],
    status: "cited",
    redFlags: [
      "Facial or periorbital oedema",
      "High fever",
      "Widespread lymphadenopathy",
      "Signs of organ involvement — jaundice, breathlessness, or reduced urine output",
    ],
    algorithm: [
      {
        id: "cw1",
        stage: "Confirm",
        title: "A late-onset reaction, typically 2-6 weeks after starting the causative drug, with a widespread rash, fever, facial oedema, lymphadenopathy and eosinophilia",
        detail: "Look specifically for liver, kidney, lung and cardiac involvement.",
        next: ["cw2"],
      },
      {
        id: "cw2",
        stage: "Decision",
        title: "Stop the causative drug immediately — corticosteroids are the mainstay of treatment for significant organ involvement",
        detail: "ClairMD does not select or dose corticosteroids or other immunomodulatory therapy — this is set by the clinician. Relapse can occur even after stopping the drug and starting treatment, so ongoing monitoring is needed.",
        next: [],
      },
    ],
    citations: [
      { title: "Cutaneous Adverse Drug Reaction", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK533000/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Stevens-Johnson syndrome/toxic epidermal necrolysis", publisher: "MedlinePlus Genetics, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/genetics/condition/stevens-johnson-syndrome-toxic-epidermal-necrolysis/", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 24: Angioedema without anaphylaxis ──────────────────────────────
  {
    id: "med-angioedema-entry",
    condition: "Angioedema without anaphylaxis (entry pathway)",
    region: "NECK",
    synonyms: ["angioedema", "facial swelling", "lip swelling", "tongue swelling"],
    status: "cited",
    redFlags: [
      "Stridor, voice change or difficulty breathing — same-day airway assessment regardless of the cause",
      "Rapidly progressive swelling",
      "Tongue or floor-of-mouth involvement",
      "Any associated urticaria, hypotension or wheeze — reassess for anaphylaxis instead",
    ],
    algorithm: [
      {
        id: "cx1",
        stage: "Presentation",
        title: "Swelling of the face, lips, tongue or upper airway without urticaria, itch or a clear allergen exposure",
        detail: "This pattern points away from an IgE-mediated (anaphylactic) cause and towards a bradykinin-mediated one, which does not respond to adrenaline.",
        branches: [{ label: "Urticaria, itch, hypotension or wheeze also present", to: "med-anaphylaxis" }],
        next: ["cx2"],
      },
      {
        id: "cx2",
        stage: "Differentiate",
        title: "Use drug history and pattern of episodes to identify the likely cause",
        branches: [
          { label: "Taking an ACE inhibitor (or, less often, an ARB), first episode", to: "med-ace-inhibitor-angioedema" },
          { label: "Recurrent episodes, often with a family history, abdominal attacks, or no response to antihistamines/adrenaline", to: "med-hereditary-angioedema" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Angioedema", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK538489/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Hereditary angioedema", publisher: "MedlinePlus Genetics, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/genetics/condition/hereditary-angioedema/", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-ace-inhibitor-angioedema",
    condition: "ACE inhibitor-induced angioedema",
    region: "NECK",
    synonyms: ["ace inhibitor angioedema", "ace-inhibitor angioedema", "drug-induced angioedema"],
    status: "cited",
    redFlags: [
      "Stridor or voice change",
      "Tongue or floor-of-mouth swelling",
      "Rapidly progressive swelling",
    ],
    algorithm: [
      {
        id: "cy1",
        stage: "Confirm",
        title: "Asymmetric swelling of the face, lips, tongue or upper airway, without urticaria or itch, in someone taking an ACE inhibitor",
        detail: "Can occur at any point during treatment, though most often in the first few months.",
        next: ["cy2"],
      },
      {
        id: "cy2",
        stage: "Decision",
        title: "Stop the ACE inhibitor immediately and permanently — do not switch to another ACE inhibitor, and use caution with ARBs given some cross-reactivity",
        detail: "ClairMD does not select or dose airway or supportive treatment — this is set by the clinician. Antihistamines, corticosteroids and adrenaline are typically ineffective, since this is a bradykinin-mediated (not histamine-mediated) reaction.",
        next: [],
      },
    ],
    citations: [
      { title: "Angioedema", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK538489/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Angiotensin-Converting Enzyme Inhibitors (ACEI)", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK431051/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-hereditary-angioedema",
    condition: "Hereditary angioedema",
    region: "NECK",
    synonyms: ["hereditary angioedema", "hae", "c1 esterase inhibitor deficiency"],
    status: "cited",
    redFlags: [
      "Stridor or voice change",
      "Tongue or floor-of-mouth swelling",
      "Severe abdominal pain during an attack",
      "Laryngeal involvement in a previous attack",
    ],
    algorithm: [
      {
        id: "cz1",
        stage: "Confirm",
        title: "Recurrent, self-limiting episodes of swelling (face, limbs, genitals, gut or airway) without urticaria or itch, often with a family history",
        detail: "A reduced C1 esterase inhibitor level or function, with low C4, supports the diagnosis — but attacks are treated on clinical grounds without waiting for results. No response to antihistamines or adrenaline is typical.",
        next: ["cz2"],
      },
      {
        id: "cz2",
        stage: "Decision",
        title: "Specific on-demand treatment is given as early as possible in an attack, especially with any airway or severe abdominal involvement",
        detail: "ClairMD does not select or dose C1 esterase inhibitor concentrate, bradykinin receptor antagonists, kallikrein inhibitors or other agents — this is set by the clinician per the patient's individualised emergency plan. Long-term prophylaxis is arranged by an allergy/immunology specialist.",
        next: [],
      },
    ],
    citations: [
      { title: "Hereditary Angioedema", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK482266/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Hereditary angioedema", publisher: "MedlinePlus Genetics, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/genetics/condition/hereditary-angioedema/", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 25: Acute poisoning ──────────────────────────────────────────────
  {
    id: "med-acute-poisoning-entry",
    condition: "Acute poisoning (entry pathway)",
    region: "SYSTEMIC",
    synonyms: ["acute poisoning", "suspected poisoning", "overdose", "ingestion of poison"],
    status: "cited",
    redFlags: [
      "Reduced consciousness or coma",
      "Seizures",
      "Respiratory depression or airway compromise",
      "Cardiovascular instability — arrhythmia or hypotension",
      "Excessive secretions, sweating, or pinpoint pupils",
    ],
    algorithm: [
      {
        id: "da1",
        stage: "Presentation",
        title: "Known or suspected poisoning or overdose — establish exactly what was taken (or exposed to), how much, when, and by what route, wherever possible",
        next: ["da2"],
      },
      {
        id: "da2",
        stage: "Stabilise first",
        title: "Airway, breathing and circulation take priority over identifying the specific poison",
        detail: "Treat the clinical toxidrome and instability first — do not wait for identification of the exact substance before starting supportive care.",
        next: ["da3"],
      },
      {
        id: "da3",
        stage: "Differentiate",
        title: "Use the exposure history and clinical picture to identify which pathway this is",
        branches: [
          { label: "Excessive salivation, sweating, lacrimation, urination, pinpoint pupils, muscle fasciculation — pesticide/insecticide exposure", to: "med-organophosphate-poisoning" },
          { label: "Deliberate or accidental ingestion of a paracetamol (acetaminophen)-containing product", to: "med-paracetamol-overdose" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Insecticide Poisoning", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/002832.htm", licence: "US Government work — public domain" },
      { title: "Acetaminophen Overdose", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/002598.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-organophosphate-poisoning",
    condition: "Organophosphate poisoning",
    region: "SYSTEMIC",
    synonyms: ["organophosphate poisoning", "organophosphorus poisoning", "pesticide poisoning", "insecticide poisoning"],
    status: "cited",
    redFlags: [
      "Respiratory failure from bronchorrhoea, bronchospasm or muscle weakness",
      "Seizures",
      "Reduced consciousness",
      "Cardiac arrhythmia",
    ],
    algorithm: [
      {
        id: "db1",
        stage: "Confirm",
        title: "A cholinergic toxidrome — excess salivation, lacrimation, urination, diarrhoea, GI upset and emesis, plus miosis, bradycardia, bronchorrhoea and muscle fasciculation — after exposure to an organophosphate pesticide",
        detail: "Onset is usually within minutes to hours of exposure.",
        next: ["db2"],
      },
      {
        id: "db2",
        stage: "Decision",
        title: "Decontaminate (remove contaminated clothing, wash skin), secure the airway, and give atropine, titrated to drying of secretions, alongside an oxime if available",
        detail: "ClairMD does not select or dose atropine, oximes or other antidotes — these are set by the clinician per local protocol and toxicology advice. Very large atropine doses may be needed.",
        next: ["db3"],
      },
      {
        id: "db3",
        stage: "Note",
        title: "Staff should wear appropriate personal protective equipment to avoid secondary contamination from the patient's clothing or skin",
        next: [],
      },
    ],
    citations: [
      { title: "Organophosphate Toxicity", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK470430/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Insecticide Poisoning", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/002832.htm", licence: "US Government work — public domain" },
    ],
  },
  {
    id: "med-paracetamol-overdose",
    condition: "Paracetamol (acetaminophen) overdose",
    region: "SYSTEMIC",
    synonyms: ["paracetamol overdose", "acetaminophen overdose", "acetaminophen toxicity", "paracetamol poisoning"],
    status: "cited",
    redFlags: [
      "Presentation more than 24 hours after a large ingestion",
      "Signs of liver failure — jaundice, encephalopathy, or coagulopathy",
      "A very high reported or estimated dose",
      "A staggered or unclear ingestion history",
    ],
    algorithm: [
      {
        id: "dc1",
        stage: "Confirm",
        title: "Ask the exact amount taken, the time of ingestion, and whether it was a single or staggered dose",
        detail: "A paracetamol level, taken at the appropriate time after ingestion, is plotted against a treatment nomogram to guide the need for treatment. ClairMD does not calculate or apply the treatment nomogram — this is done by the clinician.",
        next: ["dc2"],
      },
      {
        id: "dc2",
        stage: "Decision",
        title: "N-acetylcysteine is highly effective when started within 8 hours of a significant single ingestion",
        detail: "It is still given later, or empirically for staggered/unclear ingestions, though it becomes less effective with delay. ClairMD does not select or dose N-acetylcysteine — this is set by the clinician.",
        next: ["dc3"],
      },
      {
        id: "dc3",
        stage: "Note",
        title: "Involve a liver unit or poisons information service early for a large ingestion, a staggered overdose, or any evidence of liver injury",
        next: [],
      },
    ],
    citations: [
      { title: "Acetaminophen Toxicity", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK441917/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Acetaminophen Overdose", publisher: "MedlinePlus, National Library of Medicine, NIH, USA", url: "https://medlineplus.gov/ency/article/002598.htm", licence: "US Government work — public domain" },
    ],
  },

  // ── Cluster 26: Snake bite / envenomation ───────────────────────────────────
  {
    id: "med-snake-bite-entry",
    condition: "Snake bite (entry pathway)",
    region: "LIMB",
    synonyms: ["snake bite", "snakebite", "suspected envenomation", "venomous snake bite"],
    status: "cited",
    redFlags: [
      "Rapidly spreading swelling or tissue necrosis at the bite site",
      "Spontaneous systemic bleeding or non-clotting blood",
      "Neurological signs — ptosis, diplopia, dysphagia, weakness, or respiratory difficulty",
      "Hypotension or shock",
      "Reduced urine output",
    ],
    algorithm: [
      {
        id: "dd1",
        stage: "Presentation",
        title: "A bite from a snake, confirmed or suspected — note the time of the bite, any description of the snake, and the affected limb",
        detail: "Many bites, even from a venomous species, do not result in significant envenomation ('dry bites') — clinical and laboratory monitoring over time is what distinguishes envenomation from a bite alone.",
        next: ["dd2"],
      },
      {
        id: "dd2",
        stage: "First aid",
        title: "Immobilise the bitten limb at or below heart level and keep the patient calm and still",
        detail: "A pressure-immobilisation bandage may be used for neurotoxic-type bites per local protocol. Do not cut, suck, apply ice, apply a tourniquet, or attempt to catch or kill the snake for identification — these traditional first-aid measures do not help and can cause harm.",
        next: ["dd3"],
      },
      {
        id: "dd3",
        stage: "Differentiate",
        title: "Use the pattern of local and systemic findings to identify the type of envenomation",
        branches: [
          { label: "Local swelling, pain, bruising or blistering, with bleeding or clotting abnormalities", to: "med-haemotoxic-envenomation" },
          { label: "Ptosis, diplopia, dysphagia, or progressive weakness, with minimal local swelling", to: "med-neurotoxic-envenomation" },
        ],
        next: [],
      },
    ],
    citations: [
      { title: "Venomous Snakes at Work", publisher: "National Institute for Occupational Safety and Health (NIOSH), CDC, USA", url: "https://www.cdc.gov/niosh/outdoor-workers/about/venomous-snakes.html", licence: "US Government work — public domain" },
      { title: "Evaluation and Treatment of Snake Envenomations", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK553151/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-haemotoxic-envenomation",
    condition: "Haemotoxic (coagulopathic) snake envenomation",
    region: "LIMB",
    synonyms: ["haemotoxic envenomation", "coagulopathic snake bite", "viper bite", "viperid envenomation"],
    status: "cited",
    redFlags: [
      "Spontaneous systemic bleeding (gums, venepuncture sites, haematuria)",
      "Non-clotting blood on a bedside whole blood clotting test",
      "Rapidly progressive local swelling or necrosis",
      "Hypotension or shock",
      "Acute kidney injury",
    ],
    algorithm: [
      {
        id: "de1",
        stage: "Confirm",
        title: "Local swelling, pain and bruising at the bite site, progressing to systemic bleeding and a coagulopathy",
        detail: "A bedside 20-minute whole blood clotting test is a simple way to detect venom-induced coagulopathy where laboratory coagulation studies are not immediately available.",
        next: ["de2"],
      },
      {
        id: "de2",
        stage: "Decision",
        title: "Antivenom is the definitive treatment, given based on clinical and/or laboratory evidence of envenomation, not on the appearance of the bite alone",
        detail: "ClairMD does not select the antivenom product or dose, or decide when to give it — these are set by the clinician per local antivenom protocol and species. Have treatment for anaphylaxis ready, since antivenom reactions can occur.",
        next: ["de3"],
      },
      {
        id: "de3",
        stage: "Note",
        title: "Monitor closely for acute kidney injury and recheck clotting status regularly, since coagulopathy can recur after initial antivenom treatment",
        next: [],
      },
    ],
    citations: [
      { title: "Evaluation and Treatment of Snake Envenomations", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK553151/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Snake Toxicity", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK557565/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
    ],
  },
  {
    id: "med-neurotoxic-envenomation",
    condition: "Neurotoxic snake envenomation",
    region: "LIMB",
    synonyms: ["neurotoxic envenomation", "neurotoxic snake bite", "elapid envenomation", "cobra bite", "krait bite"],
    status: "cited",
    redFlags: [
      "Ptosis or diplopia progressing to bulbar or respiratory muscle weakness",
      "Respiratory failure",
      "Descending paralysis",
    ],
    algorithm: [
      {
        id: "df1",
        stage: "Confirm",
        title: "Progressive neurological signs — ptosis, diplopia, dysarthria, dysphagia and descending weakness — typically with less prominent local swelling than a coagulopathic bite",
        detail: "Neurotoxic effects can develop or progress over several hours, so a patient with a normal early neurological exam still needs a period of monitoring.",
        next: ["df2"],
      },
      {
        id: "df2",
        stage: "Decision",
        title: "Antivenom is the definitive treatment; airway and ventilatory support are provided proactively as weakness progresses",
        detail: "ClairMD does not select the antivenom product or dose, or decide when to intubate — these are set by the clinician. Anticholinesterase agents may help in some neurotoxic envenomations, per local protocol.",
        next: ["df3"],
      },
      {
        id: "df3",
        stage: "Note",
        title: "Respiratory failure from progressive paralysis, not the bite itself, is the usual cause of death — proactive airway monitoring is essential",
        next: [],
      },
    ],
    citations: [
      { title: "Evaluation and Treatment of Snake Envenomations", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK553151/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
      { title: "Snake Toxicity", publisher: "StatPearls, NCBI Bookshelf (NLM/NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK557565/", licence: "CC BY-NC-ND 4.0 — link/cite only, do not copy text into product" },
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
