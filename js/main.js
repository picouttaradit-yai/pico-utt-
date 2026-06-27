/* ===================================================================
   PICO FINANCE — render เนื้อหา + interactions
   อาศัย data.js และ calculator.js (โหลดก่อนหน้านี้)
   =================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

/* ---------- Navbar (mobile toggle) ---------- */
function initNav() {
  const toggle = $(".nav-toggle");
  const mobile = $(".nav-mobile");
  if (!toggle || !mobile) return;
  toggle.addEventListener("click", () => mobile.classList.toggle("open"));
  mobile.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mobile.classList.remove("open"))
  );
}

/* ---------- Render lists ที่ขับด้วย data ---------- */
function renderFeatures() {
  const grid = $("#feature-grid");
  if (!grid) return;
  FEATURES.forEach((f) => {
    grid.appendChild(
      el(
        "div",
        "card feature-card",
        `<div class="icon">${f.icon}</div><h4>${f.title}</h4><p>${f.desc}</p>`
      )
    );
  });
}

function renderProducts() {
  const list = $("#product-list");
  if (!list) return;
  PRODUCTS.forEach((p) => {
    const card = el("div", "card card-hover product-card");
    card.style.setProperty("--bar", p.color);
    const maxCap = Math.max(...Object.values(p.caps));
    card.innerHTML = `
      <h4>${p.name}</h4>
      <div class="product-meta">
        <div class="item"><div class="v">${fmtTH(maxCap)}</div><div class="l">วงเงินสูงสุด (บาท)</div></div>
        <div class="item"><div class="v">${p.maxMonths} เดือน</div><div class="l">ผ่อนนานสุด</div></div>
        <div class="item"><div class="v">${p.rate}%</div><div class="l">ดอกเบี้ย/ปี</div></div>
      </div>
      <p class="product-note">${p.note}</p>`;
    list.appendChild(card);
  });
}

function renderQualifications() {
  const list = $("#qual-list");
  if (!list) return;
  QUALIFICATIONS.forEach((q) => {
    list.appendChild(el("div", "check-item", `<span class="tick">✓</span><p>${q}</p>`));
  });
}

function renderDocuments() {
  const grid = $("#doc-grid");
  if (!grid) return;
  DOCUMENTS.forEach((d) => {
    grid.appendChild(
      el("div", "card doc-card", `<div class="icon">${d.icon}</div><h4>${d.title}</h4><p>${d.desc}</p>`)
    );
  });
}

function renderSteps() {
  const list = $("#step-list");
  if (!list) return;
  STEPS.forEach((s, i) => {
    const item = el("div", "step-item");
    item.innerHTML = `
      <div class="step-num" style="--step-color:${s.color}">${i + 1}</div>
      <div class="step-body"><h4>${s.title}</h4><p>${s.desc}</p></div>`;
    list.appendChild(item);
  });
}

