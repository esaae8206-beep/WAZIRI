const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
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
    .replaceAll('"', "&quot;");
}

function updateStats(donors) {
  if (totalDonorsEl) totalDonorsEl.textContent = donors.length;
  if (readyDonorsEl) {
    const readyCount = donors.filter((d) => isDonorReady(d.last_donation)).length;
    readyDonorsEl.textContent = readyCount;
  }
}

function renderDonors() {
  if (!donorsList) return;
  const selectedBlood = bloodFilter ? bloodFilter.value : "ALL";
  const filtered =
    selectedBlood === "ALL"
      ? allDonors
      : allDonors.filter((d) => d.blood_type === selectedBlood);

  if (filtered.length === 0) {
    donorsList.innerHTML =
      '<p class="text-slate-500">لا يوجد متبرعون مطابقون للفلتر الحالي.</p>';
    return;
  }

  donorsList.innerHTML = filtered
    .map((donor) => {
      const ready = isDonorReady(donor.last_donation);
      const badgeClass = ready
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800";
      const badgeText = ready ? "جاهز للتبرع" : "غير جاهز حالياً";

      return `
        <div class="border rounded-
