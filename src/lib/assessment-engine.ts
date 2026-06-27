import { MATCHING_CATALOG } from '@/lib/matcher/catalog';
import { buildPersonEvidence } from '@/lib/matcher/quiz-to-vector';
import { scoreEvidence } from '@/lib/matcher/scorer';
import type { ConfidenceBand, EligibilityStatus, ObjectiveEvidence } from '@/lib/matcher/types';
import { ROLE_CANDIDATES } from '@/lib/role-candidates';

// ─── Assessment Engine v4 ────────────────────────────────────────────────────
// 2-phase adaptive assessment: 5 routing questions → cluster → 4 evidence questions + 1 finalist question
// One global six-dimension geometry makes role scores comparable.
// Explicit readiness states keep contradictory roles out of the visible top three when alternatives exist.
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = 'en' | 'hi';

export type RoleId =
  | 'customer-support'
  | 'sales-support'
  | 'academic-counsellor'
  | 'hr-coordinator'
  | 'data-entry-mis'
  | 'back-office-operations'
  | 'operations-analyst'
  | 'accounting-finance-assistant'
  | 'digital-marketing-executive'
  | 'content-writer'
  | 'legal-compliance-operations'
  | 'non-voice-support-associate'
  | 'field-sales-executive'
  | 'retail-sales-associate'
  | 'retail-cashier'
  | 'retail-store-operations-assistant'
  | 'banking-sales-executive'
  | 'credit-processing-associate'
  | 'insurance-sales-associate'
  | 'microfinance-executive'
  | 'gst-assistant'
  | 'recruitment-executive'
  | 'payroll-employee-data-assistant'
  | 'logistics-operations-coordinator'
  | 'courier-operations-executive'
  | 'warehouse-associate'
  | 'supply-chain-executive'
  | 'it-helpdesk-associate'
  | 'software-testing-assistant'
  | 'web-development-associate'
  | 'digital-cataloguer'
  | 'merchant-relationship-executive'
  | 'junior-graphic-designer'
  | 'digital-content-developer'
  | 'junior-video-editor'
  | 'hotel-front-office-associate'
  | 'food-beverage-service-associate'
  | 'housekeeping-associate'
  | 'kitchen-trainee'
  | 'preschool-daycare-facilitator'
  | 'ev-service-technician';

export type ClusterId = 'people-facing' | 'desk-ops' | 'analytical' | 'creative';

export interface LocalizedText {
  en: string;
  hi: string;
}

export interface AssessmentProfile {
  fullName?: string;
  city?: string;
  degreeName?: string;
  educationStream?: string;
  speakingConfidence?: string;
  numbersConfidence?: string;
  dataConfidence?: string;
  objectiveEvidence?: ObjectiveEvidence;
  locale: Locale;
}

export interface RoleDefinition {
  id: RoleId;
  name: LocalizedText;
  shortLabel: LocalizedText;
  summary: LocalizedText;
  whyItFits: LocalizedText;
  salaryRange: LocalizedText;
  starterTasks: LocalizedText[];
  strengths: LocalizedText[];
  accent: string;
  // 6-dimension vector: [numerical, people-reactive, people-proactive, process-ops, creative-output, analytical-output]
  vector: number[];
}

export interface AssessmentOption {
  id: string;
  label: LocalizedText;
  signal: LocalizedText;
  // 6-dimension vector used for dimensionSnapshot and signal alignment
  vector: number[];
  profilePatch?: Partial<AssessmentProfile>;
  objectiveEvidencePatch?: ObjectiveEvidence;
  // Phase 1 only: direct cluster score contributions
  clusterScores?: Partial<Record<ClusterId, number>>;
  // Phase 2 only: role score contributions within the winning cluster
  roleScores?: Partial<Record<RoleId, number>>;
}

export interface AssessmentQuestion {
  id: string;
  section: LocalizedText;
  prompt: LocalizedText;
  helper: LocalizedText;
  options: AssessmentOption[];
}

export interface RoleMatch {
  roleId: RoleId;
  role: RoleDefinition;
  score: number;
  rationale: LocalizedText;
  supportingSignals: LocalizedText[];
  strengthLabel: LocalizedText;
  eligibility: EligibilityStatus;
  eligibilityReasons: string[];
  preferenceScore: number;
  demonstratedAbilityScore: number | null;
}