/* ---------- Calculator UI ---------- */
function initCalculator() {
  const occWrap = $("#occ-list");
  const slider = $("#amount-slider");
  const amountValue = $("#amount-value");
  const rangeMax = $("#range-max");
  const monthsSlider = $("#months-slider");
  const monthsValue = $("#months-value");
  const monthsMax = $("#months-max");
  const resultBox = $("#calc-result");
  if (!occWrap || !slider) return;

  // อาชีพที่เปิดให้เลือก (ข้ามตัวที่ตั้ง hidden: true ไว้)
  const visibleOccs = OCCUPATIONS.filter((o) => !o.hidden);

  const state = {
    occ: visibleOccs[0],
    amount: maxLoanAmount(visibleOccs[0].id),
    months: maxLoanTerm(visibleOccs[0].id),
  };

  // สร้างปุ่มอาชีพ
  visibleOccs.forEach((o) => {
    const btn = el("button", "occ-btn");
    btn.dataset.id = o.id;
    btn.innerHTML = `<span class="left">${o.icon} ${o.label}</span>
      <span class="max">สูงสุด ${fmtTH(maxLoanAmount(o.id))} ฿</span>`;
    btn.addEventListener("click", () => selectOcc(o));
    occWrap.appendChild(btn);
  });

  /** ปรับขอบเขต slider งวด ตามอาชีพอย่างเดียว แล้ว clamp ค่าให้อยู่ในช่วง */
  function syncMonths() {
    const max = maxLoanTerm(state.occ.id);
    monthsSlider.min = MIN_TERM;
    monthsSlider.max = max;
    state.months = Math.min(Math.max(state.months, MIN_TERM), max);
    monthsSlider.value = state.months;
    monthsMax.textContent = max + " เดือน";
  }

  function selectOcc(o) {
    state.occ = o;
    const maxAmt = maxLoanAmount(o.id);
    state.amount = Math.min(state.amount, maxAmt);
    slider.max = maxAmt;
    slider.value = state.amount;
    // เลือกอาชีพใหม่ → ตั้งงวดเป็นงวดสูงสุดของอาชีพนั้น
    state.months = maxLoanTerm(o.id);
    occWrap.querySelectorAll(".occ-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === o.id)
    );
    update();
  }

  slider.addEventListener("input", () => {
    state.amount = parseInt(slider.value, 10);
    // เปลี่ยนวงเงินไม่กระทบจำนวนงวด (งวดผูกกับอาชีพ) — คงงวดที่ผู้ใช้เลือกไว้
    update();
  });

  monthsSlider.addEventListener("input", () => {
    state.months = parseInt(monthsSlider.value, 10);
    update();
  });

  function update() {
    amountValue.textContent = fmtTH(state.amount);
    rangeMax.textContent = fmtTH(maxLoanAmount(state.occ.id)) + " ฿";
    syncMonths();
    monthsValue.textContent = state.months;
    const r = calculateLoan(state.occ.id, state.amount, state.months);
    resultBox.innerHTML = `
      <div class="headline">ผลการคำนวณ — ${state.occ.label}</div>
      <div class="monthly">${fmtTH(r.monthly)} <small>บาท / เดือน</small></div>
      <div class="result-grid">
        <div class="cell"><div class="v">${r.months} งวด</div><div class="l">จำนวนงวด</div></div>
        <div class="cell"><div class="v">${r.rate}%</div><div class="l">ดอกเบี้ย/ปี</div></div>
        <div class="cell"><div class="v">${fmtTH(r.interest)}</div><div class="l">ดอกเบี้ยรวม</div></div>
      </div>
      <div class="result-grid" style="grid-template-columns:1fr 1fr;margin-top:10px">
        <div class="cell"><div class="v">${fmtTH(state.amount)}</div><div class="l">วงเงินกู้</div></div>
        <div class="cell"><div class="v">${fmtTH(r.total)}</div><div class="l">ยอดรวมทั้งหมด</div></div>
      </div>
      <p class="calc-note">⚠️ หมายเหตุ: ผลการคำนวณข้างต้นเป็นเพียงการประมาณการเบื้องต้นเท่านั้น
        วงเงินและเงื่อนไขที่แท้จริงขึ้นอยู่กับการพิจารณาของบริษัท
        คำนวณแบบลดต้นลดดอก (Effective Rate)</p>`;
  }

  selectOcc(OCCUPATIONS[0]);
}

/* ---------- News page ---------- */
function renderNews() {
  const grid = $("#news-grid");
  if (!grid) return;
  if (!NEWS.length) {
    grid.appendChild(
      el("div", "news-empty", "ยังไม่มีข่าวสารในขณะนี้<br>เพิ่มข่าวได้ที่ตัวแปร <code>NEWS</code> ในไฟล์ js/data.js")
    );
    return;
  }
  NEWS.forEach((n) => {
    const card = el("div", "card news-card");
    card.innerHTML = `
      <div class="meta">
        <span class="news-tag" style="background:${n.tagColor || "#e0b84a"}">${n.tag}</span>
        <span class="news-date">${n.date}</span>
      </div>
      <h4>${n.title}</h4>
      <p>${n.desc}</p>`;
    grid.appendChild(card);
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  renderFeatures();
  renderProducts();
  renderQualifications();
  renderDocuments();
  renderSteps();
  initCalculator();
  renderNews();
});
