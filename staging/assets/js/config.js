// ===== CONFIG & GLOBALS =====
const SUPABASE_URL = 'https://njhdokyenxttxjpctxeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGRva3llbnh0dHhqcGN0eGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4Njg2NTksImV4cCI6MjA1OTQ0NDY1OX0.fRETrxST05o4UPmNJcW-3EqzABvWEJiCY_-4TnHC8KM';

const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ÉTAT GLOBAL ───────────────────────────────────────────────
let currentUserData = null;
let currentTab      = 'dashboard';
let allUsers        = [];

// PAGE_SIZE exporté pour tous les modules
const PAGE_SIZE = 20;