export interface AssessmentResult {
  profile: AssessmentProfile;
  cluster: ClusterId;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  confidenceReasons: string[];
  clusterMargin: number;
  scoringVersion: string;
  catalogVersion: string;
  topRoles: RoleMatch[];
  allScores: Record<RoleId, number>;
  summary: LocalizedText;
  warning: LocalizedText | null;
  dimensionSnapshot: Record<
    'numerical' | 'people-reactive' | 'people-proactive' | 'process-ops' | 'creative-output' | 'analytical-output',
    number
  >;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const DIMENSION_COUNT = 6;
// Index map: numerical=0, people-reactive=1, people-proactive=2, process-ops=3, creative-output=4, analytical-output=5

const HINDI_TERM_REPLACEMENTS = [
  ['first-generation job seekers', 'पहली बार नौकरी खोजने वाले'],
  ['entry-level white-collar job seekers', 'शुरुआती कार्यालयी नौकरी खोजने वाले'],
  ['healthcare coordination', 'स्वास्थ्य सेवा समन्वय'],
  ['process improvement', 'प्रक्रिया सुधार'],
  ['project coordination', 'परियोजना समन्वय'],
  ['customer questions', 'ग्राहकों के प्रश्नों'],
  ['customer support', 'ग्राहक सहायता'],
  ['student support', 'विद्यार्थी सहायता'],
  ['patient-facing', 'रोगियों से संवाद में'],
  ['role-specific', 'भूमिका के अनुसार'],
  ['direct-choice questions', 'सीधे विकल्प वाले प्रश्न'],
  ['problem-solving', 'समस्या समाधान'],
  ['follow-up dates', 'अगले संपर्क की तिथियाँ'],
  ['follow-up summaries', 'अगले संपर्क के सार'],
  ['follow-through', 'काम पूरा करने की निरंतरता'],
  ['work samples', 'काम के नमूने'],
  ['project examples', 'परियोजना के उदाहरण'],
  ['sample report', 'नमूना रिपोर्ट'],
  ['sample campaign idea', 'नमूना प्रचार विचार'],
  ['role-play', 'भूमिका अभ्यास'],
  ['screening questions', 'प्रारंभिक जाँच के प्रश्न'],
  ['interview schedules', 'साक्षात्कार समय-सारणी'],
  ['event-management examples', 'आयोजन प्रबंधन के उदाहरण'],
  ['process bottleneck', 'प्रक्रिया की रुकावट'],
  ['raw data', 'असंशोधित आँकड़ों'],
  ['financial records', 'वित्तीय अभिलेख'],
  ['medical documentation', 'चिकित्सकीय दस्तावेज़'],
  ['legal/compliance coursework', 'कानून और अनुपालन की पढ़ाई'],
  ['long-term ambition', 'दीर्घकालीन लक्ष्य'],
  ['reporting tools', 'प्रतिवेदन उपकरण'],
  ['writing portfolio', 'लेखन संग्रह'],
  ['social caption', 'सामाजिक माध्यम का संक्षिप्त लेख'],
  ['plain language', 'सरल भाषा'],
  ['growth ideas', 'विकास के विचार'],
  ['campaign thinking', 'प्रचार की सोच'],
  ['audience growth', 'दर्शक वृद्धि'],
  ['content quality', 'सामग्री की गुणवत्ता'],
  ['conversion rate', 'परिणाम में बदलने की दर'],
  ['role families', 'भूमिका समूहों'],
  ['starting directions', 'शुरुआती दिशाओं'],
  ['final label', 'अंतिम निर्णय'],
  ['top matches', 'सबसे उपयुक्त भूमिकाएँ'],
  ['selected role', 'चुनी हुई भूमिका'],
  ['current direction', 'वर्तमान दिशा'],
  ['fit story', 'उपयुक्तता का परिचय'],
  ['proof of work', 'काम का प्रमाण'],
  ['job search', 'नौकरी की खोज'],
  ['job openings', 'नौकरी के अवसर'],
  ['career coach', 'करियर मार्गदर्शक'],
  ['role explanations', 'भूमिका संबंधी विवरण'],
  ['legal advice', 'कानूनी सलाह'],
  ['first jobs', 'पहली नौकरियों'],
  ['entry-level', 'शुरुआती'],
  ['work setting', 'कार्यस्थल'],
  ['workday', 'कार्यदिवस'],
  ['workflows', 'कार्यप्रवाहों'],
  ['work samples', 'काम के नमूने'],
  ['recruiter calls', 'भर्ती संबंधी बातचीत'],
  ['recruiter', 'भर्तीकर्ता'],
  ['customer', 'ग्राहक'],
  ['student', 'विद्यार्थी'],
  ['patient', 'रोगी'],
  ['families', 'परिवारों'],
  ['audience', 'दर्शकों'],
  ['campaigns', 'प्रचार अभियानों'],
  ['campaign', 'प्रचार अभियान'],
  ['content', 'सामग्री'],
  ['writing', 'लेखन'],
  ['communication', 'संवाद'],
  ['consistency', 'निरंतरता'],
  ['accuracy', 'सटीकता'],
  ['reliability', 'विश्वसनीयता'],
  ['trustworthiness', 'भरोसेमंदी'],
  ['ownership', 'जिम्मेदारी'],
  ['coordination', 'समन्वय'],
  ['documentation', 'दस्तावेज़ीकरण'],
  ['reporting', 'प्रतिवेदन'],
  ['reports', 'रिपोर्टों'],
  ['report', 'रिपोर्ट'],
  ['trackers', 'सूचियों'],
  ['tracker', 'सूची'],
  ['spreadsheets', 'गणना-पत्रों'],
  ['spreadsheet', 'गणना-पत्र'],
  ['records', 'अभिलेखों'],
  ['record', 'अभिलेख'],
  ['invoices', 'बीजकों'],
  ['ledgers', 'बही-खातों'],
  ['bookkeeping', 'लेखा-लेखन'],
  ['numbers', 'संख्याओं'],
  ['data', 'आँकड़ों'],
  ['processes', 'प्रक्रियाओं'],
  ['process', 'प्रक्रिया'],
  ['system', 'व्यवस्था'],
  ['tasks', 'कार्यों'],
  ['task', 'कार्य'],
  ['applications', 'आवेदनों'],
  ['application', 'आवेदन'],
  ['resume', 'जीवनवृत्त'],
  ['interviews', 'साक्षात्कारों'],
  ['interview', 'साक्षात्कार'],
  ['follow-ups', 'अगले संपर्कों'],
  ['follow-up', 'अगला संपर्क'],
  ['role', 'भूमिका'],
  ['roles', 'भूमिकाओं'],
  ['fit-check', 'योग्यता जाँच'],
  ['fit', 'उपयुक्तता'],
  ['results', 'परिणामों'],
  ['strengths', 'खूबियों'],
  ['strength', 'खूबी'],
  ['examples', 'उदाहरण'],
  ['example', 'उदाहरण'],
  ['options', 'विकल्पों'],
  ['option', 'विकल्प'],
  ['questions', 'प्रश्नों'],
  ['question', 'प्रश्न'],
  ['details', 'विवरण'],
  ['information', 'जानकारी'],
  ['setting', 'परिवेश'],
  ['environment', 'वातावरण'],
  ['background', 'पृष्ठभूमि'],
  ['deadline', 'समय सीमा'],
  ['deadlines', 'समय सीमाओं'],
  ['workflow', 'कार्यप्रवाह'],
  ['support', 'सहायता'],
  ['operations', 'संचालन'],
  ['finance', 'वित्त'],
  ['accounts', 'लेखा'],
  ['compliance', 'अनुपालन'],
  ['marketing', 'विपणन'],
  ['sales', 'बिक्री'],
  ['creative', 'रचनात्मक'],
  ['analytical', 'विश्लेषणात्मक'],
  ['structured', 'क्रमबद्ध'],
  ['structure', 'व्यवस्था'],
  ['organized', 'व्यवस्थित'],
  ['organize', 'व्यवस्थित'],
  ['natural', 'स्वाभाविक'],
  ['realistic', 'व्यावहारिक'],
  ['practical', 'व्यावहारिक'],
  ['simple', 'सरल'],
  ['clear', 'स्पष्ट'],
  ['short', 'संक्षिप्त'],
  ['ready', 'तैयार'],
  ['review', 'समीक्षा'],
  ['highlight', 'प्रमुखता से दिखाएँ'],
  ['practice', 'अभ्यास'],
  ['apply', 'आवेदन'],
  ['track', 'लेखा रखें'],
  ['save', 'सुरक्षित'],
  ['saved', 'सुरक्षित'],
  ['guide', 'मार्गदर्शन'],
  ['guided', 'मार्गदर्शित'],
  ['handle', 'संभालें'],
  ['accept', 'स्वीकार'],
  ['confused', 'असमंजस में'],
  ['focused', 'केंद्रित'],
  ['mostly', 'मुख्यतः'],
  ['remote', 'दूरस्थ'],
  ['remotely', 'दूर से'],
  ['formal', 'औपचारिक'],
  ['satisfying', 'संतोषजनक'],
  ['satisfaction', 'संतोष'],
  ['energy', 'ऊर्जा'],
  ['energised', 'उत्साहित'],
  ['drained', 'थका हुआ'],
  ['recovery time', 'आराम का समय'],
  ['recharge time', 'आराम का समय'],
  ['impressive', 'प्रभावशाली'],
  ['glamorous', 'आकर्षक'],
  ['broad', 'व्यापक'],
  ['hype', 'बढ़ा-चढ़ाकर कही बात'],
  ['appointment-related', 'मुलाकात से जुड़े'],
  ['healthcare-adjacent', 'स्वास्थ्य सेवा से जुड़े'],
  ['commerce-oriented', 'वाणिज्य उन्मुख'],
  ['detail-oriented', 'विवरण पर ध्यान देने वाला'],
  ['number-heavy', 'संख्या प्रधान'],
  ['people-facing', 'लोगों से सीधे संवाद वाला'],
  ['persuasion-first', 'समझाने को प्राथमिकता देने वाला'],
  ['quality-first', 'गुणवत्ता को प्राथमिकता देने वाला'],
  ['research-led', 'शोध आधारित'],
  ['rule-based', 'नियम आधारित'],
  ['seo-style', 'खोज-अनुकूल शैली'],
  ['trust-building', 'भरोसा बनाने वाला'],
  ['back-to-back', 'लगातार'],
  ['clarity-first', 'स्पष्टता को प्राथमिकता'],
  ['cross-team', 'अलग-अलग दलों के बीच'],
  ['double-check', 'दोबारा जाँच'],
  ['root-cause', 'मूल कारण'],
  ['accounting', 'लेखा'],
  ['accurate', 'सटीक'],
  ['acknowledge', 'बात को स्वीकार'],
  ['action', 'कार्रवाई'],
  ['active', 'सक्रिय'],
  ['admission', 'प्रवेश'],
  ['ads', 'विज्ञापन'],
  ['against', 'की तुलना में'],
  ['analyse', 'विश्लेषण'],
  ['analysis', 'विश्लेषण'],
  ['analytics', 'विश्लेषिकी'],
  ['appointment', 'मुलाकात'],
  ['appointments', 'मुलाकातों'],
  ['approach', 'तरीका'],
  ['article', 'लेख'],
  ['attention', 'ध्यान'],
  ['awareness', 'जागरूकता'],
  ['basics', 'मूल बातें'],
  ['best', 'सबसे अच्छा'],
  ['broken', 'खराब'],
  ['budgets', 'बजट'],
  ['build', 'बनाना'],
  ['call', 'बातचीत'],
  ['calls', 'बातचीत'],
  ['calm', 'शांत'],
  ['candidates', 'उम्मीदवारों'],
  ['capture', 'दर्ज'],
  ['care', 'देखभाल'],
  ['careful', 'सावधान'],
  ['checklist', 'जाँच सूची'],
  ['checklists', 'जाँच सूचियों'],
  ['checking', 'जाँच'],
  ['check', 'जाँच'],
  ['clarification', 'स्पष्टीकरण'],
  ['clarity', 'स्पष्टता'],
  ['clauses', 'धाराओं'],
  ['cleanly', 'साफ़ ढंग से'],
  ['clean', 'साफ़'],
  ['close', 'समाप्त'],
  ['college', 'महाविद्यालय'],
  ['comfort', 'सहजता'],
  ['commerce', 'वाणिज्य'],
  ['comparison', 'तुलना'],
  ['complaints', 'शिकायतों'],
  ['completed', 'पूरा'],
  ['complex', 'जटिल'],
  ['concise', 'संक्षिप्त'],
  ['confident', 'आत्मविश्वासी'],
  ['contact', 'संपर्क'],
  ['conversations', 'बातचीत'],
  ['conversation', 'बातचीत'],
  ['convince', 'समझाना'],
  ['coordinate', 'समन्वय करना'],
  ['copy', 'प्रति'],
  ['courses', 'पाठ्यक्रमों'],
  ['creation', 'निर्माण'],
  ['create', 'बनाना'],
  ['creativity', 'रचनात्मकता'],
  ['curiosity', 'जिज्ञासा'],
  ['customers', 'ग्राहकों'],
  ['dashboard', 'कार्यस्थल'],
  ['dashboards', 'कार्यस्थलों'],
  ['day', 'दिन'],
  ['decisions', 'निर्णयों'],
  ['decision', 'निर्णय'],
  ['decide', 'निर्णय लेना'],
  ['deep', 'गहरा'],
  ['delegate', 'काम बाँटना'],
  ['desk', 'मेज़ पर किया जाने वाला'],
  ['detail', 'विवरण'],
  ['diagnose', 'कारण पहचानना'],
  ['diagnosis', 'कारण की पहचान'],
  ['direction', 'दिशा'],
  ['discipline', 'अनुशासन'],
  ['documents', 'दस्तावेज़ों'],
  ['document', 'दस्तावेज़'],
  ['doc', 'दस्तावेज़'],
  ['draft', 'प्रारूप'],
  ['drain', 'थकाना'],
  ['driven', 'प्रेरित'],
  ['education', 'शिक्षा'],
  ['email', 'ईमेल'],
  ['empathetic', 'सहानुभूतिपूर्ण'],
  ['empathise', 'सहानुभूति दिखाना'],
  ['empathy', 'सहानुभूति'],
  ['employer', 'नियोक्ता'],
  ['energise', 'उत्साहित करना'],
  ['engagement', 'जुड़ाव'],
  ['ensure', 'सुनिश्चित करना'],
  ['entries', 'प्रविष्टियों'],
  ['enter', 'दर्ज करना'],
  ['errors', 'गलतियों'],
  ['error', 'गलती'],
  ['escalation', 'वरिष्ठ स्तर पर भेजने'],
  ['execution', 'कार्यान्वयन'],
  ['experiments', 'प्रयोगों'],
  ['expertise', 'विशेषज्ञता'],
  ['explain', 'समझाना'],
  ['exposure', 'अनुभव'],
  ['facing', 'से संवाद वाला'],
  ['fair', 'उचित'],
  ['feeling', 'भावना'],
  ['feel', 'महसूस'],
  ['filters', 'छँटाई विकल्पों'],
  ['financial', 'वित्तीय'],
  ['fix', 'ठीक करना'],
  ['flag', 'चिह्नित'],
  ['flows', 'प्रवाहों'],
  ['follow', 'पालन'],
  ['formatting', 'स्वरूपण'],
  ['framing', 'प्रस्तुति'],
  ['free', 'निःशुल्क'],
  ['genuinely', 'वास्तव में'],
  ['goals', 'लक्ष्यों'],
  ['goal', 'लक्ष्य'],
  ['grow', 'बढ़ना'],
  ['growth', 'विकास'],
  ['guidance', 'मार्गदर्शन'],
  ['handling', 'संभालना'],
  ['healthcare', 'स्वास्थ्य सेवा'],
  ['health', 'स्वास्थ्य'],
  ['helper', 'सहायक'],
  ['helping', 'मदद करना'],
  ['hiring', 'भर्ती'],
  ['hours', 'घंटे'],
  ['ideal', 'उपयुक्त'],
  ['inbound', 'आने वाले'],
  ['instinctive', 'सहज'],
  ['instinct', 'सहज प्रवृत्ति'],
  ['intensity', 'तीव्रता'],
  ['interaction', 'संवाद'],
  ['internships', 'प्रशिक्षुता'],
  ['introductions', 'परिचयों'],
  ['investigation', 'जाँच-पड़ताल'],
  ['judgment', 'विवेक'],
  ['legal', 'कानूनी'],
  ['law', 'कानून'],
  ['light', 'हल्का'],
  ['likely', 'संभावित'],
  ['link', 'जोड़ना'],
  ['listening', 'सुनना'],
  ['list', 'सूची'],
  ['logistics', 'व्यवस्था संबंधी कार्य'],
  ['log', 'अभिलेख'],
  ['mainly', 'मुख्यतः'],
  ['manager', 'प्रबंधक'],
  ['manual', 'हाथ से किया जाने वाला'],
  ['mastery', 'दक्षता'],
  ['measure', 'मापना'],
  ['meetings', 'बैठकों'],
  ['message', 'संदेश'],
  ['messy', 'अव्यवस्थित'],
  ['metrics', 'मापदंडों'],
  ['metric', 'मापदंड'],
  ['minded', 'सोच वाला'],
  ['mistakes', 'गलतियों'],
  ['mode', 'तरीका'],
  ['models', 'प्रारूपों'],
  ['modules', 'भागों'],
  ['naturally', 'स्वाभाविक रूप से'],
  ['next', 'अगला'],
  ['notes', 'टिप्पणियों'],
  ['numerical', 'संख्यात्मक'],
  ['objection', 'आपत्ति'],
  ['offer', 'प्रस्ताव'],
  ['operational', 'संचालन संबंधी'],
  ['order', 'आदेश'],
  ['oriented', 'उन्मुख'],
  ['outbound', 'बाहर किए जाने वाले'],
  ['output', 'परिणाम'],
  ['outreach', 'संपर्क अभियान'],
  ['page', 'पृष्ठ'],
  ['paperwork', 'कागज़ी कार्य'],
  ['patience', 'धैर्य'],
  ['patients', 'रोगियों'],
  ['pattern', 'ढर्रा'],
  ['pending', 'लंबित'],
  ['people', 'लोगों'],
  ['performance', 'प्रदर्शन'],
  ['personal', 'व्यक्तिगत'],
  ['persuade', 'समझाना'],
  ['persuasion', 'समझाने की क्षमता'],
  ['piece', 'लेख'],
  ['pipeline', 'क्रम'],
  ['pitch', 'प्रस्ताव रखना'],
  ['pivot', 'दिशा बदलना'],
  ['plan', 'योजना'],
  ['post', 'प्रकाशन'],
  ['potential', 'संभावना'],
  ['precision', 'सूक्ष्म सटीकता'],
  ['pressure', 'दबाव'],
  ['proactive', 'पहल करने वाला'],
  ['product', 'उत्पाद'],
  ['programs', 'कार्यक्रमों'],
  ['progress', 'प्रगति'],
  ['projects', 'परियोजनाओं'],
  ['project', 'परियोजना'],
  ['publish', 'प्रकाशित करना'],
  ['queries', 'प्रश्नों'],
  ['query', 'प्रश्न'],
  ['react', 'प्रतिक्रिया'],
  ['real', 'वास्तविक'],
  ['reconciled', 'मिलान किए हुए'],
  ['reconciliation', 'मिलान'],
  ['reconcile', 'मिलान करना'],
  ['regulatory', 'नियामकीय'],
  ['repeated', 'दोहराया गया'],
  ['repetitive', 'बार-बार होने वाला'],
  ['replies', 'उत्तर'],
  ['research', 'शोध'],
  ['resolution', 'समाधान'],
  ['response', 'उत्तर'],
  ['responsible', 'जिम्मेदार'],
  ['rewrite', 'दोबारा लिखना'],
  ['routine', 'नियमित'],
  ['rows', 'पंक्तियों'],
  ['rules', 'नियमों'],
  ['samples', 'नमूनों'],
  ['satisfied', 'संतुष्ट'],
  ['scheduling', 'समय तय करना'],
  ['screen', 'प्रारंभिक जाँच'],
  ['service', 'सेवा'],
  ['sheet', 'गणना-पत्र'],
  ['signals', 'संकेतों'],
  ['smoothly', 'सुचारु रूप से'],
  ['sorting', 'क्रम में लगाना'],
  ['speed', 'गति'],
  ['status', 'स्थिति'],
  ['steps', 'चरणों'],
  ['step', 'चरण'],
  ['students', 'विद्यार्थियों'],
  ['style', 'शैली'],
  ['subjects', 'विषयों'],
  ['success', 'सफलता'],
  ['suggest', 'सुझाना'],
  ['systems', 'व्यवस्थाओं'],
  ['tables', 'तालिकाओं'],
  ['targets', 'लक्ष्यों'],
  ['teams', 'दलों'],
  ['team', 'दल'],
  ['thinking', 'सोच'],
  ['timeline', 'समय सीमा'],
  ['tools', 'उपकरणों'],
  ['tool', 'उपकरण'],
  ['topic', 'विषय'],
  ['training', 'प्रशिक्षण'],
  ['trends', 'रुझानों'],
  ['trend', 'रुझान'],
  ['triage', 'प्राथमिकता तय करना'],
  ['try', 'प्रयास'],
  ['understanding', 'समझ'],
  ['updates', 'नई जानकारी'],
  ['useful', 'उपयोगी'],
  ['valid', 'मान्य'],
  ['verify', 'सत्यापित करना'],
  ['volume', 'मात्रा'],
  ['volunteering', 'स्वयंसेवा'],
  ['warm', 'सौहार्दपूर्ण'],
  ['work', 'काम'],
  ['written', 'लिखित'],
  ['zone', 'दायरा'],
  ['hr', 'मानव संसाधन'],
  ['mis', 'प्रबंधन सूचना प्रणाली'],
  ['pdf', 'पीडीएफ़'],
  ['ga', 'गूगल विश्लेषिकी'],
  ['tally', 'टैली'],
  ['vlookup', 'वीलुकअप'],
  ['excel', 'एक्सेल'],
  ['sheets', 'शीट्स'],
  ['google', 'गूगल'],
  ['by', 'के अनुसार'],
  ['with', 'के साथ'],
  ['up', 'ऊपर'],
  ['use', 'उपयोग'],
  ['ad', 'विज्ञापन'],
  ['add', 'जोड़ना'],
  ['L', 'एल'],
] as const;

function normalizeHindiCopy(value: string) {
  return HINDI_TERM_REPLACEMENTS.reduce((copy, [english, hindi]) => {
    return copy.replace(new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), hindi);
  }, value)
    .replace(/\bRs\b/g, '₹')
    .replace(/(\d+(?:\.\d+)?)L\b/g, '$1 लाख')
    .replace(/\bGA4\b/g, 'गूगल विश्लेषिकी')
    .replace(/\s+/g, ' ')
    .trim();
}

