// ===== CONFIG & GLOBALS =====
const SUPABASE_URL = 'https://eqyqcslfvcyxdgjhvmry.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeXFjc2xmdmN5eGRnamh2bXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwNzQsImV4cCI6MjA4OTU5MjA3NH0.1OaRZHo45J_cMMdQCgR0wrqS13irrP1wBUuNe8SHrqU';

const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ÉTAT GLOBAL
let currentUserData = null;
let currentTab      = 'dashboard';
let allUsers        = [];

const PAGE_SIZE = 20;
