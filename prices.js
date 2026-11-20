/* Interactive Market Prices & 8-Month Seasonal Matrix Engine
 * Reads ./data/market-prices-calendar.json — Zero hardcoded CRM / Zero external telemetry
 */
(function () {
  "use strict";

  const FX_STORAGE_KEY = "turkey_umrah_fx_rate_v2";
  const CURRENCY_STORAGE_KEY = "turkey_umrah_currency_v2";
  const PAGE_SIZE = 50;

  const MONTHS_ORDER = [
    { key: "2026-09", title: "سبتمبر 2026", sub: "انطلاقة الموسم (ربيع الأول)" },
    { key: "2026-10", title: "أكتوبر 2026", sub: "انطلاق الوفود وتعتدل الحرارة" },
    { key: "2026-11", title: "نوفمبر 2026", sub: "ذروة العروض الخريفية" },
    { key: "2026-12", title: "ديسمبر 2026", sub: "رجب واستعدادات نصف العام" },
    { key: "2027-01", title: "يناير 2027", sub: "ذروة عطلة نصف العام (Sömestr)" },
    { key: "2027-02", title: "فبراير 2027", sub: "شعبان + دخول رمضان (8 فبراير)" },
    { key: "2027-03", title: "مارس 2027", sub: "العشر الأواخر + العيد (9 مارس)" },
    { key: "2027-04", title: "أبريل 2027", sub: "نهاية شوال 1448 (إغلاق التأشيرة 9 مارس · الخروج 7 أبريل)" },
  ];

  const PRESETS = [
    { id: "all", label: "كامل الموسم (سبتمبر–شوال)", from: "2026-09-01", to: "2027-04-08", month: "all" },
    { id: "opening", label: "الافتتاح (سبتمبر–أكتوبر)", from: "2026-09-01", to: "2026-10-31", month: "all" },
    { id: "somestr", label: "عطلة نصف العام (يناير 2027)", from: "2027-01-01", to: "2027-01-31", month: "2027-01" },
    { id: "ramadan_start", label: "شعبان وبداية رمضان (فبراير)", from: "2027-02-01", to: "2027-02-28", month: "2027-02" },
    { id: "late_ramadan", label: "العشر الأواخر والعيد (مارس)", from: "2027-03-01", to: "2027-03-31", month: "2027-03" },
    { id: "shawwal", label: "شوال 1448 (مغادرة 10–23 مارس · عودة حتى 7 أبريل)", from: "2027-03-10", to: "2027-04-08", month: "all" },
  ];

  const CHANNELS = [
    { key: "all", label: "كل المصادر" },
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "agency_web", label: "مواقع الشركات" },
    { key: "aggregator", label: "بوابة Umre Dünyası" },
    { key: "diyanet", label: "ديانت الرسمي" },
  ];

  const SEASON_DRIVERS = {
    "all": "لماذا تتفاوت الأسعار؟ برامج المشي قرب الحرم (الصفوة/الساعة/جبل عمر) تتضاعف من 1,450–1,950$ في المواسم العادية إلى 3,200–6,500$+ في العشر الأواخر، بينما تحافظ فنادق شتل العزيزية والششة على مرونة سعرية بين 1,100–1,650$ معظم الموسم قبل أن ترتفع في رمضان 1448.",
    "2026-09": "سبتمبر 2026 (بداية الموسم): تشغيل تدريجي عقب الحج وعودة المدارس؛ عروض المشي المبكرة قليلة العدد وبأسعار افتتاحية أقل قبل ارتفاع حجوزات الطيران الخريفية.",
    "2026-10": "أكتوبر 2026: ارتفاع تدريجي في رحلات الأناضول وعروض إجازة 29 أكتوبر في تركيا مع دخول فنادق أجياد وجبل عمر 5 نجوم إلى الجداول المعلنة.",
    "2026-11": "نوفمبر 2026: أكثر شهور الموسم استقرارًا وتنافسية بين عشرات الشركات؛ تتوافر فيه خيارات 7–10 و11–16 يومًا بفنادق مشي مباشرة بأسعار قياسية معتدلة.",
    "2026-12": "ديسمبر 2026: دخول شهر رجب (1448 هـ) يزيد الطلب الأوروبي والتركي وتبدأ الفوارق بالاتساع بين فنادق ساحة الحرم وبرامج شتل محبس الجن والششة.",
    "2027-01": "يناير 2027: ذروة عطلة نصف العام المدرسية (Sömestr) ترفع الطلب العائلي على الغرف الثنائية والثلاثية خاصة في الباقات القصيرة 7–10 أيام والفنادق الملاصقة للحرم.",
    "2027-02": "فبراير 2027: يصادف 1 رمضان 1448 يوم 8 فبراير 2027؛ تنقسم السوق بين برامج شعبان المتصلة ببداية رمضان وبين باقات رمضان الكامل الطويلة (17–40 يومًا).",
    "2027-03": "مارس 2027: ذروة العشر الأواخر وليلة القدر (5 مارس) وعيد الفطر (1 شوال = 9 مارس 2027)، حيث يقفز التسعير بنسبة 80%–180% لفنادق الصفوة والساعة وجبل عمر ثم يهبط سريعًا في شوال.",
    "2027-04": "أبريل 2027 (نهاية شوال 1448): وفق تقويم العمرة السعودي 1448 هـ يتوقف إصدار التأشيرات في 9 مارس 2027 ويكون آخر دخول في 23 مارس وآخر خروج في 7 أبريل 2027؛ لذلك تسجل إقلاعات أبريل الجديدة صفرًا مقابل برامج تغادر في مارس وتعود في أبريل.",
  };

  const DECISION_SCENARIOS = [
    {
      id: "cheap_walk",
      label: "أرخص مشي للحرم",
      apply: () => {
        STATE.distance = "walking";
        STATE.onlyNamedHotel = true;
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "plaza_5",
      label: "5 نجوم — ساحة الحرم (250م)",
      apply: () => {
        STATE.distance = "walk_250";
        STATE.stars = "5";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "peak_ramadan",
      label: "ذروة رمضان والعيد",
      apply: () => {
        STATE.month = "all";
        STATE.preset = "custom";
        STATE.dateFrom = "2027-02-08";
        STATE.dateTo = "2027-03-10";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "long_econ",
      label: "طويلة اقتصادية (17–40 يومًا)",
      apply: () => {
        STATE.tier = "17-40";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "social_full",
      label: "عروض IG/FB كاملة (2+3+4)",
      apply: () => {
        STATE.onlyFullRooms = true;
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "vakit40_shuttle",
      label: "40 صلاة بالمدينة (فنادق شتل)",
      apply: () => {
        STATE.vakit40 = "40v_shuttle";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "vakit40_all",
      label: "كل عروض 40 صلاة",
      apply: () => {
        STATE.vakit40 = "40v";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "ramadan_tam_shuttle",
      label: "تمام رمضان 30+ (نقل ترددي)",
      apply: () => {
        STATE.ramadanWindow = "ram_tam";
        STATE.distance = "shuttle";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "ramadan_last10",
      label: "العشر الأواخر وليلة القدر",
      apply: () => {
        STATE.ramadanWindow = "ram_last10";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "shawwal_season",
      label: "عروض شوال 1448",
      apply: () => {
        STATE.ramadanWindow = "shawwal";
        STATE.sort = "quad_asc";
      },
    },
    {
      id: "anatolia_direct",
      label: "انطلاقات خارج إسطنبول مباشر",
      apply: () => {
        STATE.city = "anatolia";
        STATE.sort = "date_asc";
      },
    },
    {
      id: "private_only",
      label: "الشركات الخاصة فقط (بدون ديانت)",
      apply: () => {
        STATE.sector = "private";
        STATE.sort = "quad_asc";
      },
    },
  ];

  let DATA = null;
  let PACKAGES = [];
  let FILTERED = [];
  let AGENCIES_BY_NAME = new Map();
  let BENCH_MEDIANS = new Map();
  let MONTH_HEAT = new Map();

  const STATE = {
    currency: "USD",
    fxRate: 44.2,
    month: "all",
    preset: "all",
    scenario: "none",
    chartTier: "all",
    dateFrom: "2026-09-01",
    dateTo: "2027-04-08",
    tier: "all",
    agency: "all",
    hotelSearch: "",
    hotelId: "all",
    distance: "all",
    stars: "all",
    channel: "all",
    vakit40: "all",
    ramadanWindow: "all",
    sector: "all",
    zone: "all",
    city: "all",
    airline: "all",
    madinahHotel: "all",
    nightlyBand: "all",
    makkahNights: "all",
    madinahNights: "all",
    precision: "all",
    budgetMin: "",
    budgetMax: 8000,
    onlyFullRooms: false,
    onlyNamedHotel: false,
    only40Vakit: false,
    lateShawwalView: "off",
    sort: "date_asc",
    shownLimit: PAGE_SIZE,
    compareIds: [],
  };

  function esc(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function trNorm(str) {
    return String(str ?? "")
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .replace(/Ş/g, "s")
      .replace(/ş/g, "s")
      .replace(/Ğ/g, "g")
      .replace(/ğ/g, "g")
      .replace(/Ü/g, "u")
      .replace(/ü/g, "u")
      .replace(/Ö/g, "o")
      .replace(/ö/g, "o")
      .replace(/Ç/g, "c")
      .replace(/ç/g, "c")
      .toLowerCase()
      .trim();
  }

  function fmtInt(n) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "غير معلن";
    return Math.round(Number(n)).toLocaleString("en-US");
  }

  function fmtPrice(usd) {
    if (usd === null || usd === undefined || Number.isNaN(Number(usd))) return "غير معلن";
    const num = Number(usd);
    if (STATE.currency === "TRY") {
      return fmtInt(num * STATE.fxRate) + " ₺";
    }
    return fmtInt(num) + " $";
  }

  function fmtDist(m, accessType) {
    if (m === null || m === undefined) {
      return accessType === "walking" ? "مشي للحرم" : "شتل";
    }
    if (m >= 1000) {
      return (m / 1000).toFixed(1).replace(/\.0$/, "") + " كم";
    }
    return m + " م";
  }

  function median(nums) {
    const clean = nums.filter((v) => typeof v === "number" && !Number.isNaN(v)).sort((a, b) => a - b);
    if (!clean.length) return null;
    const mid = Math.floor(clean.length / 2);
    return clean.length % 2 ? clean[mid] : Math.round((clean[mid - 1] + clean[mid]) / 2);
  }

  function channelBadge(ch) {
    const map = {
      instagram: ["Instagram", "ch-instagram"],
      facebook: ["Facebook", "ch-facebook"],
      agency_web: ["موقع الشركة", "ch-agency_web"],
      aggregator: ["Umre Dünyası", "ch-aggregator"],
      diyanet: ["ديانت الرسمي", "ch-diyanet"],
    };
    const [lbl, cls] = map[ch] || [ch || "مصدر", "ch-aggregator"];
    return `<span class="badge-channel ${cls}">${esc(lbl)}</span>`;
  }

  function tierLabel(band) {
    if (band === "7-10") return "7–10 أيام";
    if (band === "11-16") return "11–16 يومًا";
    if (band === "17-40") return "17–40 يومًا";
    return band || "";
  }

  function initPrefs() {
    try {
      const savedFx = Number(localStorage.getItem(FX_STORAGE_KEY));
      if (savedFx >= 20 && savedFx <= 100) STATE.fxRate = savedFx;
      const savedCur = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (savedCur === "TRY" || savedCur === "USD") STATE.currency = savedCur;
    } catch (_) {}

    const fxInput = document.getElementById("fxRateInput");
    const fxBtn = document.getElementById("fxToggleBtn");
    fxInput.value = STATE.fxRate.toFixed(2);
    updateFxUi();

    fxInput.addEventListener("input", () => {
      const v = Number(fxInput.value);
      if (v >= 20 && v <= 100) {
        STATE.fxRate = v;
        try { localStorage.setItem(FX_STORAGE_KEY, String(v)); } catch (_) {}
        updateFxUi();
        renderAll();
      }
    });

    fxBtn.addEventListener("click", () => {
      STATE.currency = STATE.currency === "USD" ? "TRY" : "USD";
      try { localStorage.setItem(CURRENCY_STORAGE_KEY, STATE.currency); } catch (_) {}
      updateFxUi();
      renderAll();
    });
  }

  function buildMarketBenchmarks() {
    BENCH_MEDIANS = new Map();
    MONTH_HEAT = new Map();
    const bySlice = new Map();
    const byMonth = new Map();
    PACKAGES.forEach((p) => {
      if (typeof p.room_quad_usd !== "number") return;
      const k = `${p.month_key}|${p.duration_band}`;
      if (!bySlice.has(k)) bySlice.set(k, []);
      bySlice.get(k).push(p.room_quad_usd);
      if (!byMonth.has(p.month_key)) byMonth.set(p.month_key, []);
      byMonth.get(p.month_key).push(p.room_quad_usd);
    });
    bySlice.forEach((arr, k) => BENCH_MEDIANS.set(k, median(arr)));

    const monthMeds = MONTHS_ORDER.map((m) => ({
      key: m.key,
      med: median(byMonth.get(m.key) || []),
    })).filter((x) => x.med !== null);
    const maxMed = Math.max(2500, ...monthMeds.map((x) => x.med));
    const minMed = Math.min(1100, ...monthMeds.map((x) => x.med));

    MONTHS_ORDER.forEach((m) => {
      const med = median(byMonth.get(m.key) || []);
      if (med === null) {
        MONTH_HEAT.set(m.key, { pct: 18, heatCls: "heat-closed", med: null });
        return;
      }
      const pct = Math.max(18, Math.min(100, Math.round(((med - minMed * 0.85) / Math.max(1, maxMed - minMed * 0.85)) * 100)));
      const heatCls = heatClassForMedian(med, false);
      MONTH_HEAT.set(m.key, { pct, heatCls, med });
    });
  }

  function heatClassForMedian(med, isClosed) {
    if (isClosed || med === null) return "heat-closed";
    if (med >= 2100) return "heat-peak";
    if (med >= 1580) return "heat-mid";
    return "heat-cool";
  }

  function getPkgValueLens(p) {
    const perNightUsd = p.nights && typeof p.room_quad_usd === "number" ? Math.round(p.room_quad_usd / p.nights) : null;
    const bench = BENCH_MEDIANS.get(`${p.month_key}|${p.duration_band}`);
    let deltaPill = "";
    if (bench && typeof p.room_quad_usd === "number") {
      const pct = Math.round(((p.room_quad_usd - bench) / bench) * 100);
      if (pct <= -7) {
        deltaPill = `<span class="val-pill is-good">أقل من الوسيط بـ ${Math.abs(pct)}%</span>`;
      } else if (pct >= 18) {
        deltaPill = `<span class="val-pill is-prem">فئة عليا +${pct}%</span>`;
      } else {
        deltaPill = `<span class="val-pill is-mid">قريب من الوسيط</span>`;
      }
    }
    return { perNightUsd, deltaPill };
  }

  function countActiveAdvancedFilters() {
    let n = 0;
    if (STATE.preset !== "all") n++;
    if (STATE.tier !== "all") n++;
    if (STATE.agency !== "all") n++;
    if (STATE.hotelId !== "all") n++;
    if (STATE.distance !== "all") n++;
    if (STATE.stars !== "all") n++;
    if (STATE.channel !== "all") n++;
    if (STATE.vakit40 !== "all") n++;
    if (STATE.ramadanWindow !== "all") n++;
    if (STATE.sector !== "all") n++;
    if (STATE.zone !== "all") n++;
    if (STATE.city !== "all") n++;
    if (STATE.airline !== "all") n++;
    if (STATE.madinahHotel !== "all") n++;
    if (STATE.nightlyBand !== "all") n++;
    if (STATE.makkahNights !== "all") n++;
    if (STATE.madinahNights !== "all") n++;
    if (STATE.precision !== "all") n++;
    if (STATE.budgetMin) n++;
    if (STATE.budgetMax < 8000) n++;
    if (STATE.onlyFullRooms) n++;
    if (STATE.onlyNamedHotel) n++;
    if (STATE.only40Vakit) n++;
    return n;
  }

  function updateFilterBadge() {
    const cnt = countActiveAdvancedFilters();
    const trig = document.getElementById("toggleAdvFiltersBtn");
    const lbl = document.getElementById("advFilterBtnLabel");
    const dockBadge = document.getElementById("dockFilterBadge");
    if (lbl) lbl.textContent = cnt > 0 ? `فلاتر (${cnt})` : "فلاتر متقدمة";
    if (trig) trig.classList.toggle("has-active", cnt > 0);
    if (dockBadge) {
      dockBadge.textContent = String(cnt);
      dockBadge.classList.toggle("hidden", cnt === 0);
    }
  }

  function updateFxUi() {
    const fxBtn = document.getElementById("fxToggleBtn");
    const fxNote = document.getElementById("fxNoteText");
    const mobPill = document.getElementById("mobFxPill");
    if (STATE.currency === "TRY") {
      fxBtn.textContent = "عرض بالليرة التركية (₺ TRY)";
      fxBtn.classList.add("active");
      if (mobPill) mobPill.textContent = "₺ TRY ⇄";
    } else {
      fxBtn.textContent = "عرض بالدولار ($ USD)";
      fxBtn.classList.add("active");
      if (mobPill) mobPill.textContent = "$ USD ⇄";
    }
    fxNote.textContent = `المصدر المرجعي: 1 دولار = ${STATE.fxRate.toFixed(2)} ليرة تركية (التحويل ينطبق على الأسعار المقارنة مع الاحتفاظ بالعملة الأصلية للإعلان).`;
  }

  function populateSelectors() {
    // Agencies sorted descending by frequency
    const agCounts = {};
    PACKAGES.forEach((p) => {
      if (p.agency) agCounts[p.agency] = (agCounts[p.agency] || 0) + 1;
    });
    const agSel = document.getElementById("agencySelect");
    Object.keys(agCounts)
      .sort((a, b) => agCounts[b] - agCounts[a] || a.localeCompare(b))
      .forEach((ag) => {
        const opt = document.createElement("option");
        opt.value = ag;
        opt.textContent = `${ag} (${agCounts[ag]})`;
        agSel.appendChild(opt);
      });

    // Madinah hotels populated dynamically
    const mdCounts = {};
    PACKAGES.forEach((p) => {
      if (p.madinah_hotel_ar) mdCounts[p.madinah_hotel_ar] = (mdCounts[p.madinah_hotel_ar] || 0) + 1;
    });
    const mdSel = document.getElementById("madinahHotelSelect");
    if (mdSel) {
      Object.keys(mdCounts)
        .sort((a, b) => mdCounts[b] - mdCounts[a] || a.localeCompare(b))
        .forEach((mh) => {
          const opt = document.createElement("option");
          opt.value = mh;
          opt.textContent = `${mh} (${mdCounts[mh]})`;
          mdSel.appendChild(opt);
        });
    }

    // Canonical Makkah Hotels for dropdown & datalist
    const hotelStats = {};
    PACKAGES.forEach((p) => {
      if (!p.makkah_hotel_id || p.is_generic_hotel) return;
      const cur = hotelStats[p.makkah_hotel_id] || {
        id: p.makkah_hotel_id,
        ar: p.makkah_hotel_ar,
        en: p.makkah_hotel_en_tr,
        stars: p.makkah_stars_ar,
        dist: p.makkah_distance_m,
        access: p.makkah_access_type,
        count: 0,
      };
      cur.count += 1;
      hotelStats[p.makkah_hotel_id] = cur;
    });

    const sortedHotels = Object.values(hotelStats).sort((a, b) => {
      if (a.access !== b.access) return a.access === "walking" ? -1 : 1;
      return b.count - a.count;
    });

    const hotelSel = document.getElementById("hotelSelect");
    const dl = document.getElementById("makkahHotelList");
    sortedHotels.forEach((h) => {
      const opt = document.createElement("option");
      opt.value = h.id;
      const distTxt = h.dist ? `${h.dist}م` : (h.access === "walking" ? "مشي" : "شتل");
      opt.textContent = `${h.ar} — ${h.en} (${h.stars} | ${distTxt} | ${h.count} عرض)`;
      hotelSel.appendChild(opt);

      const d1 = document.createElement("option");
      d1.value = h.ar;
      dl.appendChild(d1);
      if (h.en && h.en !== h.ar) {
        const d2 = document.createElement("option");
        d2.value = h.en;
        dl.appendChild(d2);
      }
    });

    // Presets
    const presetsBox = document.getElementById("seasonPresets");
    PRESETS.forEach((pr) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "preset-chip" + (pr.id === STATE.preset ? " active" : "");
      b.dataset.preset = pr.id;
      b.textContent = pr.label;
      b.addEventListener("click", () => {
        STATE.preset = pr.id;
        STATE.month = pr.month;
        STATE.lateShawwalView = "off";
        STATE.dateFrom = pr.from;
        STATE.dateTo = pr.to;
        STATE.shownLimit = PAGE_SIZE;
        document.getElementById("dateFromInput").value = pr.from;
        document.getElementById("dateToInput").value = pr.to;
        renderAll();
      });
      presetsBox.appendChild(b);
    });

    // Channels
    const chBox = document.getElementById("channelPills");
    CHANNELS.forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "filter-pill" + (ch.key === STATE.channel ? " active" : "");
      b.dataset.channel = ch.key;
      b.textContent = ch.label;
      b.addEventListener("click", () => {
        STATE.channel = ch.key;
        STATE.shownLimit = PAGE_SIZE;
        renderAll();
      });
      chBox.appendChild(b);
    });

    // One-Tap Decision Scenarios
    const scenBox = document.getElementById("decisionScenarios");
    if (scenBox) {
      DECISION_SCENARIOS.forEach((sc) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "scenario-chip" + (sc.id === STATE.scenario ? " active" : "");
        b.dataset.scenario = sc.id;
        b.textContent = sc.label;
        b.addEventListener("click", () => {
          const same = STATE.scenario === sc.id;
          STATE.month = "all";
          STATE.preset = "all";
          STATE.dateFrom = "2026-09-01";
          STATE.dateTo = "2027-04-08";
          STATE.tier = "all";
          STATE.agency = "all";
          STATE.hotelSearch = "";
          STATE.hotelId = "all";
          STATE.distance = "all";
          STATE.stars = "all";
          STATE.channel = "all";
          STATE.vakit40 = "all";
          STATE.ramadanWindow = "all";
          STATE.sector = "all";
          STATE.zone = "all";
          STATE.city = "all";
          STATE.airline = "all";
          STATE.madinahHotel = "all";
          STATE.nightlyBand = "all";
          STATE.makkahNights = "all";
          STATE.madinahNights = "all";
          STATE.precision = "all";
          STATE.budgetMin = "";
          STATE.budgetMax = 8000;
          STATE.onlyFullRooms = false;
          STATE.onlyNamedHotel = false;
          STATE.only40Vakit = false;
          STATE.lateShawwalView = "off";
          STATE.sort = "date_asc";
          STATE.shownLimit = PAGE_SIZE;
          STATE.scenario = same ? "none" : sc.id;
          if (!same) sc.apply();
          syncControlsFromState();
          renderAll();
        });
        scenBox.appendChild(b);
      });
    }
  }

  function syncControlsFromState() {
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV("dateFromInput", STATE.dateFrom);
    setV("dateToInput", STATE.dateTo);
    setV("tierSelect", STATE.tier);
    setV("agencySelect", STATE.agency);
    setV("hotelSearchInput", STATE.hotelSearch);
    setV("hotelSelect", STATE.hotelId);
    setV("distanceSelect", STATE.distance);
    setV("starsSelect", STATE.stars);
    setV("vakit40Select", STATE.vakit40);
    setV("ramadanWindowSelect", STATE.ramadanWindow);
    setV("sectorSelect", STATE.sector);
    setV("zoneSelect", STATE.zone);
    setV("citySelect", STATE.city);
    setV("airlineSelect", STATE.airline);
    setV("madinahHotelSelect", STATE.madinahHotel);
    setV("nightlyBandSelect", STATE.nightlyBand);
    setV("makkahNightsSelect", STATE.makkahNights);
    setV("madinahNightsSelect", STATE.madinahNights);
    setV("precisionSelect", STATE.precision);
    setV("budgetMinInput", STATE.budgetMin);
    setV("budgetMaxInput", STATE.budgetMax);
    document.getElementById("budgetMaxLabel").textContent = STATE.budgetMax >= 8000 ? "الكل (بلا سقف)" : fmtPrice(STATE.budgetMax);
    document.getElementById("onlyFullRoomsCheck").checked = STATE.onlyFullRooms;
    document.getElementById("onlyNamedHotelCheck").checked = STATE.onlyNamedHotel;
    const chk40 = document.getElementById("only40VakitCheck");
    if (chk40) chk40.checked = STATE.only40Vakit;
    setV("sortSelect", STATE.sort);
    document.querySelectorAll("[data-rail-sort]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.railSort === STATE.sort);
    });
  }

  function wireControls() {
    document.getElementById("dateFromInput").addEventListener("change", (e) => {
      STATE.dateFrom = e.target.value || "2026-09-01";
      STATE.preset = "custom";
      STATE.month = "all";
      STATE.lateShawwalView = "off";
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("dateToInput").addEventListener("change", (e) => {
      STATE.dateTo = e.target.value || "2027-04-08";
      STATE.preset = "custom";
      STATE.month = "all";
      STATE.lateShawwalView = "off";
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("tierSelect").addEventListener("change", (e) => {
      STATE.tier = e.target.value;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("agencySelect").addEventListener("change", (e) => {
      STATE.agency = e.target.value;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    const hotelSearch = document.getElementById("hotelSearchInput");
    hotelSearch.addEventListener("input", () => {
      STATE.hotelSearch = hotelSearch.value.trim();
      if (STATE.hotelSearch) STATE.hotelId = "all";
      document.getElementById("hotelSelect").value = STATE.hotelId;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    const hotelSel = document.getElementById("hotelSelect");
    hotelSel.addEventListener("change", () => {
      STATE.hotelId = hotelSel.value;
      if (STATE.hotelId !== "all") {
        STATE.hotelSearch = "";
        hotelSearch.value = "";
      }
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("distanceSelect").addEventListener("change", (e) => {
      STATE.distance = e.target.value;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("starsSelect").addEventListener("change", (e) => {
      STATE.stars = e.target.value;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    const wireSel = (id, prop) => {
      document.getElementById(id)?.addEventListener("change", (e) => {
        STATE[prop] = e.target.value;
        STATE.shownLimit = PAGE_SIZE;
        renderAll();
      });
    };
    wireSel("vakit40Select", "vakit40");
    wireSel("ramadanWindowSelect", "ramadanWindow");
    wireSel("sectorSelect", "sector");
    wireSel("zoneSelect", "zone");
    wireSel("citySelect", "city");
    wireSel("airlineSelect", "airline");
    wireSel("madinahHotelSelect", "madinahHotel");
    wireSel("nightlyBandSelect", "nightlyBand");
    wireSel("makkahNightsSelect", "makkahNights");
    wireSel("madinahNightsSelect", "madinahNights");
    wireSel("precisionSelect", "precision");

    document.getElementById("budgetMinInput")?.addEventListener("input", (e) => {
      STATE.budgetMin = e.target.value.trim();
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("only40VakitCheck")?.addEventListener("change", (e) => {
      STATE.only40Vakit = e.target.checked;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    const budgetInput = document.getElementById("budgetMaxInput");
    budgetInput.addEventListener("input", () => {
      STATE.budgetMax = Number(budgetInput.value);
      const lbl = document.getElementById("budgetMaxLabel");
      lbl.textContent = STATE.budgetMax >= 8000 ? "الكل (بلا سقف)" : fmtPrice(STATE.budgetMax);
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("onlyFullRoomsCheck").addEventListener("change", (e) => {
      STATE.onlyFullRooms = e.target.checked;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("onlyNamedHotelCheck").addEventListener("change", (e) => {
      STATE.onlyNamedHotel = e.target.checked;
      STATE.shownLimit = PAGE_SIZE;
      renderAll();
    });

    document.getElementById("sortSelect").addEventListener("change", (e) => {
      STATE.sort = e.target.value;
      document.querySelectorAll("[data-rail-sort]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.railSort === STATE.sort);
      });
      renderResultsOnly();
    });

    document.getElementById("resetFiltersBtn").addEventListener("click", resetAllFilters);
    document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);

    // Compact header info toggle + mobile FX pill
    const siteHdr = document.getElementById("siteHeader");
    const infoBtn = document.getElementById("heroInfoToggle");
    if (infoBtn && siteHdr) {
      infoBtn.addEventListener("click", () => {
        const next = !siteHdr.classList.contains("meta-open");
        siteHdr.classList.toggle("meta-open", next);
        siteHdr.classList.toggle("fx-open", next);
        infoBtn.setAttribute("aria-expanded", String(next));
        infoBtn.textContent = next ? "إخفاء ▴" : "نبذة ▾";
      });
    }
    const mobFxPill = document.getElementById("mobFxPill");
    if (mobFxPill) {
      mobFxPill.addEventListener("click", () => {
        document.getElementById("fxToggleBtn").click();
      });
    }

    // Advanced Filters Slide-Up Sheet (mobile)
    const advWrap = document.getElementById("advancedFiltersWrap");
    const advBackdrop = document.getElementById("advSheetBackdrop");
    const advTrigger = document.getElementById("toggleAdvFiltersBtn");
    const openAdvSheet = () => {
      if (advWrap) advWrap.classList.add("sheet-open");
      if (advBackdrop) advBackdrop.classList.add("open");
      if (advTrigger) advTrigger.setAttribute("aria-expanded", "true");
    };
    const closeAdvSheet = () => {
      if (advWrap) advWrap.classList.remove("sheet-open");
      if (advBackdrop) advBackdrop.classList.remove("open");
      if (advTrigger) advTrigger.setAttribute("aria-expanded", "false");
    };
    if (advTrigger) advTrigger.addEventListener("click", openAdvSheet);
    document.getElementById("closeAdvFiltersBtn")?.addEventListener("click", closeAdvSheet);
    document.getElementById("applyAdvFiltersBtn")?.addEventListener("click", () => {
      closeAdvSheet();
      document.getElementById("resultsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("resetAdvFiltersBtn")?.addEventListener("click", () => {
      resetAllFilters();
    });
    if (advBackdrop) advBackdrop.addEventListener("click", closeAdvSheet);

    // Sticky quick-sort rail inside results
    document.querySelectorAll("[data-rail-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        STATE.sort = btn.dataset.railSort;
        document.getElementById("sortSelect").value = STATE.sort;
        document.querySelectorAll("[data-rail-sort]").forEach((b) => {
          b.classList.toggle("active", b.dataset.railSort === STATE.sort);
        });
        renderResultsOnly();
      });
    });

    // Bottom Dock actions + Side-by-side Compare controls
    document.getElementById("dockFilterBtn")?.addEventListener("click", openAdvSheet);
    document.getElementById("dockCompareBtn")?.addEventListener("click", openCompareSheet);
    document.getElementById("openCompareSheetBtn")?.addEventListener("click", openCompareSheet);
    document.getElementById("clearCompareBtn")?.addEventListener("click", () => {
      STATE.compareIds = [];
      updateCompareTray();
      renderResultsOnly();
    });
    document.getElementById("closeCompareSheetBtn")?.addEventListener("click", closeCompareSheet);
    document.getElementById("compareBackdrop")?.addEventListener("click", closeCompareSheet);

    // Drawer listeners
    document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
    document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDrawer();
        closeAdvSheet();
        closeCompareSheet();
      }
    });
  }

  function resetAllFilters() {
    STATE.month = "all";
    STATE.preset = "all";
    STATE.scenario = "none";
    STATE.dateFrom = "2026-09-01";
    STATE.dateTo = "2027-04-08";
    STATE.tier = "all";
    STATE.agency = "all";
    STATE.hotelSearch = "";
    STATE.hotelId = "all";
    STATE.distance = "all";
    STATE.stars = "all";
    STATE.channel = "all";
    STATE.vakit40 = "all";
    STATE.ramadanWindow = "all";
    STATE.sector = "all";
    STATE.zone = "all";
    STATE.city = "all";
    STATE.airline = "all";
    STATE.madinahHotel = "all";
    STATE.nightlyBand = "all";
    STATE.makkahNights = "all";
    STATE.madinahNights = "all";
    STATE.precision = "all";
    STATE.budgetMin = "";
    STATE.budgetMax = 8000;
    STATE.onlyFullRooms = false;
    STATE.onlyNamedHotel = false;
    STATE.only40Vakit = false;
    STATE.lateShawwalView = "off";
    STATE.sort = "date_asc";
    STATE.shownLimit = PAGE_SIZE;

    syncControlsFromState();
    renderAll();
  }

  function applyMonthSelection(mk, tierOpt) {
    STATE.month = mk;
    STATE.preset = mk === "all" ? "all" : "month_" + mk;
    STATE.scenario = "none";
    STATE.lateShawwalView = "off";
    const rangeMap = {
      "2026-09": ["2026-09-01", "2026-09-30"],
      "2026-10": ["2026-10-01", "2026-10-31"],
      "2026-11": ["2026-11-01", "2026-11-30"],
      "2026-12": ["2026-12-01", "2026-12-31"],
      "2027-01": ["2027-01-01", "2027-01-31"],
      "2027-02": ["2027-02-01", "2027-02-28"],
      "2027-03": ["2027-03-01", "2027-03-31"],
      "2027-04": ["2027-04-01", "2027-04-08"],
    };
    const [df, dt] = mk !== "all" && rangeMap[mk] ? rangeMap[mk] : ["2026-09-01", "2027-04-08"];
    STATE.dateFrom = df;
    STATE.dateTo = dt;
    document.getElementById("dateFromInput").value = df;
    document.getElementById("dateToInput").value = dt;
    if (tierOpt !== undefined) {
      STATE.tier = tierOpt;
      document.getElementById("tierSelect").value = tierOpt;
    }
    STATE.shownLimit = PAGE_SIZE;
    renderAll();
  }

  function matchesRamadanWin(p, win) {
    const dep = p.dep_date || "";
    const ret = p.ret_date || dep;
    const d = p.days || 0;
    if (!dep) return false;
    switch (win) {
      case "somestr": return dep >= "2027-01-14" && dep <= "2027-01-29";
      case "rajab_miraj": return dep >= "2026-12-10" && dep <= "2027-01-13";
      case "shaban_berat": return dep >= "2027-01-15" && dep <= "2027-02-02";
      case "ram_first10": return dep >= "2027-02-02" && dep <= "2027-02-12" && d <= 18;
      case "ram_first20": return dep >= "2027-02-02" && dep <= "2027-02-12" && d >= 16 && d <= 25;
      case "ram_mid15": return dep >= "2027-02-10" && dep <= "2027-02-22" && d <= 22;
      case "ram_last10": return dep >= "2027-02-22" && dep <= "2027-03-04" && d <= 18;
      case "ram_last20": return dep >= "2027-02-13" && dep <= "2027-02-24" && d >= 16 && d <= 26;
      case "ram_tam": return (dep >= "2027-01-28" && dep <= "2027-02-14" && d >= 25) || (dep <= "2027-02-12" && ret >= "2027-03-08");
      case "shawwal": return dep >= "2027-03-10" && dep <= "2027-04-08";
      default: return true;
    }
  }

  function applyFilters(excludeMonth = false) {
    const q = trNorm(STATE.hotelSearch);
    return PACKAGES.filter((p) => {
      if (!excludeMonth && STATE.month === "2027-04" && STATE.lateShawwalView !== "off") {
        if (STATE.lateShawwalView === "return_april") {
          if (!p.ret_date || p.ret_date < "2027-04-01") return false;
        } else if (STATE.lateShawwalView === "all_shawwal") {
          const dNorm = p.dep_date && p.dep_date.length === 7 ? p.dep_date + "-15" : (p.dep_date || "");
          if (!dNorm || dNorm < "2027-03-10" || dNorm > "2027-03-25") return false;
        }
      } else {
        if (!excludeMonth && STATE.month !== "all" && p.month_key !== STATE.month) return false;
        if (p.dep_date) {
          const dNorm = p.dep_date.length === 7 ? p.dep_date + "-15" : p.dep_date;
          if (STATE.dateFrom && dNorm < STATE.dateFrom) return false;
          if (STATE.dateTo && dNorm > STATE.dateTo) return false;
        }
      }
      if (STATE.tier !== "all" && p.duration_band !== STATE.tier) return false;
      if (STATE.agency !== "all" && p.agency !== STATE.agency) return false;
      if (STATE.hotelId !== "all" && p.makkah_hotel_id !== STATE.hotelId) return false;

      if (q) {
        const hay = trNorm(
          `${p.makkah_hotel_ar} ${p.makkah_hotel_en_tr} ${p.makkah_hotel_raw} ${p.madinah_hotel_ar} ${p.agency}`
        );
        if (!hay.includes(q)) return false;
      }

      if (STATE.distance === "walking" && p.makkah_access_type !== "walking") return false;
      if (STATE.distance === "shuttle" && p.makkah_access_type !== "shuttle") return false;
      if (STATE.distance === "walk_250") {
        if (p.makkah_access_type !== "walking" || p.makkah_distance_m === null || p.makkah_distance_m > 250) return false;
      }
      if (STATE.distance === "walk_500") {
        if (p.makkah_access_type !== "walking" || p.makkah_distance_m === null || p.makkah_distance_m > 500) return false;
      }

      if (STATE.stars !== "all") {
        const s = p.makkah_stars_int;
        if (STATE.stars === "5" && s !== 5) return false;
        if (STATE.stars === "4" && s !== 4) return false;
        if (STATE.stars === "3" && s !== 3) return false;
        if (STATE.stars === "1-2" && s !== 1 && s !== 2 && s !== null) return false;
      }

      if (STATE.channel !== "all" && p.source_channel !== STATE.channel) return false;

      if (STATE.budgetMax < 8000) {
        const base = p.room_quad_usd ?? p.room_triple_usd ?? p.room_double_usd;
        if (base !== null && base > STATE.budgetMax) return false;
      }

      if (STATE.onlyFullRooms && p.price_completeness !== "full_2_3_4") return false;
      if (STATE.onlyNamedHotel && p.is_generic_hotel) return false;
      if (STATE.only40Vakit && !p._is40V) return false;

      if (STATE.vakit40 !== "all") {
        if (!p._is40V) return false;
        if (STATE.vakit40 === "40v_shuttle" && p.makkah_access_type !== "shuttle") return false;
        if (STATE.vakit40 === "40v_walk" && p.makkah_access_type !== "walking") return false;
      }
      if (STATE.ramadanWindow !== "all" && !matchesRamadanWin(p, STATE.ramadanWindow)) return false;
      if (STATE.sector !== "all") {
        const isDiy = p.source_channel === "diyanet" || /diyanet/i.test(p.agency || "");
        if (STATE.sector === "diyanet" && !isDiy) return false;
        if (STATE.sector === "private" && isDiy) return false;
      }
      if (STATE.zone !== "all" && !(p.makkah_zone_ar || "").includes(STATE.zone)) return false;
      if (STATE.city !== "all") {
        const loc = `${p.departure_hub || ""} ${p.agency_city || ""} ${p.notes_ar || ""}`;
        if (STATE.city === "anatolia") {
          if (/^إسطنبول/.test(p.departure_hub || "") && !/جميع الولايات|عموم الولايات|أنقرة|إزمير|قونية|قيصري|سيواس|توقات|قوجة إيلي|بورصة|ديار بكر|فان|ماردين|غازي عنتاب|طرابزون|أرضروم/.test(loc)) return false;
        } else if (!loc.includes(STATE.city)) {
          return false;
        }
      }
      if (STATE.airline !== "all") {
        const al = `${p.airline || ""}`.toLowerCase();
        if (STATE.airline === "thy" && !/thy|türk|turk|التركية/.test(al)) return false;
        if (STATE.airline === "saudia" && !/saudi|سعود/.test(al)) return false;
        if (STATE.airline === "ajet" && !/ajet|a-jet|anadol/.test(al)) return false;
        if (STATE.airline === "pegasus" && !/pegasus|بيجاسوس/.test(al)) return false;
        if (STATE.airline === "flynas" && !/nas|adeal|ناس/.test(al)) return false;
      }
      if (STATE.madinahHotel !== "all" && p.madinah_hotel_ar !== STATE.madinahHotel) return false;
      if (STATE.nightlyBand !== "all") {
        const [mnN, mxN] = STATE.nightlyBand.split("-").map(Number);
        if (!p._nightlyUsd || p._nightlyUsd < mnN || p._nightlyUsd > mxN) return false;
      }
      if (STATE.makkahNights !== "all") {
        const [mnM, mxM] = STATE.makkahNights.split("-").map(Number);
        if (p._mkNights === null || p._mkNights < mnM || p._mkNights > mxM) return false;
      }
      if (STATE.madinahNights !== "all") {
        const [mnD, mxD] = STATE.madinahNights.split("-").map(Number);
        if (p._mdNights === null || p._mdNights < mnD || p._mdNights > mxD) return false;
      }
      if (STATE.precision !== "all") {
        const isEx = p.date_precision === "exact" || p.date_precision === "exact_date";
        if (STATE.precision === "exact" && !isEx) return false;
        if (STATE.precision === "window" && isEx) return false;
      }
      if (STATE.budgetMin) {
        const base = p.room_quad_usd ?? p.room_triple_usd ?? p.room_double_usd;
        if (!base || base < Number(STATE.budgetMin)) return false;
      }

      return true;
    });
  }

  function sortRows(rows) {
    const arr = rows.slice();
    const byNum = (a, b, desc = false) => {
      const av = a === null || a === undefined ? (desc ? -1 : 999999) : a;
      const bv = b === null || b === undefined ? (desc ? -1 : 999999) : b;
      return desc ? bv - av : av - bv;
    };
    arr.sort((a, b) => {
      if (STATE.sort === "quad_asc") {
        return byNum(a.room_quad_usd ?? a.room_triple_usd, b.room_quad_usd ?? b.room_triple_usd, false);
      }
      if (STATE.sort === "quad_desc") {
        return byNum(a.room_quad_usd ?? a.room_triple_usd, b.room_quad_usd ?? b.room_triple_usd, true);
      }
      if (STATE.sort === "dist_asc") {
        return byNum(a.makkah_distance_m ?? (a.makkah_access_type === "walking" ? 900 : 8000), b.makkah_distance_m ?? (b.makkah_access_type === "walking" ? 900 : 8000), false);
      }
      if (STATE.sort === "days_desc") {
        return byNum(a.days, b.days, true);
      }
      if (STATE.sort === "days_asc") {
        return byNum(a.days, b.days, false);
      }
      if (STATE.sort === "nightly_asc") {
        return byNum(a._nightlyUsd, b._nightlyUsd, false);
      }
      if (STATE.sort === "madinah_desc") {
        return byNum(a._mdNights, b._mdNights, true);
      }
      // date_asc
      const da = a.dep_date || a.month_key || "9999";
      const db = b.dep_date || b.month_key || "9999";
      if (da !== db) return da.localeCompare(db);
      return byNum(a.room_quad_usd, b.room_quad_usd, false);
    });
    return arr;
  }

  function renderMonthPills() {
    const box = document.getElementById("monthPills");
    const basePool = applyFilters(true);
    const byM = {};
    basePool.forEach((p) => {
      const cell = byM[p.month_key] || { count: 0, ag: new Set() };
      cell.count += 1;
      if (p.agency) cell.ag.add(p.agency);
      byM[p.month_key] = cell;
    });

    const allAg = new Set(basePool.map((p) => p.agency).filter(Boolean));
    let html = `
      <button type="button" class="month-pill-btn ${STATE.month === "all" ? "active" : ""}" data-month="all">
        <span class="month-pill-title">كامل الموسم (8 أشهر)</span>
        <span class="month-pill-sub">${fmtInt(basePool.length)} عرض | ${allAg.size} شركة</span>
        <span class="month-sparkbar"><span class="month-spark-fill heat-mid" style="width:72%;"></span></span>
      </button>`;

    MONTHS_ORDER.forEach((m) => {
      const info = byM[m.key] || { count: 0, ag: new Set() };
      const h = MONTH_HEAT.get(m.key) || { pct: 18, heatCls: "heat-closed" };
      html += `
        <button type="button" class="month-pill-btn ${STATE.month === m.key ? "active" : ""}" data-month="${m.key}">
          <span class="month-pill-title">${m.title}</span>
          <span class="month-pill-sub">${info.count} عرض | ${info.ag.size} شركة</span>
          <span class="month-sparkbar"><span class="month-spark-fill ${h.heatCls}" style="width:${h.pct}%;"></span></span>
        </button>`;
    });

    box.innerHTML = html;
    box.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyMonthSelection(btn.dataset.month);
      });
    });

    // Update active preset, scenario & channel pill states
    document.querySelectorAll("#seasonPresets .preset-chip").forEach((el) => {
      el.classList.toggle("active", el.dataset.preset === STATE.preset);
    });
    document.querySelectorAll("#channelPills .filter-pill").forEach((el) => {
      el.classList.toggle("active", el.dataset.channel === STATE.channel);
    });
    document.querySelectorAll("#decisionScenarios .scenario-chip").forEach((el) => {
      el.classList.toggle("active", el.dataset.scenario === STATE.scenario);
    });
    updateFilterBadge();
  }

  function renderKpis(rows) {
    const kpiBox = document.getElementById("kpiSection");
    const agencies = new Set(rows.map((r) => r.agency).filter(Boolean));
    const walkRows = rows.filter((r) => r.makkah_access_type === "walking");
    const walkPct = rows.length ? Math.round((walkRows.length / rows.length) * 100) : 0;
    const quads = rows.map((r) => r.room_quad_usd).filter((v) => typeof v === "number");
    const triples = rows.map((r) => r.room_triple_usd).filter((v) => typeof v === "number");
    const doubles = rows.map((r) => r.room_double_usd).filter((v) => typeof v === "number");
    const socialDirect = rows.filter((r) => ["instagram", "facebook", "agency_web", "diyanet"].includes(r.source_channel)).length;
    const qMin = quads.length ? Math.min(...quads) : null;
    const qMax = quads.length ? Math.max(...quads) : null;

    const cards = [
      {
        label: "العروض والشركات في الفلتر النشط",
        value: `${fmtInt(rows.length)} عرض`,
        note: `تغطي ${fmtInt(agencies.size)} شركة سياحية تركية مختلفة`,
      },
      {
        label: "وسيط الغرفة الرباعية (4 أشخاص)",
        value: fmtPrice(median(quads)),
        note: qMin !== null ? `النطاق: ${fmtPrice(qMin)} إلى ${fmtPrice(qMax)}` : "لا توجد أسعار رباعية في الفلتر",
      },
      {
        label: "وسيط الثلاثية والثنائية (3 و2)",
        value: `${fmtPrice(median(triples))} / ${fmtPrice(median(doubles))}`,
        note: `${fmtInt(doubles.length)} عرضًا بتسعير ثنائي معلن صراحة`,
      },
      {
        label: "حصة فنادق المشي للحرم والمصادر",
        value: `${walkPct}% مشي للحرم`,
        note: `${fmtInt(walkRows.length)} عرض مشي | ${fmtInt(socialDirect)} من IG/FB ومواقع الشركات`,
      },
    ];

    kpiBox.innerHTML = cards
      .map(
        (c) => `
      <div class="kpi-card">
        <div class="kpi-label">${esc(c.label)}</div>
        <div class="kpi-value">${esc(c.value)}</div>
        <div class="kpi-note">${esc(c.note)}</div>
      </div>`
      )
      .join("");
  }

  function renderHotelSpotlight(rows) {
    const box = document.getElementById("hotelSpotlight");
    const activeHotelFilter = STATE.hotelId !== "all" || STATE.hotelSearch.length >= 2;
    if (!activeHotelFilter || !rows.length) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    const sample = rows[0];
    const uniqueHotels = new Set(rows.map((r) => r.makkah_hotel_ar));
    const title =
      STATE.hotelId !== "all" || uniqueHotels.size === 1
        ? `${sample.makkah_hotel_ar} (${sample.makkah_hotel_en_tr || ""})`
        : `نتائج مطابقة الفندق للبحث: "${STATE.hotelSearch}" (${uniqueHotels.size} فندقًا)`;

    const quads = rows.map((r) => r.room_quad_usd).filter((v) => typeof v === "number");
    const triples = rows.map((r) => r.room_triple_usd).filter((v) => typeof v === "number");
    const doubles = rows.map((r) => r.room_double_usd).filter((v) => typeof v === "number");
    const agencies = Array.from(new Set(rows.map((r) => r.agency).filter(Boolean)));

    box.style.display = "block";
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <strong style="font-size:1rem; color:var(--emerald);">${esc(title)}</strong>
          <div class="card-sub">
            التصنيف: ${esc(sample.makkah_stars_ar)} | القرب من الحرم: ${esc(fmtDist(sample.makkah_distance_m, sample.makkah_access_type))} (${esc(sample.makkah_zone_ar)})
          </div>
        </div>
        <span class="${sample.makkah_access_type === "walking" ? "badge-walk" : "badge-shuttle"}">
          ${sample.makkah_access_type === "walking" ? "مشي للحرم" : "شتل"}
        </span>
      </div>
      <div class="hotel-spotlight-grid">
        <div class="spot-stat">
          <div class="spot-stat-label">أرخص – وسيط – أعلى (رباعي)</div>
          <div class="spot-stat-val">${
            quads.length
              ? `<span dir="rtl" style="display:inline-flex;gap:5px;flex-wrap:wrap;align-items:center;"><span class="num" dir="ltr">${esc(fmtPrice(Math.min(...quads)))}</span><span>–</span><span class="num" dir="ltr">${esc(fmtPrice(median(quads)))}</span><span>–</span><span class="num" dir="ltr">${esc(fmtPrice(Math.max(...quads)))}</span></span>`
              : "غير معلن"
          }</div>
        </div>
        <div class="spot-stat">
          <div class="spot-stat-label">الوسيط (ثلاثي)</div>
          <div class="spot-stat-val">${fmtPrice(median(triples))}</div>
        </div>
        <div class="spot-stat">
          <div class="spot-stat-label">الوسيط (ثنائي)</div>
          <div class="spot-stat-val">${fmtPrice(median(doubles))}</div>
        </div>
        <div class="spot-stat">
          <div class="spot-stat-label">الشركات المعلنة (${agencies.length})</div>
          <div class="spot-stat-val" style="font-size:0.78rem; color:var(--ink); font-weight:600;">${esc(agencies.slice(0, 6).join("، "))}${agencies.length > 6 ? " ..." : ""}</div>
        </div>
      </div>`;
  }

  function renderMonthlyChart() {
    const box = document.getElementById("monthlyChartBox");
    const driverBox = document.getElementById("seasonDriversNote");
    driverBox.textContent = SEASON_DRIVERS[STATE.month] || SEASON_DRIVERS["all"];

    // Compute per-month medians for 3 duration tiers respecting non-month/non-tier filters
    const qFilter = trNorm(STATE.hotelSearch);
    const pool = PACKAGES.filter((p) => {
      if (STATE.agency !== "all" && p.agency !== STATE.agency) return false;
      if (STATE.hotelId !== "all" && p.makkah_hotel_id !== STATE.hotelId) return false;
      if (qFilter && !trNorm(`${p.makkah_hotel_ar} ${p.makkah_hotel_en_tr} ${p.makkah_hotel_raw}`).includes(qFilter)) return false;
      if (STATE.distance === "walking" && p.makkah_access_type !== "walking") return false;
      if (STATE.distance === "shuttle" && p.makkah_access_type !== "shuttle") return false;
      return true;
    });

    const tiers = [
      { key: "7-10", label: "7–10 أيام", color: "#0c4b33" },
      { key: "11-16", label: "11–16 يومًا", color: "#b8860b" },
      { key: "17-40", label: "17–40 يومًا", color: "#8c2f39" },
    ];

    const seriesData = tiers.map((t) => {
      const pts = MONTHS_ORDER.map((m, idx) => {
        const vals = pool
          .filter((p) => p.month_key === m.key && p.duration_band === t.key && typeof p.room_quad_usd === "number")
          .map((p) => p.room_quad_usd);
        return { idx, month: m.key, fullTitle: m.title, title: m.title.split(" ")[0], val: median(vals), count: vals.length };
      });
      return { ...t, pts };
    });

    const allVals = seriesData.flatMap((s) => s.pts.map((p) => p.val).filter((v) => v !== null));
    if (!allVals.length) {
      box.innerHTML = `<div class="footnote">لا توجد بيانات كافية لرسم المنحنى تحت الفلتر الحالي.</div>`;
      return;
    }

    const maxV = Math.max(...allVals, 3000);
    const minV = Math.max(0, Math.floor(Math.min(...allVals) * 0.8));
    const isCompact = window.innerWidth <= 640;
    const W = isCompact ? 356 : 560;
    const H = isCompact ? 232 : 254;
    const padL = isCompact ? (STATE.currency === "TRY" ? 64 : 56) : (STATE.currency === "TRY" ? 68 : 58);
    const padR = isCompact ? 18 : 26;
    const padT = 18;
    const padB = isCompact ? 40 : 44;
    const tickFs = isCompact ? 13 : 11.5;
    const xFs = isCompact ? 12.8 : 11.5;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const xPos = (i) => padL + (i / (MONTHS_ORDER.length - 1)) * plotW;
    const yPos = (v) => padT + plotH - ((v - minV) / Math.max(1, maxV - minV)) * plotH;

    let gridSvg = "";
    for (let g = 0; g <= 4; g++) {
      const val = Math.round(minV + ((maxV - minV) * g) / 4);
      const y = yPos(val);
      gridSvg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e7e1d5" stroke-dasharray="3 3" />`;
      gridSvg += `<text x="${padL - 7}" y="${y + 4}" direction="ltr" text-anchor="end" font-size="${tickFs}" fill="#6b6457">${STATE.currency === "TRY" ? fmtInt(val * STATE.fxRate) : "$" + fmtInt(val)}</text>`;
    }

    let xLabelsSvg = MONTHS_ORDER.map((m, i) => {
      const x = xPos(i);
      const active = STATE.month === m.key;
      const lbl = m.title.split(" ")[0];
      return `<text x="${x}" y="${H - 12}" text-anchor="middle" font-size="${xFs}" font-weight="${active ? "800" : "600"}" fill="${active ? "#0c4b33" : "#5c564a"}">${esc(lbl)}</text>`;
    }).join("");

    let linesSvg = "";
    seriesData.forEach((s) => {
      const focused = STATE.chartTier === "all" || STATE.chartTier === s.key;
      const op = focused ? "1" : "0.18";
      const sw = STATE.chartTier === s.key ? "3.1" : "2.3";
      const valid = s.pts.filter((p) => p.val !== null);
      if (valid.length >= 2) {
        const d = valid.map((p, k) => `${k === 0 ? "M" : "L"}${xPos(p.idx).toFixed(1)},${yPos(p.val).toFixed(1)}`).join(" ");
        linesSvg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}" />`;
      }
      valid.forEach((p) => {
        linesSvg += `<circle cx="${xPos(p.idx).toFixed(1)}" cy="${yPos(p.val).toFixed(1)}" r="${focused ? "4.2" : "3"}" fill="${s.color}" stroke="#fff" stroke-width="1.3" opacity="${op}"><title>${esc(s.label)} — ${esc(p.title)}: ${esc(fmtPrice(p.val))} (${p.count} عرض)</title></circle>`;
      });
    });

    const defIdx = Math.max(0, MONTHS_ORDER.findIndex((m) => m.key === (STATE.month !== "all" ? STATE.month : "2027-03")));
    const scrubX = xPos(defIdx).toFixed(1);

    const legendHtml = tiers
      .map(
        (t) => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:700;opacity:${STATE.chartTier === "all" || STATE.chartTier === t.key ? "1" : "0.45"};"><span style="width:12px;height:3px;background:${t.color};display:inline-block;border-radius:2px;"></span>${esc(t.label)}</span>`
      )
      .join("");

    const focusPillsHtml = [
      { key: "all", label: "الكل" },
      { key: "7-10", label: "7–10" },
      { key: "11-16", label: "11–16" },
      { key: "17-40", label: "17–40" },
    ]
      .map((f) => `<button type="button" class="tier-focus-btn ${STATE.chartTier === f.key ? "active" : ""}" data-chart-tier="${f.key}">${f.label}</button>`)
      .join("");

    box.innerHTML = `
      <div class="chart-toolbar">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">${legendHtml}</div>
        <div class="tier-focus-pills" role="group" aria-label="تمييز شريحة المدة">${focusPillsHtml}</div>
      </div>
      <div id="chartHudBar" class="chart-hud-bar"></div>
      <svg id="chartScrubSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;touch-action:pan-y;" role="img" aria-label="تطور أسعار العمرة عبر الشهور الثلاثية">
        ${gridSvg}${xLabelsSvg}
        <line id="chartScrubLine" x1="${scrubX}" y1="${padT}" x2="${scrubX}" y2="${H - padB}" stroke="#c99738" stroke-width="1.4" stroke-dasharray="4 3" />
        ${linesSvg}
      </svg>`;

    const updateHud = (idx) => {
      const m = MONTHS_ORDER[idx] || MONTHS_ORDER[0];
      const hud = document.getElementById("chartHudBar");
      const line = document.getElementById("chartScrubLine");
      if (line) {
        const nx = xPos(idx).toFixed(1);
        line.setAttribute("x1", nx);
        line.setAttribute("x2", nx);
      }
      if (!hud) return;
      const vals = seriesData
        .map((s) => {
          const pt = s.pts[idx];
          const vStr = pt && pt.val !== null ? fmtPrice(pt.val) : "—";
          return `<span style="color:${s.color};">${esc(s.label)}: <span class="num" dir="ltr">${esc(vStr)}</span></span>`;
        })
        .join(" · ");
      hud.innerHTML = `<strong>${esc(m.title)}</strong><div class="chart-hud-vals">${vals}</div>`;
    };

    updateHud(defIdx);

    box.querySelectorAll("[data-chart-tier]").forEach((btn) => {
      btn.addEventListener("click", () => {
        STATE.chartTier = btn.dataset.chartTier;
        renderMonthlyChart();
      });
    });

    const svgEl = document.getElementById("chartScrubSvg");
    if (svgEl) {
      const scrubAtClientX = (clientX) => {
        const rect = svgEl.getBoundingClientRect();
        if (!rect.width) return;
        const svgX = ((clientX - rect.left) / rect.width) * W;
        const ratio = Math.max(0, Math.min(1, (svgX - padL) / Math.max(1, plotW)));
        const idx = Math.round(ratio * (MONTHS_ORDER.length - 1));
        updateHud(idx);
      };
      svgEl.addEventListener("mousemove", (e) => scrubAtClientX(e.clientX));
      svgEl.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) scrubAtClientX(e.touches[0].clientX);
      }, { passive: true });
      svgEl.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) scrubAtClientX(e.touches[0].clientX);
      }, { passive: true });
    }
  }

  function renderHotelLadder(rows) {
    const box = document.getElementById("hotelLadderBox");
    const byH = {};
    rows.forEach((p) => {
      if (p.makkah_access_type !== "walking" || p.is_generic_hotel || typeof p.room_quad_usd !== "number") return;
      const cur = byH[p.makkah_hotel_id] || {
        id: p.makkah_hotel_id,
        name: p.makkah_hotel_ar,
        stars: p.makkah_stars_ar,
        dist: p.makkah_distance_m,
        quads: [],
        agencies: new Set(),
      };
      cur.quads.push(p.room_quad_usd);
      if (p.agency) cur.agencies.add(p.agency);
      byH[p.makkah_hotel_id] = cur;
    });

    const items = Object.values(byH)
      .filter((x) => x.quads.length >= 1)
      .map((x) => ({
        ...x,
        min: Math.min(...x.quads),
        med: median(x.quads),
        max: Math.max(...x.quads),
        agCount: x.agencies.size,
      }))
      .sort((a, b) => b.quads.length - a.quads.length || (a.dist ?? 999) - (b.dist ?? 999))
      .slice(0, 10);

    if (!items.length) {
      box.innerHTML = `<div class="footnote">لا توجد فنادق مشي مسماة بأسعار رباعية ضمن هذا التحديد؛ وسّع الفلتر لعرض السلم الفندقي الكامل.</div>`;
      return;
    }

    const globalMax = Math.max(...items.map((x) => x.max), 2500);
    box.innerHTML = items
      .map((h) => {
        const leftPct = Math.round((h.min / globalMax) * 100);
        const widthPct = Math.max(4, Math.round(((h.max - h.min) / globalMax) * 100));
        const medPct = Math.round((h.med / globalMax) * 100);
        return `
          <div class="ladder-row" data-hotel-id="${esc(h.id)}" style="cursor:pointer;padding:6px 4px;border-bottom:1px dashed var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:4px;">
              <span style="font-size:0.81rem;font-weight:700;color:var(--ink);">${esc(h.name)}</span>
              <span style="font-size:0.74rem;color:var(--muted);white-space:nowrap;">${esc(h.stars)} | ${esc(fmtDist(h.dist, "walking"))} | ${h.agCount} شركة</span>
            </div>
            <div style="position:relative;height:14px;background:#f2eee4;border-radius:999px;overflow:hidden;">
              <div style="position:absolute;left:${leftPct}%;width:${widthPct}%;top:2px;bottom:2px;background:rgba(12,75,51,0.28);border-radius:999px;"></div>
              <div title="الوسيط: ${esc(fmtPrice(h.med))}" style="position:absolute;left:calc(${medPct}% - 4px);top:1px;width:8px;height:12px;background:#0c4b33;border-radius:4px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.71rem;color:var(--muted);margin-top:2px;">
              <span>الأدنى: ${esc(fmtPrice(h.min))}</span>
              <strong style="color:var(--emerald);">الوسيط: ${esc(fmtPrice(h.med))} (${h.quads.length >= 11 ? h.quads.length + " عرضًا" : h.quads.length + " عروض"})</strong>
              <span>الأعلى: ${esc(fmtPrice(h.max))}</span>
            </div>
          </div>`;
      })
      .join("");

    box.querySelectorAll(".ladder-row").forEach((rowEl) => {
      rowEl.addEventListener("click", () => {
        const hid = rowEl.dataset.hotelId;
        STATE.hotelId = STATE.hotelId === hid ? "all" : hid;
        STATE.hotelSearch = "";
        document.getElementById("hotelSearchInput").value = "";
        document.getElementById("hotelSelect").value = STATE.hotelId;
        STATE.shownLimit = PAGE_SIZE;
        renderAll();
      });
    });
  }

  function renderShawwalBanner() {
    const banner = document.getElementById("shawwalCutoffBanner");
    if (!banner) return;
    if (STATE.month !== "2027-04" && STATE.preset !== "shawwal") {
      banner.style.display = "none";
      banner.innerHTML = "";
      return;
    }

    const retAprilCount = PACKAGES.filter((p) => p.ret_date && p.ret_date >= "2027-04-01").length;
    const allShawwalCount = PACKAGES.filter((p) => p.dep_date && p.dep_date >= "2027-03-10" && p.dep_date <= "2027-03-25").length;

    banner.style.display = "block";
    if (STATE.month === "2027-04") {
      banner.innerHTML = `
        <div class="shawwal-banner-head">
          <h3 class="shawwal-banner-title">نافذة الإغلاق الرسمي لعمرة 1448 هـ (شوال — أبريل 2027)</h3>
          <span class="shawwal-cutoff-pill">آخر تأشيرة: 9 مارس · آخر دخول: 23 مارس · آخر خروج: 7 أبريل 2027</span>
        </div>
        <p class="shawwal-banner-desc">بحسب الجدول التنظيمي السعودي لموسم 1448 هـ، تتوقف رحلات الدخول الجديدة قبل 1 أبريل 2027 (لذلك تسجل إقلاعات أبريل الجديدة 0 عروض)، بينما تتاح مغادرات شوال الفعلية بين 10 و25 مارس 2027 وتمتد عودة جزء كبير منها إلى أول أسبوع من أبريل.</p>
        <div class="shawwal-toggle-row" role="group" aria-label="تبديل عرض نهاية شوال وأبريل">
          <button type="button" class="shawwal-toggle-btn ${STATE.lateShawwalView === "off" ? "active" : ""}" data-shawwal-mode="off">إقلاعات أبريل فقط (0 رحلات جديدة)</button>
          <button type="button" class="shawwal-toggle-btn ${STATE.lateShawwalView === "return_april" ? "active" : ""}" data-shawwal-mode="return_april">رحلات شوال العائدة في أبريل (${fmtInt(retAprilCount)} عرضًا)</button>
          <button type="button" class="shawwal-toggle-btn ${STATE.lateShawwalView === "all_shawwal" ? "active" : ""}" data-shawwal-mode="all_shawwal">كافة مغادرات شوال المتاحة (${fmtInt(allShawwalCount)} عرضًا)</button>
        </div>
      `;
      banner.querySelectorAll("[data-shawwal-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          STATE.lateShawwalView = btn.dataset.shawwalMode;
          STATE.shownLimit = PAGE_SIZE;
          renderAll();
        });
      });
    } else {
      banner.innerHTML = `
        <div class="shawwal-banner-head">
          <h3 class="shawwal-banner-title">فترة شوال 1448 هـ (10 مارس – 7 أبريل 2027)</h3>
          <span class="shawwal-cutoff-pill">آخر دخول 23 مارس · آخر خروج 7 أبريل 2027</span>
        </div>
        <p class="shawwal-banner-desc">تعرض القائمة مغادرات شوال المنطلقة من 10 إلى 23 مارس 2027 (قبل إغلاق الدخول في 23 مارس)، منها ${fmtInt(retAprilCount)} برنامجًا تمتد إقامته وعودته إلى أبريل 2027.</p>
        <div class="shawwal-toggle-row">
          <button type="button" class="shawwal-toggle-btn" id="jumpReturnAprilBtn">فرز العائد في أبريل 2027 (${fmtInt(retAprilCount)} عرضًا)</button>
        </div>
      `;
      const jmp = document.getElementById("jumpReturnAprilBtn");
      if (jmp) {
        jmp.addEventListener("click", () => {
          STATE.month = "2027-04";
          STATE.preset = "month_2027-04";
          STATE.lateShawwalView = "return_april";
          STATE.dateFrom = "2027-04-01";
          STATE.dateTo = "2027-04-08";
          document.getElementById("dateFromInput").value = STATE.dateFrom;
          document.getElementById("dateToInput").value = STATE.dateTo;
          STATE.shownLimit = PAGE_SIZE;
          renderAll();
        });
      }
    }
  }

  function renderCoverageMatrix() {
    const box = document.getElementById("coverageMatrixBox");
    const tiers = [
      { key: "7-10", short: "7–10 ي" },
      { key: "11-16", short: "11–16 ي" },
      { key: "17-40", short: "17–40 ي" },
    ];

    const deskRows = [];
    const mobCards = [];

    MONTHS_ORDER.forEach((m) => {
      const deskCells = [];
      const mobTiles = [];

      tiers.forEach((t) => {
        const subset = PACKAGES.filter((p) => p.month_key === m.key && p.duration_band === t.key);
        const agAll = new Set(subset.map((p) => p.agency).filter(Boolean));
        const walkAg = new Set(subset.filter((p) => p.makkah_access_type === "walking").map((p) => p.agency).filter(Boolean));
        const medQ = median(subset.map((p) => p.room_quad_usd));
        const active = STATE.month === m.key && STATE.tier === t.key;
        const isAprilCutoff = m.key === "2027-04" && subset.length === 0;
        const heatCls = heatClassForMedian(medQ, isAprilCutoff);
        const mainCell = isAprilCutoff ? "إغلاق 1448" : (medQ !== null ? esc(fmtPrice(medQ)) : "—");
        const subCell = isAprilCutoff
          ? "0 إقلاع جديد · عودة مارس–أبريل"
          : `${agAll.size} شركة (${walkAg.size} مشي) · ${subset.length} عرض`;

        deskCells.push(`
          <td class="matrix-cell ${heatCls}" data-m="${m.key}" data-t="${t.key}" style="${active ? "outline:2px solid var(--emerald);" : ""}">
            <span class="matrix-cell-main">${mainCell}</span>
            <span class="matrix-cell-sub">${subCell}</span>
          </td>`);

        mobTiles.push(`
          <button type="button" class="matrix-mobile-tile ${heatCls} ${active ? "active" : ""}" data-m="${m.key}" data-t="${t.key}">
            <span class="matrix-tile-band">${t.short}</span>
            <span class="matrix-tile-price">${mainCell}</span>
            <span class="matrix-tile-meta">${isAprilCutoff ? "0 إقلاع" : `${agAll.size} شركة`}</span>
          </button>`);
      });

      deskRows.push(`<tr>
        <td><strong>${esc(m.title)}</strong><div class="matrix-cell-sub">${esc(m.sub)}</div></td>
        ${deskCells.join("")}
      </tr>`);

      mobCards.push(`
        <article class="matrix-month-card">
          <div class="matrix-month-head">
            <span class="matrix-month-title">${esc(m.title)}</span>
            <span class="matrix-month-sub">${esc(m.sub)}</span>
          </div>
          <div class="matrix-tier-tiles">${mobTiles.join("")}</div>
        </article>`);
    });

    box.innerHTML = `
      <div class="matrix-desktop-table">
        <table class="data-table matrix-table">
          <thead>
            <tr>
              <th>الشهر / المحطة الموسمية</th>
              <th style="text-align:center;">7–10 أيام (برامج قصيرة)</th>
              <th style="text-align:center;">11–16 يومًا (برامج متوسطة)</th>
              <th style="text-align:center;">17–40 يومًا (برامج طويلة)</th>
            </tr>
          </thead>
          <tbody>${deskRows.join("")}</tbody>
        </table>
      </div>
      <div class="matrix-mobile-cards">${mobCards.join("")}</div>`;

    box.querySelectorAll(".matrix-cell, .matrix-mobile-tile").forEach((cell) => {
      cell.addEventListener("click", () => {
        applyMonthSelection(cell.dataset.m, cell.dataset.t);
        document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderResultsOnly() {
    FILTERED = sortRows(applyFilters(false));
    const slice = FILTERED.slice(0, STATE.shownLimit);

    const summary = document.getElementById("resultsSummaryText");
    const agencies = new Set(FILTERED.map((p) => p.agency).filter(Boolean)).size;
    summary.textContent = `عرض ${fmtInt(slice.length)} من أصل ${fmtInt(FILTERED.length)} برنامجًا مطابقًا عبر ${fmtInt(agencies)} شركة تركية.`;

    const deskWrap = document.getElementById("desktopTableWrap");
    const mobWrap = document.getElementById("mobileCardsWrap");

    if (!slice.length) {
      let empty = `<div class="footnote" style="padding:16px;">لا توجد نتائج مطابقة لهذا المزيج من الفلاتر. جرّب توسيع سقف الميزانية أو تغيير نوع الوصول للحرم أو مسح البحث.</div>`;
      if (STATE.month === "2027-04" && STATE.lateShawwalView === "off") {
        const retAprilCount = PACKAGES.filter((p) => p.ret_date && p.ret_date >= "2027-04-01").length;
        const allShawwalCount = PACKAGES.filter((p) => p.dep_date && p.dep_date >= "2027-03-10" && p.dep_date <= "2027-03-25").length;
        empty = `
          <div class="shawwal-banner" style="padding:18px; border-radius:12px;">
            <h4 style="margin:0 0 8px;color:#7c2d12;">توقف الإقلاعات الجديدة في أبريل 2027 وفق تقويم العمرة السعودي 1448 هـ</h4>
            <p class="shawwal-banner-desc">آخر يوم لإصدار تأشيرات عمرة 1448 هو 9 مارس 2027، وآخر دخول 23 مارس 2027، وآخر خروج 7 أبريل 2027؛ لذلك لا توجد رحلات ذهاب جديدة بتاريخ أبريل. يمكنك استعراض رحلات شوال التي تغادر في مارس وتعود في أبريل أو كافة مغادرات شوال المتاحة:</p>
            <div class="shawwal-toggle-row">
              <button type="button" class="shawwal-toggle-btn" data-quick-shawwal="return_april">عرض الرحلات العائدة في أبريل (${fmtInt(retAprilCount)} عرضًا)</button>
              <button type="button" class="shawwal-toggle-btn" data-quick-shawwal="all_shawwal">عرض كافة مغادرات شوال (${fmtInt(allShawwalCount)} عرضًا)</button>
            </div>
          </div>`;
      }
      deskWrap.innerHTML = empty;
      mobWrap.innerHTML = empty;
      document.querySelectorAll("[data-quick-shawwal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          STATE.lateShawwalView = btn.dataset.quickShawwal;
          STATE.shownLimit = PAGE_SIZE;
          renderAll();
        });
      });
      document.getElementById("paginationWrap").innerHTML = "";
      return;
    }

    deskWrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>الشهر والتواريخ</th>
            <th>الشركة والمنطلق</th>
            <th>المدة</th>
            <th>فندق مكة والنجوم والقرب</th>
            <th>فندق المدينة</th>
            <th class="num">4 أشخاص</th>
            <th class="num">3 أشخاص</th>
            <th class="num">2 شخص</th>
            <th>المصدر والمقارنة</th>
          </tr>
        </thead>
        <tbody>
          ${slice
            .map((p) => {
              const dateTxt = p.dep_date
                ? p.ret_date
                  ? `${p.dep_date} ← ${p.ret_date}`
                  : p.dep_date
                : p.month_key;
              const dateBadge = p.date_precision === "month_window" ? "نافذة الشهر" : "";
              const accessBadge =
                p.makkah_access_type === "walking"
                  ? `<span class="badge-walk">مشي ${esc(fmtDist(p.makkah_distance_m, "walking"))}</span>`
                  : `<span class="badge-shuttle">شتل ${esc(fmtDist(p.makkah_distance_m, "shuttle"))}</span>`;
              const origNote =
                p.original_currency && p.original_currency !== "USD" && p.original_prices && p.original_prices.quad
                  ? `<div class="matrix-cell-sub">(${fmtInt(p.original_prices.quad)} ${esc(p.original_currency)})</div>`
                  : "";
              const lens = getPkgValueLens(p);
              const perNightDesk = lens.perNightUsd ? `<div class="matrix-cell-sub">${esc(fmtPrice(lens.perNightUsd))} / ليلة</div>` : "";
              const isPinned = STATE.compareIds.includes(p.id);
              const safeUrl = p.source_url && /^https?:\/\//i.test(p.source_url) ? p.source_url : "";
              const linkHtml = safeUrl
                ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" class="ext-link" onclick="event.stopPropagation();">فتح المصدر</a>`
                : `<span class="matrix-cell-sub">بدون رابط</span>`;

              return `
                <tr class="pkg-row" data-id="${esc(p.id)}" style="cursor:pointer;">
                  <td>
                    <strong>${esc(dateTxt)}</strong>
                    ${dateBadge ? `<span class="matrix-cell-sub">${esc(dateBadge)}</span>` : ""}
                  </td>
                  <td>
                    <strong>${esc(p.agency)}</strong>
                    <span class="matrix-cell-sub">${esc(p.departure_hub || p.agency_city || "تركيا")}</span>
                  </td>
                  <td>
                    <strong>${p.days ? p.days + " يومًا" : tierLabel(p.duration_band)}</strong>
                    <span class="matrix-cell-sub">${esc(tierLabel(p.duration_band))}</span>
                  </td>
                  <td>
                    <div><strong>${esc(p.makkah_hotel_ar)}</strong></div>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px;">
                      <span class="badge-stars">${esc(p.makkah_stars_ar)}</span>
                      ${accessBadge}
                      ${p._is40V ? `<span class="badge-walk">40 صلاة بالمدينة</span>` : ""}
                    </div>
                  </td>
                  <td>
                    <div>${esc(p.madinah_hotel_ar || "غير محدد بالإعلان")}</div>
                    ${p._mdNights ? `<span class="matrix-cell-sub">${esc(p._mkNights + " مكة + " + p._mdNights + " المدينة")}</span>` : ""}
                  </td>
                  <td class="num">
                    <strong>${esc(fmtPrice(p.room_quad_usd))}</strong>
                    ${origNote}${perNightDesk}
                    ${lens.deltaPill ? `<div style="margin-top:3px;">${lens.deltaPill}</div>` : ""}
                  </td>
                  <td class="num">${esc(fmtPrice(p.room_triple_usd))}</td>
                  <td class="num">${esc(fmtPrice(p.room_double_usd))}</td>
                  <td>
                    <div>${channelBadge(p.source_channel)}</div>
                    <div style="margin-top:5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                      ${linkHtml}
                      <button type="button" class="compare-pin-btn ${isPinned ? "active" : ""}" data-compare-id="${esc(p.id)}">${isPinned ? "في المقارنة" : "+ قارن"}</button>
                    </div>
                  </td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;

    mobWrap.innerHTML = slice
      .map((p) => {
        const accessBadge =
          p.makkah_access_type === "walking"
            ? `<span class="badge-walk">مشي ${esc(fmtDist(p.makkah_distance_m, "walking"))}</span>`
            : `<span class="badge-shuttle">شتل ${esc(fmtDist(p.makkah_distance_m, "shuttle"))}</span>`;
        const lens = getPkgValueLens(p);
        const isPinned = STATE.compareIds.includes(p.id);
        const origSub =
          p.original_currency && p.original_currency !== "USD" && p.original_prices && p.original_prices.quad
            ? `<div class="price-box-sub">(${fmtInt(p.original_prices.quad)} ${esc(p.original_currency)})</div>`
            : "";
        const safeUrl = p.source_url && /^https?:\/\//i.test(p.source_url) ? p.source_url : "";
        return `
          <article class="pkg-card" data-id="${esc(p.id)}">
            <div class="pkg-card-head">
              <div>
                <strong style="font-size:0.95rem;">${esc(p.agency)}</strong>
                <div class="matrix-cell-sub">${esc(p.dep_date || p.month_key)}${p.ret_date ? " ← " + esc(p.ret_date) : ""} | ${p.days ? p.days + " يومًا" : esc(tierLabel(p.duration_band))}</div>
              </div>
              ${channelBadge(p.source_channel)}
            </div>
            <div>
              <div class="pkg-hotel-title">مكة: ${esc(p.makkah_hotel_ar)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                <span class="badge-stars">${esc(p.makkah_stars_ar)}</span>
                ${accessBadge}
                ${p._is40V ? `<span class="badge-walk">40 صلاة</span>` : ""}
              </div>
              <div class="matrix-cell-sub" style="margin-top:4px;">المدينة: ${esc(p.madinah_hotel_ar || "غير محدد بالإعلان")}${p._mdNights ? " (" + esc(p._mkNights + "م+" + p._mdNights + "مد") + ")" : ""}</div>
            </div>
            <div class="pkg-lens-row">
              ${lens.perNightUsd ? `<span class="val-pill is-mid">${esc(fmtPrice(lens.perNightUsd))} / ليلة</span>` : ""}
              ${lens.deltaPill}
            </div>
            <div class="pkg-card-prices">
              <div>
                <div class="price-box-lbl">4 أشخاص</div>
                <div class="price-box-val ${p.room_quad_usd === null ? "na" : ""}">${esc(fmtPrice(p.room_quad_usd))}</div>
                ${origSub}
              </div>
              <div>
                <div class="price-box-lbl">3 أشخاص</div>
                <div class="price-box-val ${p.room_triple_usd === null ? "na" : ""}">${esc(fmtPrice(p.room_triple_usd))}</div>
              </div>
              <div>
                <div class="price-box-lbl">2 شخص</div>
                <div class="price-box-val ${p.room_double_usd === null ? "na" : ""}">${esc(fmtPrice(p.room_double_usd))}</div>
              </div>
            </div>
            <div class="pkg-card-footer">
              <button type="button" class="pkg-detail-btn">التفاصيل</button>
              <button type="button" class="compare-pin-btn ${isPinned ? "active" : ""}" data-compare-id="${esc(p.id)}">${isPinned ? "في المقارنة" : "+ قارن"}</button>
              ${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" class="ext-link" onclick="event.stopPropagation();">رابط المصدر ↗</a>` : `<span class="matrix-cell-sub">—</span>`}
            </div>
          </article>`;
      })
      .join("");

    deskWrap.querySelectorAll("tr.pkg-row").forEach((tr) => {
      tr.addEventListener("click", () => openPackageDrawer(tr.dataset.id));
    });
    mobWrap.querySelectorAll(".pkg-card").forEach((card) => {
      card.addEventListener("click", () => openPackageDrawer(card.dataset.id));
    });
    document.querySelectorAll("[data-compare-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCompareId(btn.dataset.compareId);
      });
    });

    // Pagination
    const pagBox = document.getElementById("paginationWrap");
    if (FILTERED.length > slice.length) {
      const rem = FILTERED.length - slice.length;
      pagBox.innerHTML = `<button type="button" id="loadMoreBtn" class="btn-primary-outline">تحميل ${Math.min(PAGE_SIZE, rem)} عرضًا إضافيًا (المتبقي ${fmtInt(rem)})</button>`;
      document.getElementById("loadMoreBtn").addEventListener("click", () => {
        STATE.shownLimit += PAGE_SIZE;
        renderResultsOnly();
      });
    } else {
      pagBox.innerHTML = "";
    }
  }

  function toggleCompareId(pkgId) {
    const idx = STATE.compareIds.indexOf(pkgId);
    if (idx >= 0) {
      STATE.compareIds.splice(idx, 1);
    } else {
      if (STATE.compareIds.length >= 3) STATE.compareIds.shift();
      STATE.compareIds.push(pkgId);
    }
    updateCompareTray();
    renderResultsOnly();
    const drawerBtn = document.querySelector("#drawerStickyCta [data-drawer-compare]");
    if (drawerBtn && drawerBtn.dataset.drawerCompare === pkgId) {
      const active = STATE.compareIds.includes(pkgId);
      drawerBtn.classList.toggle("active", active);
      drawerBtn.textContent = active ? "في المقارنة" : "+ أضف للمقارنة";
    }
    if (document.getElementById("compareSheet")?.classList.contains("open")) {
      renderCompareSheetBody();
    }
  }

  function updateCompareTray() {
    const bar = document.getElementById("compareTrayBar");
    const lbl = document.getElementById("compareTrayLabel");
    const badge = document.getElementById("dockCompareBadge");
    const cnt = STATE.compareIds.length;
    if (lbl) lbl.textContent = `مقارنة العروض (${cnt}/3)`;
    if (bar) bar.classList.toggle("hidden", cnt === 0);
    if (badge) {
      badge.textContent = String(cnt);
      badge.classList.toggle("hidden", cnt === 0);
    }
  }

  function renderCompareSheetBody() {
    const body = document.getElementById("compareSheetBody");
    if (!body) return;
    const items = STATE.compareIds.map((id) => PACKAGES.find((x) => x.id === id)).filter(Boolean);
    if (!items.length) {
      body.innerHTML = `<div class="footnote" style="padding:14px;">اختر حتى 3 برامج بالضغط على زر <strong>+ قارن</strong> من بطاقات النتائج لمقارنة سعر الليلة، القرب من الحرم، والغرف الثنائية والثلاثية والرباعية جنبًا إلى جنب.</div>`;
      return;
    }
    const validQuads = items.map((p) => p.room_quad_usd).filter((v) => typeof v === "number");
    const bestQuad = validQuads.length ? Math.min(...validQuads) : null;

    body.innerHTML = `
      <div class="compare-grid">
        ${items
          .map((p) => {
            const lens = getPkgValueLens(p);
            const isBest = bestQuad !== null && p.room_quad_usd === bestQuad && items.length > 1;
            const safeUrl = p.source_url && /^https?:\/\//i.test(p.source_url) && !/vertexaisearch|drive\.google\.com/i.test(p.source_url) ? p.source_url : "";
            return `
              <div class="compare-col ${isBest ? "compare-col-best" : ""}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
                  <div>
                    <strong style="font-size:0.9rem;color:var(--emerald);">${esc(p.agency)}</strong>
                    ${isBest ? `<span class="val-pill is-good" style="margin-inline-start:6px;">الأقل رباعيًا</span>` : ""}
                  </div>
                  <button type="button" class="compare-pin-btn active" data-remove-compare="${esc(p.id)}">إزالة</button>
                </div>
                <div style="font-size:0.84rem;font-weight:700;margin-top:6px;">${esc(p.makkah_hotel_ar)} (${esc(p.makkah_stars_ar)})</div>
                <div class="matrix-cell-sub">${esc(fmtDist(p.makkah_distance_m, p.makkah_access_type))} · ${p.makkah_access_type === "walking" ? "مشي للحرم" : "شتل"}</div>
                <div class="matrix-cell-sub">المدينة: ${esc(p.madinah_hotel_ar || "غير محدد بالإعلان")}</div>
                <div class="matrix-cell-sub">التاريخ: ${esc(p.dep_date || p.month_key)} · ${p.days ? p.days + " يومًا" : esc(tierLabel(p.duration_band))}</div>
                <div class="pkg-card-prices" style="margin-top:8px;">
                  <div><div class="price-box-lbl">رباعي</div><div class="price-box-val">${esc(fmtPrice(p.room_quad_usd))}</div></div>
                  <div><div class="price-box-lbl">ثلاثي</div><div class="price-box-val">${esc(fmtPrice(p.room_triple_usd))}</div></div>
                  <div><div class="price-box-lbl">ثنائي</div><div class="price-box-val">${esc(fmtPrice(p.room_double_usd))}</div></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                  <span>${lens.perNightUsd ? `<strong>${esc(fmtPrice(lens.perNightUsd))}</strong> / ليلة` : ""} ${lens.deltaPill}</span>
                  ${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" class="ext-link">فتح المصدر ↗</a>` : ""}
                </div>
              </div>`;
          })
          .join("")}
      </div>`;

    body.querySelectorAll("[data-remove-compare]").forEach((btn) => {
      btn.addEventListener("click", () => toggleCompareId(btn.dataset.removeCompare));
    });
  }

  function openCompareSheet() {
    renderCompareSheetBody();
    document.getElementById("compareBackdrop")?.classList.add("open");
    document.getElementById("compareSheet")?.classList.add("open");
  }

  function closeCompareSheet() {
    document.getElementById("compareBackdrop")?.classList.remove("open");
    document.getElementById("compareSheet")?.classList.remove("open");
  }

  function openPackageDrawer(pkgId) {
    const p = PACKAGES.find((x) => x.id === pkgId);
    if (!p) return;

    document.getElementById("drawerEyebrow").textContent = `${p.agency} — ${tierLabel(p.duration_band)}`;
    document.getElementById("drawerTitle").textContent = `${p.makkah_hotel_ar} (${p.makkah_stars_ar})`;

    const safeHref = (u) => (u && /^https?:\/\//i.test(u) && !/vertexaisearch|drive\.google\.com/i.test(u) ? u : "");
    const safeUrl = safeHref(p.source_url);
    const agInfo = AGENCIES_BY_NAME.get(trNorm(p.agency));
    const agLinks = [];
    if (agInfo) {
      if (safeHref(agInfo.website)) agLinks.push(`<a href="${esc(agInfo.website)}" target="_blank" rel="noopener noreferrer" class="agency-link-chip">الموقع الرسمي للشركة</a>`);
      if (safeHref(agInfo.ig)) agLinks.push(`<a href="${esc(agInfo.ig)}" target="_blank" rel="noopener noreferrer" class="agency-link-chip">Instagram الوكالة</a>`);
      if (safeHref(agInfo.x)) agLinks.push(`<a href="${esc(agInfo.x)}" target="_blank" rel="noopener noreferrer" class="agency-link-chip">حساب X الرسمي</a>`);
      if (safeHref(agInfo.ad_url)) agLinks.push(`<a href="${esc(agInfo.ad_url)}" target="_blank" rel="noopener noreferrer" class="agency-link-chip">صفحة العروض الموسمية</a>`);
    }
    const origLine =
      p.original_currency && p.original_currency !== "USD" && p.original_prices
        ? `<p class="footnote" style="margin-top:8px;">السعر الأصلي بالإعلان (${esc(p.original_currency)}): رباعي ${fmtInt(p.original_prices.quad)} | ثلاثي ${fmtInt(p.original_prices.triple)} | ثنائي ${fmtInt(p.original_prices.double)}</p>`
        : "";

    const rawDist = typeof p.makkah_distance_m === "number" ? p.makkah_distance_m : p.makkah_access_type === "walking" ? 500 : 2500;
    const pinRightPct = Math.max(4, Math.min(96, Math.round((rawDist / 3000) * 100)));
    const lens = getPkgValueLens(p);
    const isPinned = STATE.compareIds.includes(p.id);

    document.getElementById("drawerBody").innerHTML = `
      <div class="drawer-section">
        <h4>بيانات الرحلة والتوقيت</h4>
        <div class="kv-grid">
          <div class="kv-item"><span>الشركة السياحية</span><strong>${esc(p.agency)} (${esc(p.agency_city || "تركيا")})</strong></div>
          <div class="kv-item"><span>نقطة الانطلاق والطيران</span><strong>${esc(p.departure_hub || "—")} | ${esc(p.airline || "غير محدد")}</strong></div>
          <div class="kv-item"><span>تاريخ الذهاب والعودة</span><strong>${esc(p.dep_date || p.month_key)}${p.ret_date ? " ← " + esc(p.ret_date) : ""}</strong></div>
          <div class="kv-item"><span>المدة الإجمالية</span><strong>${p.days ? p.days + " يومًا" : tierLabel(p.duration_band)}${p.nights ? " (" + p.nights + " ليلة)" : ""}</strong></div>
        </div>
      </div>

      <div class="drawer-section">
        <h4>السكن في مكة المكرمة والمدينة المنورة</h4>
        <div class="haram-gauge">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;font-weight:700;margin-bottom:6px;">
            <span>مقياس القرب من المسجد الحرام</span>
            <strong>${esc(fmtDist(p.makkah_distance_m, p.makkah_access_type))} (${p.makkah_access_type === "walking" ? "مشي للحرم" : "نقل ترددي شتل"})</strong>
          </div>
          <div class="haram-gauge-track">
            <span class="haram-gauge-pin" style="right:${pinRightPct}%;"></span>
          </div>
          <div class="haram-gauge-ticks" dir="rtl">
            <span>0م الحرم</span>
            <span>500م مشي</span>
            <span>1 كم</span>
            <span>+3 كم شتل</span>
          </div>
        </div>
        <div class="kv-grid">
          <div class="kv-item"><span>فندق مكة المعتمد</span><strong>${esc(p.makkah_hotel_ar)}<br><small style="color:var(--muted);">${esc(p.makkah_hotel_en_tr || p.makkah_hotel_raw)}</small></strong></div>
          <div class="kv-item"><span>تصنيف مكة والمسافة للحرم</span><strong>${esc(p.makkah_stars_ar)} — ${esc(fmtDist(p.makkah_distance_m, p.makkah_access_type))} (${p.makkah_access_type === "walking" ? "مشي للحرم" : "شتل"})</strong></div>
          <div class="kv-item"><span>المنطقة</span><strong>${esc(p.makkah_zone_ar)}</strong></div>
          <div class="kv-item"><span>فندق المدينة المنورة</span><strong>${esc(p.madinah_hotel_ar || "غير محدد بالإعلان")}${p.madinah_stars_ar ? " (" + esc(p.madinah_stars_ar) + ")" : ""}</strong></div>
        </div>
      </div>

      <div class="drawer-section">
        <h4>تسعير الغرف للفرد ومؤشر القيمة</h4>
        <div class="pkg-lens-row" style="margin-bottom:8px;">
          ${lens.perNightUsd ? `<span class="val-pill is-mid">${esc(fmtPrice(lens.perNightUsd))} / ليلة</span>` : ""}
          ${lens.deltaPill}
        </div>
        <div class="pkg-card-prices" style="padding:12px;">
          <div>
            <div class="price-box-lbl">غرفة رباعية (4)</div>
            <div class="price-box-val">${esc(fmtPrice(p.room_quad_usd))}</div>
          </div>
          <div>
            <div class="price-box-lbl">غرفة ثلاثية (3)</div>
            <div class="price-box-val">${esc(fmtPrice(p.room_triple_usd))}</div>
          </div>
          <div>
            <div class="price-box-lbl">غرفة ثنائية (2)</div>
            <div class="price-box-val">${esc(fmtPrice(p.room_double_usd))}</div>
          </div>
        </div>
        ${origLine}
        <div class="footnote" style="margin-top:8px;">الوجبات: ${esc(p.meal_board || "حسب برنامج الشركة")} | حالة التسعير: ${p.price_completeness === "full_2_3_4" ? "كامل (2+3+4)" : "تسعير جزئي من المصدر"}</div>
      </div>

      <div class="drawer-section">
        <h4>التوثيق والرابط المرجعي</h4>
        <div style="margin-bottom:8px;">${channelBadge(p.source_channel)} <span class="matrix-cell-sub" style="display:inline;">${esc(p.source_label || "")}</span></div>
        ${p.notes_ar ? `<p style="font-size:0.84rem;color:var(--ink);margin:0 0 10px;">${esc(p.notes_ar)}</p>` : ""}
        ${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" class="btn-primary-outline" style="display:inline-block;text-decoration:none;">فتح رابط الإعلان / المصدر الأصلي</a>` : ""}
        ${agInfo && agInfo.metric ? `<p class="footnote" style="margin-top:10px;">تصنيف الوكالة (${esc(agInfo.tier || "مرخصة")}): ${esc(agInfo.metric)}</p>` : ""}
        ${agLinks.length ? `<div class="agency-links-row">${agLinks.join("")}</div>` : ""}
      </div>
    `;

    const stickyCta = document.getElementById("drawerStickyCta");
    if (stickyCta) {
      stickyCta.innerHTML = `
        <button type="button" class="compare-pin-btn ${isPinned ? "active" : ""}" data-drawer-compare="${esc(p.id)}" style="flex:0 0 auto;padding:8px 14px;">${isPinned ? "في المقارنة" : "+ أضف للمقارنة"}</button>
        ${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" class="btn-primary-outline" style="flex:1;text-align:center;">فتح المصدر الموثق ↗</a>` : ""}
      `;
      stickyCta.querySelector("[data-drawer-compare]")?.addEventListener("click", () => toggleCompareId(p.id));
    }

    document.getElementById("drawerBackdrop").classList.add("open");
    document.getElementById("detailDrawer").classList.add("open");
  }

  function closeDrawer() {
    document.getElementById("drawerBackdrop").classList.remove("open");
    document.getElementById("detailDrawer").classList.remove("open");
  }

  function exportCsv() {
    if (!FILTERED.length) return;
    const headers = ["month", "dep_date", "ret_date", "duration_band", "days", "makkah_nights", "madinah_nights", "is_40_vakit", "agency", "makkah_hotel_ar", "makkah_hotel_en_tr", "makkah_stars", "makkah_distance_m", "access_type", "madinah_hotel", "quad_usd", "triple_usd", "double_usd", "source_channel", "source_url"];
    const lines = [headers.join(",")];
    FILTERED.forEach((p) => {
      const row = [
        p.month_key,
        p.dep_date,
        p.ret_date,
        p.duration_band,
        p.days,
        p._mkNights ?? "",
        p._mdNights ?? "",
        p._is40V ? "yes" : "no",
        p.agency,
        p.makkah_hotel_ar,
        p.makkah_hotel_en_tr,
        p.makkah_stars_ar,
        p.makkah_distance_m ?? "",
        p.makkah_access_type,
        p.madinah_hotel_ar,
        p.room_quad_usd ?? "",
        p.room_triple_usd ?? "",
        p.room_double_usd ?? "",
        p.source_channel,
        p.source_url,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `turkey-umrah-prices-${STATE.month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function renderAll() {
    renderMonthPills();
    renderShawwalBanner();
    const rows = sortRows(applyFilters(false));
    renderKpis(rows);
    renderHotelSpotlight(rows);
    renderMonthlyChart();
    renderHotelLadder(rows);
    renderCoverageMatrix();
    renderResultsOnly();
    updateCompareTray();
    if (document.getElementById("compareSheet")?.classList.contains("open")) {
      renderCompareSheetBody();
    }
  }

  async function boot() {
    initPrefs();
    try {
      const resp = await fetch("./data/market-prices-calendar.json");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      DATA = await resp.json();
      PACKAGES = (Array.isArray(DATA.packages) ? DATA.packages : []).map((p) => {
        const note = p.notes_ar || "";
        const totN = p.nights || (p.days && p.days > 1 ? p.days - 1 : null);
        const mkM = note.match(/(\d+)\s*(?:ليلة|ليالٍ|ليالي|ليال)\s*(?:في\s*)?مكة/);
        const mdM = note.match(/(\d+)\s*(?:ليلة|ليالٍ|ليالي|ليال)\s*(?:في\s*)?المدينة/);
        let mkN = mkM ? Number(mkM[1]) : null;
        let mdN = mdM ? Number(mdM[1]) : null;
        if (mkN !== null && mdN === null && totN && totN > mkN) mdN = totN - mkN;
        if (mdN !== null && mkN === null && totN && totN > mdN) mkN = totN - mdN;
        if (mkN === null && mdN === null && totN && totN >= 2) {
          mdN = totN <= 6 ? 2 : totN <= 14 ? 3 : totN <= 22 ? 4 : 5;
          mkN = Math.max(1, totN - mdN);
        }
        const base = p.room_quad_usd ?? p.room_triple_usd ?? p.room_double_usd ?? null;
        const nightly = base && totN && totN > 0 ? Math.round(base / totN) : null;
        const is40 = (mdN !== null && mdN >= 8) || /(?:40\s*(?:vakit|صلاة|وقت)|أربعين\s*صلاة)/i.test(note);
        return { ...p, _mkNights: mkN, _mdNights: mdN, _nightlyUsd: nightly, _is40V: is40 };
      });
      AGENCIES_BY_NAME = new Map();
      if (Array.isArray(DATA.agencies)) {
        DATA.agencies.forEach((a) => {
          if (a && a.name) AGENCIES_BY_NAME.set(trNorm(a.name), a);
        });
      }

      const hdrMeta = document.getElementById("hdrMeta");
      const metaAg = DATA.meta && DATA.meta.distinct_agencies ? DATA.meta.distinct_agencies : new Set(PACKAGES.map((p) => p.agency)).size;
      hdrMeta.textContent = `رصد ${fmtInt(PACKAGES.length)} عرضًا موثقًا | ${fmtInt(metaAg)} شركة تركية | سبتمبر 2026 – شوال 1448`;

      buildMarketBenchmarks();
      populateSelectors();
      wireControls();
      renderAll();
      updateCompareTray();
    } catch (err) {
      const errBox = document.getElementById("loadError");
      errBox.style.display = "block";
      errBox.textContent = "تعذر تحميل بيانات أسعار السوق (data/market-prices-calendar.json): " + (err.message || err);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
