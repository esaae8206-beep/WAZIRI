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
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanPhoneNumber(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function setMessage(text, isError = false) {
  if (!formMessage) return;
  formMessage.textContent = text;
  formMessage.style.color = isError ? "#dc2626" : "#16a34a";
}

function updateStats(donors) {
  const list = Array.isArray(donors) ? donors : [];
  const readyCount = list.filter((d) =>
    d.is_available === false ? false : isDonorReady(d.last_donation_date)
  ).length;

  if (totalDonorsEl) totalDonorsEl.textContent = list.length;
  if (readyDonorsEl) readyDonorsEl.textContent = readyCount;
}

function renderDonors(donors) {
  if (!donorsList) return;

  const selectedBlood = bloodFilter ? bloodFilter.value : "ALL";
  const filtered =
    !selectedBlood || selectedBlood === "ALL"
      ? donors
      : donors.filter((d) => d.blood_type === selectedBlood);

  if (!filtered || filtered.length === 0) {
    donorsList.innerHTML =
      '<p class="empty-state">لا يوجد متبر