function t(en: string, hi: string): LocalizedText {
  return { en, hi: normalizeHindiCopy(hi) };
}

// ─── Role definitions ─────────────────────────────────────────────────────────
// vectors: [numerical, people-reactive, people-proactive, process-ops, creative-output, analytical-output]

export const ROLE_ORDER: RoleId[] = [
  'customer-support',
  'sales-support',
  'academic-counsellor',
  'hr-coordinator',
  'data-entry-mis',
  'back-office-operations',
  'operations-analyst',
  'accounting-finance-assistant',
  'digital-marketing-executive',
  'content-writer',
  'legal-compliance-operations',
  ...ROLE_CANDIDATES.map((candidate) => candidate.id as RoleId),
];

const ROLE_DEFINITION_SOURCE = {
  'customer-support': {
    id: 'customer-support',
    name: t('Customer Support Associate', 'कस्टमर सपोर्ट एसोसिएट'),
    shortLabel: t('Customer Support', 'कस्टमर सपोर्ट'),
    summary: t(
      'A steady first role for graduates who stay calm, explain clearly, and enjoy helping people solve day-to-day issues.',
      'यह उन ग्रेजुएट्स के लिए अच्छा शुरुआती रोल है जो शांत रहते हैं, साफ़ समझाते हैं और लोगों की रोज़मर्रा की समस्याएं हल करना पसंद करते हैं।'
    ),
    whyItFits: t(
      'This direction rewards patience, empathy, and clear follow-through.',
      'यह दिशा धैर्य, सहानुभूति और साफ़ फॉलो-थ्रू को महत्व देती है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Practice a 60-second self introduction for recruiter calls.', 'रिक्रूटर कॉल के लिए 60 सेकंड का परिचय तैयार करें।'),
      t('Write 5 short examples of solving a problem calmly.', 'शांत तरीके से समस्या हल करने के 5 छोटे उदाहरण लिखें।'),
      t('Highlight communication and consistency on your resume.', 'रिज्यूमे में communication और consistency को साफ़ दिखाएं।'),
    ],
    strengths: [t('Empathy', 'सहानुभूति'), t('Clear communication', 'साफ़ संवाद'), t('Patience', 'धैर्य')],
    accent: '#1d9a8a',
    vector: [1, 9, 3, 5, 2, 1],
  },
  'sales-support': {
    id: 'sales-support',
    name: t('Sales Support Executive', 'सेल्स सपोर्ट एग्जीक्यूटिव'),
    shortLabel: t('Sales Support', 'सेल्स सपोर्ट'),
    summary: t(
      'A practical fit for graduates who can follow up consistently, build comfort with targets, and keep conversations moving.',
      'यह उन ग्रेजुएट्स के लिए अच्छा रोल है जो लगातार फॉलो-अप कर सकते हैं, targets से सहज हैं और बातचीत को आगे बढ़ा सकते हैं।'
    ),
    whyItFits: t(
      'This path values energy, persistence, and confident communication.',
      'यह रास्ता ऊर्जा, लगातार प्रयास और आत्मविश्वास भरे संवाद को महत्व देता है।'
    ),
    salaryRange: t('Verify base pay and incentives in the target employer listing', 'लक्षित नियोक्ता की नौकरी सूची में मूल वेतन और इंसेंटिव जांचें'),
    starterTasks: [
      t('Prepare a confident pitch about yourself and your strengths.', 'अपने बारे में और अपनी strengths के बारे में एक confident pitch तैयार करें।'),
      t('Practice objection handling with simple role-play.', 'सरल role-play के साथ objection handling की practice करें।'),
      t('Track outreach and follow-up dates in one sheet.', 'एक ही sheet में outreach और follow-up dates ट्रैक करें।'),
    ],
    strengths: [t('Follow-up discipline', 'फॉलो-अप अनुशासन'), t('Confidence', 'आत्मविश्वास'), t('Relationship building', 'रिश्ते बनाना')],
    accent: '#d97706',
    vector: [2, 4, 9, 2, 5, 2],
  },
  'academic-counsellor': {
    id: 'academic-counsellor',
    name: t('Academic Counsellor', 'अकादमिक काउंसलर'),
    shortLabel: t('Academic Counselling', 'अकादमिक काउंसलिंग'),
    summary: t(
      'A strong route for graduates who can guide students, explain options clearly, and stay warm without losing structure.',
      'यह उन ग्रेजुएट्स के लिए अच्छा रास्ता है जो students को guide कर सकते हैं, options साफ़ समझा सकते हैं और warm रहते हुए भी structure बनाए रखते हैं।'
    ),
    whyItFits: t(
      'This role rewards communication, trust-building, and patient guidance.',
      'यह रोल communication, trust-building और धैर्यपूर्ण guidance को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Learn the admission process for 10 common courses or programs.', '10 आम courses या programs का admission process समझें।'),
      t('Practice explaining the same option in simple language.', 'एक ही option को सरल भाषा में समझाने की practice करें।'),
      t('Prepare examples that show listening and guidance.', 'listening और guidance दिखाने वाले examples तैयार करें।'),
    ],
    strengths: [t('Guidance', 'मार्गदर्शन'), t('Listening', 'ध्यान से सुनना'), t('Structured communication', 'संरचित संवाद')],
    accent: '#0f766e',
    vector: [1, 7, 6, 5, 2, 2],
  },
  'hr-coordinator': {
    id: 'hr-coordinator',
    name: t('HR Coordinator', 'एचआर कोऑर्डिनेटर'),
    shortLabel: t('HR Coordination', 'एचआर कोऑर्डिनेशन'),
    summary: t(
      'Good for graduates who like people, scheduling, follow-ups, and keeping hiring or team processes organized.',
      'यह उन ग्रेजुएट्स के लिए अच्छा है जिन्हें लोगों के साथ काम करना, scheduling, follow-ups और hiring या team processes को organized रखना पसंद है।'
    ),
    whyItFits: t(
      'This role rewards coordination, people comfort, and reliability.',
      'यह रोल coordination, लोगों के साथ सहजता और reliability को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Practice recruiter-style introductions and short screening questions.', 'recruiter-style introductions और short screening questions की practice करें।'),
      t('Build one clean tracker for candidates or interview schedules.', 'candidates या interview schedules के लिए एक साफ़ tracker बनाएं।'),
      t('Show coordination or event-management examples on your resume.', 'रिज्यूमे में coordination या event-management examples दिखाएं।'),
    ],
    strengths: [t('People comfort', 'लोगों के साथ सहजता'), t('Coordination', 'कोऑर्डिनेशन'), t('Follow-up', 'फॉलो-अप')],
    accent: '#8b5cf6',
    vector: [2, 5, 7, 6, 2, 2],
  },
  'data-entry-mis': {
    id: 'data-entry-mis',
    name: t('Data Entry / MIS Executive', 'डेटा एंट्री / एमआईएस एग्जीक्यूटिव'),
    shortLabel: t('Data Entry / MIS', 'डेटा एंट्री / एमआईएस'),
    summary: t(
      'A realistic fit for detail-oriented graduates who prefer desk work, spreadsheets, and accurate reporting.',
      'यह उन detail-oriented ग्रेजुएट्स के लिए अच्छा फिट है जो desk work, spreadsheets और accurate reporting पसंद करते हैं।'
    ),
    whyItFits: t(
      'This path rewards consistency, accuracy, and comfort with repetitive structured work.',
      'यह रास्ता consistency, accuracy और repetitive structured work के साथ सहजता को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Practice sorting, filters, VLOOKUP, and formatting in Excel.', 'Excel में sorting, filters, VLOOKUP और formatting की practice करें।'),
      t('Build one clean sample report to show an employer.', 'employer को दिखाने के लिए एक साफ़ sample report बनाएं।'),
      t('Make accuracy and speed visible on your resume.', 'रिज्यूमे में accuracy और speed को साफ़ दिखाएं।'),
    ],
    strengths: [t('Accuracy', 'सटीकता'), t('Spreadsheet comfort', 'स्प्रेडशीट सहजता'), t('Consistency', 'निरंतरता')],
    accent: '#2563eb',
    vector: [7, 1, 1, 9, 1, 3],
  },
  'back-office-operations': {
    id: 'back-office-operations',
    name: t('Back-Office Operations Executive', 'बैक-ऑफिस ऑपरेशंस एग्जीक्यूटिव'),
    shortLabel: t('Back-Office Operations', 'बैक-ऑफिस ऑपरेशंस'),
    summary: t(
      'A stable entry route for graduates who like process, documentation, coordination, and keeping work moving quietly in the background.',
      'यह उन ग्रेजुएट्स के लिए एक स्थिर शुरुआती रास्ता है जिन्हें process, documentation, coordination और बैकग्राउंड में काम को smoothly चलाना पसंद है।'
    ),
    whyItFits: t(
      'This role values reliability, process discipline, and ownership of routine work.',
      'यह रोल reliability, process discipline और routine work की ownership को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Prepare examples of coordination, paperwork, or operational discipline.', 'coordination, paperwork या operational discipline के examples तैयार करें।'),
      t('Create one simple checklist for a repeated task.', 'किसी repeated task के लिए एक simple checklist बनाएं।'),
      t('Practice giving short and clear status updates.', 'छोटे और साफ़ status updates देने की practice करें।'),
    ],
    strengths: [t('Process discipline', 'प्रोसेस अनुशासन'), t('Documentation', 'डॉक्यूमेंटेशन'), t('Coordination', 'कोऑर्डिनेशन')],
    accent: '#7c3aed',
    vector: [3, 2, 2, 9, 1, 4],
  },
  'operations-analyst': {
    id: 'operations-analyst',
    name: t('Operations Analyst', 'ऑपरेशंस एनालिस्ट'),
    shortLabel: t('Operations Analysis', 'ऑपरेशंस एनालिसिस'),
    summary: t(
      'A good fit for graduates who enjoy process plus problem-solving, and can turn messy information into clean decisions.',
      'यह उन ग्रेजुएट्स के लिए अच्छा फिट है जो process और problem-solving दोनों पसंद करते हैं और messy information को clean decisions में बदल सकते हैं।'
    ),
    whyItFits: t(
      'This path rewards analytical thinking, structure, and comfort with reporting.',
      'यह रास्ता analytical thinking, structure और reporting के साथ सहजता को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Build one Excel or Sheets dashboard from raw data.', 'raw data से एक Excel या Sheets dashboard बनाएं।'),
      t('Practice explaining a process bottleneck and your fix.', 'किसी process bottleneck और उसके fix को समझाने की practice करें।'),
      t('Highlight reporting, Excel, or project coordination work on your resume.', 'रिज्यूमे में reporting, Excel या project coordination work highlight करें।'),
    ],
    strengths: [t('Analytical thinking', 'विश्लेषणात्मक सोच'), t('Structure', 'संरचना'), t('Reporting', 'रिपोर्टिंग')],
    accent: '#0f766e',
    vector: [6, 2, 2, 7, 1, 9],
  },
  'accounting-finance-assistant': {
    id: 'accounting-finance-assistant',
    name: t('Accounting & Finance Assistant', 'अकाउंटिंग और फाइनेंस असिस्टेंट'),
    shortLabel: t('Accounting & Finance', 'अकाउंटिंग और फाइनेंस'),
    summary: t(
      'A strong fit for Commerce-oriented graduates who like numbers, records, reconciliation, and careful work.',
      'यह Commerce-oriented ग्रेजुएट्स के लिए एक मजबूत फिट है जिन्हें numbers, records, reconciliation और careful work पसंद है।'
    ),
    whyItFits: t(
      'This role rewards numerical comfort, accuracy, and trustworthiness.',
      'यह रोल numerical comfort, accuracy और trustworthiness को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Refresh bookkeeping, Tally, and Excel basics.', 'bookkeeping, Tally और Excel basics को मजबूत करें।'),
      t('Prepare examples that show accuracy with records or budgets.', 'records या budgets में accuracy दिखाने वाले examples तैयार करें।'),
      t('Highlight Commerce subjects and internships clearly.', 'Commerce subjects और internships को साफ़ highlight करें।'),
    ],
    strengths: [t('Numerical comfort', 'नंबर्स में सहजता'), t('Accuracy', 'सटीकता'), t('Record keeping', 'रिकॉर्ड संभालना')],
    accent: '#115e59',
    vector: [9, 1, 1, 7, 1, 5],
  },
  'digital-marketing-executive': {
    id: 'digital-marketing-executive',
    name: t('Digital Marketing Executive', 'डिजिटल मार्केटिंग एग्जीक्यूटिव'),
    shortLabel: t('Digital Marketing', 'डिजिटल मार्केटिंग'),
    summary: t(
      'A useful path for graduates who like growth ideas, campaign thinking, audience understanding, and some data with creativity.',
      'यह उन ग्रेजुएट्स के लिए अच्छा रास्ता है जिन्हें growth ideas, campaign thinking, audience understanding और creativity के साथ थोड़ा data पसंद है।'
    ),
    whyItFits: t(
      'This direction rewards creativity, communication, and comfort with experiments.',
      'यह दिशा creativity, communication और experiments के साथ सहजता को महत्व देती है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Build a sample campaign idea with audience, copy, and metrics.', 'audience, copy और metrics के साथ एक sample campaign idea बनाएं।'),
      t('Learn Google Ads or GA4 basics from free modules.', 'निःशुल्क पाठों से गूगल विज्ञापन और गूगल विश्लेषिकी की मूल बातें सीखें।'),
      t('Show one project or page where you improved engagement.', 'ऐसा एक project या page दिखाएं जहां आपने engagement बेहतर किया।'),
    ],
    strengths: [t('Creativity', 'रचनात्मकता'), t('Audience understanding', 'audience understanding'), t('Experimentation', 'प्रयोग करने की क्षमता')],
    accent: '#ea580c',
    vector: [2, 3, 5, 2, 9, 5],
  },
  'content-writer': {
    id: 'content-writer',
    name: t('Content Writer', 'कंटेंट राइटर'),
    shortLabel: t('Content Writing', 'कंटेंट राइटिंग'),
    summary: t(
      'A good first route for graduates who write clearly, enjoy research, and can turn information into useful content.',
      'यह उन ग्रेजुएट्स के लिए अच्छा शुरुआती रास्ता है जो साफ़ लिखते हैं, research पसंद करते हैं और जानकारी को उपयोगी content में बदल सकते हैं।'
    ),
    whyItFits: t(
      'This role rewards writing clarity, curiosity, and audience awareness.',
      'यह रोल writing clarity, curiosity और audience awareness को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Write 3 short samples: one explain-like-I-am-new, one SEO-style, one social caption.', '3 छोटे samples लिखें: एक simple explain piece, एक SEO-style और एक social caption।'),
      t('Practice rewriting complex information into plain language.', 'complex information को plain language में rewrite करने की practice करें।'),
      t('Build a small writing portfolio link or PDF.', 'एक छोटा writing portfolio link या PDF बनाएं।'),
    ],
    strengths: [t('Writing clarity', 'स्पष्ट लेखन'), t('Research', 'रिसर्च'), t('Audience awareness', 'दर्शक समझ')],
    accent: '#be185d',
    vector: [1, 2, 2, 3, 9, 4],
  },
  'legal-compliance-operations': {
    id: 'legal-compliance-operations',
    name: t('Legal & Compliance Operations Associate', 'लीगल और कंप्लायंस ऑपरेशंस एसोसिएट'),
    shortLabel: t('Legal & Compliance Ops', 'लीगल और कंप्लायंस ऑप्स'),
    summary: t(
      'A practical route for Law or compliance-oriented graduates who like records, rules, review, and careful documentation.',
      'यह Law या compliance-oriented ग्रेजुएट्स के लिए अच्छा रास्ता है जिन्हें records, rules, review और careful documentation पसंद है।'
    ),
    whyItFits: t(
      'This role rewards precision, documentation discipline, and rule-based thinking.',
      'यह रोल precision, documentation discipline और rule-based thinking को महत्व देता है।'
    ),
    salaryRange: t('Verify current pay in the target city and employer listing', 'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'),
    starterTasks: [
      t('Practice reviewing records or clauses with a checklist.', 'records या clauses को checklist के साथ review करने की practice करें।'),
      t('Build examples that show documentation accuracy.', 'documentation accuracy दिखाने वाले examples बनाएं।'),
      t('Highlight legal/compliance coursework and internships clearly.', 'legal/compliance coursework और internships को साफ़ highlight करें।'),
    ],
    strengths: [t('Precision', 'सटीकता'), t('Documentation', 'डॉक्यूमेंटेशन'), t('Rule-based thinking', 'नियम-आधारित सोच')],
    accent: '#92400e',
    vector: [6, 1, 1, 9, 1, 5],
  },
};

