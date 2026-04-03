// ===== CONFIG SUPABASE -- STAGING =====
// ⚠️ CE FICHIER EST CONFIGURÉ POUR LE STAGING -- NE PAS POUSSER EN PROD
const SUPABASE_URL = 'https://eqyqcslfvcyxdgjhvmry.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeXFjc2xmdmN5eGRnamh2bXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwNzQsImV4cCI6MjA4OTU5MjA3NH0.1OaRZHo45J_cMMdQCgR0wrqS13irrP1wBUuNe8SHrqU';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== VARIABLES GLOBALES PARTAGÉES =====
let currentUser = null;
let currentUserData = null;
let currentTab = 'dashboard';
let allDossiers = [];
let allUsers = [];
let searchQuery = '';
let filterGestionnaire = '';
let filterStatut = '';
let currentHabilitations = null;

// ===== INDICATEUR STAGING =====
const IS_STAGING = true;
const ENV_LABEL = '🧪 STAGING';
