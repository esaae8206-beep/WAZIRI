const SUPABASE_URL = "https://ecpstvxtgpivsvqzeqay.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Jvau7rIUasO8ThdOh4htTQ_qUvWclw5";
const TABLE_NAME = "donors";

const db = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const donorForm = document.getElementById("donor-form");
const formMessage = document.getElementById("form-message");
const donorsList = document.getElementById("donors-list");
const bloodFilter = document.getElementById("blood-filter");
const totalDonorsEl = document.getElementById("total-donors");
const readyDonorsEl = document.getElementById("ready-donors");

let allDonors = [];

function isDonorReady(lastDonationStr) {
  if (!lastDonationStr) return true;
  const lastDate = new Date(lastDonationStr);
  if (Number.isNaN(lastDate.getTime())) return true;
  const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 90;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