const CANDIDATE_ROLE_DEFINITIONS = Object.fromEntries(
  ROLE_CANDIDATES.map((candidate) => {
    const policy = MATCHING_CATALOG.roles.find((role) => role.id === candidate.id);
    if (!policy) throw new Error(`Missing matching policy for ${candidate.id}`);
    const readableSignals = candidate.separatorSignals
      .slice(0, 3)
      .map((signal) => signal.split('-').join(' '));
    const definition: RoleDefinition = {
      id: candidate.id as RoleId,
      name: candidate.name,
      shortLabel: candidate.name,
      summary: t(
        `An entry-level path centred on ${readableSignals.join(', ')}. Review the listed working conditions before choosing it.`,
        `${candidate.name.hi} में ${readableSignals.join(', ')} पर काम होता है। चुनने से पहले काम की शर्तें जांचें।`
      ),
      whyItFits: t(
        `This direction is relevant when you prefer ${readableSignals.join(' and ')}. It is guidance, not proof of eligibility.`,
        `यह दिशा ${readableSignals.join(' और ')} पसंद होने पर उपयोगी हो सकती है। यह पात्रता का प्रमाण नहीं है।`
      ),
      salaryRange: t(
        'Verify current pay in the target city and employer listing',
        'लक्षित शहर और नियोक्ता की नौकरी सूची में वर्तमान वेतन जांचें'
      ),
      starterTasks: [
        t(
          `Review current job listings using these titles: ${candidate.aliases.join(', ')}.`,
          `इन job titles से वर्तमान नौकरियां देखें: ${candidate.aliases.join(', ')}।`
        ),
        t(
          `Check whether you can meet: ${candidate.requirements.slice(0, 3).join(', ')}.`,
          `जांचें कि आप इन शर्तों को पूरा कर सकते हैं: ${candidate.requirements.slice(0, 3).join(', ')}।`
        ),
        t(
          'Complete the relevant practical check before treating this as a strong direction.',
          'इसे मजबूत दिशा मानने से पहले संबंधित practical check पूरा करें।'
        ),
      ],
      strengths: readableSignals.map((signal) => t(signal, signal)),
      accent:
        policy.cluster === 'people-facing'
          ? '#0f766e'
          : policy.cluster === 'desk-ops'
            ? '#2563eb'
            : policy.cluster === 'analytical'
              ? '#7c3aed'
              : '#be185d',
      vector: policy.preferenceTarget,
    };
    return [candidate.id, definition];
  })
);

export const ROLE_DEFINITIONS = Object.fromEntries(
  ROLE_ORDER.map((roleId) => [
    roleId,
    ROLE_DEFINITION_SOURCE[roleId as keyof typeof ROLE_DEFINITION_SOURCE] ||
      CANDIDATE_ROLE_DEFINITIONS[roleId],
  ])
) as Record<RoleId, RoleDefinition>;

// ─── Phase 1: Routing Questions ───────────────────────────────────────────────
// Same 5 questions for every user. V2 mixes feasibility gates, job scenarios,
// and lightweight proof-task evidence so recommendations are not just preference.
// vector: [numerical, people-reactive, people-proactive, process-ops, creative-output, analytical-output]

