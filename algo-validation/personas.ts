// 20 synthetic tier-2/3 India personas. Each encodes realistic answer choices.
// expectedCluster/expectedRole = our hypothesis (what a human would predict).
export type Persona = {
  id: number; name: string; city: string; blurb: string;
  seed: { fullName: string; city: string; educationStream?: string; degreeName?: string };
  routing: Record<string,string>;        // r1..r5
  tieBreaker?: string;                    // rtb_* if asked
  branch: Record<string,string>;          // b1..b4; finalist choice is derived from expectedRole
  expectedCluster: string; expectedRole: string;
};

export const PERSONAS: Persona[] = [
  // ---- PEOPLE-FACING ----
  { id:1, name:'Priya Sharma', city:'Indore', blurb:'BA grad, warm, loves calming upset people',
    seed:{fullName:'Priya Sharma',city:'Indore',educationStream:'arts-humanities',degreeName:'BA'},
    routing:{r1:'r1_a',r2:'r2_a',r3:'r3_d',r4:'r4_a',r5:'r5_a'},
    branch:{b1:'pf_b1_a',b2:'pf_b2_a',b3:'pf_b3_a',b4:'pf_b4_a'},
    expectedCluster:'people-facing',expectedRole:'customer-support' },

  { id:2, name:'Rahul Verma', city:'Nagpur', blurb:'Loves guiding students on choices',
    seed:{fullName:'Rahul Verma',city:'Nagpur',educationStream:'management',degreeName:'BBA'},
    routing:{r1:'r1_a',r2:'r2_a',r3:'r3_c',r4:'r4_a',r5:'r5_a'},
    branch:{b1:'pf_b1_b',b2:'pf_b2_b',b3:'pf_b3_b',b4:'pf_b4_b'},
    expectedCluster:'people-facing',expectedRole:'academic-counsellor' },

  { id:3, name:'Sneha Patil', city:'Aurangabad', blurb:'Organised, likes coordinating people/logistics',
    seed:{fullName:'Sneha Patil',city:'Aurangabad',educationStream:'management',degreeName:'BBA-HR'},
    routing:{r1:'r1_a',r2:'r2_a',r3:'r3_b',r4:'r4_b',r5:'r5_a'},
    branch:{b1:'pf_b1_c',b2:'pf_b2_c',b3:'pf_b3_c',b4:'pf_b4_b'},
    expectedCluster:'people-facing',expectedRole:'hr-coordinator' },

  { id:4, name:'Dr. Anjali Nair', city:'Kochi', blurb:'Nursing background, empathetic, healthcare stream',
    seed:{fullName:'Anjali Nair',city:'Kochi',educationStream:'healthcare',degreeName:'BSc Nursing'},
    routing:{r1:'r1_a',r2:'r2_a',r3:'r3_d',r4:'r4_d',r5:'r5_a'},
    branch:{b1:'pf_b1_a',b2:'pf_b2_a',b3:'pf_b3_d',b4:'pf_b4_c'},
    expectedCluster:'people-facing',expectedRole:'customer-support' },

  // ---- DESK-OPS ----
  { id:5, name:'Amit Kumar', city:'Patna', blurb:'Detail-obsessed, loves clean data entry',
    seed:{fullName:'Amit Kumar',city:'Patna',educationStream:'open',degreeName:'BCom'},
    routing:{r1:'r1_c',r2:'r2_b',r3:'r3_a',r4:'r4_c',r5:'r5_c'},
    branch:{b1:'do_b1_a',b2:'do_b2_a',b3:'do_b3_a',b4:'do_b4_a'},
    expectedCluster:'desk-ops',expectedRole:'data-entry-mis' },

  { id:6, name:'Farhan Ali', city:'Bhopal', blurb:'Process person, keeps workflows running',
    seed:{fullName:'Farhan Ali',city:'Bhopal',educationStream:'open',degreeName:'BA'},
    routing:{r1:'r1_c',r2:'r2_b',r3:'r3_b',r4:'r4_b',r5:'r5_c'},
    branch:{b1:'do_b1_b',b2:'do_b2_b',b3:'do_b3_b',b4:'do_b4_b'},
    expectedCluster:'desk-ops',expectedRole:'back-office-operations' },

  { id:7, name:'Kavya Reddy', city:'Warangal', blurb:'Law grad, loves rules & document review',
    seed:{fullName:'Kavya Reddy',city:'Warangal',educationStream:'law',degreeName:'LLB'},
    routing:{r1:'r1_c',r2:'r2_b',r3:'r3_b',r4:'r4_c',r5:'r5_c'},
    branch:{b1:'do_b1_c',b2:'do_b2_c',b3:'do_b3_c',b4:'do_b4_c'},
    expectedCluster:'desk-ops',expectedRole:'legal-compliance-operations' },

  // ---- ANALYTICAL ----
  { id:8, name:'Rohit Joshi', city:'Surat', blurb:'Commerce, strong numbers, loves dashboards',
    seed:{fullName:'Rohit Joshi',city:'Surat',educationStream:'commerce',degreeName:'BCom'},
    routing:{r1:'r1_d',r2:'r2_d',r3:'r3_a',r4:'r4_c',r5:'r5_b'},
    branch:{b1:'an_b1_a',b2:'an_b2_a',b3:'an_b3_a',b4:'an_b4_a'},
    expectedCluster:'analytical',expectedRole:'operations-analyst' },

  { id:9, name:'Meena Gupta', city:'Jaipur', blurb:'Commerce, loves Tally/accounts/reconciliation',
    seed:{fullName:'Meena Gupta',city:'Jaipur',educationStream:'commerce',degreeName:'BCom'},
    routing:{r1:'r1_d',r2:'r2_d',r3:'r3_a',r4:'r4_c',r5:'r5_b'},
    branch:{b1:'an_b1_b',b2:'an_b2_b',b3:'an_b3_b',b4:'an_b4_b'},
    expectedCluster:'analytical',expectedRole:'accounting-finance-assistant' },

  // ---- CREATIVE ----
  { id:10, name:'Aditya Singh', city:'Lucknow', blurb:'Writes well, wants content work',
    seed:{fullName:'Aditya Singh',city:'Lucknow',educationStream:'arts-humanities',degreeName:'BA Eng'},
    routing:{r1:'r1_d',r2:'r2_c',r3:'r3_c',r4:'r4_d',r5:'r5_d'},
    tieBreaker:'rtb_c',
    branch:{b1:'cr_b1_a',b2:'cr_b2_a',b3:'cr_b3_a',b4:'cr_b4_a'},
    expectedCluster:'creative',expectedRole:'content-writer' },

  { id:11, name:'Nisha Yadav', city:'Kanpur', blurb:'Social-media savvy, wants marketing',
    seed:{fullName:'Nisha Yadav',city:'Kanpur',educationStream:'management',degreeName:'BBA'},
    routing:{r1:'r1_d',r2:'r2_c',r3:'r3_c',r4:'r4_d',r5:'r5_d'},
    tieBreaker:'rtb_c',
    branch:{b1:'cr_b1_b',b2:'cr_b2_b',b3:'cr_b3_b',b4:'cr_b4_b'},
    expectedCluster:'creative',expectedRole:'digital-marketing-executive' },

  { id:12, name:'Vikas Chauhan', city:'Meerut', blurb:'Persuasive, energetic, wants sales',
    seed:{fullName:'Vikas Chauhan',city:'Meerut',educationStream:'open',degreeName:'BA'},
    routing:{r1:'r1_a',r2:'r2_c',r3:'r3_c',r4:'r4_a',r5:'r5_d'},
    tieBreaker:'rtb_c',
    branch:{b1:'cr_b1_c',b2:'cr_b2_c',b3:'cr_b3_c',b4:'cr_b4_c'},
    expectedCluster:'creative',expectedRole:'sales-support' },

  // ---- BORDERLINE / STRESS CASES ----
  { id:13, name:'Pooja Mehta', city:'Rajkot', blurb:'Torn between support and ops (ambiguous)',
    seed:{fullName:'Pooja Mehta',city:'Rajkot',educationStream:'open',degreeName:'BA'},
    routing:{r1:'r1_a',r2:'r2_d',r3:'r3_b',r4:'r4_b',r5:'r5_c'},
    tieBreaker:'rtb_a',
    branch:{b1:'pf_b1_a',b2:'pf_b2_a',b3:'pf_b3_a',b4:'pf_b4_a'},
    expectedCluster:'people-facing',expectedRole:'customer-support' },

  { id:14, name:'Sahil Khan', city:'Gwalior', blurb:'Wants finance BUT says numbers are weak (disqualifier stress)',
    seed:{fullName:'Sahil Khan',city:'Gwalior',educationStream:'commerce',degreeName:'BCom'},
    routing:{r1:'r1_d',r2:'r2_d',r3:'r3_d',r4:'r4_c',r5:'r5_b'},
    branch:{b1:'an_b1_b',b2:'an_b2_b',b3:'an_b3_b',b4:'an_b4_b'},
    expectedCluster:'analytical',expectedRole:'accounting-finance-assistant' },

  { id:15, name:'Deepak Rao', city:'Hubli', blurb:'Wants sales BUT speaking confidence low (disqualifier stress)',
    seed:{fullName:'Deepak Rao',city:'Hubli',educationStream:'open',degreeName:'BA'},
    routing:{r1:'r1_a',r2:'r2_c',r3:'r3_c',r4:'r4_d',r5:'r5_a'},
    tieBreaker:'rtb_c',
    branch:{b1:'cr_b1_c',b2:'cr_b2_c',b3:'cr_b3_c',b4:'cr_b4_c'},
    expectedCluster:'creative',expectedRole:'sales-support' },

  { id:16, name:'Ritu Bansal', city:'Ludhiana', blurb:'All-rounder, answers spread across everything (low confidence test)',
    seed:{fullName:'Ritu Bansal',city:'Ludhiana',educationStream:'open',degreeName:'BA'},
    routing:{r1:'r1_b',r2:'r2_b',r3:'r3_b',r4:'r4_b',r5:'r5_b'},
    tieBreaker:'rtb_d',
    branch:{b1:'an_b1_a',b2:'an_b2_a',b3:'an_b3_a',b4:'an_b4_a'},
    expectedCluster:'analytical',expectedRole:'operations-analyst' },

  { id:17, name:'Manish Tiwari', city:'Jabalpur', blurb:'Science grad, analytical + strong numbers',
    seed:{fullName:'Manish Tiwari',city:'Jabalpur',educationStream:'science',degreeName:'BSc'},
    routing:{r1:'r1_d',r2:'r2_d',r3:'r3_a',r4:'r4_c',r5:'r5_b'},
    branch:{b1:'an_b1_a',b2:'an_b2_a',b3:'an_b3_a',b4:'an_b4_a'},
    expectedCluster:'analytical',expectedRole:'operations-analyst' },

  { id:18, name:'Shabnam Sheikh', city:'Aligarh', blurb:'Healthcare grad but wants desk/data work (stream vs choice tension)',
    seed:{fullName:'Shabnam Sheikh',city:'Aligarh',educationStream:'healthcare',degreeName:'BPharm'},
    routing:{r1:'r1_c',r2:'r2_b',r3:'r3_a',r4:'r4_c',r5:'r5_c'},
    branch:{b1:'do_b1_a',b2:'do_b2_a',b3:'do_b3_a',b4:'do_b4_a'},
    expectedCluster:'desk-ops',expectedRole:'data-entry-mis' },

  { id:19, name:'Gaurav Pandey', city:'Varanasi', blurb:'Confident talker, analytical bent, mixed',
    seed:{fullName:'Gaurav Pandey',city:'Varanasi',educationStream:'commerce',degreeName:'BCom'},
    routing:{r1:'r1_d',r2:'r2_a',r3:'r3_a',r4:'r4_a',r5:'r5_b'},
    tieBreaker:'rtb_d',
    branch:{b1:'an_b1_a',b2:'an_b2_a',b3:'an_b3_a',b4:'an_b4_a'},
    expectedCluster:'analytical',expectedRole:'operations-analyst' },

  { id:20, name:'Lakshmi Iyer', city:'Madurai', blurb:'Arts grad, empathetic, leans counselling',
    seed:{fullName:'Lakshmi Iyer',city:'Madurai',educationStream:'arts-humanities',degreeName:'BA'},
    routing:{r1:'r1_a',r2:'r2_a',r3:'r3_c',r4:'r4_b',r5:'r5_a'},
    branch:{b1:'pf_b1_b',b2:'pf_b2_b',b3:'pf_b3_b',b4:'pf_b4_b'},
    expectedCluster:'people-facing',expectedRole:'academic-counsellor' },

  { id:21, name:'Dr. Neeraj Menon', city:'Kozhikode', blurb:'MBBS grad, likes structured remote healthcare support but not clerical-only work',
    seed:{fullName:'Neeraj Menon',city:'Kozhikode',educationStream:'healthcare',degreeName:'MBBS'},
    routing:{r1:'r1_a',r2:'r2_b',r3:'r3_d',r4:'r4_c',r5:'r5_a'},
    branch:{b1:'pf_b1_a',b2:'pf_b2_a',b3:'pf_b3_d',b4:'pf_b4_a'},
    expectedCluster:'people-facing',expectedRole:'customer-support' },

  { id:22, name:'Aarav Sethi', city:'Delhi', blurb:'LLB grad, compliance-leaning, wants rule review over routine records',
    seed:{fullName:'Aarav Sethi',city:'Delhi',educationStream:'law',degreeName:'LLB'},
    routing:{r1:'r1_c',r2:'r2_b',r3:'r3_b',r4:'r4_c',r5:'r5_c'},
    branch:{b1:'do_b1_c',b2:'do_b2_c',b3:'do_b3_c',b4:'do_b4_c'},
    expectedCluster:'desk-ops',expectedRole:'legal-compliance-operations' },

  { id:23, name:'Tanvi Kulkarni', city:'Pune', blurb:'B.Tech grad, analytical, strong spreadsheet and accuracy signals',
    seed:{fullName:'Tanvi Kulkarni',city:'Pune',educationStream:'science',degreeName:'B.Tech'},
    routing:{r1:'r1_d',r2:'r2_d',r3:'r3_a',r4:'r4_c',r5:'r5_b'},
    branch:{b1:'an_b1_a',b2:'an_b2_a',b3:'an_b3_a',b4:'an_b4_a'},
    expectedCluster:'analytical',expectedRole:'operations-analyst' },
];
