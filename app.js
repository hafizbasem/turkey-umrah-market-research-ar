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
    offersMonthFilter: "all",
    offersTypeFilter: "all",
    offersQuery: "",
    offersSort: "id",
    pagesDocFilter: "all", // all | 40p | 50p
    pagesGroupFilter: "all",
    sim12: { makkahNight: 85, madinahNight: 95, fixedCost: 840, occ: 4, bank: "none", inst: 1 },
    simBusPax: 32,
    simMetaSpend: 1200,
    simMetaChats: 500,
    simMetaConv: 6,
    simTaxBaseSar: 250
  };

  const TAB_TITLES = {
    macro: "حجم السوق والطلب",
    aviation: "الطيران والنقل (THY)",
    agencies: "الشركات والحيتان (32+)",
    monthly: "الموسمية والأسعار (H1)",
    economics: "التكاليف والضرائب والتسعير",
    distribution: "التسويق وقمع CRM",
    pages: "مستكشف الـ 90 صفحة",
    audit: "التدقيق والمصادر (A/B/C)"
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
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
    return Math.round(Number(n)).toLocaleString("en-US");
  }

  function fmtDec(n, digits = 2) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
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
    if (usdVal === null || usdVal === undefined || Number.isNaN(Number(usdVal))) return "—";
    const val = Number(usdVal);
    if (state.currency === "USD") {
      return decimals ? `$${fmtDec(val, decimals)}` : `$${fmtInt(val)}`;
    }
    const tryVal = val * fxRate();
    return `${fmtInt(tryVal)} TL`;
  }

  function dualMoney(usdVal) {
    if (usdVal === null || usdVal === undefined) return "—";
    if (state.currency === "USD") return `$${fmtInt(usdVal)}`;
    return `${fmtInt(usdVal * fxRate())} TL <small class="num">($${fmtInt(usdVal)})</small>`;
  }

  // Drawer helpers
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

  // Chart 1: Crisp Native-RTL Horizontal Bar Infographic (zero clipping on 390px mobile or 1440px desktop)
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

  // SVG Chart 2: Vertical Bar / Whisker Chart for Monthly H1 (staggered non-overlapping labels)
  function buildMonthlyWhiskerSvg(months) {
    const W = 760;
    const H = 300;
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
          <text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="10.5" fill="#9e2a2b">(0 عروض)</text>
        </g>`;
        return;
      }

      const yMax = yOf(m.atlas_max);
      const yMin = yOf(m.atlas_min);
      const yMed = yOf(m.atlas_median);
      const medBadgeW = 48;
      cols += `<g class="svg-bar-interactive" data-select-month="${esc(m.key)}">
        ${bgHighlight}
        <line x1="${cx}" y1="${yMax}" x2="${cx}" y2="${yMin}" stroke="#0d5c46" stroke-width="4" stroke-linecap="round" />
        <rect x="${cx - 12}" y="${yMax - 2}" width="24" height="4" rx="2" fill="#0d5c46" />
        <rect x="${cx - 12}" y="${yMin - 2}" width="24" height="4" rx="2" fill="#0d5c46" />
        <circle cx="${cx}" cy="${yMed}" r="7" fill="#c99738" stroke="#ffffff" stroke-width="2" />
        <text x="${cx}" y="${yMax - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#2d3e38">$${fmtInt(m.atlas_max)}</text>
        <text x="${cx}" y="${yMin + 14}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5a6a64">$${fmtInt(m.atlas_min)}</text>
        <rect x="${cx + 9}" y="${yMed - 9}" width="${medBadgeW}" height="18" rx="4" fill="#0f2c23" />
        <text x="${cx + 9 + medBadgeW / 2}" y="${yMed + 4}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#f5deb0">$${fmtInt(m.atlas_median)}</text>
        <text x="${cx}" y="${H - 20}" text-anchor="middle" font-size="13" font-weight="${isSelected ? "800" : "600"}" fill="#0f2c23">${esc(m.short)}</text>
        <text x="${cx}" y="${H - 5}" text-anchor="middle" font-size="10.5" fill="#5a6a64">(${m.sample_n} عرضًا)</text>
      </g>`;
    });

    return `<svg class="chart-svg" style="direction:ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="تطور أسعار العمرة في النصف الأول 2026">${grid}${cols}</svg>`;
  }

  // SVG Chart 3: Break-even Comparison Lines (19 vs 32)
  function buildBreakEvenSvg(selectedPax) {
    const W = 740, H = 250, padL = 62, padR = 24, padT = 22, padB = 38;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const minP = 10, maxP = 45;
    const minNet = -6000, maxNet = 12000;
    const xOf = (p) => padL + ((p - minP) / (maxP - minP)) * plotW;
    const yOf = (n) => padT + ((maxNet - n) / (maxNet - minNet)) * plotH;

    let purePts = [], adjPts = [];
    for (let p = minP; p <= maxP; p += 1) {
      const pureNet = p * 400 - 7500;
      const adjNet = p * 400 - 12800; // +5300 POS/risk
      purePts.push(`${xOf(p).toFixed(1)},${yOf(pureNet).toFixed(1)}`);
      adjPts.push(`${xOf(p).toFixed(1)},${yOf(adjNet).toFixed(1)}`);
    }

    const yZero = yOf(0);
    const curX = xOf(selectedPax);
    const curPure = selectedPax * 400 - 7500;
    const curAdj = selectedPax * 400 - 12800;

    return `<svg class="chart-svg" style="direction:ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="نقطة التعادل 18.75 مقابل 32 معتمرًا">
      <line x1="${padL}" y1="${yZero}" x2="${W - padR}" y2="${yZero}" stroke="#0f2c23" stroke-width="1.5" stroke-dasharray="4,3" />
      <text x="${padL - 8}" y="${yZero + 4}" text-anchor="end" font-size="11.5" font-weight="700" fill="#0f2c23">$0 (تعادل)</text>
      <text x="${padL - 8}" y="${yOf(10000) + 4}" text-anchor="end" font-size="11" fill="#0d5c46">+$10,000</text>
      <text x="${padL - 8}" y="${yOf(-5000) + 4}" text-anchor="end" font-size="11" fill="#9e2a2b">-$5,000</text>

      <polyline fill="none" stroke="#0d5c46" stroke-width="3" points="${purePts.join(" ")}" />
      <polyline fill="none" stroke="#9e2a2b" stroke-width="3" stroke-dasharray="6,4" points="${adjPts.join(" ")}" />

      <circle cx="${xOf(18.75)}" cy="${yZero}" r="6" fill="#0d5c46" stroke="#fff" stroke-width="2" />
      <text x="${xOf(18.75)}" y="${yZero - 12}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#0d5c46">50P: 18.75 (19)</text>

      <circle cx="${xOf(32)}" cy="${yZero}" r="6" fill="#9e2a2b" stroke="#fff" stroke-width="2" />
      <text x="${xOf(32)}" y="${yZero + 18}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#9e2a2b">40P: 32 (71.1% مع POS)</text>

      <line x1="${curX}" y1="${padT}" x2="${curX}" y2="${H - padB}" stroke="#c99738" stroke-width="2" />
      <circle cx="${curX}" cy="${yOf(curPure)}" r="5" fill="#c99738" />
      <circle cx="${curX}" cy="${yOf(curAdj)}" r="5" fill="#c99738" />

      <text x="${xOf(15)}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="#5a6a64">15 مقعدًا</text>
      <text x="${xOf(25)}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="#5a6a64">25 مقعدًا</text>
      <text x="${xOf(32)}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="#5a6a64">32 مقعدًا</text>
      <text x="${xOf(45)}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="#5a6a64">45 (100%)</text>
    </svg>`;
  }

  // ==================== TAB RENDERERS ====================

  function renderMacroTab() {
    const D = state.data.macro;
    const sec = document.getElementById("tab-macro");

    const kpisHtml = D.kpis.map((k, idx) => `
      <article class="kpi-card tone-${esc(k.tone)}" data-kpi-idx="${idx}" tabindex="0">
        <div class="kpi-top">
          <div class="kpi-val num">${esc(k.value)}</div>
          <span class="src-tag">${esc(k.src)}</span>
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
      { aria: "السلسلة الرسمية لبرنامج ضيوف الرحمن 2022-2024", labelW: 205 }
    );

    const top10Svg = buildHBarSvg(
      D.global_top10_2024.map((c) => ({
        label: `#${c.rank} ${c.country}`,
        val: c.count,
        valLabel: `${fmtInt(c.count)} (${c.share_pct}%)`,
        highlight: Boolean(c.highlight)
      })),
      { aria: "أكبر 10 دول مرسلة للعمرة 2024", labelW: 195, rowH: 30 }
    );

    const benchmarkSvg = buildHBarSvg(
      D.turkey_benchmarks_fig2.map((b) => ({
        label: b.label,
        val: b.value,
        valLabel: b.range,
        highlight: b.value >= 659000
      })),
      { aria: "تقديرات السوق التركي بين المصادر", labelW: 215 }
    );

    const hajjUmrahSvg = buildHBarSvg(
      D.hajj_vs_umrah_fig3.map((x) => ({
        label: x.tier,
        val: x.usd,
        valLabel: fmtUsdOrTry(x.usd),
        highlight: x.type === "عمرة",
        color: x.type === "حج" ? "#2d3e38" : "#0d5c46"
      })),
      { aria: "مقارنة متوسط سعر العمرة والحج", labelW: 215, rowH: 31 }
    );

    // Scenario calculator
    const diyH1 = 73000;
    const share = Math.max(10, Math.min(35, Number(state.scenarioPct)));
    const estTotalH1 = Math.round(diyH1 / (share / 100));
    const estPrivateH1 = estTotalH1 - diyH1;

    sec.innerHTML = `
      <div class="section-head">
        <h2>كم معتمرًا في السوق التركي؟ ومن أين تأتي الأرقام؟</h2>
        <p class="section-sub">دمج السلسلة السعودية الرسمية (PEP + GASTAT 43.09M) مع تقارير ديانت وتقديرات HURSAD</p>
      </div>
      <div class="kpi-grid">${kpisHtml}</div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>الطلب التركي الموثق في السعودية (PEP 2022–2024)</h3>
          <p>قفز عدد المعتمرين القادمين من تركيا بمقدار <strong>5.24 أضعاف</strong> خلال عامين (<span class="src-tag">50P ص4</span>).</p>
          <div class="svg-wrap">${pepSvg}</div>
          <div class="callout callout-info">فارق تدقيق بين طبعتَي PEP: تسجل طبعة 2024 رقم <strong>125,738</strong> لعام 2022 مقابل <strong>125,783</strong> في طبعة 2023 (فارق مراجعة إحصائية 45 شخصًا فقط — <span class="src-tag">50P ص3–4</span>).</div>
        </div>

        <div class="card">
          <h3>تركيا السابعة عالميًا ضمن أكبر 10 دول مرسلة (2024)</h3>
          <p>إجمالي العمرة من الخارج عالميًا في 2024 بلغ <strong>16.92 مليونًا</strong>؛ وتمثل تركيا قرابة <strong>3.90%</strong> (<span class="src-tag">50P ص5</span>).</p>
          <div class="svg-wrap">${top10Svg}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>محاكي سيناريوهات النصف الأول H1 2026 (40P ص2)</h3>
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
          <div class="sim-results-grid" style="grid-template-columns: repeat(3, 1fr)">
            <div class="sim-box"><div class="sb-lbl">ديانت المباشر (مؤكد)</div><div class="sb-val num">${fmtInt(diyH1)}</div></div>
            <div class="sim-box"><div class="sb-lbl">حصة الوكالات الخاصة (تقديري)</div><div class="sb-val num" style="color:var(--emerald)">${fmtInt(estPrivateH1)}</div></div>
            <div class="sim-box"><div class="sb-lbl">الإجمالي الضمني في H1</div><div class="sb-val num">${fmtInt(estTotalH1)}</div></div>
          </div>
          <div class="callout callout-warn">تنبيه 50P ص6: نسبة ديانت (<strong>~16.6%</strong> من 650 ألفًا في 24–25) تمثل فرقًا بين مصدرين ولا يجوز افتراض ثباتها تلقائيًا لكل أشهر 2026 دون رصد كامل.</div>
        </div>

        <div class="card">
          <h3>أطر ديانت الثلاثة غير القابلة للخلط (50P ص6–7 + 40P ص2)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الإطار الرسمي</th><th class="num">العدد</th><th>التفكيك والتغطية</th><th>المصدر</th></tr></thead>
              <tbody>
                ${D.diyanet_three_frames.map((f) => `
                  <tr>
                    <td><strong>${esc(f.frame)}</strong></td>
                    <td class="num"><strong>${fmtInt(f.value)}</strong></td>
                    <td>${esc(f.split)}<br><small style="color:var(--crimson)">${esc(f.warning)}</small></td>
                    <td><span class="src-tag">${esc(f.src)}</span></td>
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
          <h3>السوق السعودي الكلي (43.09 مليونًا) وربع GASTAT Q1 2026</h3>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">إجمالي 2025 (+20.3%)</div><div class="sb-val num">${fmtInt(D.gastat_global.y2025_total)}</div></div>
            <div class="sim-box"><div class="sb-lbl">القادمون من الخارج 2025</div><div class="sb-val num">${fmtInt(D.gastat_global.y2025_external)}</div></div>
            <div class="sim-box"><div class="sb-lbl">إجمالي Q1 2026</div><div class="sb-val num">${fmtInt(D.gastat_global.q1_total)}</div></div>
            <div class="sim-box"><div class="sb-lbl">خارجي Q1 2026 (-11.56%)</div><div class="sb-val num">${fmtInt(D.gastat_global.q1_foreign)}</div></div>
          </div>
          <p style="margin-top:10px">توزيع الوافدين من الخارج في Q1 2026 (كل الجنسيات): <strong>${D.gastat_global.entry_air_pct}% جوي</strong> | <strong>${D.gastat_global.entry_land_pct}% بري</strong> | <strong>${D.gastat_global.entry_sea_pct}% بحري</strong> — والجنس: <strong>${D.gastat_global.gender_female_pct}% إناث</strong> مقابل <strong>${D.gastat_global.gender_male_pct}% ذكور</strong> (<span class="src-tag">50P ص9</span>).</p>
          <div class="table-wrap">
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

        <div class="card">
          <h3>مقارنة تقديرات تركيا وبوصلة ربط العمرة بحصص الحج (84,942)</h3>
          <div class="svg-wrap">${benchmarkSvg}</div>
          <h3 style="margin-top:12px">لماذا تتنافس الشركات على العمرة؟ عائد التذكرة مقارنة بالحج</h3>
          <div class="svg-wrap">${hajjUmrahSvg}</div>
          <div class="callout callout-danger"><strong>مفتاح السوق (40P ص17):</strong> حصة الحج التركية <strong>84,942 حاجًا</strong> (من <strong>1,799,835</strong> متقدمًا في القرعة): 60% لديانت و40% للخاص (~33,977 حاجًا)، و<strong>80%–90%</strong> من حصة الخاص مربوطة رقميًا بأداء الوكالة في العمرة، بحد أقصى <strong>500 حاج/رخصة</strong> — ما يدفع الكبار لتفريخ رخص شقيقة.</div>
        </div>
      </div>
    `;

    // Bind sliders & clicks
    sec.querySelectorAll("[data-scen-pct]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.scenarioPct = Number(btn.dataset.scenPct);
        renderMacroTab();
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
        openDrawer(`مؤشر كلي · ${k.src}`, k.label, `
          <div class="drawer-box"><strong>القيمة المرصودة:</strong> <span class="num">${esc(k.value)}</span></div>
          <div class="drawer-box"><strong>التفاصيل والسياق:</strong><br>${esc(k.sub)}</div>
          <div class="drawer-box"><strong>مرجع المصدر:</strong> ${esc(k.src)}</div>
        `);
      });
    });
  }

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

    const thySvg = buildHBarSvg(chartItems, { aria: "إفصاحات الخطوط التركية الرسمية Hajj-Umrah", labelW: 190 });
    const sc = A.samsun_case;

    sec.innerHTML = `
      <div class="section-head">
        <h2>بيانات الطيران الرسمي (THY KAP)، المطارات الـ 11، ودراسة سامسون</h2>
        <p class="section-sub">دمج إفصاحات البورصة للخطوط التركية (50P ص10–12) مع خريطة البوابات الإقليمية (40P ص38 + 50P ص45)</p>
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

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>مصفوفة فجوة بيانات الناقلات العاملة من تركيا (50P ص12)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الناقل</th><th>البيانات المتاحة</th><th>ما يغيب عن الإفصاح العام</th></tr></thead>
              <tbody>
                ${A.carrier_gap_matrix.map((c) => `
                  <tr><td><strong>${esc(c.carrier)}</strong></td><td>${esc(c.available)}</td><td style="color:var(--crimson)">${esc(c.missing)}</td></tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <h3 style="margin-top:16px">بوابات المغادرة والمطارات الإقليمية الـ 11 (40P ص38)</h3>
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

        <div class="card">
          <h3>${esc(sc.title)}</h3>
          <p>أرقام موثقة من تنظيم ديانت ومفتي ولاية سامسون فقط — تكشف أهمية المحافظات وحدود قراءة إعلانات المطارات (<span class="src-tag">50P ص45</span>):</p>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">تسجيلات الموسم</div><div class="sb-val num">${fmtInt(sc.season_registrations)}</div></div>
            <div class="sim-box"><div class="sb-lbl">الترتيب الوطني</div><div class="sb-val" style="font-size:15px">${esc(sc.national_rank)}</div></div>
            <div class="sim-box"><div class="sb-lbl">معتمرُو عطلة 2026</div><div class="sb-val num">${fmtInt(sc.winter_holiday_pax)}</div></div>
            <div class="sim-box"><div class="sb-lbl">نسبة العطلة من الموسم</div><div class="sb-val num">${sc.holiday_share_pct}%</div></div>
          </div>
          <div class="sim-results-grid" style="grid-template-columns: repeat(3, 1fr)">
            <div class="sim-box"><div class="sb-lbl">عدد رحلات العطلة</div><div class="sb-val num">${sc.winter_holiday_trips}</div></div>
            <div class="sim-box"><div class="sb-lbl">المتوسط لكل رحلة</div><div class="sb-val num">~${sc.avg_per_trip}</div></div>
            <div class="sim-box"><div class="sb-lbl">برامج موسمية خاصة</div><div class="sb-val num">${sc.special_programs}</div></div>
          </div>
          <div class="callout callout-warn">${esc(sc.caveat)}</div>
        </div>
      </div>
    `;

    sec.querySelectorAll("[data-thy-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.thyView = btn.dataset.thyView;
        renderAviationTab();
      });
    });
  }

  function renderAgenciesTab() {
    const AG = state.data.agencies;
    const sec = document.getElementById("tab-agencies");

    const funnelSvg = buildHBarSvg(
      AG.funnel.map((f, i) => ({
        label: f.stage,
        val: f.count,
        valLabel: `${fmtInt(f.count)} (${f.src})`,
        highlight: i === 3 || i === 4
      })),
      { aria: "هرم التركز والترخيص في السوق التركي", labelW: 255, rowH: 34 }
    );

    const catalogSvg = buildHBarSvg(
      AG.catalog_scale_fig4.map((c, i) => ({
        label: `${c.agency} (${c.belge})`,
        val: c.listings,
        valLabel: `${fmtInt(c.listings)} برنامجًا`,
        highlight: i < 2
      })),
      { aria: "حجم الكتالوجات المعلنة عبر المنصات الشكل 4", labelW: 220, rowH: 30 }
    );

    let shareRows = [];
    let shareDesc = "";
    if (state.agencyShareView === "excel59") {
      shareDesc = "ملف Excel الأصلي (50P ص38): يظهر تركز Asfâr (25.4%) وRK (16.9%) = 42.4% من السجلات؛ ويحذر التقرير من الخلط بين تكرار الإعلان وحصة الركاب الفعلية.";
      shareRows = AG.excel_59_original_shares.map((s) => ({ name: s.agency, n: s.offers, pct: `${s.share_pct}%`, note: s.note }));
    } else if (state.agencyShareView === "ext69") {
      shareDesc = "سجل التحقق الموسع (69 سجلًا — 50P ص40): يُظهر تنوع الأسماء التشغيلية المتكررة (>=26 اسمًا منها Uzman وEmvaj وAmmar) دون توفر كشوف ركاب شهرية.";
      shareRows = AG.extended_69_top_agencies.map((s) => ({ name: s.agency, n: s.count, pct: `${fmtDec((s.count / 69) * 100, 1)}%`, note: "إعلان أو تعرفة في سجل الـ 69" }));
    } else {
      shareDesc = "جدول الـ 59 عرضًا المستبدل بالفنادق الموثقة في الأطلس (40P ص25–30): أعيد توزيع العينة باستبدال الصفوف مجهولة الفندق فبرزت Semerşah (6) وKıyam (5) وBeyt (4).";
      shareRows = AG.replacement_59_shares.map((s) => ({ name: s.agency, n: s.offers, pct: `${s.share_pct}%`, note: "سجل مستوفي اسم الفندق وتاريخ الرحلة" }));
    }

    const shareSvg = buildHBarSvg(
      shareRows.slice(0, 10).map((r, i) => ({
        label: r.name,
        val: r.n,
        valLabel: `${r.n} سجلات (${r.pct})`,
        highlight: i < 2
      })),
      { aria: "تركز الظهور الإعلاني داخل العينة", labelW: 215, rowH: 30 }
    );

    const rm = AG.saudi_rooms_stock_h1_2025;
    const emergingFiltered = state.emergingCityFilter === "all"
      ? AG.emerging_18
      : AG.emerging_18.filter((e) => e.city.includes(state.emergingCityFilter) || e.ops.includes(state.emergingCityFilter));

    sec.innerHTML = `
      <div class="section-head">
        <h2>الشركات والتكتلات (32 شركة عميقة + 19 وكالة عينة الأسعار)</h2>
        <p class="section-sub">فصل حجم الكتالوج والظهور الرقمي (40P ص22–23) عن إثبات الحصة السوقية الحقيقية (50P ص13–15, 38, 40)</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>هرم الترخيص والتركز: من 2,400 فاعل إلى 352 ضمانًا فعليًا</h3>
          <div class="svg-wrap">${funnelSvg}</div>
          <div class="callout callout-info">
            <strong>مخزون الإيواء السعودي بنهاية H1 2025 (منفصل عن الحصص — 50P ص13):</strong><br>
            مكة: <strong class="num">${fmtInt(rm.makkah)}</strong> غرفة مرخصة | المدينة: <strong class="num">${fmtInt(rm.madinah)}</strong> غرفة | إجمالي المملكة: <strong class="num">${fmtInt(rm.ksa_total)}</strong> (<span class="num">${rm.hotels_pct}%</span> فنادق / <span class="num">${rm.apts_pct}%</span> شقق). ${esc(rm.note)}
          </div>
        </div>

        <div class="card">
          <h3>مقياس الكتالوج المنشور على المنصات (الشكل 4، 40P ص22)</h3>
          <p>تقود <strong>Hisar (494)</strong> و<strong>Hançer (379)</strong> كثافة البرامج المنشورة من أصل <strong>3,190</strong> برنامجًا لـ 126 ناشرًا — وهو مؤشر ظهور بحثي لا يعني تساوي المبيعات.</p>
          <div class="svg-wrap">${catalogSvg}</div>
        </div>
      </div>

      <div class="section-head" style="margin-top:22px">
        <h2>التكتلات الكبرى الـ 14 (بيانات الأطلس + قيود التدقيق في 50P ص14)</h2>
        <p class="section-sub">انقر على أي تكتل لفتح ملف التدقيق والمؤشرات المالية التفصيلية</p>
      </div>
      <div class="grid-3">
        ${AG.whales_blocks.map((w, idx) => `
          <article class="card clickable-row" data-whale-idx="${idx}">
            <div class="kpi-top">
              <h3 style="margin:0">${esc(w.name)}</h3>
              <span class="src-tag">${esc(w.src)}</span>
            </div>
            <p style="margin:4px 0;font-weight:700;color:var(--emerald)">${esc(w.license)}</p>
            <p style="margin:4px 0"><strong>الحجم المعلن:</strong> ${esc(w.volume)}</p>
            <p style="margin:4px 0"><strong>الركيزة:</strong> ${esc(w.financials)}</p>
            <div class="callout callout-warn" style="margin-top:8px;font-size:12px">${esc(w.audit_caveat)}</div>
          </article>
        `).join("")}
      </div>

      <div class="card" style="margin-top:18px">
        <h3>فارق الظهور الإعلاني عبر العينات الثلاث (لماذا تبرز Asfâr في 50P وتغيب في سجل 40P المستبدل؟)</h3>
        <div class="pill-row">
          <button type="button" class="filter-pill ${state.agencyShareView === "excel59" ? "active" : ""}" data-share-view="excel59">عينة Excel 59 الأصلية (50P ص38)</button>
          <button type="button" class="filter-pill ${state.agencyShareView === "ext69" ? "active" : ""}" data-share-view="ext69">سجل التحقق الموسع 69 (50P ص40)</button>
          <button type="button" class="filter-pill ${state.agencyShareView === "rep59" ? "active" : ""}" data-share-view="rep59">سجل الـ 59 المستبدل بالفنادق (40P)</button>
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
        <h3>خريطة 18 وكالة إقليمية ومتخصصة (40P ص23 + تحفظ 50P ص15: 0 حصة ركاب منشورة)</h3>
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

    sec.querySelectorAll("[data-whale-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const w = AG.whales_blocks[Number(el.dataset.whaleIdx)];
        openDrawer(`تدقيق تكتل كبرى · ${w.src}`, w.name, `
          <div class="drawer-box"><strong>التراخيص والشبكة:</strong> ${esc(w.license)}</div>
          <div class="drawer-box"><strong>الحجم والمؤشرات المعلنة:</strong> ${esc(w.volume)}<br><br>${esc(w.financials)}</div>
          <div class="drawer-box"><strong>لماذا وكيف تعمل في السوق؟</strong><br>${esc(w.why)}</div>
          <div class="callout callout-warn"><strong>قيد الإثبات والتدقيق (50P):</strong><br>${esc(w.audit_caveat)}</div>
          <p><a href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">الموقع العام الرسمي للجهة ↗</a></p>
        `);
      });
    });

    sec.querySelectorAll("[data-share-view]").forEach((b) => {
      b.addEventListener("click", () => {
        state.agencyShareView = b.dataset.shareView;
        renderAgenciesTab();
      });
    });

    sec.querySelectorAll("[data-city-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        state.emergingCityFilter = b.dataset.cityFilter;
        renderAgenciesTab();
      });
    });
  }

  function renderMonthlyTab() {
    const M = state.data.monthly_h1;
    const activeM = M.find((x) => x.key === state.selectedMonth) || M[0];
    const bands = state.data.quad_price_bands_54;
    const sec = document.getElementById("tab-monthly");

    const whiskerSvg = buildMonthlyWhiskerSvg(M);
    const bandsSvg = buildHBarSvg(
      bands.map((b) => ({
        label: b.band,
        val: b.count,
        valLabel: `${b.count} عرضًا (${b.pct}%)`,
        highlight: b.band.includes("الذروة")
      })),
      { aria: "توزيع 54 عرضًا رباعي التسعير حسب الفئة السعرية (50P ص37)", labelW: 215, rowH: 30 }
    );

    const dualSampleSvg = buildHBarSvg(
      M.map((m) => ({
        label: `${m.short}: أصل (${m.sample_n}) مقابل موسع (${m.ext_69_n})`,
        val: Math.max(m.sample_n, m.ext_69_n),
        valLabel: `${m.sample_n} / ${m.ext_69_n}`,
        highlight: m.key === "mar",
        color: m.key === "may" ? "#9e2a2b" : "#0d5c46"
      })),
      { aria: "مقارنة عدد السجلات بين عينة 59 الأصلية والموسعة 69", labelW: 225, rowH: 30 }
    );

    // Filter 59 offers
    const q = state.offersQuery.trim().toLowerCase();
    let list = state.data.offers_59.filter((o) => {
      if (state.offersMonthFilter !== "all" && o.month_key !== state.offersMonthFilter) return false;
      if (state.offersTypeFilter !== "all" && o.transfer_type !== state.offersTypeFilter) return false;
      if (q) {
        const hay = `${o.agency} ${o.origin} ${o.tier_detail} ${o.month_ar} ${o.window}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.offersSort === "quad_asc") list = [...list].sort((a, b) => a.quad - b.quad);
    else if (state.offersSort === "quad_desc") list = [...list].sort((a, b) => b.quad - a.quad);
    else if (state.offersSort === "days_desc") list = [...list].sort((a, b) => b.days - a.days);

    sec.innerHTML = `
      <div class="section-head">
        <h2>الموسمية والأسعار في النصف الأول H1 2026 (يناير ← يونيو)</h2>
        <p class="section-sub">اضغط على أي شهر في الرسم لاكتشاف أسباب التشتت (SD) وسعر الصرف وتعرفة ديانت وإغلاق مايو</p>
      </div>

      <div class="card">
        <h3>المخطط التفاعلي للمدى والوسيط السعري للغرفة الرباعية ($ USD)</h3>
        <div class="svg-wrap">${whiskerSvg}</div>
        <div class="pill-row">
          ${M.map((m) => `<button type="button" class="filter-pill ${m.key === activeM.key ? "active" : ""}" data-select-month="${m.key}">${esc(m.short)} (${m.key === "may" ? "إغلاق 0$" : fmtUsdOrTry(m.atlas_median)})</button>`).join("")}
        </div>
        <div class="drawer-box" style="margin-top:8px">
          <div class="kpi-top">
            <strong>${esc(activeM.name_ar)}</strong>
            <span class="src-tag">${esc(activeM.pdf_pages)}</span>
          </div>
          <div class="sim-results-grid">
            <div class="sim-box"><div class="sb-lbl">الوسيط الرباعي</div><div class="sb-val num">${activeM.key === "may" ? "0$ (توقف)" : fmtUsdOrTry(activeM.atlas_median)}</div></div>
            <div class="sim-box"><div class="sb-lbl">سعر الصرف USD/TRY</div><div class="sb-val num">${activeM.usd_try.toFixed(4)}</div></div>
            <div class="sim-box"><div class="sb-lbl">سجلات العينة (59 / 69)</div><div class="sb-val num">${activeM.sample_n} / ${activeM.ext_69_n}</div></div>
            <div class="sim-box"><div class="sb-lbl">حركة ديانت / العطل</div><div class="sb-val" style="font-size:13.5px">${esc(activeM.diyanet_volume)}</div></div>
          </div>
          <p style="margin-top:10px"><strong>كيف ولماذا تحرك السعر؟</strong> ${esc(activeM.drivers)}</p>
          <p><strong>تعرفة ديانت الموازية:</strong> ${esc(activeM.diyanet_tariffs)}</p>
          <div class="callout callout-warn" style="margin-top:6px"><strong>ملاحظة التدقيق والاختلاف (40P + 50P):</strong> ${esc(activeM.audit_note)}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>التوزيع الفعلي للأسعار الرباعية عبر 54 سجلًا مكتملًا (50P ص37)</h3>
          <p>تتركز <strong>70.4%</strong> من السوق (38 من 54 عرضًا) بين <strong>$1,200 و$1,599</strong> مع وسيط كلي <strong>${dualMoney(1450)}</strong>.</p>
          <div class="svg-wrap">${bandsSvg}</div>
        </div>
        <div class="card">
          <h3>مقارنة أحجام الرصد الشهرية: Excel 59 الأصلي مقابل الموسع 69 (50P ص36)</h3>
          <p>مارس يستحوذ على <strong>40.7%</strong> (24/59) من سجلات الإعلانات المرصودة، ما لا يساوي بالضرورة 40.7% من عدد المعتمرين المنطلقين.</p>
          <div class="svg-wrap">${dualSampleSvg}</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>السجل السعري التاريخي الموّثق للوكالات (59 برنامجًا ببيانات مكتملة — 40P ص25–30)</h3>
        <p>يعكس بنية التسعير السوقي حسب الشهر، مدينة الإقلاع، المدة، فئة النقل، وغرف الإشغال (4/3/2) لقياس الأسعار — دون ترويج فندقي.</p>
        <div class="control-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))">
          <div class="ctrl-field">
            <label for="f-month">الشهر</label>
            <select id="f-month">
              <option value="all">كل الشهور (59)</option>
              <option value="jan">يناير (13)</option>
              <option value="feb">فبراير (8)</option>
              <option value="mar">مارس (24)</option>
              <option value="apr">أبريل (2)</option>
              <option value="jun">يونيو (12)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-type">فئة النقل والمسافة</label>
            <select id="f-type">
              <option value="all">الكل (مشي + باص/شتل)</option>
              <option value="شتل">باص / شتل</option>
              <option value="مشي">مشي / قريب للحرم</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-sort">الترتيب</label>
            <select id="f-sort">
              <option value="id">التسلسل التاريخي (1 ← 59)</option>
              <option value="quad_asc">الأقل سعرًا (الرباعي ↑)</option>
              <option value="quad_desc">الأعلى سعرًا (الرباعي ↓)</option>
              <option value="days_desc">الأطول مدة (الأيام ↓)</option>
            </select>
          </div>
          <div class="ctrl-field">
            <label for="f-q">تصفية بالوكالة أو المطار</label>
            <input id="f-q" type="text" value="${esc(state.offersQuery)}" placeholder="مثال: RK، Kıyam، SAW..." />
          </div>
        </div>
        <div class="section-sub">النتائج المعروضة: <strong class="num">${list.length}</strong> من أصل 59 سجلًا</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>الشهر</th><th>الوكالة</th><th>نقطة الإقلاع</th><th>الفترة</th><th class="num">أيام</th><th>الفئة</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th></tr>
            </thead>
            <tbody>
              ${list.map((o) => `
                <tr>
                  <td class="num">${o.id}</td>
                  <td>${esc(o.month_ar)}</td>
                  <td><strong>${esc(o.agency)}</strong></td>
                  <td>${esc(o.origin)}</td>
                  <td class="num">${esc(o.window)}</td>
                  <td class="num">${o.days}</td>
                  <td>${esc(o.tier_detail)}</td>
                  <td class="num"><strong>${fmtUsdOrTry(o.quad)}</strong></td>
                  <td class="num">${fmtUsdOrTry(o.triple)}</td>
                  <td class="num">${fmtUsdOrTry(o.double)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Sync select values
    document.getElementById("f-month").value = state.offersMonthFilter;
    document.getElementById("f-type").value = state.offersTypeFilter;
    document.getElementById("f-sort").value = state.offersSort;

    sec.querySelectorAll("[data-select-month]").forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedMonth = el.dataset.selectMonth;
        renderMonthlyTab();
      });
    });

    document.getElementById("f-month").addEventListener("change", (e) => { state.offersMonthFilter = e.target.value; renderTab("monthly"); });
    document.getElementById("f-type").addEventListener("change", (e) => { state.offersTypeFilter = e.target.value; renderTab("monthly"); });
    document.getElementById("f-sort").addEventListener("change", (e) => { state.offersSort = e.target.value; renderTab("monthly"); });
    document.getElementById("f-q").addEventListener("input", (e) => { state.offersQuery = e.target.value; renderTab("monthly"); });
  }

  function renderEconomicsTab() {
    const E = state.data.economics;
    const sec = document.getElementById("tab-economics");

    // Interactive 12-day model calculations
    const roomTotal = state.sim12.makkahNight * 9 + state.sim12.madinahNight * 3;
    const roomPerPax = roomTotal / state.sim12.occ;
    const baseCost = roomPerPax + state.sim12.fixedCost;
    const withReserve = baseCost * 1.03;
    const sellPrice = withReserve / 0.85;
    const grossMargin = sellPrice - withReserve;

    // POS commission lookup
    let posPct = 0;
    let holdNote = "تحصيل فوري دون عمولة بطاقات.";
    if (state.sim12.bank === "albaraka") {
      const row = E.pos_commissions_fig9.find((r, i) => [1, 3, 6, 9, 12][i] === Number(state.sim12.inst)) || E.pos_commissions_fig9[0];
      posPct = row.albaraka;
      holdNote = "خصم عمولة مباشر بنسبة " + posPct + "% (تستبعد ضريبة BSMV وفق الشكل 9).";
    } else if (state.sim12.bank === "kuveyt") {
      const row = E.pos_commissions_fig9.find((r, i) => [1, 3, 6, 9, 12][i] === Number(state.sim12.inst)) || E.pos_commissions_fig9[0];
      posPct = row.kuveyt;
      holdNote = "عمولة معتدلة " + posPct + "%؛ الأهم ضبط فترة السماح المصرفية.";
    } else if (state.sim12.bank === "tf") {
      posPct = 0;
      holdNote = "0% عمولة للبنك لكن مع حجز سيولة (Bloke) من 14 إلى 40 يومًا (40P ص37).";
    }
    const posFeeUsd = sellPrice * (posPct / 100);
    const marginAfterPos = grossMargin - posFeeUsd;
    const kdvOnMargin = Math.max(0, marginAfterPos) * (0.20 / 1.20); // 20% KDV on agency margin only
    const netProfitUsd = marginAfterPos - kdvOnMargin;

    // Saudi Tax calc
    const sarBase = Number(state.simTaxBaseSar);
    const sarWithMuni = sarBase * 1.05;
    const sarTotal = sarWithMuni * 1.15; // 1.2075x
    const taxQuad9nUsd = (sarTotal * 9 / 4) / 3.75;

    const shuttleSvg = buildHBarSvg(
      E.shuttle_vs_walk_fig11.components.flatMap((c) => ([
        { label: `شتل — ${c.item}`, val: c.shuttle, valLabel: fmtUsdOrTry(c.shuttle), color: "#5a6a64" },
        { label: `مشي — ${c.item}`, val: c.walking, valLabel: fmtUsdOrTry(c.walking), highlight: c.item.includes("هامش") }
      ])),
      { aria: "تفكيك عائد الشتل 260$ مقابل المشي 390$ (الشكل 11)", labelW: 215, rowH: 28 }
    );

    const busPureNet = state.simBusPax * 400 - 7500;
    const busAdjNet = state.simBusPax * 400 - 12800;

    sec.innerHTML = `
      <div class="section-head">
        <h2>التكاليف والضرائب والهوامش والتشريع (40P ص31–37 + 50P ص39, 42–44, 46, 48)</h2>
        <p class="section-sub">اقتصاديات التسعير البحتة، مرونة المسافة السعرية، ضريبة 20.75% السعودية وKDV التركية، ونموذج الحاسبة الشفاف</p>
      </div>

      <div class="card">
        <h3>محاكي تكلفة باقة الـ 12 يومًا + عمولات التقسيط POS + ضريبة الهامش KDV</h3>
        <p>مدخلات <strong>50P ص48</strong> و<strong>40P ص36–37</strong>: اختبر تغيّر الربح الصافي عند اختيار الإشغال (4/3/2) والبنك (الشكل 9: Albaraka حتى 23.14%):</p>
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
            <label for="s12-bank">قناة الدفع / البنك (POS الشكل 9)</label>
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
              <option value="1">دفعة واحدة (Single-Shot)</option>
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
        <div class="callout ${netProfitUsd <= 0 ? "callout-danger" : "callout-info"}">${esc(holdNote)} ${netProfitUsd <= 0 ? "تحذير حاسم: عمولة الـ 12 قسطًا التهمت الهامش كله وأدخلت المقعد في خسارة صافية ما لم يُرفع السعر!" : ""}</div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>منحنى نقطة التعادل لحافلة 45 مقعدًا: 18.75 مقابل 32 (50P ص47 + 40P ص36)</h3>
          <div class="control-grid" style="grid-template-columns:1fr">
            <div class="ctrl-field">
              <label>عدد الركاب الفعلي بالمجموعة: <strong class="num">${state.simBusPax}</strong> من 45 (<span class="num">${fmtDec((state.simBusPax / 45) * 100, 1)}%</span> امتلاء)</label>
              <input id="bus-slider" type="range" min="10" max="45" step="1" value="${state.simBusPax}" />
            </div>
          </div>
          <div class="svg-wrap">${buildBreakEvenSvg(state.simBusPax)}</div>
          <div class="sim-results-grid" style="grid-template-columns:1fr 1fr">
            <div class="sim-box"><div class="sb-lbl">النتيجة النظريّة البحتة (50P: ثابت 7,500$)</div><div class="sb-val num" style="color:${busPureNet >= 0 ? "var(--emerald)" : "var(--crimson)"}">${fmtUsdOrTry(busPureNet)}</div></div>
            <div class="sim-box"><div class="sb-lbl">بعد مخصص 5,300$ POS ومخاطر (40P)</div><div class="sb-val num" style="color:${busAdjNet >= 0 ? "var(--emerald)" : "var(--crimson)"}">${fmtUsdOrTry(busAdjNet)}</div></div>
          </div>
        </div>

        <div class="card">
          <h3>اقتصاديات الشتل (260$) مقابل المشي (390$) — زيادة ربحية +50%</h3>
          <div class="svg-wrap">${shuttleSvg}</div>
          <div class="callout callout-info">${esc(E.shuttle_vs_walk_fig11.note)}</div>
          <h3 style="margin-top:12px">فوارق الغرف داخل البرنامج الواحد (50P ص44 + 40P ص24)</h3>
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
          <h3>المرونة السعرية حسب المسافة وتكلفة الإيواء بالجملة (ص32–34 + 50P ص39,42)</h3>
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
          <div class="control-grid" style="grid-template-columns:1fr">
            <div class="ctrl-field">
              <label>اختبر سعر غرفة مكة الأساسي (SAR/ليلة): <strong class="num">${sarBase} SAR</strong></label>
              <input id="tax-sar-slider" type="range" min="70" max="1500" step="10" value="${sarBase}" />
            </div>
          </div>
          <div class="sim-results-grid" style="grid-template-columns:repeat(3,1fr)">
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
          <h3>تعرفات ديانت (SAR 2025–2027)، الأطفال، وتأكل الليرة</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>نشرة ديانت</th><th>المدد</th><th class="num">رباعي</th><th class="num">ثلاثي</th><th class="num">ثنائي</th></tr></thead>
              <tbody>
                ${E.diyanet_tariffs_table.map((d) => `<tr><td><strong>${esc(d.bulletin)}</strong></td><td>${esc(d.durations)}</td><td class="num">${esc(d.quad)}</td><td class="num">${esc(d.triple)}</td><td class="num">${esc(d.double)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <p style="margin-top:10px">تآكل الصرف: باقة <strong class="num">$1,500</strong> ارتفعت محليًا من <strong class="num">64,821 TL</strong> في يناير (43.21) إلى <strong class="num">69,392 TL</strong> في يونيو (46.26) ثم <strong class="num">75,165 TL</strong> في نوفمبر* (50.11) — بزيادة <strong class="num">+17%</strong>.</p>
        </div>

        <div class="card">
          <h3>الأعباء التنظيمية والقانونية والضريبية في تركيا والسعودية</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>البند التنظيمي</th><th>القيمة / القاعدة</th><th>الأثر على الوكالة</th></tr></thead>
              <tbody>
                ${E.regulatory_items_p37_p46.map((r) => `<tr><td><strong>${esc(r.item)}</strong></td><td>${esc(r.value)}</td><td>${esc(r.ref)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Restore selects & bind events
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
    document.getElementById("tax-sar-slider").addEventListener("input", (e) => { state.simTaxBaseSar = Number(e.target.value); renderTab("economics"); });
  }

  function renderDistributionTab() {
    const D = state.data.distribution;
    const sec = document.getElementById("tab-distribution");

    const bookingsFromChats = Math.round(state.simMetaChats * (state.simMetaConv / 100));
    const cacLive = bookingsFromChats > 0 ? state.simMetaSpend / bookingsFromChats : 0;
    const estRev = bookingsFromChats * 1500;
    const roasLive = state.simMetaSpend > 0 ? estRev / state.simMetaSpend : 0;

    const crmSvg = buildHBarSvg([
      ...D.crm_funnel_aggregate.breakdown.map((b) => ({
        label: b.segment,
        val: b.count,
        valLabel: `${fmtInt(b.count)} (${b.pct}%)`,
        highlight: b.segment.includes("العمرة")
      })),
      {
        label: "في حالة انتظار رد العميل (الاختناق)",
        val: D.crm_funnel_aggregate.awaiting_reply_count,
        valLabel: `${fmtInt(D.crm_funnel_aggregate.awaiting_reply_count)} (${D.crm_funnel_aggregate.awaiting_reply_pct}%)`,
        color: "#9e2a2b"
      }
    ], { aria: "قمع استفسارات CRM (839 سجلًا مجمّعًا دون بيانات شخصية)", labelW: 230 });

    sec.innerHTML = `
      <div class="section-head">
        <h2>التسويق الرقمي (Meta/IG)، مخاطر الإلغاء، واختناق مبيعات CRM (839)</h2>
        <p class="section-sub">دمج أمثلة إنستغرام الثمانية وCRM المجهول الهوية (40P ص38–39) مع مصفوفة الحساسية القابلة لإعادة الحساب (50P ص47)</p>
      </div>

      <div class="callout callout-warn" style="margin-bottom:14px">${esc(D.meta_metrics.audit_warning)}</div>

      <div class="grid-2">
        <div class="card">
          <h3>حاسبة حساسية الإعلانات: الإنفاق ← المحادثات ← الحجوزات (50P ص47)</h3>
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

          <h3 style="margin-top:14px">جدول الحساسية المرجعي (50P ص47): الإنفاق مقابل CAC</h3>
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
          <h3>اختناق قمع CRM (839 استفسارًا مجمّعًا — 40P ص38)</h3>
          <p>${esc(D.crm_funnel_aggregate.source_label)}</p>
          <div class="svg-wrap">${crmSvg}</div>
          <div class="callout callout-danger">${esc(D.crm_funnel_aggregate.insight)}</div>
          <div class="callout callout-info">${esc(D.europe_diaspora_p39)}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>مسح 8 حملات إعلانية حية على إنستغرام في السوق التركي (40P ص39)</h3>
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
          <h3>مصفوفة مخاطر الإلغاء والسيولة لدى الناقلات والفنادق (40P ص38)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>النافذة الزمنية</th><th>شروط الطيران (THY/flynas)</th><th>الفندق</th><th>تأثير السيولة</th></tr></thead>
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

  function renderPagesTab() {
    const sec = document.getElementById("tab-pages");
    const all40 = state.data.pages_40.map((p) => ({ ...p, doc: "40p", docLabel: "الأطلس (40P)" }));
    const all50 = state.data.pages_50.map((p) => ({ ...p, doc: "50p", docLabel: "الموسوعة (50P)" }));
    let merged = [...all40, ...all50];

    if (state.pagesDocFilter !== "all") merged = merged.filter((p) => p.doc === state.pagesDocFilter);
    if (state.pagesGroupFilter !== "all") merged = merged.filter((p) => p.group === state.pagesGroupFilter);

    const groups = [
      ["all", "كل المحاور"],
      ["macro", "السوق والطلب"],
      ["aviation", "الطيران والمطارات"],
      ["agencies", "الشركات والحيتان"],
      ["monthly", "الشهور والأسعار"],
      ["economics", "التكاليف والضرائب"],
      ["distribution", "التسويق وCRM"],
      ["audit", "التدقيق والمصادر"]
    ];

    sec.innerHTML = `
      <div class="section-head">
        <h2>مستكشف الـ 90 صفحة (40 صفحة للأطلس + 50 صفحة للموسوعة المدمجة)</h2>
        <p class="section-sub">اضغط على أي بطاقة صفحة لعرض المؤشرات المستخلصة وشرح «لماذا وكيف؟»</p>
      </div>

      <div class="pill-row">
        <button type="button" class="filter-pill ${state.pagesDocFilter === "all" ? "active" : ""}" data-pdoc="all">الكل (90 صفحة)</button>
        <button type="button" class="filter-pill ${state.pagesDocFilter === "40p" ? "active" : ""}" data-pdoc="40p">ملف الأطلس التنفيذي (40 صفحة)</button>
        <button type="button" class="filter-pill ${state.pagesDocFilter === "50p" ? "active" : ""}" data-pdoc="50p">الموسوعة المدمجة (50 صفحة)</button>
      </div>

      <div class="pill-row">
        ${groups.map(([gKey, gLbl]) => `
          <button type="button" class="filter-pill ${state.pagesGroupFilter === gKey ? "active" : ""}" data-pgrp="${gKey}">${gLbl}</button>
        `).join("")}
      </div>

      <div class="section-sub" style="margin-bottom:10px">الصفحات المعروضة: <strong class="num">${merged.length}</strong> صفحة مصدرية</div>

      <div class="grid-3">
        ${merged.map((p) => `
          <article class="page-card ${p.doc === "50p" ? "src-50p" : ""}" data-open-page="${p.doc}:${p.p}">
            <div>
              <div class="page-card-head">
                <span class="page-num-pill">${esc(p.docLabel)} · ص <span class="num">${p.p}</span></span>
                <span class="src-tag">${esc(groups.find((x) => x[0] === p.group)?.[1] || p.group)}</span>
              </div>
              <div class="page-card-title">${esc(p.title)}</div>
              <div class="page-card-kpis">${esc(p.kpis)}</div>
            </div>
            <div class="page-card-why">${esc(p.why)}</div>
          </article>
        `).join("")}
      </div>
    `;

    sec.querySelectorAll("[data-pdoc]").forEach((b) => b.addEventListener("click", () => { state.pagesDocFilter = b.dataset.pdoc; renderPagesTab(); }));
    sec.querySelectorAll("[data-pgrp]").forEach((b) => b.addEventListener("click", () => { state.pagesGroupFilter = b.dataset.pgrp; renderPagesTab(); }));
    sec.querySelectorAll("[data-open-page]").forEach((card) => {
      card.addEventListener("click", () => {
        const [doc, pNum] = card.dataset.openPage.split(":");
        const p = (doc === "40p" ? state.data.pages_40 : state.data.pages_50).find((x) => String(x.p) === pNum);
        openDrawer(`${doc === "40p" ? "الأطلس 40 صفحة" : "الموسوعة 50 صفحة"} · صفحة ${p.p}`, p.title, `
          <div class="drawer-box"><strong>الأرقام والمؤشرات الرئيسية بالصفحة:</strong><br>${esc(p.kpis)}</div>
          <div class="drawer-box"><strong>التحليل والمنهجية (لماذا وكيف؟):</strong><br>${esc(p.why)}</div>
          <div class="callout callout-info">هذه البطاقة مستخلصة نصيًا ورقميًا بالكامل من الصفحة رقم <strong>${p.p}</strong> من وثيقة <strong>${doc === "40p" ? "Turkey_Umrah_40p_Master_Atlas_2026" : "Turkey_Umrah_2025_2026_Master_50_Page_Merged"}</strong>.</div>
        `);
      });
    });
  }

  function renderAuditTab() {
    const AU = state.data.audit;
    const sec = document.getElementById("tab-audit");

    sec.innerHTML = `
      <div class="section-head">
        <h2>سجل التوفيق بين الملفين (40P + 50P)، درجات الإثبات (A/B/C)، والمصادر العامة</h2>
        <p class="section-sub">شفافية كاملة حول أي تفاوت رقمي أو اصطلاحي مع استبعاد الروابط السحابية الخاصة</p>
      </div>

      <div class="card">
        <h3>سجل التعارضات والحلول بين الأطلس (40P) والموسوعة (50P)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>نقطة البحث أو التضارب</th><th>ما ورد في الأطلس (40P)</th><th>ما ورد في الموسوعة (50P)</th><th>الحكم المنهجي المعتمد</th></tr></thead>
            <tbody>
              ${AU.reconciliation_matrix.map((r) => `
                <tr>
                  <td><strong>${esc(r.topic)}</strong></td>
                  <td>${esc(r.val_40p)}</td>
                  <td>${esc(r.val_50p)}</td>
                  <td style="color:var(--emerald)"><strong>${esc(r.verdict)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <h3>قاموس الوحدات الإحصائية الست غير القابلة للدمج (50P ص2)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>الوحدة</th><th>أمثلة الأرقام بالملفين</th><th>قاعدة المنع</th></tr></thead>
              <tbody>
                ${AU.units_6.map((u) => `<tr><td><strong>${esc(u.unit)}</strong></td><td>${esc(u.example)}</td><td>${esc(u.rule)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>تصنيف الموثوقية (A / B / C) ورموز المصادر S01–S14</h3>
          ${AU.grades.map((g) => `
            <div class="drawer-box">
              <span class="badge-grade grade-${esc(g.grade)}">${esc(g.label)}</span>
              <div style="margin-top:6px;font-size:13px">${esc(g.items)}</div>
            </div>
          `).join("")}
          <div class="table-wrap">
            <table>
              <thead><tr><th>الرمز</th><th>المصدر</th><th>نطاق الإثبات</th></tr></thead>
              <tbody>
                ${AU.source_codes_s01_s14.map((s) => `<tr><td class="num"><strong>${esc(s.code)}</strong></td><td>${esc(s.source)}</td><td>${esc(s.scope)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>المصادر العامة الموثقة القابلة للتحقق المباشر (${AU.verified_public_sources.length} رابطًا رسميًا وإعلاميًا)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>المصدر</th><th>الدرجة</th><th>الموضع في الوثيقتين</th><th>الرابط العام المباشر</th></tr></thead>
            <tbody>
              ${AU.verified_public_sources.map((s) => `
                <tr>
                  <td><strong>${esc(s.name)}</strong></td>
                  <td><span class="badge-grade grade-${esc(s.grade)}">${esc(s.grade)}</span></td>
                  <td><span class="src-tag">${esc(s.src)}</span></td>
                  <td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">فتح المصدر الأصلي ↗</a></td>
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
    state.data.agencies.whales_blocks.forEach((w, idx) => {
      if (`${w.name} ${w.license} ${w.financials} ${w.audit_caveat}`.toLowerCase().includes(q)) {
        hits.push({ kind: "تكتل كبرى", title: w.name, sub: w.volume, action: () => { switchTab("agencies"); } });
      }
    });
    state.data.agencies.emerging_18.forEach((e) => {
      if (`${e.name} ${e.city} ${e.ops} ${e.strategy}`.toLowerCase().includes(q)) {
        hits.push({ kind: "وكالة إقليمية", title: e.name, sub: `${e.city} — ${e.strategy}`, action: () => { switchTab("agencies"); } });
      }
    });
    state.data.pages_40.forEach((p) => {
      if (`${p.title} ${p.kpis} ${p.why}`.toLowerCase().includes(q)) {
        hits.push({ kind: `40P ص${p.p}`, title: p.title, sub: p.kpis, action: () => { switchTab("pages"); state.pagesDocFilter = "40p"; renderPagesTab(); } });
      }
    });
    state.data.pages_50.forEach((p) => {
      if (`${p.title} ${p.kpis} ${p.why}`.toLowerCase().includes(q)) {
        hits.push({ kind: `50P ص${p.p}`, title: p.title, sub: p.kpis, action: () => { switchTab("pages"); state.pagesDocFilter = "50p"; renderPagesTab(); } });
      }
    });
    state.data.audit.reconciliation_matrix.forEach((r) => {
      if (`${r.topic} ${r.val_40p} ${r.val_50p} ${r.verdict}`.toLowerCase().includes(q)) {
        hits.push({ kind: "تدقيق 40/50", title: r.topic, sub: r.verdict, action: () => { switchTab("audit"); } });
      }
    });

    if (hits.length === 0) {
      panel.innerHTML = `<div class="search-hit"><span>لا توجد نتائج مطابقة لـ «${esc(query)}» عبر الـ 90 صفحة.</span></div>`;
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

  function renderTab(tabId) {
    if (!state.data) return;
    preserveFocusRun(() => {
      if (tabId === "macro") renderMacroTab();
      else if (tabId === "aviation") renderAviationTab();
      else if (tabId === "agencies") renderAgenciesTab();
      else if (tabId === "monthly") renderMonthlyTab();
      else if (tabId === "economics") renderEconomicsTab();
      else if (tabId === "distribution") renderDistributionTab();
      else if (tabId === "pages") renderPagesTab();
      else if (tabId === "audit") renderAuditTab();
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".tab-btn").forEach((b) => {
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
      const resp = await fetch("./data/research-merged.json");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      state.data = await resp.json();

      document.getElementById("app-title").textContent = state.data.meta.title;
      document.getElementById("app-subtitle").textContent = state.data.meta.subtitle;
      document.getElementById("loading-state").classList.add("hidden");

      // Bind tab buttons
      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
      });

      // Bind FX switcher
      document.querySelectorAll(".fx-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.currency = btn.dataset.currency;
          document.querySelectorAll(".fx-btn").forEach((x) => x.classList.toggle("active", x === btn));
          const notes = {
            USD: "عرض القيم بالدولار الأمريكي (أساس الدراسة الموحد).",
            TRY_JAN: `التحويل بالليرة التركية وفق صرف يناير 2026 (1$ = ${state.data.meta.usd_try_jan} TL).`,
            TRY_JUN: `التحويل بالليرة التركية وفق صرف يونيو 2026 (1$ = ${state.data.meta.usd_try_jun} TL).`,
            TRY_NOV: `التحويل بالليرة التركية وفق نوفمبر* التقديري (1$ = ${state.data.meta.usd_try_nov} TL | +17%).`
          };
          document.getElementById("fx-active-note").textContent = notes[state.currency];
          renderTab(state.activeTab);
        });
      });

      // Bind global search
      const sInput = document.getElementById("global-search");
      sInput.addEventListener("input", () => handleGlobalSearch(sInput.value));
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-bar-wrap")) {
          document.getElementById("search-results-panel").classList.add("hidden");
        }
      });

      // Bind drawer close
      document.getElementById("drawer-close").addEventListener("click", closeDrawer);
      document.getElementById("drawer-backdrop").addEventListener("click", closeDrawer);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDrawer();
      });

      switchTab("macro");
    } catch (err) {
      document.getElementById("loading-state").innerHTML = `<div class="callout callout-danger">تعذر تحميل بيانات البحث الموحد: ${esc(err.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