export const ROUTING_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'r1',
    section: t('Voice and People Work', 'बातचीत और लोगों से जुड़ा काम'),
    prompt: t(
      'For your first job, how realistic is 5-6 hours a day of calls, chats, or direct customer/student interaction?',
      'पहली नौकरी में रोज़ 5-6 घंटे कॉल, चैट या सीधे ग्राहक/विद्यार्थी से बातचीत करना आपके लिए कितना realistic है?'
    ),
    helper: t(
      'This is a feasibility check, not a personality question. Be practical.',
      'यह feasibility check है, personality question नहीं। practical होकर जवाब दें।'
    ),
    options: [
      {
        id: 'r1_a',
        label: t('Comfortable with frequent calls and difficult conversations if I get a script/training', 'स्क्रिप्ट या training मिले तो frequent calls और कठिन बातचीत में सहज हूँ'),
        signal: t('Voice-heavy people work is feasible', 'voice-heavy लोगों वाला काम feasible है'),
        vector: [0, 3, 3, 0, 0, 0],
        profilePatch: { speakingConfidence: 'high' },
        objectiveEvidencePatch: { communication: 75 },
        clusterScores: { 'people-facing': 3 },
      },
      {
        id: 'r1_b',
        label: t('Prefer chat, email, or ticket replies over long voice calls', 'लंबी voice calls की जगह chat, email या ticket replies पसंद हैं'),
        signal: t('Written support is more feasible than voice', 'voice से ज़्यादा written support feasible है'),
        vector: [0, 2, 0, 2, 1, 0],
        profilePatch: { speakingConfidence: 'medium' },
        objectiveEvidencePatch: { communication: 65, writing: 60 },
        clusterScores: { 'people-facing': 1, 'desk-ops': 2 },
      },
      {
        id: 'r1_c',
        label: t('Prefer mostly back-office work with only short clarification calls', 'mostly back-office काम पसंद है, सिर्फ छोटी clarification calls ठीक हैं'),
        signal: t('Low-intensity interaction constraint', 'कम interaction वाली constraint'),
        vector: [0, 0, 0, 3, 0, 0],
        profilePatch: { speakingConfidence: 'low' },
        clusterScores: { 'desk-ops': 3 },
      },
      {
        id: 'r1_d',
        label: t('I can talk when needed, but I would rather solve from data, documents, or systems', 'ज़रूरत हो तो बात कर सकता/सकती हूँ, पर data, documents या systems से solve करना पसंद है'),
        signal: t('Analytical work preferred over front-line interaction', 'front-line interaction से ज़्यादा analytical काम पसंद'),
        vector: [2, 0, 0, 1, 0, 3],
        profilePatch: { speakingConfidence: 'medium' },
        clusterScores: { 'analytical': 3 },
      },
    ],
  },
  {
    id: 'r2',
    section: t('Work Conditions', 'काम की स्थितियां'),
    prompt: t(
      'Which work condition can you realistically accept in the next 6 months?',
      'अगले 6 महीनों में आप कौन-सी काम की स्थिति realistic तरीके से accept कर सकते/सकती हैं?'
    ),
    helper: t(
      'This helps avoid recommending roles that sound good but are hard to sustain.',
      'इससे ऐसी भूमिकाएं avoid होती हैं जो सुनने में अच्छी लगें पर निभाना कठिन हो।'
    ),
    options: [
      {
        id: 'r2_a',
        label: t('Targets, follow-ups, and daily outreach are acceptable if the role has clear training', 'clear training हो तो targets, follow-ups और daily outreach acceptable हैं'),
        signal: t('Target and outreach work is feasible', 'target और outreach work feasible है'),
        vector: [0, 1, 3, 1, 0, 0],
        objectiveEvidencePatch: { communication: 70 },
        clusterScores: { 'people-facing': 3 },
      },
      {
        id: 'r2_b',
        label: t('Fixed desk hours, trackers, documentation, and repeated process work suit me better', 'fixed desk hours, trackers, documentation और repeated process work मुझे बेहतर suit करता है'),
        signal: t('Stable process work is feasible', 'stable process work feasible है'),
        vector: [1, 0, 0, 3, 0, 1],
        objectiveEvidencePatch: { accuracy: 65 },
        clusterScores: { 'desk-ops': 3 },
      },
      {
        id: 'r2_c',
        label: t('Researching, writing, designing, or improving content for a visible audience sounds sustainable', 'visible audience के लिए research, writing, designing या content improve करना sustainable लगता है'),
        signal: t('Creative output work is feasible', 'creative output work feasible है'),
        vector: [0, 0, 1, 0, 3, 1],
        objectiveEvidencePatch: { writing: 70 },
        clusterScores: { 'creative': 3 },
      },
      {
        id: 'r2_d',
        label: t('Analysing numbers, finding patterns, and building reports is something I can practice seriously', 'numbers analyse करना, patterns ढूँढना और reports बनाना मैं seriously practice कर सकता/सकती हूँ'),
        signal: t('Analytical reporting path is feasible', 'analytical reporting path feasible है'),
        vector: [3, 0, 0, 1, 0, 3],
        objectiveEvidencePatch: { spreadsheet: 65, numeracy: 65 },
        clusterScores: { 'analytical': 3 },
      },
    ],
  },
  {
    id: 'r3',
    section: t('Quick Data Check', 'छोटी data check'),
    prompt: t(
      'A tracker says: 18 applications sent, 7 replies, 4 interviews, 5 offers. What do you notice first?',
      'एक tracker में लिखा है: 18 applications भेजे, 7 replies, 4 interviews, 5 offers. आप सबसे पहले क्या notice करेंगे?'
    ),
    helper: t(
      'This is a small proof task for accuracy and numbers, not a preference question.',
      'यह accuracy और numbers की छोटी proof task है, preference question नहीं।'
    ),
    options: [
      {
        id: 'r3_a',
        label: t('Offers cannot be higher than interviews; the tracker has a consistency error', 'offers interviews से ज़्यादा नहीं हो सकते; tracker में consistency error है'),
        signal: t('Caught the data consistency issue', 'data consistency issue पकड़ा'),
        vector: [3, 0, 0, 3, 0, 2],
        profilePatch: { numbersConfidence: 'high', dataConfidence: 'high' },
        objectiveEvidencePatch: { accuracy: 90, numeracy: 85, spreadsheet: 80 },
        clusterScores: { 'analytical': 3, 'desk-ops': 2 },
      },
      {
        id: 'r3_b',
        label: t('The reply rate is 7 out of 18; I would calculate the percentage next', 'reply rate 18 में से 7 है; मैं next percentage calculate करूँगा/करूँगी'),
        signal: t('Understands basic funnel numbers', 'basic funnel numbers समझता/समझती है'),
        vector: [2, 0, 0, 1, 0, 2],
        profilePatch: { numbersConfidence: 'medium', dataConfidence: 'medium' },
        objectiveEvidencePatch: { numeracy: 65, spreadsheet: 55 },
        clusterScores: { 'analytical': 2, 'desk-ops': 1 },
      },
      {
        id: 'r3_c',
        label: t('I would ask what each column means before judging the numbers', 'numbers judge करने से पहले मैं पूछूँगा/पूछूँगी कि हर column का मतलब क्या है'),
        signal: t('Careful but needs context before checking', 'careful है पर checking से पहले context चाहिए'),
        vector: [1, 0, 0, 2, 0, 1],
        profilePatch: { numbersConfidence: 'medium' },
        objectiveEvidencePatch: { accuracy: 55 },
        clusterScores: { 'desk-ops': 2, 'analytical': 1 },
      },
      {
        id: 'r3_d',
        label: t('I would rather not work with trackers like this every day', 'मैं रोज़ ऐसे trackers के साथ काम नहीं करना चाहूँगा/चाहूँगी'),
        signal: t('Low comfort with data-checking work', 'data-checking काम में कम comfort'),
        vector: [0, 2, 1, 0, 0, 0],
        profilePatch: { numbersConfidence: 'low', dataConfidence: 'low' },
        objectiveEvidencePatch: { numeracy: 25, accuracy: 25 },
        clusterScores: { 'people-facing': 2 },
      },
    ],
  },
  {
    id: 'r4',
    section: t('Written Response Check', 'लिखित response check'),
    prompt: t(
      'A customer writes: "I paid yesterday but my account is still blocked." Which first reply is strongest?',
      'एक customer लिखता है: "मैंने कल payment किया था लेकिन मेरा account अभी भी blocked है." सबसे अच्छा पहला reply कौन-सा है?'
    ),
    helper: t(
      'This checks clarity, empathy, and whether you ask for the right information.',
      'यह clarity, empathy और सही जानकारी मांगने की क्षमता check करता है।'
    ),
    options: [
      {
        id: 'r4_a',
        label: t('Sorry for the trouble. Please share your payment ID or registered phone number so I can check and update you.', 'असुविधा के लिए खेद है। कृपया payment ID या registered phone number भेजें ताकि मैं check करके update दे सकूँ।'),
        signal: t('Clear empathetic support reply', 'clear empathetic support reply'),
        vector: [0, 3, 1, 2, 1, 0],
        profilePatch: { speakingConfidence: 'high' },
        objectiveEvidencePatch: { communication: 90, writing: 80 },
        clusterScores: { 'people-facing': 3 },
      },
      {
        id: 'r4_b',
        label: t('Payment team will check. Wait for some time.', 'payment team check करेगी। कुछ समय wait करें।'),
        signal: t('Understandable but low-detail reply', 'समझ में आता है पर detail कम है'),
        vector: [0, 1, 0, 1, 0, 0],
        profilePatch: { speakingConfidence: 'medium' },
        objectiveEvidencePatch: { communication: 45, writing: 45 },
        clusterScores: { 'people-facing': 1 },
      },
      {
        id: 'r4_c',
        label: t('I would first check the payment log, account status, and ticket history before replying.', 'reply करने से पहले मैं payment log, account status और ticket history check करूँगा/करूँगी।'),
        signal: t('Investigates before responding', 'respond करने से पहले जांचता/जांचती है'),
        vector: [1, 1, 0, 3, 0, 2],
        objectiveEvidencePatch: { accuracy: 75 },
        clusterScores: { 'desk-ops': 2, 'analytical': 1 },
      },
      {
        id: 'r4_d',
        label: t('I would rewrite it into a short, polished message before sending.', 'send करने से पहले मैं इसे short, polished message में rewrite करूँगा/करूँगी।'),
        signal: t('Writing polish instinct', 'writing polish instinct'),
        vector: [0, 1, 0, 1, 3, 1],
        profilePatch: { speakingConfidence: 'low' },
        objectiveEvidencePatch: { writing: 75 },
        clusterScores: { 'creative': 2, 'desk-ops': 1 },
      },
    ],
  },
  {
    id: 'r5',
    section: t('Prioritisation Scenario', 'Priority scenario'),
    prompt: t(
      'It is 4 PM. You have four unfinished tasks. Which one do you handle first?',
      'शाम के 4 बजे हैं। आपके पास चार अधूरे काम हैं। आप सबसे पहले कौन-सा करेंगे/करेंगी?'
    ),
    helper: t(
      'This tells us what kind of pressure you handle best.',
      'इससे पता चलता है कि आप किस तरह का pressure बेहतर handle करते/करती हैं।'
    ),
    options: [
      {
        id: 'r5_a',
        label: t('A customer/student waiting for a response that affects their next step', 'एक customer/student जिसके next step के लिए आपका response ज़रूरी है'),
        signal: t('Prioritises human impact', 'human impact को priority देता/देती है'),
        vector: [0, 3, 2, 1, 0, 0],
        objectiveEvidencePatch: { communication: 75 },
        clusterScores: { 'people-facing': 3 },
      },
      {
        id: 'r5_b',
        label: t('A report with numbers that will be used in tomorrow morning’s meeting', 'एक numbers report जो कल सुबह की meeting में use होगी'),
        signal: t('Prioritises decision-critical analysis', 'decision-critical analysis को priority देता/देती है'),
        vector: [3, 0, 0, 1, 0, 3],
        objectiveEvidencePatch: { spreadsheet: 75, numeracy: 75 },
        clusterScores: { 'analytical': 3 },
      },
      {
        id: 'r5_c',
        label: t('A tracker/process update that multiple teammates need before they can continue', 'tracker/process update जिसकी जरूरत कई teammates को आगे बढ़ने के लिए है'),
        signal: t('Prioritises workflow dependency', 'workflow dependency को priority देता/देती है'),
        vector: [1, 0, 0, 3, 0, 1],
        objectiveEvidencePatch: { accuracy: 70 },
        clusterScores: { 'desk-ops': 3 },
      },
      {
        id: 'r5_d',
        label: t('A draft post, campaign message, or design that must go out today', 'draft post, campaign message या design जिसे आज publish/send करना है'),
        signal: t('Prioritises visible creative output', 'visible creative output को priority देता/देती है'),
        vector: [0, 0, 1, 0, 3, 1],
        objectiveEvidencePatch: { writing: 70 },
        clusterScores: { 'creative': 3 },
      },
    ],
  },
];

// ─── Tie-breaker (inserted if cluster margin < 15 points) ────────────────────

export const TIE_BREAKER_QUESTION: AssessmentQuestion = {
  id: 'rtb',
  section: t('Proof You Can Build', 'आप कौन-सा proof बना सकते हैं'),
  prompt: t(
    'If you had two weeks to prove readiness for one direction, what would you actually build or practice?',
    'अगर एक direction के लिए readiness prove करने को आपके पास दो हफ्ते हों, तो आप वास्तव में क्या बनाएंगे या practice करेंगे?'
  ),
  helper: t(
    'This breaks close results using evidence you can realistically produce, not prestige.',
    'यह close results को prestige नहीं, बल्कि realistically बनाए जा सकने वाले evidence से अलग करता है।'
  ),
  options: [
    {
      id: 'rtb_a',
      label: t('A set of strong customer/student replies and a short call introduction', 'strong customer/student replies और छोटा call introduction'),
      signal: t('Can produce communication proof', 'communication proof बना सकता/सकती है'),
      vector: [0, 2, 1, 0, 0, 0],
      objectiveEvidencePatch: { communication: 80, writing: 70 },
      clusterScores: { 'people-facing': 3 },
    },
    {
      id: 'rtb_b',
      label: t('A clean tracker, checklist, or data-cleaning sample with no obvious errors', 'clean tracker, checklist या data-cleaning sample जिसमें obvious errors न हों'),
      signal: t('Can produce operations accuracy proof', 'operations accuracy proof बना सकता/सकती है'),
      vector: [1, 0, 0, 3, 0, 1],
      objectiveEvidencePatch: { accuracy: 80, spreadsheet: 70 },
      clusterScores: { 'desk-ops': 3 },
    },
    {
      id: 'rtb_c',
      label: t('A short article, post, campaign message, or visual content sample', 'short article, post, campaign message या visual content sample'),
      signal: t('Can produce creative proof', 'creative proof बना सकता/सकती है'),
      vector: [0, 0, 1, 0, 3, 0],
      objectiveEvidencePatch: { writing: 80, design: 55 },
      clusterScores: { 'creative': 3 },
    },
    {
      id: 'rtb_d',
      label: t('A spreadsheet analysis, reconciliation, or error-checking sample', 'spreadsheet analysis, reconciliation या error-checking sample'),
      signal: t('Can produce numbers and analysis proof', 'numbers और analysis proof बना सकता/सकती है'),
      vector: [3, 0, 0, 2, 0, 1],
      objectiveEvidencePatch: { numeracy: 80, spreadsheet: 80, accuracy: 75 },
      clusterScores: { 'analytical': 3 },
    },
  ],
};

// ─── Phase 2: Branch Questions ────────────────────────────────────────────────
// 4 questions per cluster. Differentiates roles within the winning cluster.
// roleScores: partial record of role contributions for this option

