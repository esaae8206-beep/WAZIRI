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
      '<p class="empty-state">لا يوجد متبرعون مطابقون حالياً.</p>';
    return;
  }

  donorsList.innerHTML = filtered
    .map((donor) => {
      const ready =
        donor.is_available === false
          ? false
          : isDonorReady(donor.last_donation_date);
      const statusText = ready ? "جاهز للتبرع" : "غير جاهز حالياً";
      const statusClass = ready ? "ready" : "not-ready";

      const cleanCall = cleanPhoneNumber(donor.phone);
      const cleanWa = cleanPhoneNumber(donor.whatsapp_phone || donor.phone).replace(
        /^\+/,
        ""
      );

      const callBtn = cleanCall
        ? `<a href="tel:${escapeHtml(cleanCall)}" class="btn-call">اتصال</a>`
        : "";
      const waBtn = cleanWa
        ? `<a href="https://wa.me/${escapeHtml(cleanWa)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">واتساب</a>`
        : "";

      const lastDonationText = donor.last_donation_date
        ? `آخر تبرع: ${escapeHtml(donor.last_donation_date)}`
        : "لم يتبرع من قبل";

      const notesText = donor.medical_notes
        ? `<p class="donor-notes">ملاحظات: ${escapeHtml(donor.medical_notes)}</p>`
        : "";

      return `
        <div class="donor-card">
          <div class="donor-header">
            <h3>${escapeHtml(donor.full_name)}</h3>
            <span class="blood-badge">${escapeHtml(donor.blood_type)}</span>
          </div>
          <p class="donor-status ${statusClass}">${statusText}</p>
          <p class="donor-meta">${lastDonationText}</p>
          ${notesText}
          <div class="donor-actions">
            ${callBtn}
            ${waBtn}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadDonors() {
  if (!db) {
    setMessage("تعذر الاتصال بقاعدة البيانات (تأكد من تحميل مكتبة Supabase).", true);
    return;
  }

  const { data, error } = await db
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading donors:", error);
    setMessage("حدث خطأ أثناء تحميل قائمة المتبرعين: " + error.message, true);
    return;
  }

  allDonors = data || [];
  updateStats(allDonors);
  renderDonors(allDonors);
}

if (donorForm) {
  donorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!db) {
      setMessage("تعذر الاتصال بقاعدة البيانات.", true);
      return;
    }

    const fullName = document.getElementById("full-name")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const whatsappPhone =
      document.getElementById("whatsapp-phone")?.value.trim() || phone;
    const bloodType = document.getElementById("blood-type")?.value.trim() || "";
    const lastDonationDate =
      document.getElementById("last-donation")?.value || null;
    const medicalNotes =
      document.getElementById("medical-notes")?.value.trim() || "";
    const isAvailableEl = document.getElementById("is-available");
    const isAvailable = isAvailableEl ? Boolean(isAvailableEl.checked) : true;

    if (!fullName || !phone || !bloodType) {
      setMessage("يرجى تعبئة الاسم الكامل ورقم الهاتف وفصيلة الدم.", true);
      return;
    }

    setMessage("جاري حفظ البيانات...", false);

    const newDonor = {
      full_name: fullName,
      phone: phone,
      whatsapp_phone: whatsappPhone,
      blood_type: bloodType,
      last_donation_date: lastDonationDate || null,
      medical_notes: medicalNotes,
      is_available: isAvailable
    };

    const { error } = await db.from(TABLE_NAME).insert([newDonor]);

    if (error) {
      console.error("Error inserting donor:", error);
      setMessage("فشل حفظ البيانات: " + error.message, true);
      return;
    }

    donorForm.reset();
    setMessage("تم حفظ بيانات المتبرع بنجاح!", false);
    await loadDonors();
  });
}

if (bloodFilter) {
  bloodFilter.addEventListener("change", () => {
    renderDonors(allDonors);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadDonors();
});
