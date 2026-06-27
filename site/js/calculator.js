/* ===================================================================
   PICO FINANCE — Logic คำนวณสินเชื่อ (ลดต้นลดดอก / Effective Rate)
   Input: อาชีพ + วงเงิน + จำนวนงวด  (ไม่มีอายุ)
   =================================================================== */

/** จำนวนงวดขั้นต่ำ */
const MIN_TERM = 3;

/** ผลิตภัณฑ์ที่อาชีพนี้มีสิทธิ์ใช้ (มี cap สำหรับอาชีพนั้น) */
function eligibleProducts(occId) {
  return PRODUCTS.filter((p) => p.caps[occId] != null);
}

/** วงเงินสูงสุดของอาชีพ — เพดานสูงสุดในบรรดาผลิตภัณฑ์ที่มีสิทธิ์ */
function maxLoanAmount(occId) {
  const caps = eligibleProducts(occId).map((p) => p.caps[occId]);
  return caps.length ? Math.max(...caps) : 0;
}

/** จำนวนงวดสูงสุดของอาชีพ — งวดสูงสุดในผลิตภัณฑ์ที่มีสิทธิ์ (จำกัดด้วย termCap ถ้ามี) */
function maxLoanTerm(occId) {
  const months = eligibleProducts(occId).map((p) => p.maxMonths);
  let max = months.length ? Math.max(...months) : MIN_TERM;
  const occ = OCCUPATIONS.find((o) => o.id === occId);
  if (occ && occ.termCap != null) max = Math.min(max, occ.termCap);
  return max;
}

/**
 * ผลิตภัณฑ์ที่เหมาะกับ อาชีพ + วงเงิน + งวด
 * เลือกผลิตภัณฑ์ที่อาชีพมีสิทธิ์ ดอกเบี้ยต่ำสุด ที่รองรับทั้ง
 * วงเงิน (amount ≤ cap ของอาชีพ) และงวด (months ≤ งวดสูงสุดของผลิตภัณฑ์)
 */
function productFor(occId, amount, months) {
  const sorted = eligibleProducts(occId).sort((a, b) => a.rate - b.rate);
  return (
    sorted.find((p) => amount <= p.caps[occId] && months <= p.maxMonths) ||
    sorted[sorted.length - 1] ||
    null
  );
}

/** อัตราดอกเบี้ยต่อปี (%) — อิงตามผลิตภัณฑ์ที่เหมาะกับอาชีพ+วงเงิน+งวด */
function loanRate(occId, amount, months) {
  const p = productFor(occId, amount, months);
  return p ? p.rate : 0;
}

/**
 * คำนวณยอดผ่อนรายเดือนแบบลดต้นลดดอก (PMT)
 * @param {string} occId  รหัสอาชีพ
 * @param {number} amount วงเงินกู้
 * @param {number} months จำนวนงวดที่ผู้ใช้เลือก (ถ้าไม่ระบุ ใช้งวดสูงสุด)
 * @returns {{monthly:number, total:number, interest:number, rate:number, months:number}}
 */
function calculateLoan(occId, amount, months) {
  if (months == null) months = maxLoanTerm(occId);
  const yearly = loanRate(occId, amount, months);
  const t = yearly / 100 / 12; // อัตราต่อเดือน

  let monthly;
  if (t === 0) {
    monthly = amount / months;
  } else {
    const pow = Math.pow(1 + t, months);
    monthly = (amount * t * pow) / (pow - 1);
  }
  // ปัดค่างวดขึ้นเป็นหลักสิบเต็ม (เช่น 928 → 930, 591 → 600)
  monthly = Math.ceil(monthly / 10) * 10;

  const total = monthly * months;
  return {
    monthly,
    total,
    interest: total - amount,
    rate: yearly,
    months,
  };
}

const fmtTH = (n) => n.toLocaleString("th-TH");
