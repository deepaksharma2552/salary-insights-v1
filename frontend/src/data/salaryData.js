// ─── SALARY DATA ───
// Replace these with real API calls: GET /api/public/salaries
export const SALARIES = [
  { id:0, company:'Google',    compAbbr:'G',  compColor:'#3ecfb0', compBg:'rgba(62,207,176,0.15)',   compInd:'Big Tech',       role:'Software Engineer III',   internalLevel:'L5',      level:'senior', location:'Bengaluru', exp:'5–8 yrs', yoe:'6 years',  empType:'Full-time', base:'₹52L',  bonus:'₹8L',  equity:'₹24L', tc:'₹84L',    status:'approved', recordedAt:'12 Mar 2025, 10:42 AM', notes:'Offer post-negotiation. Total stock grant ₹96L vesting over 4 years. Joining bonus ₹4L.' },
  { id:1, company:'Microsoft', compAbbr:'M',  compColor:'#d4a853', compBg:'rgba(212,168,83,0.15)',   compInd:'Big Tech',       role:'Software Development Engineer II', internalLevel:'SDE-II', level:'mid', location:'Hyderabad', exp:'3–5 yrs', yoe:'4 years', empType:'Full-time', base:'₹38L', bonus:'₹5L', equity:'₹12L', tc:'₹55L', status:'approved', recordedAt:'10 Mar 2025, 3:15 PM', notes:'Salary band confirmed during final round debrief. Stock vests over 4 years with 25% cliff.' },
  { id:2, company:'Amazon',    compAbbr:'A',  compColor:'#e05c7a', compBg:'rgba(224,92,122,0.15)',   compInd:'E-Commerce',     role:'Senior Software Development Engineer', internalLevel:'SDE-III / L6', level:'senior', location:'Bengaluru', exp:'7–10 yrs', yoe:'8 years', empType:'Full-time', base:'₹64L', bonus:'₹12L', equity:'₹34L', tc:'₹1.1Cr', status:'approved', recordedAt:'8 Mar 2025, 9:00 AM', notes:'Sign-on ₹10L included. RSU grant ₹1.36Cr total vesting quarterly. Role: Prime Video backend.' },
  { id:3, company:'Flipkart',  compAbbr:'F',  compColor:'#a08ff0', compBg:'rgba(160,144,240,0.15)',  compInd:'E-Commerce',     role:'Senior Software Development Engineer', internalLevel:'SDE-3', level:'lead', location:'Bengaluru', exp:'8–12 yrs', yoe:'9 years', empType:'Full-time', base:'₹46L', bonus:'₹7L', equity:'₹15L', tc:'₹68L', status:'pending', recordedAt:'6 Mar 2025, 2:30 PM', notes:'Pending admin verification. Equity is ESOPs valued at current pre-IPO price.' },
  { id:4, company:'Zepto',     compAbbr:'Z',  compColor:'#3ecfb0', compBg:'rgba(62,207,176,0.15)',   compInd:'Quick Commerce', role:'Engineering Lead',         internalLevel:'EM-2',    level:'lead',   location:'Mumbai',    exp:'6–9 yrs', yoe:'7 years',  empType:'Full-time', base:'₹55L',  bonus:'₹10L', equity:'₹25L', tc:'₹90L',    status:'approved', recordedAt:'5 Mar 2025, 11:00 AM', notes:'Startup equity highly variable; valued at Series D price. Fast growth role with P&L ownership.' },
  { id:5, company:'Razorpay',  compAbbr:'R',  compColor:'#e89050', compBg:'rgba(232,144,80,0.15)',   compInd:'Fintech',        role:'Software Development Engineer II', internalLevel:'SDE-2', level:'mid', location:'Bengaluru', exp:'3–6 yrs', yoe:'4 years', empType:'Full-time', base:'₹28L', bonus:'₹4L', equity:'₹10L', tc:'₹42L', status:'approved', recordedAt:'3 Mar 2025, 4:45 PM', notes:'ESOP grant vesting 4 years. Fintech domain — payments infra team.' },
  { id:6, company:'Google',    compAbbr:'G',  compColor:'#3ecfb0', compBg:'rgba(62,207,176,0.15)',   compInd:'Big Tech',       role:'Software Engineer II',     internalLevel:'L4',      level:'junior', location:'Bengaluru', exp:'1–3 yrs', yoe:'2 years',  empType:'Full-time', base:'₹24L',  bonus:'₹4L',  equity:'₹10L', tc:'₹38L',    status:'approved', recordedAt:'1 Mar 2025, 9:30 AM', notes:'New grad offer from campus (IIT). Signing bonus ₹3L. Noogler training 6 weeks.' },
  { id:7, company:'Swiggy',    compAbbr:'Sw', compColor:'#d4a853', compBg:'rgba(212,168,83,0.15)',   compInd:'Food Tech',      role:'Senior Software Engineer', internalLevel:'IC-4',    level:'senior', location:'Bengaluru', exp:'5–7 yrs', yoe:'6 years',  empType:'Full-time', base:'₹32L',  bonus:'₹5L',  equity:'₹11L', tc:'₹48L',    status:'approved', recordedAt:'28 Feb 2025, 6:10 PM', notes:'Team: Maps & logistics. ESOP strike price significantly below current 409A valuation.' },
  { id:8, company:'PhonePe',   compAbbr:'P',  compColor:'#c07df0', compBg:'rgba(192,125,240,0.15)',  compInd:'Fintech',        role:'Software Development Engineer I', internalLevel:'SDE-1', level:'junior', location:'Bengaluru', exp:'0–2 yrs', yoe:'1.5 years', empType:'Full-time', base:'₹14L', bonus:'₹2L', equity:'₹2L', tc:'₹18L', status:'approved', recordedAt:'25 Feb 2025, 1:00 PM', notes:'Entry level offer. ESOPs granted on 1-year cliff. Role in payments core team.' },
  { id:9, company:'Meesho',    compAbbr:'Me', compColor:'#3ecfb0', compBg:'rgba(62,207,176,0.15)',   compInd:'E-Commerce',     role:'Staff Engineer',           internalLevel:'SDE-Staff', level:'lead', location:'Bengaluru', exp:'10+ yrs', yoe:'11 years', empType:'Full-time', base:'₹68L', bonus:'₹10L', equity:'₹22L', tc:'₹1.0Cr', status:'pending', recordedAt:'22 Feb 2025, 10:15 AM', notes:'Pending verification. Stock is pre-IPO. Total grant ₹88L vesting over 4 years with accelerator clause.' },
];