export const BRANCH_QUESTIONS: Record<ClusterId, AssessmentQuestion[]> = {
  'people-facing': [
    {
      id: 'b1',
      section: t('People Style', 'लोगों के साथ आपका style'),
      prompt: t(
        'Someone comes to you confused about their options. You naturally:',
        'कोई व्यक्ति अपने options को लेकर confused होकर आपके पास आता है। आप naturally:'
      ),
      helper: t('Pick the one that feels most instinctive.', 'वह चुनें जो सबसे instinctive लगे।'),
      options: [
        {
          id: 'pf_b1_a',
          label: t('Listen, empathise, and help them feel calm first', 'पहले सुनता/सुनती हूँ, empathise करता/करती हूँ और उन्हें calm feel कराता/कराती हूँ'),
          signal: t('Calm empathetic support', 'शांत empathetic support'),
          vector: [0, 3, 0, 1, 0, 0],
          roleScores: { 'customer-support': 3 },
        },
        {
          id: 'pf_b1_b',
          label: t('Walk them through each option clearly and help them decide', 'हर option साफ़ समझाता/समझाती हूँ और decide करने में मदद करता/करती हूँ'),
          signal: t('Structured guidance and clarity', 'structured guidance और clarity'),
          vector: [0, 2, 2, 1, 0, 0],
          roleScores: { 'academic-counsellor': 3, 'customer-support': 1 },
        },
        {
          id: 'pf_b1_c',
          label: t('Ask what they have already tried and coordinate the next steps', 'पूछता/पूछती हूँ कि उन्होंने क्या try किया और next steps coordinate करता/करती हूँ'),
          signal: t('Coordination-first approach', 'पहले coordination करना'),
          vector: [0, 1, 3, 2, 0, 0],
          roleScores: { 'hr-coordinator': 3, 'academic-counsellor': 1 },
        },
      ],
    },
    {
      id: 'b2',
      section: t('Your Energy', 'आपकी energy'),
      prompt: t(
        'End of a long day with back-to-back calls. You feel:',
        'back-to-back calls के बाद एक लंबे दिन का अंत। आप महसूस करते हैं:'
      ),
      helper: t('Be honest — there is no right or wrong here.', 'ईमानदारी से बताएं — यहाँ कोई सही या गलत नहीं है।'),
      options: [
        {
          id: 'pf_b2_a',
          label: t('Drained but fulfilled — I like helping, I just need recovery time', 'थका/थकी हुआ/हुई पर satisfied — helping पसंद है, बस recovery time चाहिए'),
          signal: t('Empathetic helper who needs recharge time', 'recharge time चाहने वाला/वाली empathetic helper'),
          vector: [0, 3, 0, 1, 0, 0],
          roleScores: { 'customer-support': 3 },
        },
        {
          id: 'pf_b2_b',
          label: t('Energised if the conversations went well', 'अगर conversations अच्छी गई हों तो energised'),
          signal: t('Energy from good conversations', 'अच्छी conversations से energy मिलती है'),
          vector: [0, 1, 3, 0, 0, 0],
          roleScores: { 'academic-counsellor': 3, 'customer-support': 1 },
        },
        {
          id: 'pf_b2_c',
          label: t('Ready for tomorrow\'s coordination and follow-up work', 'कल के coordination और follow-up काम के लिए ready'),
          signal: t('Process-energy over conversation-energy', 'conversation की जगह process से energy मिलती है'),
          vector: [0, 1, 2, 3, 0, 0],
          roleScores: { 'hr-coordinator': 3 },
        },
      ],
    },
    {
      id: 'b3',
      section: t('Your Setting', 'आपका setting'),
      prompt: t(
        'Which work setting sounds most natural to you?',
        'कौन-सा work setting आपको सबसे natural लगता है?'
      ),
      helper: t('This is one of the clearest signals we use.', 'यह उन सबसे साफ़ signals में से एक है जिनका हम उपयोग करते हैं।'),
      options: [
        {
          id: 'pf_b3_a',
          label: t('Handling queries and complaints for a product or service', 'किसी product या service के लिए queries और complaints संभालना'),
          signal: t('Customer-facing query resolution', 'customer-facing query resolution'),
          vector: [0, 3, 1, 2, 0, 0],
          roleScores: { 'customer-support': 3 },
        },
        {
          id: 'pf_b3_b',
          label: t('Guiding students or families through education decisions', 'students या families को education decisions में guide करना'),
          signal: t('Education guidance setting', 'education guidance setting'),
          vector: [0, 2, 3, 2, 0, 0],
          roleScores: { 'academic-counsellor': 3 },
        },
        {
          id: 'pf_b3_c',
          label: t('Coordinating hiring, scheduling, or team logistics', 'hiring, scheduling या team logistics coordinate करना'),
          signal: t('HR and team coordination setting', 'HR और team coordination setting'),
          vector: [0, 1, 3, 3, 0, 0],
          roleScores: { 'hr-coordinator': 3 },
        },
        {
          id: 'pf_b3_d',
          label: t('Supporting patients or healthcare appointments remotely', 'patients या healthcare appointments को remotely support करना'),
          signal: t('Healthcare coordination setting', 'healthcare coordination setting'),
          vector: [1, 3, 1, 3, 0, 0],
          roleScores: { 'customer-support': 2, 'hr-coordinator': 1 },
        },
      ],
    },
    {
      id: 'b4',
      section: t('How You Write', 'आप कैसे लिखते हैं'),
      prompt: t(
        'Which writing style comes most naturally to you?',
        'कौन-सी writing style आपको सबसे natural आती है?'
      ),
      helper: t('Think about what you can do repeatedly at work, not just once.', 'उसके बारे में सोचें जो आप काम में बार-बार कर सकें।'),
      options: [
        {
          id: 'pf_b4_a',
          label: t('Short, clear replies to customer questions', 'customer questions के लिए छोटे, clear replies'),
          signal: t('Concise customer-facing writing', 'concise customer-facing writing'),
          vector: [0, 2, 1, 2, 1, 0],
          roleScores: { 'customer-support': 2, 'hr-coordinator': 1 },
        },
        {
          id: 'pf_b4_b',
          label: t('Structured guidance notes or follow-up summaries', 'structured guidance notes या follow-up summaries'),
          signal: t('Structured written guidance', 'structured written guidance'),
          vector: [0, 2, 2, 2, 0, 0],
          roleScores: { 'academic-counsellor': 2, 'hr-coordinator': 2 },
        },
        {
          id: 'pf_b4_c',
          label: t('Appointment-related or medical documentation', 'appointment-related या medical documentation'),
          signal: t('Formal health documentation comfort', 'formal health documentation में सहजता'),
          vector: [1, 2, 0, 3, 0, 0],
          roleScores: { 'hr-coordinator': 2, 'customer-support': 1 },
        },
      ],
    },
  ],

  'desk-ops': [
    {
      id: 'b1',
      section: t('When You Find an Error', 'जब आपको error मिले'),
      prompt: t(
        'You spot an error in a completed piece of work. You:',
        'आपको एक completed काम में error मिलती है। आप:'
      ),
      helper: t('Pick the most natural response — not the most responsible-sounding.', 'सबसे natural response चुनें — सबसे responsible सुनाई देने वाला नहीं।'),
      options: [
        {
          id: 'do_b1_a',
          label: t('Fix it immediately and double-check everything around it', 'तुरंत ठीक करता/करती हूँ और उसके आसपास सब कुछ double-check करता/करती हूँ'),
          signal: t('High accuracy instinct', 'उच्च accuracy instinct'),
          vector: [2, 0, 0, 3, 0, 1],
          roleScores: { 'data-entry-mis': 3, 'legal-compliance-operations': 1 },
        },
        {
          id: 'do_b1_b',
          label: t('Log it, fix it, and add a check to catch it next time', 'log करता/करती हूँ, ठीक करता/करती हूँ और अगली बार पकड़ने के लिए check add करता/करती हूँ'),
          signal: t('Process improvement instinct', 'process improvement instinct'),
          vector: [1, 0, 0, 3, 0, 2],
          roleScores: { 'back-office-operations': 3, 'data-entry-mis': 1 },
        },
        {
          id: 'do_b1_c',
          label: t('Investigate what caused it before fixing anything', 'कुछ ठीक करने से पहले जांचता/जांचती हूँ कि यह क्यों हुआ'),
          signal: t('Compliance-minded root-cause investigation', 'compliance-minded root-cause investigation'),
          vector: [2, 0, 0, 2, 0, 2],
          roleScores: { 'legal-compliance-operations': 3 },
        },
      ],
    },
    {
      id: 'b2',
      section: t('Your Comfort Zone', 'आपका comfort zone'),
      prompt: t(
        'Which of these sounds most like your natural strength?',
        'इनमें से कौन-सा आपकी natural strength जैसा लगता है?'
      ),
      helper: t('Go with your gut — no judgment either way.', 'instinct से जाएं — दोनों तरफ कोई judgment नहीं।'),
      options: [
        {
          id: 'do_b2_a',
          label: t('Accuracy — entering, verifying, and reporting data cleanly', 'Accuracy — data cleanly enter करना, verify करना और report करना'),
          signal: t('Data accuracy strength', 'data accuracy strength'),
          vector: [3, 0, 0, 3, 0, 1],
          roleScores: { 'data-entry-mis': 3 },
        },
        {
          id: 'do_b2_b',
          label: t('Process — keeping operational workflows running correctly', 'Process — operational workflows को सही तरीके से चलाना'),
          signal: t('Operational process strength', 'operational process strength'),
          vector: [1, 0, 0, 4, 0, 2],
          roleScores: { 'back-office-operations': 3 },
        },
        {
          id: 'do_b2_c',
          label: t('Compliance — reviewing documents and records against rules', 'Compliance — documents और records को rules के against review करना'),
          signal: t('Rule-based review strength', 'rule-based review strength'),
          vector: [2, 0, 0, 3, 0, 2],
          roleScores: { 'legal-compliance-operations': 3 },
        },
      ],
    },
    {
      id: 'b3',
      section: t('Your Ideal Day', 'आपका ideal day'),
      prompt: t(
        'Your ideal workday looks like:',
        'आपका ideal workday कुछ ऐसा दिखता है:'
      ),
      helper: t('Be realistic about the next 6 months, not your long-term ambition.', 'अगले 6 महीनों के बारे में realistic रहें, long-term ambition नहीं।'),
      options: [
        {
          id: 'do_b3_a',
          label: t('Minimal meetings, mostly screen-based focused work', 'कम meetings, mostly screen पर focused काम'),
          signal: t('Deep focused desk work', 'deep focused desk काम'),
          vector: [2, 0, 0, 3, 0, 1],
          roleScores: { 'data-entry-mis': 3 },
        },
        {
          id: 'do_b3_b',
          label: t('Some coordination with other teams, mainly task-driven', 'दूसरी teams के साथ थोड़ा coordination, mainly task-driven'),
          signal: t('Cross-team operational coordination', 'cross-team operational coordination'),
          vector: [1, 0, 1, 3, 0, 2],
          roleScores: { 'back-office-operations': 3 },
        },
        {
          id: 'do_b3_c',
          label: t('Reviewing documents with occasional clarification calls', 'documents review करना और कभी-कभी clarification calls'),
          signal: t('Document review with light communication', 'document review with light communication'),
          vector: [2, 0, 0, 2, 0, 2],
          roleScores: { 'legal-compliance-operations': 2, 'back-office-operations': 1 },
        },
      ],
    },
    {
      id: 'b4',
      section: t('Where You Want to Grow', 'आप कहाँ grow करना चाहते हैं'),
      prompt: t(
        'Which feels closest to work you would want to get good at?',
        'इनमें से कौन-सा काम आप सीखना और उसमें अच्छा होना चाहते हैं?'
      ),
      helper: t('Think about what you would be proud of 2 years from now.', 'सोचें कि 2 साल बाद आप किस बात पर गर्व करेंगे।'),
      options: [
        {
          id: 'do_b4_a',
          label: t('Spreadsheets, data systems, and reporting tools', 'Spreadsheets, data systems और reporting tools'),
          signal: t('Data tools mastery goal', 'data tools mastery goal'),
          vector: [3, 0, 0, 3, 0, 2],
          roleScores: { 'data-entry-mis': 3 },
        },
        {
          id: 'do_b4_b',
          label: t('Operational processes, documentation, coordination', 'Operational processes, documentation, coordination'),
          signal: t('Operations mastery goal', 'operations mastery goal'),
          vector: [1, 0, 1, 4, 0, 2],
          roleScores: { 'back-office-operations': 3 },
        },
        {
          id: 'do_b4_c',
          label: t('Legal documents, compliance checklists, regulatory records', 'Legal documents, compliance checklists, regulatory records'),
          signal: t('Legal and compliance mastery goal', 'legal और compliance mastery goal'),
          vector: [2, 0, 0, 3, 0, 2],
          roleScores: { 'legal-compliance-operations': 3 },
        },
      ],
    },
  ],

  'analytical': [
    {
      id: 'b1',
      section: t('Your Best Output', 'आपका best output'),
      prompt: t(
        'You built something useful at work. It is most likely:',
        'आपने काम पर कुछ useful बनाया। यह सबसे ज़्यादा likely क्या होगा:'
      ),
      helper: t('Pick the one that feels most like you.', 'वह चुनें जो आप जैसा सबसे ज़्यादा लगे।'),
      options: [
        {
          id: 'an_b1_a',
          label: t('A dashboard or report someone uses every week', 'एक dashboard या report जिसे कोई हर हफ्ते use करे'),
          signal: t('Dashboard and reporting strength', 'dashboard और reporting strength'),
          vector: [2, 0, 0, 2, 0, 4],
          roleScores: { 'operations-analyst': 3 },
        },
        {
          id: 'an_b1_b',
        label: t('A reconciled set of accounts or financial records', 'मिलान किया हुआ लेखा विवरण या वित्तीय अभिलेख'),
          signal: t('Financial accuracy strength', 'financial accuracy strength'),
          vector: [4, 0, 0, 3, 0, 2],
          roleScores: { 'accounting-finance-assistant': 3 },
        },
      ],
    },
    {
      id: 'b2',
      section: t('Numbers Work You Enjoy', 'आपको जो numbers work पसंद है'),
      prompt: t(
        'Which kind of numbers work feels most satisfying?',
        'किस तरह का numbers काम सबसे satisfying लगता है?'
      ),
      helper: t('Think about what energises vs. drains you.', 'सोचें कि क्या energise करता है बनाम क्या drain करता है।'),
      options: [
        {
          id: 'an_b2_a',
          label: t('Spotting trends, building models, diagnosing what changed', 'trends देखना, models बनाना, यह diagnose करना कि क्या बदला'),
          signal: t('Analytical trend and diagnosis work', 'analytical trend और diagnosis काम'),
          vector: [2, 0, 0, 1, 0, 4],
          roleScores: { 'operations-analyst': 3 },
        },
        {
          id: 'an_b2_b',
          label: t('Reconciling ledgers, checking invoices, ensuring accuracy', 'ledgers reconcile करना, invoices check करना, accuracy ensure करना'),
          signal: t('Financial reconciliation work', 'financial reconciliation काम'),
          vector: [4, 0, 0, 2, 0, 2],
          roleScores: { 'accounting-finance-assistant': 3 },
        },
      ],
    },
    {
      id: 'b3',
      section: t('Your Tool Comfort', 'आपकी tool comfort'),
      prompt: t(
        'Which sounds more natural right now?',
        'अभी कौन-सा आपको ज़्यादा natural लगता है?'
      ),
      helper: t('Honest answer wins — even if you have not used these tools yet.', 'ईमानदार जवाब सही रहेगा — भले ही आपने ये tools अभी use नहीं किए।'),
      options: [
        {
          id: 'an_b3_a',
          label: t('Excel or Sheets — analysis, pivot tables, dashboards', 'Excel या Sheets — analysis, pivot tables, dashboards'),
          signal: t('Analytics tool comfort', 'analytics tool comfort'),
          vector: [2, 0, 0, 1, 0, 4],
          roleScores: { 'operations-analyst': 3 },
        },
        {
          id: 'an_b3_b',
          label: t('Tally, accounting entries, bookkeeping, financial records', 'Tally, accounting entries, bookkeeping, financial records'),
          signal: t('Accounting tool comfort', 'accounting tool comfort'),
          vector: [4, 0, 0, 3, 0, 1],
          roleScores: { 'accounting-finance-assistant': 3 },
        },
      ],
    },
    {
      id: 'b4',
      section: t('Where You Want to Grow', 'आप कहाँ grow करना चाहते हैं'),
      prompt: t(
        'Where do you want to build real expertise over the next 2 years?',
        'अगले 2 साल में आप कहाँ असली expertise बनाना चाहते हैं?'
      ),
      helper: t('Both are solid paths. This just decides the direction.', 'दोनों अच्छे रास्ते हैं। यह बस direction तय करता है।'),
      options: [
        {
          id: 'an_b4_a',
          label: t('Operations, process improvement, and reporting', 'Operations, process improvement और reporting'),
          signal: t('Operations growth direction', 'operations growth direction'),
          vector: [2, 0, 0, 2, 0, 4],
          roleScores: { 'operations-analyst': 3 },
        },
        {
          id: 'an_b4_b',
          label: t('Finance, accounts, reconciliation, and Tally', 'Finance, accounts, reconciliation और Tally'),
          signal: t('Finance growth direction', 'finance growth direction'),
          vector: [4, 0, 0, 3, 0, 2],
          roleScores: { 'accounting-finance-assistant': 3 },
        },
      ],
    },
  ],

  'creative': [
    {
      id: 'b1',
      section: t('Your Best Work', 'आपका best काम'),
      prompt: t(
        'The work you are most proud of creating:',
        'जो काम आपने create किया और आपको उस पर सबसे ज़्यादा गर्व है:'
      ),
      helper: t('Think of real examples, college or personal projects included.', 'real examples सोचें — college या personal projects भी शामिल हैं।'),
      options: [
        {
          id: 'cr_b1_a',
          label: t('A piece of writing, article, or content someone found useful', 'एक writing piece, article या content जिसे किसी ने useful पाया'),
          signal: t('Writing and content creation strength', 'writing और content creation strength'),
          vector: [0, 0, 0, 1, 3, 2],
          roleScores: { 'content-writer': 3 },
        },
        {
          id: 'cr_b1_b',
          label: t('A campaign, ad, or post that got real engagement', 'एक campaign, ad या post जिसे real engagement मिली'),
          signal: t('Campaign and growth work strength', 'campaign और growth काम में strength'),
          vector: [0, 0, 1, 1, 3, 2],
          roleScores: { 'digital-marketing-executive': 3 },
        },
        {
          id: 'cr_b1_c',
          label: t('A pitch or conversation that genuinely convinced someone', 'एक pitch या conversation जिसने किसी को genuinely convince किया'),
          signal: t('Persuasion and sales strength', 'persuasion और sales strength'),
          vector: [0, 1, 3, 0, 2, 0],
          roleScores: { 'sales-support': 3 },
        },
      ],
    },
    {
      id: 'b2',
      section: t('Your Audience Mode', 'आपका audience mode'),
      prompt: t(
        'When you think about your audience, your natural mode is:',
        'जब आप अपने audience के बारे में सोचते/सोचती हैं तो आपका natural mode क्या है:'
      ),
      helper: t('There is no wrong answer here.', 'यहाँ कोई गलत जवाब नहीं है।'),
      options: [
        {
          id: 'cr_b2_a',
          label: t('Writing clearly so they understand the topic', 'साफ़ लिखना ताकि वे topic समझें'),
          signal: t('Clarity-first writing mode', 'clarity-first writing mode'),
          vector: [0, 0, 0, 1, 3, 1],
          roleScores: { 'content-writer': 3 },
        },
        {
          id: 'cr_b2_b',
          label: t('Understanding what will capture their attention', 'समझना कि उनका ध्यान कैसे capture होगा'),
          signal: t('Attention and growth thinking', 'attention और growth thinking'),
          vector: [0, 0, 1, 0, 3, 2],
          roleScores: { 'digital-marketing-executive': 3 },
        },
        {
          id: 'cr_b2_c',
          label: t('Persuading them toward a decision or action', 'उन्हें किसी decision या action की तरफ persuade करना'),
          signal: t('Persuasion-first mode', 'persuasion-first mode'),
          vector: [0, 1, 3, 0, 1, 0],
          roleScores: { 'sales-support': 3 },
        },
      ],
    },
    {
      id: 'b3',
      section: t('How You Measure Success', 'आप success कैसे measure करते हैं'),
      prompt: t(
        'You would rather be measured on:',
        'आप किस पर measure होना पसंद करेंगे:'
      ),
      helper: t('Pick the metric that would feel fair to you.', 'वह metric चुनें जो आपको fair लगे।'),
      options: [
        {
          id: 'cr_b3_a',
          label: t('Content quality and how useful it is', 'Content quality और यह कितना useful है'),
          signal: t('Quality-first content metric', 'quality-first content metric'),
          vector: [0, 0, 0, 1, 3, 2],
          roleScores: { 'content-writer': 3 },
        },
        {
          id: 'cr_b3_b',
          label: t('Campaign performance and audience growth numbers', 'Campaign performance और audience growth numbers'),
          signal: t('Growth and performance metric', 'growth और performance metric'),
          vector: [0, 0, 1, 0, 3, 2],
          roleScores: { 'digital-marketing-executive': 3 },
        },
        {
          id: 'cr_b3_c',
          label: t('Outreach volume and conversion rate', 'Outreach volume और conversion rate'),
          signal: t('Sales metric comfort', 'sales metric comfort'),
          vector: [0, 1, 3, 0, 1, 0],
          roleScores: { 'sales-support': 3 },
        },
      ],
    },
    {
      id: 'b4',
      section: t('More Satisfying Day', 'ज़्यादा satisfying day'),
      prompt: t(
        'Which would make for a more satisfying workday?',
        'इनमें से कौन-सा workday ज़्यादा satisfying होगा?'
      ),
      helper: t('Be realistic — all three are valid paths.', 'Realistic रहें — तीनों valid रास्ते हैं।'),
      options: [
        {
          id: 'cr_b4_a',
          label: t('Research, draft, edit, and publish something', 'शोध करके प्रारूप बनाएँ, संपादन करें और कुछ प्रकाशित करें'),
          signal: t('Writing workflow satisfaction', 'writing workflow में satisfaction'),
          vector: [0, 0, 0, 2, 3, 1],
          roleScores: { 'content-writer': 3 },
        },
        {
          id: 'cr_b4_b',
          label: t('Plan a campaign, set it up, and analyse the results', 'प्रचार अभियान की योजना बनाएँ, उसे शुरू करें और परिणामों का विश्लेषण करें'),
          signal: t('Campaign execution satisfaction', 'campaign execution में satisfaction'),
          vector: [1, 0, 1, 1, 3, 2],
          roleScores: { 'digital-marketing-executive': 3 },
        },
        {
          id: 'cr_b4_c',
          label: t('Build a pipeline, make calls, and close conversations', 'Pipeline build करें, calls करें और conversations close करें'),
          signal: t('Sales execution satisfaction', 'sales execution में satisfaction'),
          vector: [0, 1, 3, 0, 2, 0],
          roleScores: { 'sales-support': 3 },
        },
      ],
    },
  ],
};

