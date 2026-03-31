/* config.js — Dispatchis v2.5.58 — Configuration Supabase STAGING */

const SUPABASE_URL = 'https://eqyqcslfvcyxdgjhvmry.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxeXFjc2xmdmN5eGRnamh2bXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwNzQsImV4cCI6MjA4OTU5MjA3NH0.1OaRZHo45J_cMMdQCgR0wrqS13irrP1wBUuNe8SHrqU';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);