// ─── COMPANIES DATA ───
// Replace with real API calls: GET /api/public/companies
export const ALL_COMPANIES = [
  { name: 'Zepto',         industry: 'Quick Commerce', abbr: 'Z',  color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 128,  avgBase: '₹36.8L', avgTC: '₹56.2L',  updatedLabel: '2h ago'  },
  { name: 'Google',        industry: 'Big Tech',        abbr: 'G',  color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 842,  avgBase: '₹48.2L', avgTC: '₹82.4L',  updatedLabel: '5h ago'  },
  { name: 'Razorpay',      industry: 'Fintech',         abbr: 'R',  color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',    entries: 302,  avgBase: '₹30.2L', avgTC: '₹48.8L',  updatedLabel: '8h ago'  },
  { name: 'Amazon',        industry: 'E-Commerce',      abbr: 'A',  color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',    entries: 785,  avgBase: '₹44.8L', avgTC: '₹84.2L',  updatedLabel: '12h ago' },
  { name: 'PhonePe',       industry: 'Fintech',         abbr: 'P',  color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',   entries: 218,  avgBase: '₹26.8L', avgTC: '₹38.2L',  updatedLabel: '1d ago'  },
  { name: 'Microsoft',     industry: 'Big Tech',        abbr: 'M',  color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',    entries: 612,  avgBase: '₹38.6L', avgTC: '₹59.1L',  updatedLabel: '1d ago'  },
  { name: 'Swiggy',        industry: 'Food Tech',       abbr: 'Sw', color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',    entries: 248,  avgBase: '₹28.6L', avgTC: '₹42.4L',  updatedLabel: '2d ago'  },
  { name: 'Meesho',        industry: 'E-Commerce',      abbr: 'Me', color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 184,  avgBase: '₹24.4L', avgTC: '₹34.8L',  updatedLabel: '2d ago'  },
  { name: 'Flipkart',      industry: 'E-Commerce',      abbr: 'F',  color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',   entries: 534,  avgBase: '₹32.4L', avgTC: '₹48.6L',  updatedLabel: '3d ago'  },
  { name: 'CRED',          industry: 'Fintech',         abbr: 'CR', color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',    entries: 96,   avgBase: '₹34.0L', avgTC: '₹52.0L',  updatedLabel: '3d ago'  },
  { name: 'Paytm',         industry: 'Fintech',         abbr: 'Pa', color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',    entries: 316,  avgBase: '₹22.4L', avgTC: '₹30.2L',  updatedLabel: '4d ago'  },
  { name: 'Ola',           industry: 'Mobility',        abbr: 'Ol', color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',   entries: 142,  avgBase: '₹20.8L', avgTC: '₹28.6L',  updatedLabel: '5d ago'  },
  { name: 'Dunzo',         industry: 'Quick Commerce',  abbr: 'D',  color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 58,   avgBase: '₹18.2L', avgTC: '₹24.4L',  updatedLabel: '6d ago'  },
  { name: 'Nykaa',         industry: 'E-Commerce',      abbr: 'Ny', color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',    entries: 112,  avgBase: '₹21.6L', avgTC: '₹30.8L',  updatedLabel: '1w ago'  },
  { name: 'Groww',         industry: 'Fintech',         abbr: 'Gr', color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',   entries: 168,  avgBase: '₹28.4L', avgTC: '₹40.2L',  updatedLabel: '1w ago'  },
  { name: 'Zomato',        industry: 'Food Tech',       abbr: 'Zo', color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',    entries: 294,  avgBase: '₹26.0L', avgTC: '₹38.4L',  updatedLabel: '1w ago'  },
  { name: "Byju's",        industry: 'EdTech',          abbr: 'By', color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',    entries: 228,  avgBase: '₹18.8L', avgTC: '₹24.2L',  updatedLabel: '2w ago'  },
  { name: 'Freshworks',    industry: 'SaaS',            abbr: 'Fr', color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 382,  avgBase: '₹24.6L', avgTC: '₹36.8L',  updatedLabel: '2w ago'  },
  { name: 'Zoho',          industry: 'SaaS',            abbr: 'Zh', color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',   entries: 446,  avgBase: '₹16.4L', avgTC: '₹20.8L',  updatedLabel: '2w ago'  },
  { name: 'InMobi',        industry: 'AdTech',          abbr: 'In', color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',    entries: 88,   avgBase: '₹22.8L', avgTC: '₹34.4L',  updatedLabel: '3w ago'  },
  { name: 'Unacademy',     industry: 'EdTech',          abbr: 'Un', color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',    entries: 74,   avgBase: '₹19.2L', avgTC: '₹26.0L',  updatedLabel: '3w ago'  },
  { name: 'Dream11',       industry: 'Gaming',          abbr: 'Dr', color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',   entries: 66,   avgBase: '₹30.4L', avgTC: '₹46.2L',  updatedLabel: '1mo ago' },
  { name: 'ShareChat',     industry: 'Social Media',    abbr: 'SC', color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',    entries: 54,   avgBase: '₹24.8L', avgTC: '₹36.4L',  updatedLabel: '1mo ago' },
  { name: 'Lenskart',      industry: 'D2C',             abbr: 'Le', color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',    entries: 48,   avgBase: '₹20.4L', avgTC: '₹28.8L',  updatedLabel: '1mo ago' },
  { name: 'BrowserStack',  industry: 'SaaS',            abbr: 'BS', color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',   entries: 134,  avgBase: '₹26.2L', avgTC: '₹38.0L',  updatedLabel: '2mo ago' },
];

// ─── BADGE HELPERS ───
export const LEVEL_BADGE_CLASS = {
  junior: 'badge badge-level-junior',
  mid:    'badge badge-level-mid',
  senior: 'badge badge-level-senior',
  lead:   'badge badge-level-lead',
};

export const STATUS_BADGE_CLASS = {
  approved: 'status-badge status-approved',
  pending:  'status-badge status-pending',
  rejected: 'status-badge status-rejected',
};

export const STATUS_LABEL = {
  approved: '✓ Verified',
  pending:  '⧗ Pending',
  rejected: '✕ Rejected',
};

// ─── DATE HELPERS ───
export function parseRecordedAt(str) {
  // Format: "12 Mar 2025, 10:42 AM"
  return new Date(str.replace(',', ''));
}

export function getRecentSalaries(limit = 10) {
  return [...SALARIES]
    .sort((a, b) => parseRecordedAt(b.recordedAt) - parseRecordedAt(a.recordedAt))
    .slice(0, limit);
}
