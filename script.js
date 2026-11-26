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

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
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

async function deleteDonorById(donorId) {
  if (!db) {
    setMessage("تعذر الاتصال بقاعدة البيانات.", true);
    return;
  }

  const donor = allDonors.find((d) => String(d.id) === String(donorId));
  if (!donor) {
    setMessage("لم يتم العثور على سجل المتبرع.", true);
    return;
  }

  const enteredName = prompt(
    `لحذف سجل المتبرع (${donor.full_name})، يرجى كتابة الاسم المسجل بالضبط للتأكيد:`
  );

  if (enteredName === null) {
    return;
  }

  if (normalizeName(enteredName) !== normalizeName(donor.full_name)) {
    alert("الاسم المدخل لا يطابق الاسم المسجل. تم إلغاء عملية الحذف.");
    return;
  }

  const confirmDelete = confirm(
    `هل أنت متأكد من حذف بيانات (${donor.full_name}) نهائياً من منصة WAZIRI؟`
  );
  if (!confirmDelete) {
    return;
  }

  setMessage("جاري حذف السجل...", false);

  const { error } = await db.from(TABLE_NAME).delete().eq("id", donor.id);

  if (error) {
    console.error("Error deleting donor:", error);
    setMessage("فشل حذف البيانات: " + error.message, true);
    return;
  }

  setMessage("تم حذف بيانات المتبرع بنجاح.", false);
  await loadDonors();
}

window.deleteDonorById = deleteDonorById;

function renderDonors(donors) {
  if (!donorsList) return;

  const selectedBlood = bloodFilter ? bloodFilter.value : "ALL";
  const filtered =
    !selectedBlood || selectedBlood === "ALL"
      ? donors
      : donors.filter((d) => d.blood_type === selectedBlood);

  if (!filtered || filtered.length === 0) {
    donorsList.innerHTML =
      '<p class="empty-state text-slate-500 text-sm">لا يوجد متبرعون مطابقون حالياً.</p>';
    return;
  }

  donorsList.innerHTML = filtered
    .map((donor) => {
      const ready =
        donor.is_available === false
          ? false
          : isDonorReady(donor.last_donation_date);
      const statusText = ready ? "جاهز للتبرع" : "غير جاهز حالياً";
      const statusClass = ready
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

      const cleanCall = cleanPhoneNumber(donor.phone);
      const cleanWa = cleanPhoneNumber(donor.whatsapp_phone || donor.phone).replace(
        /^\+/,
        ""
      );

      const callBtn = cleanCall
        ? `<a href="tel:${escapeHtml(cleanCall)}" class="inline-flex items-center justify-center bg-red-800 hover:bg-red-900 text-white text-sm font-bold px-4 py-2 rounded-xl transition">اتصال</a>`
        : "";
      const waBtn = cleanWa
        ? `<a href="https://wa.me/${escapeHtml(cleanWa)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition">واتساب</a>`
        : "";

      const lastDonationText = donor.last_donation_date
        ? `آخر تبرع: ${escapeHtml(donor.last_donation_date)}`
        : "لم يتبرع من قبل";

      const medicalNotesText = donor.medical_notes
        ? `<p class="text-sm text-slate-700 mt-1.5">ملاحظات طبية: ${escapeHtml(donor.medical_notes)}</p>`
        : "";

      const contactNotesText = donor.contact_notes
        ? `<p class="text-sm text-slate-700 mt-1.5">وقت الاتصال: ${escapeHtml(donor.contact_notes)}</p>`
        : "";

      const safeId = escapeHtml(donor.id);

      return `
        <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-extrabold text-base text-slate-900">${escapeHtml(donor.full_name)}</h3>
            <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-900">${escapeHtml(donor.blood_type)}</span>
          </div>
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusClass}">${statusText}</span>
          </div>
          <p class="text-xs text-slate-500">${lastDonationText}</p>
          ${medicalNotesText}
          ${contactNotesText}
          <div class="flex items-center flex-wrap gap-2 pt-3 mt-2 border-t border-slate-100">
            ${callBtn}
            ${waBtn}
            <button type="button" onclick="deleteDonorById('${safeId}')" class="inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold px-3.5 py-2 rounded-xl transition mr-auto">حذف بياناتي</button>
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
    const contactNotes =
      document.getElementById("contact-notes")?.value.trim() || "";
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
      contact_notes: contactNotes,
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