// ─── Backward-compatible export ───────────────────────────────────────────────
function buildFinalistQuestion(cluster: ClusterId): AssessmentQuestion {
  const policies = MATCHING_CATALOG.roles.filter((role) => role.cluster === cluster);
  return {
    id: 'rf',
    section: t('Closest Work Direction', 'सबसे करीब काम की दिशा'),
    prompt: t(
      'After comparing the actual work, which direction would you most seriously explore?',
      'असली काम की तुलना के बाद आप किस दिशा को सबसे गंभीरता से खोजेंगे?'
    ),
    helper: t(
      'Choose for the work itself, not status. Requirements and practical evidence are checked separately.',
      'पद के नाम के बजाय काम को देखकर चुनें। योग्यता और practical evidence की जांच अलग होती है।'
    ),
    options: policies.map((policy) => {
      const role = ROLE_DEFINITIONS[policy.id as RoleId];
      const candidate = ROLE_CANDIDATES.find((item) => item.id === policy.id);
      const workDescription = candidate
        ? candidate.separatorSignals
            .slice(0, 3)
            .map((signal) => signal.split('-').join(' '))
            .join(', ')
        : role.summary.en;
      return {
        id: `rf_${role.id}`,
        label: t(
          `${role.name.en}: ${workDescription}`,
          `${role.name.hi}: ${candidate ? workDescription : role.summary.hi}`
        ),
        signal: t(
          `Direct preference for ${role.name.en}`,
          `${role.name.hi} के लिए सीधी पसंद`
        ),
        vector: [...policy.preferenceTarget],
        roleScores: { [role.id]: 24 },
      };
    }),
  };
}

for (const cluster of Object.keys(BRANCH_QUESTIONS) as ClusterId[]) {
  BRANCH_QUESTIONS[cluster].push(buildFinalistQuestion(cluster));
}

// product.ts re-exports ASSESSMENT_QUESTIONS; UI uses it for the initial question set.
// The UI must call getNextQuestions() after routing phase to load branch questions.
export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = ROUTING_QUESTIONS;

// ─── Internal scoring helpers ─────────────────────────────────────────────────

function computeUserVector(selectedOptions: AssessmentOption[]): number[] {
  const combined = new Array(DIMENSION_COUNT).fill(0) as number[];
  for (const option of selectedOptions) {
    option.vector.forEach((value, index) => {
      combined[index] += value;
    });
  }
  return combined;
}

function computeClusterScores(options: AssessmentOption[]): Record<ClusterId, number> {
  const scores: Record<ClusterId, number> = {
    'people-facing': 0,
    'desk-ops': 0,
    'analytical': 0,
    'creative': 0,
  };
  for (const option of options) {
    if (option.clusterScores) {
      for (const [cluster, score] of Object.entries(option.clusterScores)) {
        scores[cluster as ClusterId] += score as number;
      }
    }
  }
  return scores;
}

function mergeObjectiveEvidence(
  current: ObjectiveEvidence | undefined,
  patch: ObjectiveEvidence
): ObjectiveEvidence {
  const merged: ObjectiveEvidence = { ...(current || {}) };
  for (const [signal, value] of Object.entries(patch) as Array<
    [keyof ObjectiveEvidence, number | undefined]
  >) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      continue;
    }
    const existing = merged[signal];
    merged[signal] =
      typeof existing === 'number' && Number.isFinite(existing) && existing >= 0 && existing <= 100
        ? Math.max(existing, value)
        : value;
  }
  return merged;
}

