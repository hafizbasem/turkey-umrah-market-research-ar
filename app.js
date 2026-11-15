(function () {
  "use strict";

  const state = {
    data: null,
    activeTab: "macro",
    currency: "USD", // USD | TRY_JAN | TRY_JUN | TRY_NOV
    selectedMonth: "jan",
    scenarioPct: 16.64,
    thyView: "annual", // annual | quarterly | 9m
    agencyShareView: "excel59", // excel59 | ext69 | rep59
    emergingCityFilter: "all",
    dirTierFilter: "all",
    dirQuery: "",
    dirSort: "min_asc",
    offersSeasonFilter: "all",
    offersTypeFilter: "all",
    offersQuery: "",
    offersSort: "id",
    showAllPrograms: false,
    showAllDir: false,
    monthlyFocusSubtab: "all",
    briefGroupFilter: "all",
    sim12: { makkahNight: 85, madinahNight: 95, fixedCost: 840, occ: 4, bank: "none", inst: 1 },
    simBusPax: 32,
    simMetaSpend: 1200,
    simMetaChats: 500,
    simMetaConv: 6,
    simTaxBaseSar: 250
  };

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtInt(n) {
    if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
    return Math.round(Number(n)).toLocaleString("en-US");
  }

  function fmtDec(n, digits = 2) {
    if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function fxRate() {
    if (!state.data) return 1;
    const m = state.data.meta;
    if (state.currency === "TRY_JAN") return m.usd_try_jan;
    if (state.currency === "TRY_JUN") return m.usd_try_jun;
    if (state.currency === "TRY_NOV") return m.usd_try_nov;
    return 1;
  }

  function fmtUsdOrTry(usdVal, decimals = 0) {
    if (usdVal === null || usdVal === undefined || usdVal === "" || Number.isNaN(Number(usdVal))) return "—";
    const val = Number(usdVal);
    if (state.currency === "USD") {
      return decimals ? `$${fmtDec(val, decimals)}` : `$${fmtInt(val)}`;
    }
    const tryVal = val * fxRate();
    return `${fmtInt(tryVal)} TL`;
  }

  function dualMoney(usdVal) {
    if (usdVal === null || usdVal === undefined || usdVal === "") return "—";
    if (state.currency === "USD") return `$${fmtInt(usdVal)}`;
    return `${fmtInt(usdVal * fxRate())} TL <small class="num">($${fmtInt(usdVal)})</small>`;
  }

  function openDrawer(kicker, title, htmlBody) {
    document.getElementById("drawer-kicker").textContent = kicker;
    document.getElementById("drawer-title").textContent = title;
    document.getElementById("drawer-body").innerHTML = htmlBody;
    document.getElementById("drawer-backdrop").classList.remove("hidden");
    document.getElementById("detail-drawer").classList.remove("hidden");
  }

  function closeDrawer() {
    document.getElementById("drawer-backdrop").classList.add("hidden");
    document.getElementById("detail-drawer").classList.add("hidden");
  }

  // Native-RTL Horizontal Bar Infographic
  function buildHBarSvg(items, opts) {
    const maxVal = Math.max(1, ...items.map((d) => Number(d.val) || 0));
    const rows = items.map((d) => {
      const pct = Math.max(2, Math.min(100, Math.round(((Number(d.val) || 0) / maxVal) * 100)));
      const cls = d.highlight
        ? "is-hi"
        : d.color === "#9e2a2b"
          ? "is-red"
          : d.color === "#5a6a64"
            ? "is-muted"
            : "";
      return `
        <div class="hbar-row ${cls}">
          <div class="hbar-meta">
            <span class="hbar-lbl">${esc(d.label)}</span>
            <span class="hbar-val">${esc(d.valLabel)}</span>
          </div>
          <div class="hbar-track" role="progressbar" aria-valuenow="${Number(d.val) || 0}" aria-valuemin="0" aria-valuemax="${maxVal}">
            <div class="hbar-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join("");
    return `<div class="hbar-list" aria-label="${esc(opts.aria || "مخطط بياني")}">${rows}</div>`;
  }

  // SVG Whisker Chart for Monthly H1 2026 + Mobile Barbell Morph
  function buildMonthlyWhiskerSvg(months) {
    const W = 760, H = 300;
    const padL = 56, padR = 24, padT = 28, padB = 50;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxUsd = 3000;
    const yOf = (v) => padT + plotH - (v / maxUsd) * plotH;
    const colW = plotW / months.length;

    let grid = "";
    [0, 1000, 1500, 2000, 2500, 3000].forEach((tick) => {
      const y = yOf(tick);
      grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5dfd3" stroke-dasharray="3,3" />
               <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5a6a64">$${fmtInt(tick)}</text>`;
    });

    let cols = "";
    months.forEach((m, i) => {
      const cx = padL + i * colW + colW / 2;
      const isSelected = state.selectedMonth === m.key;
      const bgHighlight = isSelected ? `<rect x="${padL + i * colW + 4}" y="${padT - 8}" width="${colW - 8}" height="${plotH + 14}" rx="8" fill="rgba(201, 151, 56, 0.14)" stroke="#c99738" stroke-width="1.5" />` : "";

      if (m.key === "may") {
        cols += `<g class="svg-bar-interactive" data-select-month="may">
          ${bgHighlight}
          <rect x="${cx - 32}" y="${yOf(460)}" width="64" height="${yOf(0) - yOf(460)}" rx="6" fill="#fbeaea" stroke="#9e2a2b" />
          <text x="${cx}" y="${yOf(230)}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#9e2a2b">إغلاق (0$)</text>
          <text x="${cx}" y="${H - 20}" text-anchor="middle" font-size="13" font-weight="700" fill="#9e2a2b">${esc(m.short)}</text>
          <text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="11" fill="#9e2a2b">(0 عروض)</text>
        </g>`;
        return;
      }

      const yMax = yOf(m.atlas_max);
      const yMin = yOf(m.atlas_min);
      const yMed = yOf(m.atlas_median);
      const medBadgeW = 50;
      cols += `<g class="svg-bar-interactive" data-select-month="${esc(m.key)}">
        ${bgHighlight}
        <line x1="${cx}" y1="${yMax}" x2="${cx}" y2="${yMin}" stroke="#0d5c46" stroke-width="4" stroke-linecap="round" />
        <rect x="${cx - 12}" y="${yMax - 2}" width="24" height="4" rx="2" fill="#0d5c46" />
        <rect x="${cx - 12}" y="${yMin - 2}" width="24" height="4" rx="2" fill="#0d5c46" />
        <circle cx="${cx}" cy="${yMed}" r="7" fill="#c99738" stroke="#ffffff" stroke-width="2" />
        <text x="${cx}" y="${yMax - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#2d3e38">$${fmtInt(m.atlas_max)}</text>
        <text x="${cx}" y="${yMin + 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#5a6a64">$${fmtInt(m.atlas_min)}</text>
        <rect x="${cx + 9}" y="${yMed - 9}" width="${medBadgeW}" height="18" rx="4" fill="#0f2c23" />
        <text x="${cx + 9 + medBadgeW / 2}" y="${yMed + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#f5deb0">$${fmtInt(m.atlas_median)}</text>
        <text x="${cx}" y="${H - 20}" text-anchor="middle" font-size="13" font-weight="${isSelected ? "800" : "600"}" fill="#0f2c23">${esc(m.short)}</text>
        <text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="11" fill="#5a6a64">(${m.sample_n} عرضًا)</text>
      </g>`;
    });

    const minAxis = 900, maxAxis = 2900;
    const toPct = (v) => Math.max(2, Math.min(98, Math.round(((v - minAxis) / (maxAxis - minAxis)) * 100)));
    const barbellRows = months.map((m) => {
      const isSelected = state.selectedMonth === m.key;
      if (m.key === "may") {
        return `
          <div class="h1-barbell-row ${isSelected ? "active" : ""}" data-select-month="may" style="border-color:#e9b7b7;background:#fef6f6;">
            <div class="h1-barbell-top">
              <span class="h1-barbell-month" style="color:#9e2a2b;">${esc(m.short)} (الحج 1447)</span>
              <span class="h1-barbell-med" style="background:#fbeaea;color:#9e2a2b;">إغلاق (0$)</span>
            </div>
            <div class="h1-barbell-bounds"><span>0 عروض معتمدة — تعليق تأشيرات العمرة لموسم الحج</span></div>
          </div>`;
      }
      const leftP = toPct(m.atlas_min);
      const rightP = toPct(m.atlas_max);
      const medP = toPct(m.atlas_median);
      return `
        <div class="h1-barbell-row ${isSelected ? "active" : ""}" data-select-month="${esc(m.key)}">
          <div class="h1-barbell-top">
            <span class="h1-barbell-month">${esc(m.short)} (${m.sample_n} عرضًا)</span>
            <span class="h1-barbell-med">الوسيط: ${fmtUsdOrTry(m.atlas_median)}</span>
          </div>
          <div class="h1-barbell-track">
            <span class="h1-barbell-span" style="left:${leftP}%;width:${Math.max(4, rightP - leftP)}%;"></span>
            <span class="h1-barbell-pin" style="left:${medP}%;" title="الوسيط ${fmtUsdOrTry(m.atlas_median)}"></span>
          </div>
          <div class="h1-barbell-bounds" style="direction:ltr;">
            <span dir="rtl">الأدنى: <strong class="num" dir="ltr">${fmtUsdOrTry(m.atlas_min)}</strong></span>
            <span dir="rtl">الأعلى: <strong class="num" dir="ltr">${fmtUsdOrTry(m.atlas_max)}</strong></span>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="h1-desktop-svg">
        <svg class="chart-svg" style="direction:ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="تطور أسعار العمرة في النصف الأول 2026">${grid}${cols}</svg>
      </div>
      <div class="h1-barbell-list">${barbellRows}</div>`;
  }

  // SVG Chart: Break-even Lines (18.75 Pure vs 32 Adjusted for POS & Risk)
  function buildBreakEvenSvg(selectedPax) {
    const isCompact = window.innerWidth <= 640;
    const W = isCompact ? 344 : 740;
    const H = isCompact ? 228 : 256;
    const padL = isCompact ? 56 : 64;
    const padR = isCompact ? 34 : 38;
    const padT = 26, padB = 38;
    const fs = isCompact ? 12 : 13;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const minP = 10, maxP = 45;
    const minNet = -6000, maxNet = 12000;
    const xOf = (p) => padL + ((p - minP) / (maxP - minP)) * plotW;
    const yOf = (n) => padT + ((maxNet - n) / (maxNet - minNet)) * plotH;

    let purePts = [], adjPts = [];
    for (let p = minP; p <= maxP; p += 1) {
      const pureNet = p * 400 - 7500;
      const adjNet = p * 400 - 12800;
      purePts.push(`${xOf(p).toFixed(1)},${yOf(pureNet).toFixed(1)}`);
      adjPts.push(`${xOf(p).toFixed(1)},${yOf(adjNet).toFixed(1)}`);
    }

    const yZero = yOf(0);
    const curX = xOf(selectedPax);
    const curPure = selectedPax * 400 - 7500;
    const curAdj = selectedPax * 400 - 12800;

    const pureCapW = isCompact ? 82 : 136;
    const adjCapW = isCompact ? 102 : 162;
    const pureCapX = Math.max(padL + 2, xOf(18.75) - pureCapW - 6);
    const adjCapX = Math.min(W - padR - adjCapW, xOf(32) + 6);
    const pureLbl = isCompact ? "بحت: 18.75" : "تشغيل بحت: 18.75 (19)";
    const adjLbl = isCompact ? "فعلي: 32 (71%)" : "التعادل الحقيقي: 32 (71%)";

    return `<svg class="chart-svg" style="direction:ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="نقطة التعادل 18.75 مقابل 32 معتمرًا">
      <line x1="${padL}" y1="${yZero}" x2="${W - padR}" y2="${yZero}" stroke="#0f2c23" stroke-width="1.5" stroke-dasharray="4,3" />
      <text x="${padL - 6}" y="${yZero + 4}" text-anchor="end" font-size="${fs}" font-weight="700" fill="#0f2c23">$0</text>
      <text x="${padL - 6}" y="${yOf(10000) + 4}" text-anchor="end" font-size="${fs}" fill="#0d5c46">+$10k</text>
      <text x="${padL - 6}" y="${yOf(-5000) + 4}" text-anchor="end" font-size="${fs}" fill="#9e2a2b">-$5k</text>

      <polyline fill="none" stroke="#0d5c46" stroke-width="2.8" points="${purePts.join(" ")}" />
      <polyline fill="none" stroke="#9e2a2b" stroke-width="2.8" stroke-dasharray="6,4" points="${adjPts.join(" ")}" />

      <circle cx="${xOf(18.75)}" cy="${yZero}" r="5.5" fill="#0d5c46" stroke="#fff" stroke-width="2" />
      <rect x="${pureCapX}" y="${yZero - 28}" width="${pureCapW}" height="20" rx="5" fill="#e7f6ee" stroke="#0d5c46" stroke-width="1" />
      <text x="${pureCapX + pureCapW / 2}" y="${yZero - 14}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#0d5c46">${pureLbl}</text>

      <circle cx="${xOf(32)}" cy="${yZero}" r="5.5" fill="#9e2a2b" stroke="#fff" stroke-width="2" />
      <rect x="${adjCapX}" y="${yZero + 9}" width="${adjCapW}" height="20" rx="5" fill="#fbeaea" stroke="#9e2a2b" stroke-width="1" />
      <text x="${adjCapX + adjCapW / 2}" y="${yZero + 23}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#9e2a2b">${adjLbl}</text>

      <line x1="${curX}" y1="${padT}" x2="${curX}" y2="${H - padB}" stroke="#c99738" stroke-width="2" />
      <circle cx="${curX}" cy="${yOf(curPure)}" r="5" fill="#c99738" />
      <circle cx="${curX}" cy="${yOf(curAdj)}" r="5" fill="#c99738" />

      <text x="${xOf(15)}" y="${H - 12}" text-anchor="middle" font-size="${fs}" fill="#5a6a64">15</text>
      <text x="${xOf(25)}" y="${H - 12}" text-anchor="middle" font-size="${fs}" fill="#5a6a64">25</text>
      <text x="${xOf(32)}" y="${H - 12}" text-anchor="middle" font-size="${fs}" fill="#5a6a64">32</text>
      <text x="${W - 4}" y="${H - 12}" text-anchor="end" font-size="${fs}" fill="#5a6a64">45 (100%)</text>
    </svg>`;
  }

  function buildCoachSeatMapHtml(selectedPax) {
    let seats = "";
    for (let s = 1; s <= 45; s++) {
      let cls = "is-empty";
      if (s === 19) cls = "is-be-pure";
      else if (s === 32) cls = "is-be-adj";
      else if (s <= selectedPax) {
        cls = s < 19 ? "is-loss" : s < 32 ? "is-warn" : "is-profit";
      }
      seats += `<button type="button" class="coach-seat ${cls}" data-seat="${s}" title="مقعد ${s} من 45">${s}</button>`;
    }
    return `
      <div class="coach-map-wrap">
        <div class="coach-map-head">
          <span>خريطة إشغال حافلة 45 مقعدًا (اضغط أي مقعد لاختبار التعادل)</span>
          <span class="num">${selectedPax} / 45 مقعدًا</span>
        </div>
        <div class="coach-grid">${seats}</div>
        <div class="coach-legend">
          <span class="coach-leg-item"><span class="coach-dot" style="background:#fbeaea;border:1px solid #e9b7b7;"></span>خسارة (1–18)</span>
          <span class="coach-leg-item"><span class="coach-dot" style="background:#e4f3ed;border:2px solid #0d5c46;"></span>تعادل بحت (19)</span>
          <span class="coach-leg-item"><span class="coach-dot" style="background:#fdf3e2;border:1px solid #e6c68a;"></span>منطقة حرجة (20–31)</span>
          <span class="coach-leg-item"><span class="coach-dot" style="background:#c99738;"></span>تعادل حقيقي (32)</span>
          <span class="coach-leg-item"><span class="coach-dot" style="background:#0d5c46;"></span>ربح صافي (33–45)</span>
        </div>
      </div>`;
  }

  // ==================== TAB 1: MACRO & LIVE MARKET PULSE ====================

  function renderMacroTab() {
    const D = state.data.macro;
    const sec = document.getElementById("tab-macro");

    const kpisHtml = D.kpis.map((k, idx) => `
      <article class="kpi-card tone-${esc(k.tone)}" data-kpi-idx="${idx}" tabindex="0">
        <div class="kpi-top">
          <div class="kpi-val num">${esc(k.value)}</div>
          <span class="src-tag">${esc(k.src || "رصد السوق")}</span>
        </div>
        <div>
          <div class="kpi-label">${esc(k.label)}</div>
          <div class="kpi-sub">${esc(k.sub)}</div>
        </div>
      </article>
    `).join("");

    const pepSvg = buildHBarSvg(
      D.pep_series_2022_2024.map((r) => ({
        label: `عام ${r.year} (${r.yoy})`,
        val: r.arrivals,
        valLabel: `${fmtInt(r.arrivals)} معتمر`,
        highlight: r.year === "2024"
      })),
      { aria: "السلسلة الرسمية لبرنامج ضيوف الرحمن 2022-2024" }
    );

    const top10Svg = buildHBarSvg(
      D.global_top10_2024.map((c) => ({
        label: `#${c.rank} ${c.country}`,
        val: c.count,
        valLabel: `${fmtInt(c.count)} (${c.share_pct}%)`,
        highlight: Boolean(c.highlight)
      })),
      { aria: "أكبر 10 دول مرسلة للعمرة 2024" }
    );

    const benchmarkSvg = buildHBarSvg(
      D.turkey_benchmarks_fig2.map((b) => ({
        label: b.label,
        val: b.value,
        valLabel: b.range || fmtInt(b.value),
        highlight: b.value >= 650000
      })),
      { aria: "مقارنة تقديرات السوق التركي بين المصادر" }
    );

    const hajjUmrahSvg = buildHBarSvg(
      D.hajj_vs_umrah_fig3.map((x) => ({
        label: x.tier,
        val: x.usd,
        valLabel: fmtUsdOrTry(x.usd),
        highlight: x.type === "عمرة",
        color: x.type === "حج" ? "#2d3e38" : "#0d5c46"
      })),
      { aria: "مقارنة متوسط سعر العمرة والحج" }
    );

    const ud = D.ud_live_market_nov2026;
    const udMonthsSvg = buildHBarSvg(
      ud.by_month.map((m) => ({
        label: `${m.month} (${m.firms} شركة)`,
        val: m.programs,
        valLabel: `${fmtInt(m.programs)} برنامجًا | أدنى ${fmtUsdOrTry(m.min_usd)}`,
        highlight: m.programs >= 800
      })),
      { aria: "توزيع المعروض الشهري الحي على Umre Dünyası" }
    );

    const dnorm = D.diyanet_normal_2026_2027;

    const diyH1 = 73000;
    const share = Math.max(10, Math.min(35, Number(state.scenarioPct)));
    const estTotalH1 = Math.round(diyH1 / (share / 100));
    const estPrivateH1 = estTotalH1 - diyH1;

    sec.innerHTML = `
      <div class="section-head">
        <h2>كم معتمرًا في السوق التركي؟ وكيف يتوزع الطلب والعرض؟</h2>
        <p class="section-sub">دمج الإحصاءات الرسمية (PEP · GASTAT 43.09M · ديانت 650K+) مع نبض المعروض الحي على المنصات (${fmtInt(ud.active_tours)} جولة نشطة)</p>
      </div>
      <div class="kpi-grid">${kpisHtml}</div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>الطلب التركي الموثق في السعودية (PEP 2022–2024)</h3>
          <p>قفز عدد المعتمرين القادمين من تركيا بمقدار <strong>5.24 أضعاف</strong> خلال عامين (تقرير برنامج خدمة ضيوف الرحمن).</p>
          <div class="svg-wrap">${pepSvg}</div>
          <div class="callout callout-info">مراجعة إحصائية بين إصدارَي PEP: يسجل تقرير 2024 رقم <strong>125,738</strong> لعام 2022 مقابل <strong>125,783</strong> في طبعة 2023 (فارق مراجعة طفيف قدره 45 معتمرًا فقط). كما أكد تصريح ديانت لموسم 24–25 وصول المنظّم عبر ديانت والوكالات إلى <strong>650,000</strong> يتجاوزهم السوق مع التأشيرات الفردية والسياحية.</div>
        </div>

        <div class="card">
          <h3>تركيا السابعة عالميًا ضمن أكبر 10 دول مرسلة (2024)</h3>
          <p>إجمالي العمرة من الخارج عالميًا في 2024 بلغ <strong>16.92 مليونًا</strong>؛ وتمثل تركيا قرابة <strong>3.90%</strong>.</p>
          <div class="svg-wrap">${top10Svg}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>محاكي سيناريوهات النصف الأول H1 2026</h3>
          <p>بناءً على الرقم الرسمي المؤكد لديانت (<strong>73,000</strong> معتمر في H1 2026)، حرّك حصة ديانت المفترضة لمعرفة حجم السوق الخاص والكلي الضمني:</p>
          <div class="pill-row">
            ${D.scenarios_h1.map((s) => `
              <button type="button" class="filter-pill ${Math.abs(state.scenarioPct - s.diyanet_pct) < 0.05 ? "active" : ""}" data-scen-pct="${s.diyanet_pct}">${esc(s.label)}</button>
            `).join("")}
          </div>
          <div class="control-grid">
            <div class="ctrl-field" style="grid-column: 1 / -1">
              <label for="scen-slider">حصة ديانت المفترضة من H1 2026: <span class="num" id="scen-pct-val">${share.toFixed(2)}%</span></label>
              <input id="scen-slider" type="range" min="10" max="30" step="0.1" value="${share}" />
            </div>
          </div>
          <div class="sim-results-grid sim-results-grid--3">
            <div class="sim-box"><div class="sb-lbl">ديانت المباشر (مؤكد)</div><div class="sb-val num">${fmtInt(diyH1)}</div></div>
            <div class="sim-box"><div class="sb-lbl">حصة الوكالات الخاصة (تقديري)</div><div class="sb-val num" style="color:var(--emerald)">${fmtInt(estPrivateH1)}</div></div>
            <div class="sim-box"><div class="sb-lbl">الإجمالي الضمني في H1</div><div class="sb-val num">${fmtInt(estTotalH1)}</div></div>
          </div>
          <div class="callout callout-warn">قيد القياس: نسبة ديانت (~16.6% من 650 ألفًا في 24–25) مؤشر هيكلي ولا يجوز افتراض ثباتها آليًا لكل أشهر العام دون رصد موسمي كامل.</div>
        </div>

        <div class="card">
          <h3>أطر ديانت الثلاثة غير القابلة للخلط (تجنب الجمع المزدوج)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الإطار الرسمي</th><th class="num">العدد</th><th>التفكيك والتغطية</th><th>المصدر</th></tr></thead>
              <tbody>
                ${D.diyanet_three_frames.map((f) => `
                  <tr>
                    <td><strong>${esc(f.frame)}</strong></td>
                    <td class="num"><strong>${fmtInt(f.value)}</strong></td>
                    <td>${esc(f.split)}<br><small style="color:var(--crimson)">${esc(f.warning)}</small></td>
                    <td><span class="src-tag">${esc(f.src || "ديانت")}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h3 style="margin-top:14px">النمو الفصلي في برامج ديانت (H1 2025 ← H1 2026)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>البند</th><th class="num">2025</th><th class="num">2026</th><th class="num">التغير</th></tr></thead>
              <tbody>
                ${D.diyanet_growth.map((g) => `
                  <tr>
                    <td>${esc(g.metric)}</td>
                    <td class="num">${fmtInt(g.y2025)}</td>
                    <td class="num">${fmtInt(g.y2026)}</td>
                    <td class="num"><strong>${esc(g.change)}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>نبض المعروض الحي على المنصات (رصد ${esc(ud.snapshot_date)})</h3>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">جولات نشطة حاليًا</div><div class="sb-val num" style="color:var(--emerald)">${fmtInt(ud.active_tours)}</div></div>
            <div class="sim-box"><div class="sb-lbl">منتهية / مباعة بالكامل</div><div class="sb-val num">${fmtInt(ud.sold_out_tours)}</div></div>
            <div class="sim-box"><div class="sb-lbl">الشركات النشطة الآن</div><div class="sb-val num">${fmtInt(ud.active_companies)}</div></div>
            <div class="sim-box"><div class="sb-lbl">أرضية السوق (بلا طيران/قصير)</div><div class="sb-val num">${fmtUsdOrTry(ud.global_floor_usd)}</div></div>
          </div>
          <div class="svg-wrap" style="margin-top:10px">${udMonthsSvg}</div>
          <div class="table-wrap" style="margin-top:10px">
            <table>
              <thead><tr><th>المدة</th><th class="num">البرامج النشطة</th><th class="num">أدنى سعر</th><th class="num">الوسيط</th></tr></thead>
              <tbody>
                ${ud.by_duration.map((d) => `
                  <tr><td><strong>${esc(d.label)}</strong></td><td class="num">${fmtInt(d.count)}</td><td class="num">${fmtUsdOrTry(d.min_usd)}</td><td class="num"><strong>${fmtUsdOrTry(d.median_usd)}</strong></td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="callout callout-info" style="margin-top:8px">عروض رمضان النشطة لحظة الرصد: <strong>${fmtInt(ud.ramadan_active.count)}</strong> برنامجًا عبر <strong>${fmtInt(ud.ramadan_active.firms)}</strong> شركة بحد أدنى يبدأ من <strong>${fmtUsdOrTry(ud.ramadan_active.min_usd)}</strong>.</div>
        </div>

        <div class="card">
          <h3>${esc(dnorm.title_ar)}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الفئة والمدة</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي / نطاق</th><th>التفاصيل</th></tr></thead>
              <tbody>
                ${dnorm.servisli.map((r) => `<tr><td><strong>شتل — ${r.days} يومًا</strong></td><td class="num">${fmtUsdOrTry(r.quad)}</td><td class="num">${fmtUsdOrTry(r.triple)}</td><td class="num">${fmtUsdOrTry(r.double)}</td><td>${esc(r.note)}</td></tr>`).join("")}
                ${dnorm.yurume_yakin.map((r) => `<tr><td><strong>مشي قريب — ${r.days} يومًا</strong></td><td class="num">${fmtUsdOrTry(r.quad)}</td><td class="num">—</td><td class="num">${esc(r.range_usd)}$</td><td>${esc(r.note)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <h3 style="margin-top:12px">تعرفة الأطفال الرسمية (ديانت 2026–2027)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الفئة العمرية</th><th class="num">التعرفة</th><th>القاعدة</th></tr></thead>
              <tbody>
                ${dnorm.children.map((c) => `<tr><td><strong>${esc(c.age)}</strong></td><td class="num"><strong>${typeof c.usd === "number" ? fmtUsdOrTry(c.usd) : esc(c.usd) + "$"}</strong></td><td>${esc(c.note)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>السوق السعودي الكلي (43.09 مليونًا) وربع GASTAT Q1 2026</h3>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">إجمالي 2025 (+20.3%)</div><div class="sb-val num">${fmtInt(D.gastat_global.y2025_total)}</div></div>
            <div class="sim-box"><div class="sb-lbl">القادمون من الخارج 2025</div><div class="sb-val num">${fmtInt(D.gastat_global.y2025_external)}</div></div>
            <div class="sim-box"><div class="sb-lbl">إجمالي Q1 2026</div><div class="sb-val num">${fmtInt(D.gastat_global.q1_total)}</div></div>
            <div class="sim-box"><div class="sb-lbl">خارجي Q1 2026 (-11.56%)</div><div class="sb-val num">${fmtInt(D.gastat_global.q1_foreign)}</div></div>
          </div>
          <p style="margin-top:10px">توزيع الوافدين من الخارج في Q1 2026 (كل الجنسيات): <strong>${D.gastat_global.entry_air_pct}% جوي</strong> | <strong>${D.gastat_global.entry_land_pct}% بري</strong> | <strong>${D.gastat_global.entry_sea_pct}% بحري</strong> — والجنس: <strong>${D.gastat_global.gender_female_pct}% إناث</strong> مقابل <strong>${D.gastat_global.gender_male_pct}% ذكور</strong>.</p>
          <details class="mob-spoiler">
            <summary>تفصيل الوافدين عالميًا في شهور Q1 2026 (GASTAT)<span class="mob-spoiler-badge">${D.gastat_global.months.length} أشهر</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>الشهر (2026)</th><th class="num">خارجي عالمي</th><th class="num">المتوسط اليومي</th><th>الدلالة</th></tr></thead>
                  <tbody>
                    ${D.gastat_global.months.map((m) => `
                      <tr>
                        <td><strong>${esc(m.month)}</strong></td>
                        <td class="num">${fmtInt(m.external)}</td>
                        <td class="num">${esc(m.daily_avg)}</td>
                        <td>${esc(m.note)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>

        <div class="card">
          <h3>مقارنة تقديرات تركيا وبوصلة ربط العمرة بحصص الحج (84,942)</h3>
          <div class="svg-wrap">${benchmarkSvg}</div>
          <h3 style="margin-top:12px">لماذا تتنافس الشركات على العمرة؟ عائد التذكرة مقارنة بالحج</h3>
          <div class="svg-wrap">${hajjUmrahSvg}</div>
          <div class="callout callout-danger"><strong>مفتاح السوق:</strong> حصة الحج التركية <strong>84,942 حاجًا</strong> (من <strong>1,799,835</strong> متقدمًا في القرعة): 60% لديانت و40% للخاص (~33,977 حاجًا)، و<strong>80%–90%</strong> من حصة الخاص مربوطة رقميًا بأداء الوكالة في العمرة، بحد أقصى <strong>500 حاج/رخصة</strong> — ما يدفع المجموعات لتشغيل رخص شقيقة.</div>
        </div>
      </div>
    `;

    sec.querySelectorAll("[data-scen-pct]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.scenarioPct = Number(btn.dataset.scenPct);
        renderTab("macro");
      });
    });
    const slider = document.getElementById("scen-slider");
    if (slider) {
      slider.addEventListener("input", () => {
        state.scenarioPct = Number(slider.value);
        renderTab("macro");
      });
    }
    sec.querySelectorAll(".kpi-card").forEach((card) => {
      card.addEventListener("click", () => {
        const k = D.kpis[Number(card.dataset.kpiIdx)];
        openDrawer(`مؤشر كلي · ${k.src || "مرصد السوق"}`, k.label, `
          <div class="drawer-box"><strong>القيمة المرصودة:</strong> <span class="num">${esc(k.value)}</span></div>
          <div class="drawer-box"><strong>التفاصيل والسياق:</strong><br>${esc(k.sub)}</div>
          <div class="drawer-box"><strong>المرجع المؤسسي:</strong> ${esc(k.src || "بيانات رسمية")}</div>
        `);
      });
    });
  }

  // ==================== TAB 2: AVIATION, HUBS & VISA ====================

  function renderAviationTab() {
    const A = state.data.aviation;
    const sec = document.getElementById("tab-aviation");

    let chartItems = [];
    let tableHtml = "";
    if (state.thyView === "annual") {
      chartItems = A.thy_annual.map((x) => ({
        label: x.period,
        val: x.pax,
        valLabel: `${fmtInt(x.pax)} راكب (${fmtInt(x.flights)} رحلة)`,
        highlight: x.period.includes("2025")
      }));
      tableHtml = `<table><thead><tr><th>الفترة (KAP)</th><th class="num">ركاب Hajj-Umrah</th><th class="num">الرحلات</th><th class="num">راكب/رحلة</th><th>الملاحظة</th></tr></thead><tbody>
        ${A.thy_annual.map((r) => `<tr><td><strong>${esc(r.period)}</strong></td><td class="num">${fmtInt(r.pax)}</td><td class="num">${fmtInt(r.flights)}</td><td class="num">${r.pax_per_flight}</td><td>${esc(r.note)}</td></tr>`).join("")}
      </tbody></table>`;
    } else if (state.thyView === "quarterly") {
      chartItems = [
        { label: "Q1 2025", val: 170404, valLabel: "170,404 راكبًا", highlight: false },
        { label: "Q1 2026 (+14.4%)", val: 194872, valLabel: "194,872 راكبًا", highlight: true },
        { label: "Q2 2025 (مشتق)", val: 117912, valLabel: "117,912 راكبًا", highlight: false },
        { label: "Q2 2026 (-20.5%)", val: 93773, valLabel: "93,773 راكبًا", highlight: false, color: "#9e2a2b" },
        { label: "H1 2025 الإجمالي", val: 288316, valLabel: "288,316 راكبًا", highlight: false },
        { label: "H1 2026 (+0.1%)", val: 288645, valLabel: "288,645 راكبًا", highlight: true }
      ];
      tableHtml = `<table><thead><tr><th>الفترة</th><th class="num">ركاب 2025</th><th class="num">ركاب 2026</th><th class="num">التغير</th><th class="num">رحلات 25 / 26</th><th>القراءة</th></tr></thead><tbody>
        ${A.thy_quarterly_h1.map((r) => `<tr><td><strong>${esc(r.period)}</strong></td><td class="num">${fmtInt(r.pax_2025)}</td><td class="num">${fmtInt(r.pax_2026)}</td><td class="num"><strong>${esc(r.pax_chg)}</strong></td><td class="num">${fmtInt(r.flights_2025)} / ${fmtInt(r.flights_2026)}</td><td>${esc(r.note)}</td></tr>`).join("")}
      </tbody></table>`;
    } else {
      chartItems = [
        { label: "9M 2025 (3Q KAP)", val: 312460, valLabel: "312,460 (2,334 رحلة)", highlight: false },
        { label: "9M 2026 (3Q KAP)", val: 330338, valLabel: "330,338 (2,492 رحلة | +5.72%)", highlight: true }
      ];
      tableHtml = `<table><thead><tr><th>الفترة</th><th class="num">2025</th><th class="num">2026</th><th class="num">التغير</th><th class="num">الرحلات (25/26)</th><th>راكب/رحلة</th></tr></thead><tbody>
        ${A.thy_9m.map((r) => `<tr><td><strong>${esc(r.period)}</strong></td><td class="num">${fmtInt(r.pax_2025)}</td><td class="num">${fmtInt(r.pax_2026)}</td><td class="num"><strong>${esc(r.pax_chg)}</strong></td><td class="num">${fmtInt(r.flights_2025)} / ${fmtInt(r.flights_2026)} (${esc(r.flights_chg)})</td><td>${esc(r.pax_per_flight_chg)}</td></tr>`).join("")}
      </tbody></table>`;
    }

    const thySvg = buildHBarSvg(chartItems, { aria: "إفصاحات الخطوط التركية الرسمية Hajj-Umrah" });
    const sc = A.samsun_case;
    const hubs = A.city_hub_spreads;

    sec.innerHTML = `
      <div class="section-head">
        <h2>بيانات الطيران (THY KAP)، سياسات الـ 5 ناقلات، فروق المدن والتأشيرة</h2>
        <p class="section-sub">دمج إفصاحات البورصة للخطوط التركية مع بوابات الإقلاع الإقليمية الـ 11، سماحات الأمتعة وماء زمزم، وضوابط الخروج والتأشيرة 2026–2027</p>
      </div>

      <div class="callout callout-danger" style="margin-bottom:14px">${esc(A.thy_caveat)}</div>

      <div class="card">
        <h3>مؤشرات الخطوط التركية (THY Hajj-Umrah Segment)</h3>
        <div class="pill-row">
          <button type="button" class="filter-pill ${state.thyView === "annual" ? "active" : ""}" data-thy-view="annual">السنوي الكامل (2024 ← 2025)</button>
          <button type="button" class="filter-pill ${state.thyView === "quarterly" ? "active" : ""}" data-thy-view="quarterly">الربع الأول والثاني H1 (2025 ← 2026)</button>
          <button type="button" class="filter-pill ${state.thyView === "9m" ? "active" : ""}" data-thy-view="9m">التسعة أشهر 9M (إفصاح 3Q 2026)</button>
        </div>
        <div class="svg-wrap">${thySvg}</div>
        <div class="table-wrap">${tableHtml}</div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>سماحات الأمتعة وماء زمزم على الناقلات الـ 5 العاملة من تركيا</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الناقل</th><th>الشريحة</th><th>الأمتعة المسجلة</th><th>المقصورة</th><th>قاعدة ماء زمزم (5 لترات)</th><th>الميزة التنافسية</th></tr></thead>
            <tbody>
              ${A.carriers_rules.map((c) => `
                <tr>
                  <td><strong>${esc(c.name)}</strong> (<span class="num">${esc(c.code)}</span>)</td>
                  <td>${esc(c.tier_ar)}</td>
                  <td>${esc(c.checked_kg)}</td>
                  <td>${esc(c.cabin_kg)}</td>
                  <td>${esc(c.zemzem_rule)}</td>
                  <td>${esc(c.pros_ar)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>فوارق تكلفة الانطلاق من المحافظات الـ 5 مقابل إسطنبول</h3>
          <p>${esc(hubs.source_note)}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>المدينة / المطار</th><th class="num">رباعي (ليرة)</th><th class="num">ثنائي (ليرة)</th><th class="num">الفارق عن إسطنبول</th><th>قراءة السوق</th></tr></thead>
              <tbody>
                ${hubs.hubs.map((h) => `
                  <tr>
                    <td><strong>${esc(h.city)}</strong></td>
                    <td class="num">${fmtInt(h.quad_try)} TL</td>
                    <td class="num">${fmtInt(h.double_try)} TL</td>
                    <td class="num"><strong>+${fmtInt(h.spread_vs_ist_try)} TL</strong></td>
                    <td>${esc(h.package_note)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h3 style="margin-top:16px">ضوابط التأشيرة وضريبة الخروج والصحة (2026–2027)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>البند</th><th class="num">التكلفة / المدة</th><th>القاعدة الملزمة</th></tr></thead>
              <tbody>
                ${A.visa_exit_checklist.map((v) => `
                  <tr><td><strong>${esc(v.item)}</strong></td><td class="num"><strong>${esc(v.cost)}</strong></td><td>${esc(v.rule)}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <details class="mob-spoiler">
            <summary>مصفوفة فجوة بيانات الناقلات والمطارات الإقليمية (${A.airports_11.length})<span class="mob-spoiler-badge">جداول مرجعية</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>الناقل</th><th>البيانات المتاحة</th><th>ما يغيب عن الإفصاح العام</th></tr></thead>
                  <tbody>
                    ${A.carrier_gap_matrix.map((c) => `
                      <tr><td><strong>${esc(c.carrier)}</strong></td><td>${esc(c.available)}</td><td style="color:var(--crimson)">${esc(c.missing)}</td></tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
              <h3 style="margin-top:14px">بوابات المغادرة والمطارات الإقليمية الـ 11</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>المنطقة</th><th>الرموز</th><th>الكثافة</th><th>الدور بالسوق</th></tr></thead>
                  <tbody>
                    ${A.airports_11.map((ap) => `
                      <tr><td><strong>${esc(ap.region)}</strong></td><td class="num">${esc(ap.codes)}</td><td>${esc(ap.share_note)}</td><td>${esc(ap.role)}</td></tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <h3 style="margin-top:16px">${esc(sc.title)}</h3>
          <p>أرقام موثقة من تنظيم ديانت ومفتي ولاية سامسون — تكشف أهمية المحافظات وحدود قراءة إعلانات المطارات:</p>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">تسجيلات الموسم</div><div class="sb-val num">${fmtInt(sc.season_registrations)}</div></div>
            <div class="sim-box"><div class="sb-lbl">الترتيب الوطني</div><div class="sb-val" style="font-size:15px">${esc(sc.national_rank)}</div></div>
            <div class="sim-box"><div class="sb-lbl">معتمرُو عطلة 2026</div><div class="sb-val num">${fmtInt(sc.winter_holiday_pax)}</div></div>
            <div class="sim-box"><div class="sb-lbl">نسبة العطلة من الموسم</div><div class="sb-val num">${sc.holiday_share_pct}%</div></div>
          </div>
          <div class="callout callout-warn" style="margin-top:8px">${esc(sc.caveat)}</div>
        </div>
      </div>
    `;

    sec.querySelectorAll("[data-thy-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.thyView = btn.dataset.thyView;
        renderTab("aviation");
      });
    });
  }

  // ==================== TAB 3: AGENCIES, WHALES & FULL +66 DIRECTORY ====================

  function renderAgenciesTab() {
    const AG = state.data.agencies;
    const sec = document.getElementById("tab-agencies");

    const funnelSvg = buildHBarSvg(
      AG.funnel.map((f, i) => ({
        label: f.stage,
        val: f.count,
        valLabel: `${fmtInt(f.count)} (${f.src || "رصد"})`,
        highlight: i === 3 || i === 4
      })),
      { aria: "هرم التركز والترخيص في السوق التركي" }
    );

    const catalogSvg = buildHBarSvg(
      AG.catalog_scale_fig4.map((c, i) => ({
        label: `${c.agency} (${c.belge})`,
        val: c.listings,
        valLabel: `${fmtInt(c.listings)} برنامجًا`,
        highlight: i < 2
      })),
      { aria: "حجم الكتالوجات المعلنة عبر المنصات" }
    );

    let shareRows = [];
    let shareDesc = "";
    if (state.agencyShareView === "excel59") {
      shareDesc = "ملف الرصد الأولي (59 سجلًا): يُظهر تركز Asfâr (25.4%) وRK (16.9%) = 42.4% من السجلات؛ ويحذر التحليل المنهجي من الخلط بين تكرار الإعلان وحصة الركاب الفعلية.";
      shareRows = AG.excel_59_original_shares.map((s) => ({ name: s.agency, n: s.offers, pct: `${s.share_pct}%`, note: s.note }));
    } else if (state.agencyShareView === "ext69") {
      shareDesc = "سجل التحقق الموسع (69 سجلًا): يُظهر تنوع الأسماء التشغيلية المتكررة (>=26 اسمًا منها Uzman وEmvaj وAmmar) دون توفر كشوف ركاب شهرية.";
      shareRows = AG.extended_69_top_agencies.map((s) => ({ name: s.agency, n: s.count, pct: `${fmtDec((s.count / 69) * 100, 1)}%`, note: "إعلان أو تعرفة في سجل الـ 69" }));
    } else {
      shareDesc = "سجل التحقق المضبوط (59 عرضًا مكتمل المواصفات): أعيد توزيع العينة باستبعاد الصفوف ناقصة الموقع، فبرزت Semerşah (6) وKıyam (5) وBeyt (4).";
      shareRows = AG.replacement_59_shares.map((s) => ({ name: s.agency, n: s.offers, pct: `${s.share_pct}%`, note: "سجل مستوفي المواصفات وتاريخ الرحلة" }));
    }

    const shareSvg = buildHBarSvg(
      shareRows.slice(0, 10).map((r, i) => ({
        label: r.name,
        val: r.n,
        valLabel: `${r.n} سجلات (${r.pct})`,
        highlight: i < 2
      })),
      { aria: "تركز الظهور الإعلاني داخل العينة" }
    );

    const rm = AG.saudi_rooms_stock_h1_2025;
    const emergingFiltered = state.emergingCityFilter === "all"
      ? AG.emerging_18
      : AG.emerging_18.filter((e) => e.city.includes(state.emergingCityFilter) || e.ops.includes(state.emergingCityFilter));

    // Directory (+66 agencies) filter & sort
    const dirAll = AG.directory || [];
    const tiersList = Array.from(new Set(dirAll.map((a) => a.tier).filter(Boolean)));
    const dq = state.dirQuery.trim().toLowerCase();
    let dirFiltered = dirAll.filter((a) => {
      if (state.dirTierFilter !== "all" && a.tier !== state.dirTierFilter) return false;
      if (dq) {
        const hay = `${a.name} ${a.city} ${a.tier} ${a.metric}`.toLowerCase();
        if (!hay.includes(dq)) return false;
      }
      return true;
    });
    if (state.dirSort === "min_asc") dirFiltered = [...dirFiltered].sort((a, b) => (a.min_usd || 99999) - (b.min_usd || 99999));
    else if (state.dirSort === "min_desc") dirFiltered = [...dirFiltered].sort((a, b) => (b.min_usd || 0) - (a.min_usd || 0));
    else dirFiltered = [...dirFiltered].sort((a, b) => a.name.localeCompare(b.name));

    sec.innerHTML = `
      <div class="section-head">
        <h2>الشركات والتكتلات والدليل المستكمل (${dirAll.length} وكالة + 18 متخصصة)</h2>
        <p class="section-sub">فصل حجم الكتالوج والظهور الرقمي عن إثبات الحصة السوقية الحقيقية، مع استكمال كامل الأسعار الدنيا والمواقع الرسمية لجميع الوكالات الـ ${dirAll.length}</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>هرم الترخيص والتركز: من 2,400 فاعل إلى 352 ضمانًا فعليًا</h3>
          <div class="svg-wrap">${funnelSvg}</div>
          <div class="callout callout-info">
            <strong>مخزون الإيواء السعودي بنهاية H1 2025 (منفصل عن الحصص):</strong><br>
            مكة: <strong class="num">${fmtInt(rm.makkah)}</strong> غرفة مرخصة | المدينة: <strong class="num">${fmtInt(rm.madinah)}</strong> غرفة | إجمالي المملكة: <strong class="num">${fmtInt(rm.ksa_total)}</strong> (<span class="num">${rm.hotels_pct}%</span> فنادق / <span class="num">${rm.apts_pct}%</span> شقق). ${esc(rm.note)}
          </div>
        </div>

        <div class="card">
          <h3>مقياس الكتالوج المنشور على المنصات</h3>
          <p>تقود <strong>Hisar (494)</strong> و<strong>Hançer (379)</strong> كثافة البرامج المنشورة من أصل <strong>3,190</strong> برنامجًا لـ 126 ناشرًا — وهو مؤشر ظهور بحثي لا يعني تساوي المبيعات.</p>
          <div class="svg-wrap">${catalogSvg}</div>
        </div>
      </div>

      <div class="section-head" style="margin-top:22px">
        <h2>التكتلات الكبرى الـ 14 والفاعلون الرئيسيون</h2>
        <p class="section-sub">انقر على أي تكتل لفتح ملف التدقيق والمؤشرات المالية والقيود المنهجية</p>
      </div>
      <div class="grid-3">
        ${AG.whales_blocks.map((w, idx) => `
          <article class="card clickable-row" data-whale-idx="${idx}">
            <div class="kpi-top">
              <h3 style="margin:0">${esc(w.name)}</h3>
              <span class="src-tag">${esc(w.src || "تكتل كبرى")}</span>
            </div>
            <p style="margin:4px 0;font-weight:700;color:var(--emerald)">${esc(w.license)}</p>
            <p style="margin:4px 0"><strong>الحجم المعلن:</strong> ${esc(w.volume)}</p>
            <p style="margin:4px 0"><strong>الركيزة:</strong> ${esc(w.financials)}</p>
            <div class="callout callout-warn" style="margin-top:8px;font-size:12px">${esc(w.audit_caveat)}</div>
          </article>
        `).join("")}
      </div>

      <div class="card" style="margin-top:18px">
        <h3>دليل الوكالات المستكمل (${dirAll.length} وكالة — السعر الأدنى المؤكد، المدينة، والرابط الرسمي)</h3>
        <p>تم استكمال كافة الفجوات السعرية والمواقع الرسمية (مثل Semerşah، Toprak، İsra، RK، Mebrur، Emvaj، Fazilet، Anadolu Umre، Mabed) دون تضمين أي أرقام هواتف شخصية.</p>
        <div class="control-grid control-grid--auto">
          <div class="ctrl-field">
            <label for="dir-tier">تصنيف الوكالة</label>
            <select id="dir-tier">
              <option value="all">كل التصنيفات (${dirAll.length})</option>
              ${tiersList.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
            </select>
          </div>
          <div class="ctrl-field">
            <label for="dir-sort">الترتيب</label>
            <select id="dir-sort">
              <option value="min_asc">أدنى سعر بداية (↑)</option>
              <option value="min_desc">أعلى سعر بداية (↓)</option>
              <option value="name_asc">أبجديًا (A–Z)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="dir-q">بحث بالاسم أو المدينة</label>
            <input id="dir-q" type="text" value="${esc(state.dirQuery)}" placeholder="مثال: Hisar، إسطنبول، قونية..." />
          </div>
        </div>
        <div class="section-sub">الوكالات المعروضة: <strong class="num">${dirFiltered.length}</strong> من أصل ${dirAll.length} وكالة</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الوكالة</th><th>الفئة</th><th>المدينة / النطاق</th><th class="num">أدنى سعر بداية</th><th>المؤشر السعري والتشغيلي الموثق</th><th>الروابط الرسمية</th></tr></thead>
            <tbody>
              ${dirFiltered.map((a, idx) => `
                <tr${idx >= 12 && !state.dirQuery.trim() && !state.showAllDir ? ' class="mob-row-hidden"' : ""}>
                  <td><strong>${esc(a.name)}</strong></td>
                  <td><span class="src-tag">${esc(a.tier)}</span></td>
                  <td>${esc(a.city)}</td>
                  <td class="num"><strong>${fmtUsdOrTry(a.min_usd)}</strong></td>
                  <td>${esc(a.metric)}</td>
                  <td>
                    <a class="ext-link" href="${esc(a.website)}" target="_blank" rel="noopener noreferrer">الموقع ↗</a>
                    ${a.ig ? ` · <a class="ext-link" href="${esc(a.ig)}" target="_blank" rel="noopener noreferrer">IG</a>` : ""}
                    ${a.x ? ` · <a class="ext-link" href="${esc(a.x)}" target="_blank" rel="noopener noreferrer">X</a>` : ""}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${dirFiltered.length > 12 && !state.dirQuery.trim() ? `<div class="mob-only-inline" style="margin-top:10px;"><button type="button" id="toggle-dir-all" class="filter-pill ${state.showAllDir ? "active" : ""}">${state.showAllDir ? "تقليص لأول 12 وكالة" : `عرض باقي الوكالات (${dirFiltered.length - 12})`}</button></div>` : ""}
      </div>

      <div class="card" style="margin-top:18px">
        <h3>فارق الظهور الإعلاني عبر العينات الثلاث (تحيز النشر مقابل الإيواء الموثق)</h3>
        <div class="pill-row">
          <button type="button" class="filter-pill ${state.agencyShareView === "excel59" ? "active" : ""}" data-share-view="excel59">عينة الإطلاق الأولية (59)</button>
          <button type="button" class="filter-pill ${state.agencyShareView === "ext69" ? "active" : ""}" data-share-view="ext69">سجل التحقق الموسع (69)</button>
          <button type="button" class="filter-pill ${state.agencyShareView === "rep59" ? "active" : ""}" data-share-view="rep59">العينة المضبوطة بالسكن (59)</button>
        </div>
        <p>${esc(shareDesc)}</p>
        <div class="grid-2">
          <div class="svg-wrap">${shareSvg}</div>
          <div class="table-wrap" style="margin-top:0">
            <table>
              <thead><tr><th>الوكالة / الجهة</th><th class="num">السجلات</th><th class="num">النسبة</th><th>التفسير المنهجي</th></tr></thead>
              <tbody>
                ${shareRows.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td><td class="num">${r.n}</td><td class="num">${esc(r.pct)}</td><td>${esc(r.note)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h3>خريطة 18 وكالة إقليمية ومتخصصة (دون كشوف ركاب شهرية منفردة)</h3>
        <div class="pill-row">
          ${[["all", "الكل (15 بطاقة/18 علامة)"], ["إسطنبول", "إسطنبول"], ["إزمير", "إزمير"], ["قونية", "قونية"], ["قيصري", "قيصري"], ["أنقرة", "أنقرة"], ["بورصة", "بورصة"]].map(([val, lbl]) => `
            <button type="button" class="filter-pill ${state.emergingCityFilter === val ? "active" : ""}" data-city-filter="${val}">${lbl}</button>
          `).join("")}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الوكالة / العلامات</th><th>النطاق والرخصة</th><th>التشغيل المعلن</th><th>زاوية التموضع في السوق</th></tr></thead>
            <tbody>
              ${emergingFiltered.map((e) => `
                <tr><td><strong>${esc(e.name)}</strong></td><td>${esc(e.city)}</td><td>${esc(e.ops)}</td><td>${esc(e.strategy)}</td></tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("dir-tier").value = state.dirTierFilter;
    document.getElementById("dir-sort").value = state.dirSort;
    document.getElementById("dir-tier").addEventListener("change", (e) => { state.dirTierFilter = e.target.value; renderTab("agencies"); });
    document.getElementById("dir-sort").addEventListener("change", (e) => { state.dirSort = e.target.value; renderTab("agencies"); });
    document.getElementById("dir-q").addEventListener("input", (e) => { state.dirQuery = e.target.value; renderTab("agencies"); });
    const dirAllBtn = document.getElementById("toggle-dir-all");
    if (dirAllBtn) {
      dirAllBtn.addEventListener("click", () => {
        state.showAllDir = !state.showAllDir;
        renderTab("agencies");
      });
    }

    sec.querySelectorAll("[data-whale-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const w = AG.whales_blocks[Number(el.dataset.whaleIdx)];
        openDrawer(`تدقيق تكتل كبرى · ${w.src || "رصد السوق"}`, w.name, `
          <div class="drawer-box"><strong>التراخيص والشبكة:</strong> ${esc(w.license)}</div>
          <div class="drawer-box"><strong>الحجم والمؤشرات المعلنة:</strong> ${esc(w.volume)}<br><br>${esc(w.financials)}</div>
          <div class="drawer-box"><strong>لماذا وكيف تعمل في السوق؟</strong><br>${esc(w.why)}</div>
          <div class="callout callout-warn"><strong>قيد الإثبات المنهجي:</strong><br>${esc(w.audit_caveat)}</div>
          <p><a class="ext-link" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">الموقع العام الرسمي للجهة ↗</a></p>
        `);
      });
    });

    sec.querySelectorAll("[data-share-view]").forEach((b) => {
      b.addEventListener("click", () => {
        state.agencyShareView = b.dataset.shareView;
        renderTab("agencies");
      });
    });

    sec.querySelectorAll("[data-city-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        state.emergingCityFilter = b.dataset.cityFilter;
        renderTab("agencies");
      });
    });
  }

  // ==================== TAB 4: SEASONALITY, IKBAL, TAM RAMAZAN, 285 PROGRAMS & ZAIR DIY ====================

  function renderMonthlyTab() {
    const M = state.data.monthly_h1;
    const activeM = M.find((x) => x.key === state.selectedMonth) || M[0];
    const bands = state.data.quad_price_bands_54;
    const IKB = state.data.ikbal;
    const TAM = state.data.tam_ramazan;
    const ZAIR = state.data.zair_individual;
    const PROGS = state.data.programs_unified || [];
    const sec = document.getElementById("tab-monthly");

    const whiskerSvg = buildMonthlyWhiskerSvg(M);
    const bandsSvg = buildHBarSvg(
      bands.map((b) => ({
        label: b.band,
        val: b.count,
        valLabel: `${b.count} عرضًا (${b.pct}%)`,
        highlight: b.band.includes("الذروة")
      })),
      { aria: "توزيع 54 عرضًا رباعي التسعير حسب الفئة السعرية" }
    );

    const dualSampleSvg = buildHBarSvg(
      M.map((m) => ({
        label: `${m.short}: أصل (${m.sample_n}) مقابل موسع (${m.ext_69_n})`,
        val: Math.max(m.sample_n, m.ext_69_n),
        valLabel: `${m.sample_n} / ${m.ext_69_n}`,
        highlight: m.key === "mar",
        color: m.key === "may" ? "#9e2a2b" : "#0d5c46"
      })),
      { aria: "مقارنة عدد السجلات بين العينة الأساسية والموسعة" }
    );

    // Filter unified 285 programs
    const seasonsList = Array.from(new Set(PROGS.map((p) => p.season_group).filter(Boolean)));
    const q = state.offersQuery.trim().toLowerCase();
    let list = PROGS.filter((o) => {
      if (state.offersSeasonFilter !== "all" && o.season_group !== state.offersSeasonFilter) return false;
      if (state.offersTypeFilter === "مشي" && !(o.access_band || "").includes("مشي")) return false;
      if (state.offersTypeFilter === "شتل" && (o.access_band || "").includes("مشي")) return false;
      if (q) {
        const hay = `${o.id} ${o.agency} ${o.month} ${o.departure} ${o.airline} ${o.access_band}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.offersSort === "quad_asc") list = [...list].sort((a, b) => (a.quad_usd || 99999) - (b.quad_usd || 99999));
    else if (state.offersSort === "quad_desc") list = [...list].sort((a, b) => (b.quad_usd || 0) - (a.quad_usd || 0));
    else if (state.offersSort === "days_desc") list = [...list].sort((a, b) => (b.days || 0) - (a.days || 0));

    const visibleList = state.showAllPrograms ? list : list.slice(0, 60);

    sec.innerHTML = `
      <div class="section-head">
        <h2>الموسمية والأسعار: H1 2026، حالة إقبال، تمام رمضان (30–38 يومًا)، وفهرس الـ ${PROGS.length} برنامجًا</h2>
        <p class="section-sub">اضغط على أي قسم للقفز المباشر أو تفاعل مع الأشهر وفلاتر التسعير — بيانات تسعير ومسافات وصول فقط دون دليل فنادق</p>
      </div>

      <div class="subtab-bar">
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "all" ? "active" : ""}" data-focus="all" data-jump="#sec-h1">كل الأقسام</button>
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "h1" ? "active" : ""}" data-focus="h1" data-jump="#sec-h1">موسمية H1 والمخطط</button>
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "ikbal" ? "active" : ""}" data-focus="ikbal" data-jump="#sec-ikbal">إقبال توريزم (13+15+5)</button>
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "tam" ? "active" : ""}" data-focus="tam" data-jump="#sec-tam">تمام رمضان وديانت SAR/USD</button>
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "zair" ? "active" : ""}" data-focus="zair" data-jump="#sec-zair">التشغيل الفردي Zair DIY (98)</button>
        <button type="button" class="subtab-btn ${state.monthlyFocusSubtab === "unified" ? "active" : ""}" data-focus="unified" data-jump="#sec-unified">سجل الـ ${PROGS.length} برنامجًا الموّحد</button>
      </div>

      <div id="sec-h1" class="card ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "h1" ? "mobile-chapter-collapsed" : ""}">
        <h3>المخطط التفاعلي للمدى والوسيط السعري للغرفة الرباعية H1 2026 ($ USD)</h3>
        <div class="svg-wrap">${whiskerSvg}</div>
        <div class="pill-row">
          ${M.map((m) => `<button type="button" class="filter-pill ${m.key === activeM.key ? "active" : ""}" data-select-month="${m.key}">${esc(m.short)} (${m.key === "may" ? "إغلاق 0$" : fmtUsdOrTry(m.atlas_median)})</button>`).join("")}
        </div>
        <div class="drawer-box" style="margin-top:8px">
          <div class="kpi-top">
            <strong>${esc(activeM.name_ar)}</strong>
            <span class="src-tag">USD/TRY: ${activeM.usd_try.toFixed(4)}</span>
          </div>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">الوسيط الرباعي</div><div class="sb-val num">${activeM.key === "may" ? "0$ (توقف)" : fmtUsdOrTry(activeM.atlas_median)}</div></div>
            <div class="sim-box"><div class="sb-lbl">سعر الصرف USD/TRY</div><div class="sb-val num">${activeM.usd_try.toFixed(4)}</div></div>
            <div class="sim-box"><div class="sb-lbl">سجلات العينة (59 / 69)</div><div class="sb-val num">${activeM.sample_n} / ${activeM.ext_69_n}</div></div>
            <div class="sim-box"><div class="sb-lbl">حركة ديانت / العطل</div><div class="sb-val" style="font-size:13.5px">${esc(activeM.diyanet_volume)}</div></div>
          </div>
          <p style="margin-top:10px"><strong>كيف ولماذا تحرك السعر؟</strong> ${esc(activeM.drivers)}</p>
          <p><strong>تعرفة ديانت الموازية:</strong> ${esc(activeM.diyanet_tariffs)}</p>
          <div class="callout callout-warn" style="margin-top:6px"><strong>ملاحظة التدقيق والمنهجية:</strong> ${esc(activeM.audit_note)}</div>
        </div>
      </div>

      <div class="grid-2 ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "h1" ? "mobile-chapter-collapsed" : ""}" style="margin-top:16px">
        <div class="card">
          <h3>التوزيع الفعلي للأسعار الرباعية عبر 54 سجلًا مكتملًا</h3>
          <p>تتركز <strong>70.4%</strong> من السوق (38 من 54 عرضًا) بين <strong>$1,200 و$1,599</strong> مع وسيط كلي <strong>${dualMoney(1450)}</strong>.</p>
          <div class="svg-wrap">${bandsSvg}</div>
        </div>
        <div class="card">
          <h3>مقارنة أحجام الرصد الشهرية: العينة الأساسية 59 مقابل الموسعة 69</h3>
          <p>مارس يستحوذ على <strong>40.7%</strong> (24/59) من سجلات الإعلانات المرصودة، ما لا يساوي بالضرورة 40.7% من عدد المعتمرين المنطلقين.</p>
          <div class="svg-wrap">${dualSampleSvg}</div>
        </div>
      </div>

      <div id="sec-ikbal" class="card ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "ikbal" ? "mobile-chapter-collapsed" : ""}" style="margin-top:16px">
        <div class="kpi-top">
          <h3 style="margin:0">تحليل حالة إقبال للسياحة (İkbal Turizm — رخصة ${esc(IKB.belge_no)})</h3>
          <span class="src-tag">تحديث المقاعد: ${esc(IKB.seats_updated_at)}</span>
        </div>
        <p>${esc(IKB.google_rating)} | <strong>نموذج الوصول والإيواء:</strong> ${esc(IKB.access_summary)}</p>
        <div class="callout callout-info">${esc(IKB.archive_2026_note)}</div>

        <h3 style="margin-top:12px">1) البرامج الرسمية الـ 13 لموسم 2026–2027 (رمضان وشوال مع المقاعد المتبقية)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الرمز والفئة</th><th>البرنامج والمسار</th><th class="num">المدة</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th><th class="num">طفل / رضيع</th><th class="num">المتبقي</th><th>الرابط الرسمي</th></tr></thead>
            <tbody>
              ${IKB.official_13.map((p) => `
                <tr>
                  <td><strong class="num">${esc(p.id)}</strong><br><small>${esc(p.category)}</small></td>
                  <td><strong>${esc(p.title_ar)}</strong><br><small class="num">${esc(p.route)} | ${esc(p.departure_ar)} ← ${esc(p.return_ar)}</small>${p.discrepancy ? `<br><small style="color:var(--crimson)">${esc(p.discrepancy)}</small>` : ""}</td>
                  <td class="num">${p.days} يومًا</td>
                  <td class="num"><strong>${fmtUsdOrTry(p.quad_usd)}</strong></td>
                  <td class="num">${fmtUsdOrTry(p.triple_usd)}</td>
                  <td class="num">${fmtUsdOrTry(p.double_usd)}</td>
                  <td class="num">${fmtUsdOrTry(p.child_usd)} / ${fmtUsdOrTry(p.baby_usd)}</td>
                  <td class="num"><span class="status-pill ${p.remaining_seats <= 35 ? "status-warn" : "status-ok"}">${fmtInt(p.remaining_seats)} مقعدًا</span></td>
                  <td><a class="ext-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">تحقق ↗</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <details class="mob-spoiler">
          <summary>الانطلاقات الإقليمية (5 مطارات) ورصد شتاء إقبال (${IKB.winter_ud_preview.length} جولة)<span class="mob-spoiler-badge">مرجع إقبال</span></summary>
          <div class="mob-spoiler-body">
            <div class="grid-2" style="margin-top:6px">
              <div>
                <h3>2) الانطلاقات الإقليمية الشتوية الموثقة (5 مطارات)</h3>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>المطار</th><th>البرنامج</th><th class="num">أيام</th><th class="num">رباعي</th><th class="num">متبقٍ</th><th>الرابط</th></tr></thead>
                    <tbody>
                      ${IKB.official_winter_highlights.map((h) => `
                        <tr>
                          <td><strong>${esc(h.hub)}</strong></td>
                          <td>${esc(h.title_ar)}<br><small>${esc(h.note)}</small></td>
                          <td class="num">${h.days}</td>
                          <td class="num"><strong>${fmtUsdOrTry(h.quad_usd)}</strong></td>
                          <td class="num">${fmtInt(h.remaining)}</td>
                          <td><a class="ext-link" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">فتح ↗</a></td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3>3) رصد شتاء إقبال على المنصة (${IKB.winter_ud_preview.length} جولة نوفمبر–ديسمبر 2026)</h3>
                <div class="table-wrap" style="max-height:310px;overflow-y:auto">
                  <table>
                    <thead><tr><th>الانطلاق والمطار</th><th class="num">المدة</th><th>الناقل</th><th class="num">رباعي</th><th>الرابط</th></tr></thead>
                    <tbody>
                      ${IKB.winter_ud_preview.map((w) => `
                        <tr>
                          <td><strong>${esc(w.departure_ar)}</strong> (${esc(w.airport)})<br><small>${esc(w.nights_split)}</small></td>
                          <td class="num">${w.days} يومًا</td>
                          <td>${esc(w.airline)}</td>
                          <td class="num"><strong>${fmtUsdOrTry(w.quad_usd)}</strong></td>
                          <td><a class="ext-link" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">فتح ↗</a></td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div id="sec-tam" class="card ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "tam" ? "mobile-chapter-collapsed" : ""}" style="margin-top:16px">
        <h3>ملف تمام رمضان (30–38 يومًا): موسم 2027 المصنف مقابل أرشيف 2026 وتعرفة ديانت SAR/USD</h3>
        <div class="grid-2">
          <div>
            <h3>أرخص ${TAM.season_2027.length} برنامجًا لتمام رمضان 2027 (مرتبة تصاعديًا)</h3>
            <div class="table-wrap" style="max-height:420px;overflow-y:auto">
              <table>
                <thead><tr><th class="num">#</th><th>الوكالة والمسار</th><th class="num">أيام</th><th class="num">رباعي</th><th class="num">ثنائي</th><th>الوصول والرابط</th></tr></thead>
                <tbody>
                  ${TAM.season_2027.map((r) => `
                    <tr>
                      <td class="num"><strong>${r.rank}</strong></td>
                      <td><strong>${esc(r.agency)}</strong><br><small>${esc(r.departure)} ← ${esc(r.return_date)} | ${esc(r.airline)}</small></td>
                      <td class="num">${r.days}</td>
                      <td class="num"><strong>${fmtUsdOrTry(r.quad_usd)}</strong></td>
                      <td class="num">${fmtUsdOrTry(r.double_usd)}</td>
                      <td><small>${esc(r.access_tier)}</small><br><a class="ext-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">المصدر ↗</a></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3>مقارنة المنافسين والأرشيف (2026 مقابل 2027)</h3>
            <div class="table-wrap" style="max-height:200px;overflow-y:auto">
              <table>
                <thead><tr><th>المنافس (2027)</th><th>البرنامج والمحطة</th><th class="num">رباعي</th><th class="num">ثنائي</th><th>الرابط</th></tr></thead>
                <tbody>
                  ${TAM.competitors_2027.map((c) => `
                    <tr><td><strong>${esc(c.agency)}</strong> (${esc(c.tier)})</td><td>${esc(c.program)}<br><small>${esc(c.hub)}</small></td><td class="num"><strong>${fmtUsdOrTry(c.quad_usd)}</strong></td><td class="num">${fmtUsdOrTry(c.double_usd)}</td><td><a class="ext-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">فتح ↗</a></td></tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <h3 style="margin-top:12px">مراسي تمام رمضان 2026 التاريخية (${TAM.season_2026_hist.length} نماذج)</h3>
            <div class="table-wrap" style="max-height:190px;overflow-y:auto">
              <table>
                <thead><tr><th>الجهة</th><th class="num">أيام</th><th class="num">السعر الأصلي</th><th class="num">المعادل ($)</th></tr></thead>
                <tbody>
                  ${TAM.season_2026_hist.map((h) => `
                    <tr><td><strong>${esc(h.agency)}</strong><br><small>${esc(h.notes)}</small></td><td class="num">${h.days || "—"}</td><td class="num">${esc(h.orig_price)}</td><td class="num"><strong>${fmtUsdOrTry(h.quad_usd)}</strong></td></tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <details class="mob-spoiler">
          <summary>جداول تعرفات ديانت لرمضان وشوال 2026 (SAR) و2027 (USD)<span class="mob-spoiler-badge">30 كودًا</span></summary>
          <div class="mob-spoiler-body">
            <div class="grid-2" style="margin-top:6px">
              <div>
                <h3>تعرفة ديانت لرمضان وشوال 2026 (بالريال SAR — 14 كودًا)</h3>
                <div class="table-wrap" style="max-height:260px;overflow-y:auto">
                  <table>
                    <thead><tr><th>الكود</th><th>الموسم والنقل</th><th class="num">أيام</th><th class="num">رباعي SAR</th><th class="num">~USD</th></tr></thead>
                    <tbody>
                      ${TAM.diyanet_2026_sar.map((d) => `
                        <tr><td class="num"><strong>${esc(d.code)}</strong></td><td>${esc(d.season)} (${esc(d.transport)})</td><td class="num">${d.days}</td><td class="num">${fmtInt(d.quad)} SAR</td><td class="num">~${fmtUsdOrTry(d.quad_usd_approx)}</td></tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3>تعرفة ديانت لرمضان وشوال 2027 (بالدولار USD — 16 كودًا | زيادة +7% إلى +16%)</h3>
                <div class="table-wrap" style="max-height:260px;overflow-y:auto">
                  <table>
                    <thead><tr><th>الكود</th><th>الموسم والنقل</th><th class="num">أيام</th><th class="num">رباعي USD</th><th class="num">ثنائي USD</th></tr></thead>
                    <tbody>
                      ${TAM.diyanet_2027_usd.map((d) => `
                        <tr><td class="num"><strong>${esc(d.code)}</strong></td><td>${esc(d.season)} (${esc(d.transport)})</td><td class="num">${d.days}</td><td class="num"><strong>${fmtUsdOrTry(d.quad)}</strong></td><td class="num">${fmtUsdOrTry(d.double)}</td></tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div id="sec-zair" class="card ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "zair" ? "mobile-chapter-collapsed" : ""}" style="margin-top:16px">
        <h3>التسعير الفردي الديناميكي (Zair DIY — ${fmtInt(ZAIR.count)} باقة فردية)</h3>
        <p>${esc(ZAIR.note)} | <strong>النطاق:</strong> <span class="num">${fmtUsdOrTry(ZAIR.min_usd_pp, 2)} – ${fmtUsdOrTry(ZAIR.max_usd_pp, 2)}</span> (لقطة صرف ${ZAIR.fx_snapshot} ليرة)</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الرمز</th><th>الفترة والليالي</th><th>الطيران والتنقل بين الحرمين</th><th class="num">السعر بالليرة</th><th class="num">المعادل بالدولار</th><th>المنصة</th></tr></thead>
            <tbody>
              ${ZAIR.sample.map((z) => `
                <tr>
                  <td class="num"><strong>${esc(z.id)}</strong></td>
                  <td><span class="num">${esc(z.departure)} ← ${esc(z.return)}</span><br><small>${esc(z.city_nights)}</small></td>
                  <td>${esc(z.airline)} + ${esc(z.intercity)}</td>
                  <td class="num">${fmtInt(z.per_person_try)} TL</td>
                  <td class="num"><strong>${fmtUsdOrTry(z.indicative_usd, 2)}</strong></td>
                  <td><a class="ext-link" href="${esc(z.url)}" target="_blank" rel="noopener noreferrer">Zair ↗</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div id="sec-unified" class="card ${state.monthlyFocusSubtab !== "all" && state.monthlyFocusSubtab !== "unified" ? "mobile-chapter-collapsed" : ""}" style="margin-top:16px">
        <h3>فهرس الأسعار الموحّد للبرامج (${PROGS.length} سجلًا: H1 2026 + الشتاء + رمضان + شوال)</h3>
        <p>يعرض جميع الباقات حسب الموسم، المدة، مسافة الوصول، والناقل لقياس التسعير السوقي — دون عرض بطاقات فنادق.</p>
        <div class="control-grid control-grid--auto">
          <div class="ctrl-field">
            <label for="f-season">الموسم / المجموعة</label>
            <select id="f-season">
              <option value="all">كل المواسم (${PROGS.length})</option>
              ${seasonsList.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-type">فئة الوصول والمسافة</label>
            <select id="f-type">
              <option value="all">الكل (مشي + شتل)</option>
              <option value="شتل">حافلة / شتل</option>
              <option value="مشي">مشي / قريب للحرم</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-sort">الترتيب</label>
            <select id="f-sort">
              <option value="id">التسلسل المصدري (${PROGS.length})</option>
              <option value="quad_asc">الأقل سعرًا (الرباعي ↑)</option>
              <option value="quad_desc">الأعلى سعرًا (الرباعي ↓)</option>
              <option value="days_desc">الأطول مدة (الأيام ↓)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-q">تصفية بالوكالة أو الشهر أو الناقل</label>
            <input id="f-q" type="text" value="${esc(state.offersQuery)}" placeholder="مثال: İkbal، Yakut، رمضان..." />
          </div>
        </div>
        <div class="pill-row" style="justify-content:space-between;align-items:center">
          <div class="section-sub">المعروض الآن: <strong class="num">${visibleList.length}</strong> من أصل <strong class="num">${list.length}</strong> سجلًا مطابقًا</div>
          ${list.length > 60 ? `<button type="button" class="filter-pill ${state.showAllPrograms ? "active" : ""}" id="toggle-all-progs">${state.showAllPrograms ? "العودة لعرض 60 صفًا" : `عرض كل النتائج (${list.length})`}</button>` : ""}
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>الرمز</th><th>الموسم والشهر</th><th>الوكالة</th><th>الطيران / الإقلاع</th><th>الفترة</th><th class="num">أيام</th><th>فئة الوصول</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th><th>المرجع</th></tr>
            </thead>
            <tbody>
              ${visibleList.map((o) => `
                <tr>
                  <td class="num"><strong>${esc(o.id)}</strong></td>
                  <td><small>${esc(o.season_group)}</small><br>${esc(o.month)}</td>
                  <td><strong>${esc(o.agency)}</strong></td>
                  <td>${esc(o.airline)}</td>
                  <td class="num">${esc(o.departure)}</td>
                  <td class="num">${o.days || "—"}</td>
                  <td><small>${esc(o.access_band)}</small></td>
                  <td class="num"><strong>${fmtUsdOrTry(o.quad_usd)}</strong></td>
                  <td class="num">${fmtUsdOrTry(o.triple_usd)}</td>
                  <td class="num">${fmtUsdOrTry(o.double_usd)}</td>
                  <td>${o.url ? `<a class="ext-link" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">رابط ↗</a>` : `<small>${esc(o.audit_status)}</small>`}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("f-season").value = state.offersSeasonFilter;
    document.getElementById("f-type").value = state.offersTypeFilter;
    document.getElementById("f-sort").value = state.offersSort;

    sec.querySelectorAll("[data-focus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.monthlyFocusSubtab = btn.dataset.focus || "all";
        renderTab("monthly");
        if (window.innerWidth > 768 && btn.dataset.jump) {
          const target = sec.querySelector(btn.dataset.jump);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    sec.querySelectorAll("[data-select-month]").forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedMonth = el.dataset.selectMonth;
        renderTab("monthly");
      });
    });

    document.getElementById("f-season").addEventListener("change", (e) => { state.offersSeasonFilter = e.target.value; renderTab("monthly"); });
    document.getElementById("f-type").addEventListener("change", (e) => { state.offersTypeFilter = e.target.value; renderTab("monthly"); });
    document.getElementById("f-sort").addEventListener("change", (e) => { state.offersSort = e.target.value; renderTab("monthly"); });
    document.getElementById("f-q").addEventListener("input", (e) => { state.offersQuery = e.target.value; renderTab("monthly"); });
    const toggleBtn = document.getElementById("toggle-all-progs");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        state.showAllPrograms = !state.showAllPrograms;
        renderTab("monthly");
      });
    }
  }

  // ==================== TAB 5: ECONOMICS, ROOM INTEGER, TRAIN VS CAR & TAXES ====================

  function renderEconomicsTab() {
    const E = state.data.economics;
    const sec = document.getElementById("tab-economics");

    const roomTotal = state.sim12.makkahNight * 9 + state.sim12.madinahNight * 3;
    const roomPerPax = roomTotal / state.sim12.occ;
    const baseCost = roomPerPax + state.sim12.fixedCost;
    const withReserve = baseCost * 1.03;
    const sellPrice = withReserve / 0.85;
    const grossMargin = sellPrice - withReserve;

    let posPct = 0;
    let holdNote = "تحصيل فوري دون عمولة بطاقات.";
    if (state.sim12.bank === "albaraka") {
      const row = E.pos_commissions_fig9.find((r, i) => [1, 3, 6, 9, 12][i] === Number(state.sim12.inst)) || E.pos_commissions_fig9[0];
      posPct = row.albaraka;
      holdNote = `خصم عمولة مباشر بنسبة ${posPct}% (تستبعد ضريبة BSMV).`;
    } else if (state.sim12.bank === "kuveyt") {
      const row = E.pos_commissions_fig9.find((r, i) => [1, 3, 6, 9, 12][i] === Number(state.sim12.inst)) || E.pos_commissions_fig9[0];
      posPct = row.kuveyt;
      holdNote = `عمولة معتدلة ${posPct}%؛ الأهم ضبط فترة السماح المصرفية.`;
    } else if (state.sim12.bank === "tf") {
      posPct = 0;
      holdNote = "0% عمولة للبنك لكن مع حجز سيولة (Bloke) من 14 إلى 40 يومًا.";
    }
    const posFeeUsd = sellPrice * (posPct / 100);
    const marginAfterPos = grossMargin - posFeeUsd;
    const kdvOnMargin = Math.max(0, marginAfterPos) * (0.20 / 1.20);
    const netProfitUsd = marginAfterPos - kdvOnMargin;

    const sarBase = Number(state.simTaxBaseSar);
    const sarWithMuni = sarBase * 1.05;
    const sarTotal = sarWithMuni * 1.15;
    const taxQuad9nUsd = (sarTotal * 9 / 4) / 3.75;

    const shuttleSvg = buildHBarSvg(
      E.shuttle_vs_walk_fig11.components.flatMap((c) => ([
        { label: `شتل — ${c.item}`, val: c.shuttle, valLabel: fmtUsdOrTry(c.shuttle), color: "#5a6a64" },
        { label: `مشي — ${c.item}`, val: c.walking, valLabel: fmtUsdOrTry(c.walking), highlight: c.item.includes("هامش") }
      ])),
      { aria: "تفكيك عائد الشتل 260$ مقابل المشي 390$" }
    );

    const busPureNet = state.simBusPax * 400 - 7500;
    const busAdjNet = state.simBusPax * 400 - 12800;

    const roomInt = E.room_integer_effect || [];
    const tvc = E.train_vs_car;

    sec.innerHTML = `
      <div class="section-head">
        <h2>التكاليف والضرائب والهوامش، ضربة الغرفة الصحيحية، والنقل بين الحرمين</h2>
        <p class="section-sub">محاكاة التكلفة الكاملة (POS + KDV)، التعادل المزدوج 18.75 مقابل 32، قفزة ceil(N/4)، قطار الحرمين مقابل السيارات، وضريبة 20.75% السعودية</p>
      </div>

      <div class="card">
        <h3>محاكي تكلفة باقة الـ 12 يومًا + عمولات التقسيط POS + ضريبة الهامش KDV (20%)</h3>
        <p>اختبر تغيّر الربح الصافي عند تعديل تكلفة الغرف والإشغال (4/3/2) وقناة التقسيط البنكية (حتى 23.14% في Albaraka):</p>
        <div class="control-grid">
          <div class="ctrl-field">
            <label>غرفة مكة (9 ليالٍ) — $/ليلة: <span class="num">$${state.sim12.makkahNight}</span></label>
            <input id="s12-mk" type="range" min="45" max="350" step="5" value="${state.sim12.makkahNight}" />
          </div>
          <div class="ctrl-field">
            <label>غرفة المدينة (3 ليالٍ) — $/ليلة: <span class="num">$${state.sim12.madinahNight}</span></label>
            <input id="s12-md" type="range" min="50" max="250" step="5" value="${state.sim12.madinahNight}" />
          </div>
          <div class="ctrl-field">
            <label>التكاليف الأخرى (طيران+تأشيرة+نقل) $/فرد: <span class="num">$${state.sim12.fixedCost}</span></label>
            <input id="s12-fx" type="range" min="650" max="1200" step="10" value="${state.sim12.fixedCost}" />
          </div>
          <div class="ctrl-field">
            <label for="s12-occ">نوع الإشغال</label>
            <select id="s12-occ">
              <option value="4">رباعي (4 أشخاص / غرفة)</option>
              <option value="3">ثلاثي (3 أشخاص / غرفة)</option>
              <option value="2">ثنائي (شخصان / غرفة)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="s12-bank">قناة الدفع / البنك (POS)</label>
            <select id="s12-bank">
              <option value="none">نقدي / تحويل بنكي (0%)</option>
              <option value="albaraka">Albaraka Türk (عمولة تقسيط مرتفعة)</option>
              <option value="kuveyt">Kuveyt Türk (1.89%–3.35%)</option>
              <option value="tf">Türkiye Finans (0% مع حجز 14–40 يومًا)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="s12-inst">عدد الأقساط</label>
            <select id="s12-inst" ${state.sim12.bank === "none" ? "disabled" : ""}>
              <option value="1">دفعة واحدة</option>
              <option value="3">3 أقساط</option>
              <option value="6">6 أقساط</option>
              <option value="9">9 أقساط</option>
              <option value="12">12 قسطًا</option>
            </select>
          </div>
        </div>
        <div class="sim-results-grid">
          <div class="sim-box"><div class="sb-lbl">تكلفة المقعد (+3% احتياطي)</div><div class="sb-val num">${fmtUsdOrTry(withReserve, 2)}</div></div>
          <div class="sim-box"><div class="sb-lbl">سعر البيع الإيضاحي (هامش 15%)</div><div class="sb-val num">${fmtUsdOrTry(sellPrice, 2)}</div></div>
          <div class="sim-box"><div class="sb-lbl">استقطاع POS (<span class="num">${posPct}%</span>) + KDV هامش</div><div class="sb-val num" style="color:var(--crimson)">-${fmtUsdOrTry(posFeeUsd + kdvOnMargin, 2)}</div></div>
          <div class="sim-box"><div class="sb-lbl">الصافي المتبقي للمقعد</div><div class="sb-val num" style="color:${netProfitUsd > 0 ? "var(--emerald)" : "var(--crimson)"}">${fmtUsdOrTry(netProfitUsd, 2)}</div></div>
        </div>
        <div class="callout ${netProfitUsd <= 0 ? "callout-danger" : "callout-info"}">${esc(holdNote)} ${netProfitUsd <= 0 ? "تحذير حاسم: عمولة التقسيط التهمت الهامش كله وأدخلت المقعد في خسارة صافية ما لم يُعدَّل السعر!" : ""}</div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>منحنى نقطة التعادل لحافلة 45 مقعدًا: 18.75 مقابل 32</h3>
          <div class="control-grid control-grid--1">
            <div class="ctrl-field">
              <label>عدد الركاب الفعلي بالمجموعة: <strong class="num">${state.simBusPax}</strong> من 45 (<span class="num">${fmtDec((state.simBusPax / 45) * 100, 1)}%</span> امتلاء)</label>
              <input id="bus-slider" type="range" min="1" max="45" step="1" value="${state.simBusPax}" />
            </div>
          </div>
          <div class="svg-wrap">${buildBreakEvenSvg(state.simBusPax)}</div>
          <div class="sim-results-grid sim-results-grid--2">
            <div class="sim-box"><div class="sb-lbl">التعادل التشغيلي البحت (ثابت $7,500)</div><div class="sb-val num" style="color:${busPureNet >= 0 ? "var(--emerald)" : "var(--crimson)"}">${fmtUsdOrTry(busPureNet)}</div></div>
            <div class="sim-box"><div class="sb-lbl">بعد مخصص +$5,300 POS ومخاطر</div><div class="sb-val num" style="color:${busAdjNet >= 0 ? "var(--emerald)" : "var(--crimson)"}">${fmtUsdOrTry(busAdjNet)}</div></div>
          </div>
          ${buildCoachSeatMapHtml(state.simBusPax)}
        </div>

        <div class="card">
          <h3>اقتصاديات الشتل (260$) مقابل المشي (390$) — زيادة ربحية +50%</h3>
          <div class="svg-wrap">${shuttleSvg}</div>
          <div class="callout callout-info">${esc(E.shuttle_vs_walk_fig11.note)}</div>
          <h3 style="margin-top:12px">فوارق الغرف داخل البرنامج الواحد</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الوكالة / البرنامج</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th><th class="num">الزيادة (2−4)</th></tr></thead>
              <tbody>
                ${E.same_offer_spreads_p44.map((s) => `<tr><td><strong>${esc(s.agency)}</strong></td><td class="num">${fmtUsdOrTry(s.quad)}</td><td class="num">${fmtUsdOrTry(s.triple)}</td><td class="num">${fmtUsdOrTry(s.double)}</td><td class="num"><strong>+${fmtUsdOrTry(s.spread_2_4)}</strong></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>أثر العدد الصحيح للغرف ceil(N/4) وقفزة التكلفة الفردية</h3>
          <p>إضافة معتمر واحد يكسر مضاعف الـ 4 (من 12 ← 13 أو 16 ← 17) يفرض غرفة إضافية كاملة ويرفع تكلفة السرير الفندقية من <strong>$125.67</strong> إلى <strong>$154.67</strong> (+23% فجائيًا)!</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="num">عدد المسافرين</th><th class="num">عدد الغرف ceil(N/4)</th><th class="num">تكلفة السرير/فرد ($)</th><th>الأثر الهامشي</th></tr></thead>
              <tbody>
                ${roomInt.map((r) => `
                  <tr ${r.pax === 13 || r.pax === 17 ? 'style="background:#fef6e4"' : ""}>
                    <td class="num"><strong>${r.pax} مسافرًا</strong></td>
                    <td class="num">${r.rooms} غرف</td>
                    <td class="num"><strong>${fmtUsdOrTry(r.hotel_cost_pp_USD, 2)}</strong></td>
                    <td>${r.pax === 13 || r.pax === 17 ? '<span class="status-pill status-warn">قفزة كسر الغرفة!</span>' : r.pax % 4 === 0 ? '<span class="status-pill status-ok">اكتمال رباعي مثالي</span>' : "امتصاص تدريجي"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="callout callout-info" style="margin-top:10px">
            <strong>معادلة الإشغال القياسية:</strong> تعتمد الدراسة على افتراض ميزانية غرفة رباعية <span class="num">1,885 SAR</span> مقسومة عبر دالة السقف <span class="num">ceil(N / 4)</span>؛ لذا يمثّل إغلاق المجموعات عند مضاعفات الـ 4 فارق حماية رئيسيًا في الهامش.
          </div>
        </div>

        <div class="card">
          <h3>تكلفة قطار الحرمين مقابل سيارة سيدان أو ستاريا (1 ← 7 أفراد بالريال SAR)</h3>
          <p>${esc(tvc.note)}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="num">عدد الركاب</th><th class="num">قطار الحرمين (+15% و200 محطة)</th><th class="num">سيدان (SAR شاملة)</th><th class="num">ستاريا (SAR شاملة)</th><th>الأوفر بالمنطق المالي</th></tr></thead>
              <tbody>
                ${tvc.rows.map((r) => `
                  <tr>
                    <td class="num"><strong>${r.pax}</strong></td>
                    <td class="num">${fmtDec(r.train_total_before_unknown_fees_SAR, 1)} SAR</td>
                    <td class="num">${fmtDec(r.sedan_total_SAR, 2)} SAR</td>
                    <td class="num">${fmtDec(r.staria_total_SAR, 2)} SAR</td>
                    <td><strong>${r.pax === 1 ? "القطار أرخص" : r.pax <= 4 ? "السيدان أوفر بـ +" + fmtDec(r.train_total_before_unknown_fees_SAR - r.sedan_total_SAR, 0) + " SAR" : "الستاريا أوفر بفارق هائل"}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>المرونة السعرية حسب المسافة وتكلفة الإيواء بالجملة</h3>
          <p>${esc(E.elasticity_p32_34_summary.log_relation)}</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>النطاق الجغرافي (اقتصاديًا)</th><th>السعر بالباقة</th><th>نطاق الجملة (SAR/غرفة)</th><th>الدور بالسوق التركي</th></tr></thead>
              <tbody>
                ${E.elasticity_p32_34_summary.distance_bands.map((b) => `<tr><td><strong>${esc(b.band)}</strong></td><td class="num">${esc(b.price_usd)}</td><td class="num">${esc(b.wholesale_sar)}</td><td>${esc(b.market_role)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="callout callout-warn">${esc(E.elasticity_p32_34_summary.data_hygiene_50p_p42)}</div>
        </div>

        <div class="card">
          <h3>شلال الضريبة السعودية التراكمي (+5% بلدية ← +15% VAT = 20.75%)</h3>
          <div class="control-grid control-grid--1">
            <div class="ctrl-field">
              <label>اختبر سعر غرفة مكة الأساسي (SAR/ليلة): <strong class="num">${sarBase} SAR</strong></label>
              <input id="tax-sar-slider" type="range" min="70" max="1500" step="10" value="${sarBase}" />
            </div>
          </div>
          <div class="sim-results-grid sim-results-grid--3">
            <div class="sim-box"><div class="sb-lbl">+5% بلدية</div><div class="sb-val num">${fmtDec(sarWithMuni, 2)} SAR</div></div>
            <div class="sim-box"><div class="sb-lbl">+15% VAT إجمالي 1.2075×</div><div class="sb-val num">${fmtDec(sarTotal, 2)} SAR</div></div>
            <div class="sim-box"><div class="sb-lbl">تكلفة 9 ليالٍ/فرد (رباعي)</div><div class="sb-val num">${fmtUsdOrTry(taxQuad9nUsd, 2)}</div></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الفئة السعرية</th><th class="num">أساسي SAR</th><th class="num">بعد 20.75%</th><th class="num">تكلفة 9 ليالٍ/فرد ($)</th></tr></thead>
              <tbody>
                ${E.saudi_tax_waterfall.map((t) => `<tr><td>${esc(t.bracket)}</td><td class="num">${t.base_sar}</td><td class="num">${fmtDec(t.vat_15_total, 2)}</td><td class="num"><strong>$${fmtDec(t.per_person_9n_usd, 2)}</strong></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>تعرفات ديانت (SAR 2025–2027) وتآكل الليرة التركية (+17%)</h3>
          <p>تآكل الصرف: باقة <strong class="num">$1,500</strong> ارتفعت محليًا من <strong class="num">64,821 TL</strong> في يناير (43.21) إلى <strong class="num">69,392 TL</strong> في يونيو (46.26) ثم <strong class="num">75,165 TL</strong> في نوفمبر (50.11) — بزيادة <strong class="num">+17%</strong>.</p>
          <details class="mob-spoiler">
            <summary>جدول تعرفات ديانت المرجعية (2025–2027)<span class="mob-spoiler-badge">${E.diyanet_tariffs_table.length} نشرات</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>نشرة ديانت</th><th>المدد</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th></tr></thead>
                  <tbody>
                    ${E.diyanet_tariffs_table.map((d) => `<tr><td><strong>${esc(d.bulletin)}</strong></td><td>${esc(d.durations)}</td><td class="num">${esc(d.quad)}</td><td class="num">${esc(d.triple)}</td><td class="num">${esc(d.double)}</td></tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>

        <div class="card">
          <h3>الأعباء التنظيمية والقانونية والضريبية في تركيا والسعودية</h3>
          <details class="mob-spoiler">
            <summary>قائمة الرسوم والضرائب التنظيمية (${E.regulatory_items_p37_p46.length} بنود)<span class="mob-spoiler-badge">مرجع تنظيمي</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>البند التنظيمي</th><th>القيمة / القاعدة</th><th>الأثر على الوكالة</th></tr></thead>
                  <tbody>
                    ${E.regulatory_items_p37_p46.map((r) => `<tr><td><strong>${esc(r.item)}</strong></td><td>${esc(r.value)}</td><td>${esc(r.ref)}</td></tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      </div>
    `;

    document.getElementById("s12-occ").value = String(state.sim12.occ);
    document.getElementById("s12-bank").value = state.sim12.bank;
    document.getElementById("s12-inst").value = String(state.sim12.inst);

    document.getElementById("s12-mk").addEventListener("input", (e) => { state.sim12.makkahNight = Number(e.target.value); renderTab("economics"); });
    document.getElementById("s12-md").addEventListener("input", (e) => { state.sim12.madinahNight = Number(e.target.value); renderTab("economics"); });
    document.getElementById("s12-fx").addEventListener("input", (e) => { state.sim12.fixedCost = Number(e.target.value); renderTab("economics"); });
    document.getElementById("s12-occ").addEventListener("change", (e) => { state.sim12.occ = Number(e.target.value); renderTab("economics"); });
    document.getElementById("s12-bank").addEventListener("change", (e) => { state.sim12.bank = e.target.value; renderTab("economics"); });
    document.getElementById("s12-inst").addEventListener("change", (e) => { state.sim12.inst = Number(e.target.value); renderTab("economics"); });
    document.getElementById("bus-slider").addEventListener("input", (e) => { state.simBusPax = Number(e.target.value); renderTab("economics"); });
    sec.querySelectorAll("[data-seat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.simBusPax = Number(btn.dataset.seat);
        renderTab("economics");
      });
    });
    document.getElementById("tax-sar-slider").addEventListener("input", (e) => { state.simTaxBaseSar = Number(e.target.value); renderTab("economics"); });
  }

  // ==================== TAB 6: DIGITAL MARKETING SENSITIVITY, IG ADS & CANCELLATION THRESHOLD ====================

  function renderDistributionTab() {
    const D = state.data.distribution;
    const sec = document.getElementById("tab-distribution");

    const bookingsFromChats = Math.round(state.simMetaChats * (state.simMetaConv / 100));
    const cacLive = bookingsFromChats > 0 ? state.simMetaSpend / bookingsFromChats : 0;
    const estRev = bookingsFromChats * 1500;
    const roasLive = state.simMetaSpend > 0 ? estRev / state.simMetaSpend : 0;
    const ct = D.cancellation_threshold;

    const convSvg = buildHBarSvg([
      {
        label: `سيناريو متحفظ (3% من ${fmtInt(state.simMetaChats)} محادثة)`,
        val: Math.round(state.simMetaChats * 0.03),
        valLabel: `${fmtInt(state.simMetaChats * 0.03)} حجزًا`,
        color: "#5a6a64"
      },
      {
        label: `سيناريو متوسط (6% من ${fmtInt(state.simMetaChats)} محادثة)`,
        val: Math.round(state.simMetaChats * 0.06),
        valLabel: `${fmtInt(state.simMetaChats * 0.06)} حجزًا`
      },
      {
        label: `سيناريو متفائل (9% من ${fmtInt(state.simMetaChats)} محادثة)`,
        val: Math.round(state.simMetaChats * 0.09),
        valLabel: `${fmtInt(state.simMetaChats * 0.09)} حجزًا`,
        highlight: true
      }
    ], { aria: "حساسية تحويل المحادثات الرقمية إلى حجوزات مؤكدة" });

    sec.innerHTML = `
      <div class="section-head">
        <h2>التسويق الرقمي (Meta/IG)، الحملات العامة في السوق، ومخاطر الإلغاء</h2>
        <p class="section-sub">نموذج حساسية الإنفاق الإعلاني وتكلفة الاستحواذ CAC، مسح الحملات العامة الثماني، الجالية الأوروبية، وعتبة الإلغاء 11.11%</p>
      </div>

      <div class="callout callout-warn" style="margin-bottom:14px">${esc(D.meta_metrics.audit_warning)}</div>

      <div class="grid-2">
        <div class="card">
          <h3>حاسبة حساسية الإعلانات: الإنفاق ← المحادثات ← الحجوزات</h3>
          <div class="control-grid">
            <div class="ctrl-field">
              <label>الميزانية الإعلانية ($ USD): <strong class="num">$${fmtInt(state.simMetaSpend)}</strong></label>
              <input id="meta-spend" type="range" min="300" max="4800" step="100" value="${state.simMetaSpend}" />
            </div>
            <div class="ctrl-field">
              <label>عدد المحادثات الناتجة (WhatsApp/DM): <strong class="num">${fmtInt(state.simMetaChats)}</strong></label>
              <input id="meta-chats" type="range" min="100" max="1500" step="50" value="${state.simMetaChats}" />
            </div>
            <div class="ctrl-field">
              <label>نسبة الإغلاق (%): <strong class="num">${state.simMetaConv}%</strong></label>
              <input id="meta-conv" type="range" min="2" max="12" step="0.5" value="${state.simMetaConv}" />
            </div>
          </div>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">الحجوزات المتوقعة</div><div class="sb-val num">${fmtInt(bookingsFromChats)}</div></div>
            <div class="sim-box"><div class="sb-lbl">تكلفة الاستحواذ CAC</div><div class="sb-val num">${fmtUsdOrTry(cacLive, 1)}</div></div>
            <div class="sim-box"><div class="sb-lbl">تكلفة المحادثة الضمنية</div><div class="sb-val num">$${fmtDec(state.simMetaSpend / state.simMetaChats, 2)}</div></div>
            <div class="sim-box"><div class="sb-lbl">مضاعف الإيراد (ROAS عند 1,500$)</div><div class="sb-val num">${fmtDec(roasLive, 1)}×</div></div>
          </div>

          <h3 style="margin-top:14px">جدول الحساسية المرجعي: الإنفاق مقابل CAC</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="num">الإنفاق $</th><th class="num">CAC عند 20 حجزًا</th><th class="num">CAC عند 40 حجزًا</th><th class="num">CAC عند 60 حجزًا</th></tr></thead>
              <tbody>
                ${D.meta_sensitivity_p47.spend_vs_cac.map((r) => `<tr><td class="num"><strong>$${fmtInt(r.spend)}</strong></td><td class="num">$${r.c20.toFixed(1)}</td><td class="num">$${r.c40.toFixed(1)}</td><td class="num">$${r.c60.toFixed(1)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>مصفوفة حساسية تحويل المحادثات وضوابط السوق الرقمي التركي</h3>
          <p>متطلبات السوق المعلنة: <strong>${esc(D.meta_metrics.tax_surcharge)}</strong> | نطاق CPM بالليرة: <strong class="num">${esc(D.meta_metrics.cpm_tl)}</strong></p>
          <div class="svg-wrap">${convSvg}</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th class="num">حجم المحادثات</th><th class="num">تحويل 3%</th><th class="num">تحويل 6%</th><th class="num">تحويل 9%</th></tr></thead>
              <tbody>
                ${D.meta_sensitivity_p47.chats_vs_bookings.map((r) => `<tr><td class="num"><strong>${fmtInt(r.chats)}</strong></td><td class="num">${r.r3}</td><td class="num">${r.r6}</td><td class="num"><strong>${r.r9}</strong></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="callout callout-info" style="margin-top:10px">${esc(D.europe_diaspora_p39)}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>مسح 8 حملات إعلانية حية على إنستغرام في السوق التركي</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الحساب الإعلاني</th><th>العرض السعري المعلن</th><th>نطاق التغطية</th><th>الميزة التسويقية (Hook)</th></tr></thead>
              <tbody>
                ${D.instagram_ads_8.map((ad) => `<tr><td><strong class="num">${esc(ad.account)}</strong></td><td>${esc(ad.offer)}</td><td>${esc(ad.reach)}</td><td>${esc(ad.hook)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>مصفوفة مخاطر الإلغاء والسيولة + حد التعادل (${ct.breakeven_prob_pct}%)</h3>
          <div class="callout callout-warn" style="margin-bottom:10px">
            <strong>معادلة حجز الفندق غير المسترد مقابل المسترد:</strong> سعر غير مسترد <span class="num">${fmtInt(ct.nr_sar)} SAR</span> مقابل مسترد <span class="num">${fmtInt(ct.ref_sar)} SAR</span> ← أي احتمال إلغاء يتجاوز <strong>${ct.breakeven_prob_pct}%</strong> ((1,800−1,600) ÷ 1,800) يجعل الحجز غير المسترد خاسرًا رياضيًا!
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>النافذة الزمنية</th><th>شروط الطيران (THY/flynas)</th><th>السكن</th><th>تأثير السيولة</th></tr></thead>
              <tbody>
                ${D.cancellation_matrix.map((c) => `<tr><td><strong>${esc(c.window)}</strong></td><td>${esc(c.flight)}</td><td>${esc(c.hotel)}</td><td>${esc(c.liquidity)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById("meta-spend").addEventListener("input", (e) => { state.simMetaSpend = Number(e.target.value); renderTab("distribution"); });
    document.getElementById("meta-chats").addEventListener("input", (e) => { state.simMetaChats = Number(e.target.value); renderTab("distribution"); });
    document.getElementById("meta-conv").addEventListener("input", (e) => { state.simMetaConv = Number(e.target.value); renderTab("distribution"); });
  }

  // ==================== TAB 7: THEMATIC RESEARCH BRIEFS & 12 RESOLVED GAPS ====================

  function renderBriefsTab() {
    const sec = document.getElementById("tab-briefs");
    const briefs = state.data.research_briefs || [];
    const gaps = state.data.resolved_gaps || [];

    const filtered = state.briefGroupFilter === "all"
      ? briefs
      : briefs.filter((b) => b.group === state.briefGroupFilter);

    const groups = [
      ["all", `كل الملفات (${briefs.length})`],
      ["macro", "السوق والطلب"],
      ["aviation", "الطيران والمطارات"],
      ["agencies", "الشركات والحيتان"],
      ["monthly", "إقبال وتمام رمضان وZair"],
      ["economics", "التكاليف والضرائب"],
      ["distribution", "التسويق والإلغاء"],
      ["audit", "التنقية والجالية"]
    ];

    sec.innerHTML = `
      <div class="section-head">
        <h2>ملفات التحقق المعمّق (${briefs.length} ملفًا موضوعيًا) وسجل الـ ${gaps.length} ثغرة محلولة</h2>
        <p class="section-sub">مؤشرات تحليلية مصنفة حسب المحور البحثي مع توثيق الثغرات التسعيرية والروابط التي تم استكمالها بالرصد الحي</p>
      </div>

      <div class="pill-row">
        ${groups.map(([gKey, gLbl]) => `
          <button type="button" class="filter-pill ${state.briefGroupFilter === gKey ? "active" : ""}" data-bgrp="${gKey}">${gLbl}</button>
        `).join("")}
      </div>

      <div class="grid-3">
        ${filtered.map((b) => `
          <article class="page-card" data-open-brief="${esc(b.id)}">
            <div>
              <div class="page-card-head">
                <span class="page-num-pill num">${esc(b.id)}</span>
                <span class="src-tag">${esc(groups.find((x) => x[0] === b.group)?.[1] || b.group)}</span>
              </div>
              <div class="page-card-title">${esc(b.title)}</div>
              <div class="page-card-kpis">${esc(b.kpis)}</div>
            </div>
            <div class="page-card-why">${esc(b.why)}</div>
          </article>
        `).join("")}
      </div>

      <div class="card" style="margin-top:20px">
        <h3>سجل الـ ${gaps.length} ثغرة ونقص ميداني مُستكمل بالتحقق المباشر</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الوكالة والفترة</th><th>الادعاء والسعر</th><th>الفجوة الأصلية</th><th>الحالة</th><th>نتيجة التحقق الميداني</th><th>الرابط</th></tr></thead>
            <tbody>
              ${gaps.map((g) => `
                <tr>
                  <td><strong>${esc(g.agency)}</strong><br><small>${esc(g.period)}</small></td>
                  <td>${esc(g.date_claim)}<br><strong class="num">${esc(g.price_claim)}</strong></td>
                  <td>${esc(g.missing_field)}</td>
                  <td><span class="status-pill ${g.status_ar.includes("مكتمل") || g.status_ar.includes("الحل") ? "status-ok" : "status-warn"}">${esc(g.status_ar)}</span></td>
                  <td>${esc(g.resolved_ar)}</td>
                  <td><a class="ext-link" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">تحقق ↗</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    sec.querySelectorAll("[data-bgrp]").forEach((b) => b.addEventListener("click", () => { state.briefGroupFilter = b.dataset.bgrp; renderTab("briefs"); }));
    sec.querySelectorAll("[data-open-brief]").forEach((card) => {
      card.addEventListener("click", () => {
        const b = briefs.find((x) => x.id === card.dataset.openBrief);
        if (!b) return;
        openDrawer(`ملف تحليلي · ${b.id}`, b.title, `
          <div class="drawer-box"><strong>الأرقام والمؤشرات الحاسمة:</strong><br>${esc(b.kpis)}</div>
          <div class="drawer-box"><strong>التحليل والتفسير (لماذا وكيف؟):</strong><br>${esc(b.why)}</div>
        `);
      });
    });
  }

  // ==================== TAB 8: METHODOLOGY, DISCREPANCIES & PUBLIC SOURCES ====================

  function renderAuditTab() {
    const AU = state.data.audit;
    const sec = document.getElementById("tab-audit");

    sec.innerHTML = `
      <div class="section-head">
        <h2>منهجية التدقيق الإحصائي، سجل التناقضات (AUD-01..07)، والمصادر المؤسسية</h2>
        <p class="section-sub">قواعد الفصل بين الوحدات الست، توثيق التضاربات المصححة، و${AU.verified_public_sources.length} رابطًا رسميًا وإعلاميًا قابلة للتحقق العام</p>
      </div>

      <div class="card">
        <h3>سجل التوفيق بين الإفصاحات الرسمية ومسوحات المنصات</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>نقطة البحث أو التضارب</th><th>المصدر المؤسسي الأول</th><th>المصدر / الرصد الثاني</th><th>الحكم المنهجي المعتمد</th></tr></thead>
            <tbody>
              ${AU.reconciliation_matrix.map((r) => `
                <tr>
                  <td><strong>${esc(r.topic)}</strong></td>
                  <td>${esc(r.source_a)}</td>
                  <td>${esc(r.source_b)}</td>
                  <td style="color:var(--emerald)"><strong>${esc(r.verdict)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>سجل التناقضات والأخطاء المصححة في السوق (AUD-01 ← AUD-07)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الرمز / الخطورة</th><th>عنوان التناقض</th><th>الادعاء المرصود</th><th>الحقيقة المدققة</th><th>المرجع المؤسسي</th></tr></thead>
            <tbody>
              ${(AU.discrepancies || []).map((d) => `
                <tr>
                  <td><strong class="num">${esc(d.id)}</strong><br><span class="status-pill ${d.severity === "حرج" ? "status-warn" : "status-ok"}">${esc(d.severity)}</span></td>
                  <td><strong>${esc(d.title)}</strong></td>
                  <td>${esc(d.claim_found)}</td>
                  <td>${esc(d.truth_audited)}</td>
                  <td><small>${esc(d.source_ref)}</small></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>قاموس الوحدات الإحصائية الست غير القابلة للخلط</h3>
          <details class="mob-spoiler">
            <summary>عرض القاموس والقاعدة المانعة للجمع المزدوج<span class="mob-spoiler-badge">${AU.units_6.length} وحدات</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>الوحدة</th><th>الأرقام المرجعية</th><th>قاعدة المنع</th></tr></thead>
                  <tbody>
                    ${AU.units_6.map((u) => `<tr><td><strong>${esc(u.unit)}</strong></td><td>${esc(u.example)}</td><td>${esc(u.rule)}</td></tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>

        <div class="card">
          <h3>تصنيف الموثوقية (A / B / C) ورموز المنهجية</h3>
          ${AU.grades.map((g) => `
            <div class="drawer-box">
              <span class="badge-grade grade-${esc(g.grade)}">${esc(g.label)}</span>
              <div style="margin-top:6px;font-size:13px">${esc(g.items)}</div>
            </div>
          `).join("")}
          <details class="mob-spoiler">
            <summary>جدول رموز المصادر المرجعية (${(AU.source_codes || []).length})<span class="mob-spoiler-badge">مرجع الرموز</span></summary>
            <div class="mob-spoiler-body">
              <div class="table-wrap" style="margin-top:0">
                <table>
                  <thead><tr><th>الرمز</th><th>المصدر</th><th>نطاق الإثبات</th></tr></thead>
                  <tbody>
                    ${(AU.source_codes || []).map((s) => `<tr><td class="num"><strong>${esc(s.code)}</strong></td><td>${esc(s.source)}</td><td>${esc(s.scope)}</td></tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>المصادر العامة الموثقة القابلة للتحقق المباشر (${AU.verified_public_sources.length} رابطًا)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>المصدر</th><th>الدرجة</th><th>التصنيف</th><th>الرابط العام المباشر</th></tr></thead>
            <tbody>
              ${AU.verified_public_sources.map((s) => `
                <tr>
                  <td><strong>${esc(s.name)}</strong></td>
                  <td><span class="badge-grade grade-${esc(s.grade)}">${esc(s.grade)}</span></td>
                  <td><span class="src-tag">${esc(s.category)}</span></td>
                  <td><a class="ext-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">فتح المصدر الأصلي ↗</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==================== GLOBAL SEARCH & NAVIGATION ====================

  function handleGlobalSearch(query) {
    const panel = document.getElementById("search-results-panel");
    const q = query.trim().toLowerCase();
    if (!q || !state.data) {
      panel.classList.add("hidden");
      panel.innerHTML = "";
      return;
    }

    const hits = [];
    state.data.agencies.whales_blocks.forEach((w) => {
      if (`${w.name} ${w.license} ${w.financials} ${w.audit_caveat}`.toLowerCase().includes(q)) {
        hits.push({ kind: "تكتل كبرى", title: w.name, sub: w.volume, action: () => switchTab("agencies") });
      }
    });
    (state.data.agencies.directory || []).forEach((a) => {
      if (`${a.name} ${a.city} ${a.metric}`.toLowerCase().includes(q)) {
        hits.push({ kind: `وكالة (${fmtUsdOrTry(a.min_usd)})`, title: a.name, sub: `${a.city} — ${a.metric}`, action: () => { state.dirQuery = a.name; switchTab("agencies"); } });
      }
    });
    (state.data.tam_ramazan.season_2027 || []).forEach((t) => {
      if (`${t.agency} تمام رمضان ${t.days} ${t.airline}`.toLowerCase().includes(q)) {
        hits.push({ kind: "تمام رمضان 27", title: `${t.agency} (${t.days} يومًا)`, sub: `رباعي ${fmtUsdOrTry(t.quad_usd)} | ${t.departure}`, action: () => { state.monthlyFocusSubtab = "all"; switchTab("monthly"); } });
      }
    });
    (state.data.ikbal.official_13 || []).forEach((p) => {
      if (`إقبال ikbal ${p.id} ${p.title_ar} ${p.category} ${p.route}`.toLowerCase().includes(q)) {
        hits.push({ kind: `إقبال ${p.id}`, title: p.title_ar, sub: `رباعي ${fmtUsdOrTry(p.quad_usd)} | متبقٍ ${p.remaining_seats}`, action: () => { state.monthlyFocusSubtab = "all"; switchTab("monthly"); } });
      }
    });
    (state.data.research_briefs || []).forEach((b) => {
      if (`${b.title} ${b.kpis} ${b.why}`.toLowerCase().includes(q)) {
        hits.push({ kind: `ملف ${b.id}`, title: b.title, sub: b.kpis, action: () => switchTab("briefs") });
      }
    });
    state.data.audit.reconciliation_matrix.forEach((r) => {
      if (`${r.topic} ${r.source_a} ${r.source_b} ${r.verdict}`.toLowerCase().includes(q)) {
        hits.push({ kind: "تدقيق", title: r.topic, sub: r.verdict, action: () => switchTab("audit") });
      }
    });

    if (hits.length === 0) {
      panel.innerHTML = `<div class="search-hit"><span>لا توجد نتائج مطابقة لـ «${esc(query)}».</span></div>`;
    } else {
      panel.innerHTML = hits.slice(0, 12).map((h, i) => `
        <div class="search-hit" data-hit-idx="${i}">
          <div><strong>${esc(h.title)}</strong><div style="font-size:12px;color:var(--slate-muted)">${esc(h.sub)}</div></div>
          <span class="search-hit-kind">${esc(h.kind)}</span>
        </div>
      `).join("");
      panel.querySelectorAll("[data-hit-idx]").forEach((el) => {
        el.addEventListener("click", () => {
          hits[Number(el.dataset.hitIdx)].action();
          panel.classList.add("hidden");
        });
      });
    }
    panel.classList.remove("hidden");
  }

  function preserveFocusRun(fn) {
    const active = document.activeElement;
    const activeId = active && active.id ? active.id : null;
    const selStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    fn();
    if (activeId) {
      const next = document.getElementById(activeId);
      if (next) {
        next.focus({ preventScroll: true });
        if (selStart !== null && typeof next.setSelectionRange === "function") {
          try { next.setSelectionRange(selStart, selStart); } catch (_) {}
        }
      }
    }
  }

  const MOBILE_CHAPTERS = [
    { id: "macro", title: "السوق والطلب الكلي", kpi: "16.92M / 650K+", sub: "PEP، GASTAT، ديانت ونبض المنصات" },
    { id: "aviation", title: "الطيران والمطارات", kpi: "11 مطارًا", sub: "THY، Pegasus، المطارات وفوارق المحافظات" },
    { id: "agencies", title: "الشركات والتكتلات (+66)", kpi: "+66 وكالة", sub: "التكتلات، خريطة الأقاليم، والدليل المستكمل" },
    { id: "monthly", title: "الأسعار H1، تمام وإقبال", kpi: "285 برنامجًا", sub: "موسمية H1، إقبال، تمام رمضان وZair DIY" },
    { id: "economics", title: "التكاليف والضرائب", kpi: "18.75 / 32 مقعد", sub: "محاكي الهامش، POS، حافلة 45 والضريبة" },
    { id: "distribution", title: "التسويق والإلغاء", kpi: "11.1% تعادل", sub: "حاسبة Meta/CAC، الحملات، ومخاطر السيولة" },
    { id: "briefs", title: "ملفات التحقق والثغرات", kpi: "12 ثغرة محلولة", sub: "البطاقات البحثية والفجوات المغلقة" },
    { id: "audit", title: "منهجية التدقيق والمصادر", kpi: "AUD-01..07", sub: "مصفوفة التوفيق والمصادر العامة" }
  ];

  function syncSpoilersForViewport(sec) {
    if (!sec) return;
    const isDesk = window.innerWidth > 768;
    sec.querySelectorAll("details.mob-spoiler").forEach((det) => {
      if (!det.dataset.userToggled) {
        det.open = isDesk;
      }
      if (!det.dataset.boundSpoiler) {
        det.dataset.boundSpoiler = "1";
        det.addEventListener("toggle", () => {
          det.dataset.userToggled = "1";
        });
      }
    });
  }

  function enhanceTablesForMobile(sec) {
    if (!sec) return;
    sec.querySelectorAll(".table-wrap").forEach((wrap) => {
      const tbl = wrap.querySelector("table");
      if (!tbl) return;
      const ths = Array.from(tbl.querySelectorAll("thead th"));
      const labels = ths.map((th) => th.textContent.trim().replace(/\s+/g, " "));
      const firstRow = tbl.querySelector("tbody tr");
      const firstTds = firstRow ? Array.from(firstRow.querySelectorAll("td")) : [];
      const numCount = firstTds.filter((td) => td.classList.contains("num")).length;
      const hasLinks = !!tbl.querySelector("tbody a.ext-link, tbody button");
      const maxPlainTextLen = Math.max(
        0,
        ...firstTds.filter((td) => !td.classList.contains("num")).map((td) => td.textContent.trim().length)
      );

      const isStickyMatrix =
        labels.length >= 3 &&
        labels.length <= 5 &&
        numCount >= 2 &&
        !hasLinks &&
        maxPlainTextLen <= 44;

      wrap.classList.remove("is-mob-cards", "is-mob-sticky");
      if (wrap.previousElementSibling && wrap.previousElementSibling.classList.contains("mob-scroll-hint")) {
        wrap.previousElementSibling.remove();
      }

      if (isStickyMatrix) {
        wrap.classList.add("is-mob-sticky");
        const hint = document.createElement("div");
        hint.className = "mob-scroll-hint";
        hint.textContent = "اسحب الجدول أفقيًا لمقارنة الأعمدة ←";
        wrap.parentNode.insertBefore(hint, wrap);
        return;
      }

      wrap.classList.add("is-mob-cards");
      tbl.querySelectorAll("tbody tr").forEach((tr) => {
        const tds = Array.from(tr.querySelectorAll("td"));
        let headIdx = 0;
        if (tds.length > 2 && (/^(#|الرمز|الكود)$/.test(labels[0] || "") || tds[0].textContent.trim().length <= 6)) {
          headIdx = 1;
        }
        tds.forEach((td, idx) => {
          td.dataset.label = labels[idx] || "";
          const hasAction = !!td.querySelector("a.ext-link, button");
          const lbl = labels[idx] || "";
          if (hasAction || (idx === tds.length - 1 && /رابط|مرجع|مصدر|الموقع/.test(lbl))) {
            td.dataset.mobRole = "cta";
          } else if (idx === headIdx) {
            td.dataset.mobRole = "head";
          } else if (!td.classList.contains("num") && (td.textContent.trim().length > 42 || td.querySelector("br, small"))) {
            td.dataset.mobRole = "wide";
          } else {
            td.removeAttribute("data-mob-role");
          }
        });
      });
    });
  }

  function openMobileTabSheet() {
    document.getElementById("mobSheetBackdrop")?.classList.add("open");
    document.getElementById("mobileTabSheet")?.classList.add("open");
  }

  function closeMobileTabSheet() {
    document.getElementById("mobSheetBackdrop")?.classList.remove("open");
    document.getElementById("mobileTabSheet")?.classList.remove("open");
  }

  function syncMobileChrome() {
    const mobFxPill = document.getElementById("mobFxPill");
    if (mobFxPill) {
      const lbl = { USD: "$ USD ⇄", TRY_JAN: "₺ يناير ⇄", TRY_JUN: "₺ يونيو ⇄", TRY_NOV: "₺ نوفمبر ⇄" };
      mobFxPill.textContent = lbl[state.currency] || "$ USD ⇄";
    }
    document.querySelectorAll("#mobileBottomDock [data-dock-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.dockTab === state.activeTab);
    });
    const moreBtn = document.getElementById("mobMoreTabsBtn");
    if (moreBtn) {
      const inDock = ["macro", "agencies", "monthly"].includes(state.activeTab);
      moreBtn.classList.toggle("active", !inDock);
    }
    const grid = document.getElementById("mobSheetGrid");
    if (grid) {
      grid.innerHTML = MOBILE_CHAPTERS.map((ch) => `
        <button type="button" class="mob-chapter-card ${state.activeTab === ch.id ? "active" : ""}" data-sheet-tab="${ch.id}">
          <span class="mob-chapter-kpi">${esc(ch.kpi)}</span>
          <span class="mob-chapter-title">${esc(ch.title)}</span>
          <span class="mob-chapter-sub">${esc(ch.sub)}</span>
        </button>`
      ).join("") + `
        <a class="mob-chapter-card" href="./prices.html" style="text-decoration:none;border-color:#c99738;background:#fdf8eb;grid-column:1 / -1;">
          <span class="mob-chapter-kpi" style="color:#8b5e00;">صفحة الأسعار الحية</span>
          <span class="mob-chapter-title">تقويم وأسعار سوق العمرة (سبتمبر 2026 – شوال 1448) ↗</span>
          <span class="mob-chapter-sub">رصد شهري لفنادق مكة والمدينة والغرف (2-3-4 أشخاص) وروابط الوكالات</span>
        </a>`;
      grid.querySelectorAll("[data-sheet-tab]").forEach((b) => {
        b.addEventListener("click", () => {
          closeMobileTabSheet();
          switchTab(b.dataset.sheetTab);
        });
      });
    }
  }

  function renderTab(tabId) {
    if (!state.data) return;
    preserveFocusRun(() => {
      if (tabId === "macro") renderMacroTab();
      else if (tabId === "aviation") renderAviationTab();
      else if (tabId === "agencies") renderAgenciesTab();
      else if (tabId === "monthly") renderMonthlyTab();
      else if (tabId === "economics") renderEconomicsTab();
      else if (tabId === "distribution") renderDistributionTab();
      else if (tabId === "briefs") renderBriefsTab();
      else if (tabId === "audit") renderAuditTab();
      const sec = document.getElementById(`tab-${tabId}`);
      syncSpoilersForViewport(sec);
      enhanceTablesForMobile(sec);
    });
    syncMobileChrome();
  }

  function switchTab(tabId) {
    if (!tabId) return;
    state.activeTab = tabId;
    document.querySelectorAll(".tab-btn[data-tab]").forEach((b) => {
      const active = b.dataset.tab === tabId;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("hidden", p.id !== `tab-${tabId}`);
    });
    renderTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function init() {
    try {
      const resp = await fetch("./data/research-data.json");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      state.data = await resp.json();

      document.getElementById("app-title").textContent = state.data.meta.title;
      document.getElementById("app-subtitle").textContent = state.data.meta.subtitle;
      document.getElementById("loading-state").classList.add("hidden");

      document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
      });

      document.querySelectorAll(".fx-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.currency = btn.dataset.currency;
          document.querySelectorAll(".fx-btn").forEach((x) => x.classList.toggle("active", x === btn));
          const notes = {
            USD: "عرض القيم بالدولار الأمريكي (أساس الدراسة الموحد).",
            TRY_JAN: `التحويل بالليرة التركية وفق صرف يناير 2026 (1$ = ${state.data.meta.usd_try_jan} TL).`,
            TRY_JUN: `التحويل بالليرة التركية وفق صرف يونيو 2026 (1$ = ${state.data.meta.usd_try_jun} TL).`,
            TRY_NOV: `التحويل بالليرة التركية وفق نوفمبر (1$ = ${state.data.meta.usd_try_nov} TL | +17%).`
          };
          document.getElementById("fx-active-note").textContent = notes[state.currency];
          renderTab(state.activeTab);
        });
      });

      const sInput = document.getElementById("global-search");
      sInput.addEventListener("input", () => handleGlobalSearch(sInput.value));
      document.querySelectorAll("#searchQuickTags [data-quick-q]").forEach((chip) => {
        chip.addEventListener("click", () => {
          sInput.value = chip.dataset.quickQ || "";
          handleGlobalSearch(sInput.value);
          sInput.focus();
        });
      });
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-bar-wrap")) {
          document.getElementById("search-results-panel").classList.add("hidden");
        }
      });

      const siteHdr = document.getElementById("siteHeader");
      const heroInfoBtn = document.getElementById("heroInfoToggle");
      if (heroInfoBtn && siteHdr) {
        heroInfoBtn.addEventListener("click", () => {
          const next = !siteHdr.classList.contains("meta-open");
          siteHdr.classList.toggle("meta-open", next);
          siteHdr.classList.toggle("fx-open", next);
          heroInfoBtn.setAttribute("aria-expanded", String(next));
          heroInfoBtn.textContent = next ? "إخفاء ▴" : "المصادر ▾";
        });
      }

      const mobFxPill = document.getElementById("mobFxPill");
      if (mobFxPill) {
        mobFxPill.addEventListener("click", () => {
          const order = ["USD", "TRY_NOV", "TRY_JAN", "TRY_JUN"];
          const nextCur = order[(order.indexOf(state.currency) + 1) % order.length];
          document.querySelector(`.fx-btn[data-currency="${nextCur}"]`)?.click();
        });
      }

      document.querySelectorAll("#mobileBottomDock [data-dock-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.dockTab));
      });
      document.getElementById("mobMoreTabsBtn")?.addEventListener("click", openMobileTabSheet);
      document.getElementById("mobSheetClose")?.addEventListener("click", closeMobileTabSheet);
      document.getElementById("mobSheetBackdrop")?.addEventListener("click", closeMobileTabSheet);

      document.getElementById("drawer-close").addEventListener("click", closeDrawer);
      document.getElementById("drawer-backdrop").addEventListener("click", closeDrawer);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeDrawer();
          closeMobileTabSheet();
        }
      });

      switchTab("macro");
    } catch (err) {
      document.getElementById("loading-state").innerHTML = `<div class="callout callout-danger">تعذر تحميل قاعدة البيانات البحثية المستقلة: ${esc(err.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
