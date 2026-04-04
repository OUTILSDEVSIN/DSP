// ===== CONFIG SUPABASE -- PRODUCTION =====
const SUPABASE_URL = 'https://xwiguxvmlqskzamapyzf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aWd1eHZtbHFza3phbWFweXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODUwMTMsImV4cCI6MjA4ODc2MTAxM30.6on-JPw82PY3LZlUiHDwWlSkOt2l_rmfIsDwGPo137M';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentUserData = null;
let currentTab = 'dashboard';
let allDossiers = [];
let allUsers = [];
let searchQuery = '';
let filterGestionnaire = '';
let filterStatut = '';
let currentHabilitations = null;

const IS_STAGING = false;
const ENV_LABEL = 'PRODUCTION';