function computeConfidence(
  clusterScores: Record<ClusterId, number>,
  preferredCluster?: ClusterId
): {
  topCluster: ClusterId;
  margin: number;
  needsTieBreaker: boolean;
} {
  const sorted = (Object.entries(clusterScores) as [ClusterId, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const margin = sorted[0][1] - sorted[1][1];
  let topCluster = sorted[0][0];
  // FIX (Issue 4): honor an explicit tie-breaker answer within 3 pts of the leader.
  if (preferredCluster) {
    const prefScore = clusterScores[preferredCluster] ?? 0;
    if (sorted[0][1] - prefScore <= 3) topCluster = preferredCluster;
  }
  return {
    topCluster,
    margin,
    needsTieBreaker: margin < 5, // FIX (Issue 4): was < 8
  };
}

function signalAlignment(option: AssessmentOption, role: RoleDefinition): number {
  return option.vector.reduce(
    (sum, value, index) => sum + value * role.vector[index],
    0
  );
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getLocaleValue(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

function getRankDirectionLabel(index: number): LocalizedText {
  if (index === 0) return t('Leading direction', 'प्रमुख दिशा');
  if (index === 1) return t('Second direction', 'दूसरी दिशा');
  return t('Third direction', 'तीसरी दिशा');
}

export function buildRoleRationale(
  role: RoleDefinition,
  signals: LocalizedText[],
  profile: AssessmentProfile,
  locale: Locale
): LocalizedText {
  const reasonBits = signals.slice(0, 2).map((s) => s[locale]);
  const locationText = profile.city
    ? locale === 'en'
      ? ` for someone targeting opportunities around ${profile.city}`
      : ` खासकर ${profile.city} के आसपास अवसर खोजने वाले उम्मीदवार के लिए`
    : '';
  const joinedReason =
    reasonBits.length > 1
      ? `${reasonBits[0]} + ${reasonBits[1]}`
      : reasonBits[0] || (locale === 'en' ? 'your current profile' : 'आपकी मौजूदा प्रोफाइल');

  return {
    en: `${role.shortLabel.en} stands out because of ${joinedReason}${locationText}. ${role.whyItFits.en}`,
    hi: `${role.shortLabel.hi} इसलिए उभरकर आता है क्योंकि ${joinedReason}${locationText}। ${role.whyItFits.hi}`,
  };
}

export class AssessmentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues[0] || 'Invalid assessment responses');
    this.name = 'AssessmentValidationError';
  }
}

export interface ValidatedAssessmentPath {
  canonicalResponses: Record<string, string>;
  cluster: ClusterId;
  clusterMargin: number;
  routingOptions: AssessmentOption[];
  branchOptions: AssessmentOption[];
  requiredAnswerCount: number;
}

function selectedOption(question: AssessmentQuestion, responses: Record<string, string>) {
  return question.options.find((option) => option.id === responses[question.id]);
}

function resolveAssessmentPath(
  responses: Record<string, string>,
  requireComplete: boolean
): ValidatedAssessmentPath | null {
  const issues: string[] = [];
  const knownQuestionIds = new Set([
    'r1',
    'r2',
    'r3',
    'r4',
    'r5',
    'rtb',
    'b1',
    'b2',
    'b3',
    'b4',
    'rf',
  ]);
  for (const questionId of Object.keys(responses)) {
    if (!knownQuestionIds.has(questionId)) issues.push(`Unknown question id: ${questionId}`);
  }

  const routingOptions = ROUTING_QUESTIONS.map((question) => {
    const option = selectedOption(question, responses);
    if (!option && responses[question.id] !== undefined) {
      issues.push(`Invalid option for ${question.id}`);
    } else if (!option && requireComplete) {
      issues.push(`Missing answer for ${question.id}`);
    }
    return option;
  }).filter((option): option is AssessmentOption => Boolean(option));

  if (routingOptions.length !== ROUTING_QUESTIONS.length) {
    if (issues.length > 0 && requireComplete) throw new AssessmentValidationError(issues);
    return null;
  }

  const baseScores = computeClusterScores(routingOptions);
  const baseConfidence = computeConfidence(baseScores);
  let tieBreakerOption: AssessmentOption | undefined;
  if (baseConfidence.needsTieBreaker) {
    tieBreakerOption = selectedOption(TIE_BREAKER_QUESTION, responses);
    if (!tieBreakerOption && responses.rtb !== undefined) issues.push('Invalid option for rtb');
    else if (!tieBreakerOption && requireComplete) issues.push('Missing answer for rtb');
  } else if (responses.rtb !== undefined) {
    issues.push('Tie-breaker answer is not active for this response path');
  }

  if (baseConfidence.needsTieBreaker && !tieBreakerOption) {
    if (issues.length > 0 && requireComplete) throw new AssessmentValidationError(issues);
    return null;
  }

  const routingWithTie = tieBreakerOption ? [...routingOptions, tieBreakerOption] : routingOptions;
  const tieCluster = tieBreakerOption
    ? (Object.keys(tieBreakerOption.clusterScores || {})[0] as ClusterId | undefined)
    : undefined;
  const finalClusterScores = computeClusterScores(routingWithTie);
  const clusterResolution = computeConfidence(finalClusterScores, tieCluster);
  const branchQuestions = BRANCH_QUESTIONS[clusterResolution.topCluster];
  const branchOptions = branchQuestions.map((question) => {
    const option = selectedOption(question, responses);
    if (!option && responses[question.id] !== undefined) {
      issues.push(`Invalid option for ${question.id} on the ${clusterResolution.topCluster} path`);
    } else if (!option && requireComplete) {
      issues.push(`Missing answer for ${question.id}`);
    }
    return option;
  }).filter((option): option is AssessmentOption => Boolean(option));

  if (issues.length > 0 && requireComplete) throw new AssessmentValidationError(issues);
  if (branchOptions.length !== branchQuestions.length) return null;

  const canonicalResponses = Object.fromEntries([
    ...ROUTING_QUESTIONS.map((question, index) => [question.id, routingOptions[index].id]),
    ...(tieBreakerOption ? [[TIE_BREAKER_QUESTION.id, tieBreakerOption.id]] : []),
    ...branchQuestions.map((question, index) => [question.id, branchOptions[index].id]),
  ]);

  return {
    canonicalResponses,
    cluster: clusterResolution.topCluster,
    clusterMargin: clusterResolution.margin,
    routingOptions: routingWithTie,
    branchOptions,
    requiredAnswerCount: ROUTING_QUESTIONS.length + branchQuestions.length + (tieBreakerOption ? 1 : 0),
  };
}

export function validateAssessmentResponses(
  responses: Record<string, string>
): ValidatedAssessmentPath {
  const path = resolveAssessmentPath(responses, true);
  if (!path) throw new AssessmentValidationError(['Assessment path is incomplete']);
  return path;
}

/**
 * Returns the full ordered list of questions the user should see given their
 * current responses. The UI renders questions[currentIndex] and uses
 * questions.length as the total count.
 *
 * Before Phase 1 is complete: returns the 5 routing questions.
 * After Phase 1, if tie-breaker needed and not answered: appends tie-breaker.
 * After cluster determined: appends the 4 evidence questions + 1 finalist question for that cluster.
 */
export function getNextQuestions(
  responses: Record<string, string>
): AssessmentQuestion[] {
  const phase1Complete = ROUTING_QUESTIONS.every((question) => selectedOption(question, responses));
  if (!phase1Complete) return ROUTING_QUESTIONS;

  const phase1Options = ROUTING_QUESTIONS.map((question) => selectedOption(question, responses)) as AssessmentOption[];

  const baseScores = computeClusterScores(phase1Options);
  const { needsTieBreaker } = computeConfidence(baseScores);

  const hasTieBreaker = Boolean(selectedOption(TIE_BREAKER_QUESTION, responses));

  if (needsTieBreaker && !hasTieBreaker) {
    return [...ROUTING_QUESTIONS, TIE_BREAKER_QUESTION];
  }

  // FIX (Issue 4): pick branch cluster INCLUDING the tie-breaker answer.
  const tbOption = TIE_BREAKER_QUESTION.options.find(
    (o) => o.id === responses[TIE_BREAKER_QUESTION.id]
  );
  const tbCluster = tbOption
    ? (Object.keys(tbOption.clusterScores || {})[0] as ClusterId | undefined)
    : undefined;
  const finalScores = tbOption
    ? computeClusterScores([...phase1Options, tbOption])
    : baseScores;
  const { topCluster } = computeConfidence(finalScores, tbCluster);
  const branch = BRANCH_QUESTIONS[topCluster];

  if (needsTieBreaker) {
    return [...ROUTING_QUESTIONS, TIE_BREAKER_QUESTION, ...branch];
  }

  return [...ROUTING_QUESTIONS, ...branch];
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function scoreAssessment(
  responses: Record<string, string>,
  profileSeed: Partial<AssessmentProfile> = {},
  locale: Locale = 'en'
): AssessmentResult {
  const validated = validateAssessmentResponses(responses);
  const profile: AssessmentProfile = { locale, ...profileSeed };
  const allSelected = [...validated.routingOptions, ...validated.branchOptions];
  for (const option of allSelected) {
    if (option.profilePatch) Object.assign(profile, option.profilePatch);
    if (option.objectiveEvidencePatch) {
      profile.objectiveEvidence = mergeObjectiveEvidence(
        profile.objectiveEvidence,
        option.objectiveEvidencePatch
      );
    }
  }
  const userVector = computeUserVector(allSelected);
  const personEvidence = buildPersonEvidence(allSelected, profile, validated.requiredAnswerCount);
  const matching = scoreEvidence(personEvidence, MATCHING_CATALOG);

  const scoredRoles = matching.rankedRoles.map((evidence) => {
    const roleId = evidence.roleId as RoleId;
    const role = ROLE_DEFINITIONS[roleId];
    const rationaleSignals = allSelected
      .map((option) => ({ signal: option.signal, alignment: signalAlignment(option, role) }))
      .sort((left, right) => right.alignment - left.alignment)
      .slice(0, 3)
      .map((item) => item.signal);
    return { ...evidence, roleId, role, rationaleSignals };
  });

  const allScores = Object.fromEntries(
    scoredRoles.map((item) => [item.roleId, item.score])
  ) as Record<RoleId, number>;

  const topRoles = scoredRoles.slice(0, 3).map((item, index) => {
    const rationale = buildRoleRationale(item.role, item.rationaleSignals, profile, locale);
    if (item.eligibility === 'insufficient-evidence') {
      rationale.en += ' Confirm the role-specific education and tool requirements before applying.';
      rationale.hi += ' आवेदन से पहले भूमिका की शिक्षा और उपकरण संबंधी आवश्यकताएं जांच लें।';
    }
    return {
      roleId: item.roleId,
      role: item.role,
      score: item.score,
      rationale,
      supportingSignals: item.rationaleSignals,
      strengthLabel: getRankDirectionLabel(index),
      eligibility: item.eligibility,
      eligibilityReasons: item.eligibilityReasons,
      preferenceScore: item.preferenceScore,
      demonstratedAbilityScore: item.components.demonstratedAbility,
    };
  });

  // Step 7: Dimension snapshot (6-dim, normalised 0-100)
  const total = Math.max(1, userVector.reduce((s, v) => s + v, 0));
  const dimensionSnapshot = {
    'numerical': Math.round((userVector[0] / total) * 100),
    'people-reactive': Math.round((userVector[1] / total) * 100),
    'people-proactive': Math.round((userVector[2] / total) * 100),
    'process-ops': Math.round((userVector[3] / total) * 100),
    'creative-output': Math.round((userVector[4] / total) * 100),
    'analytical-output': Math.round((userVector[5] / total) * 100),
  };

  const summary: LocalizedText = topRoles[0]
    ? {
        en: `Based on your constraints, scenarios, and proof signals, ${topRoles[0].role.name.en} is the strongest direction to explore now, with ${
          topRoles[1]?.role.name.en || 'two other solid options'
        } close behind.`,
        hi: `आपकी constraints, scenarios और proof signals के आधार पर अभी ${topRoles[0].role.name.hi} explore करने की सबसे मजबूत दिशा है, और ${
          topRoles[1]?.role.name.hi || 'दो अन्य अच्छे विकल्प'
        } भी करीब हैं।`,
      }
    : {
        en: 'We need a few more details to recommend the best path.',
        hi: 'सबसे अच्छा रास्ता सुझाने के लिए हमें कुछ और जानकारी चाहिए।',
      };

  const warning: LocalizedText | null =
    matching.confidence.band === 'low'
      ? t(
          'Treat this as a starting direction, not a final answer. Add a short work sample or portfolio proof before relying on it.',
          'इसे अंतिम जवाब नहीं, शुरुआती दिशा मानें। इस पर भरोसा करने से पहले छोटा work sample या portfolio proof जोड़ें।'
        )
      : matching.confidence.separation < 0.25
        ? t(
            'Several roles are close. Compare the work conditions and complete one proof task before deciding.',
            'कई भूमिकाएं करीब हैं। फैसला लेने से पहले काम की स्थितियां compare करें और एक proof task पूरा करें।'
          )
        : null;

  return {
    profile,
    cluster: validated.cluster,
    confidenceScore: matching.confidence.index,
    confidenceBand: matching.confidence.band,
    confidenceReasons: matching.confidence.reasons,
    clusterMargin: validated.clusterMargin,
    scoringVersion: matching.scoringVersion,
    catalogVersion: matching.catalogVersion,
    topRoles,
    allScores,
    summary,
    warning,
    dimensionSnapshot,
  };
}
