/* ============================================================================
   GIZ-SLOCAT Transport Tracker — Country Profile renderer (v2)
   Works both as country.html?country=ISO3 and as a pre-rendered static page
   (countries/<slug>/index.html) where window.CP_CODE / CP_BASE are baked in.
   ============================================================================ */

(function () {
"use strict";

const BASE = window.CP_BASE || "";
const params = new URLSearchParams(location.search);
const CODE = (window.CP_CODE || params.get("country") || params.get("code") || "").toUpperCase();

if (!CODE) { location.replace(BASE + "index.html"); return; }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt = (n) => n == null ? "—" :
    Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};
const year = (iso) => iso ? iso.slice(0, 4) : "";

const NAVY = "#003D5C", TEAL = "#00A4BD", GREEN = "#9DBE3D", ORANGE = "#E8821A";
const FONT = "'Source Sans 3', sans-serif";

const DOC_LABEL = { NDC: "NDC", LTS: "LTS", BTR: "BTR",
    "National policy document": "NPD", Other: "DOC" };

const flagSrc = (iso2, size) =>
    iso2 ? `${BASE}../assets/flags/${iso2}.png` : "";
const flagFallback = (iso2, size) =>
    `this.onerror=null;this.src='https://flagcdn.com/w${size}/${iso2}.png'`;

let PROFILE = null;

fetch(`${BASE}data/countries/${CODE}.json`)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(() => {
        document.querySelector("main").innerHTML =
            `<div class="cp-empty" style="margin-top:2rem;">No profile found for
             code “${esc(CODE)}”. <a href="${BASE}index.html">Browse all countries</a>.</div>`;
    });

function render(p) {
    PROFILE = p;
    document.title = `${p.name} — Transport in Climate Policy | GIZ-SLOCAT Transport Tracker`;
    renderHero(p);
    renderStory(p);
    renderTrend(p);
    renderJourney(p);
    renderDocCards(p);
    renderTargets(p);
    renderMeasures(p);
    renderAdaptation(p);
    renderBenefits(p);
    renderBtr(p);
    renderCoalitions(p);
    renderSimilar(p);
    renderCompareLink(p);
    renderResources(p);
    const gen = p.meta && p.meta.generated;
    document.getElementById("cp-footer-meta").textContent =
        `Profile: ${p.name} (${p.code})` +
        (gen ? ` · Data refreshed: ${fmtDate(gen)}` : "");
}

/* ── Hero ─────────────────────────────────────────────────────────── */
function renderHero(p) {
    document.getElementById("cp-name").textContent = p.name;
    document.getElementById("cp-region").textContent = p.region || "—";
    document.getElementById("cp-income").textContent = p.income || "—";
    const flag = document.getElementById("cp-flag");
    if (p.iso2) {
        flag.src = flagSrc(p.iso2, 160);
        flag.setAttribute("onerror", flagFallback(p.iso2, 160));
        flag.alt = `Flag of ${p.name}`;
    } else { flag.remove(); }

    const dates = p.documents.map((d) => d.date).filter(Boolean).sort();
    const lines = [];
    if (dates.length) lines.push(`Latest assessed submission: ${fmtDate(dates[dates.length - 1])}`);
    if (p.meta && p.meta.generated) lines.push(`Database last updated: ${fmtDate(p.meta.generated)}`);
    document.getElementById("cp-updated").innerHTML = lines.map(esc).join("<br>");

    if (p.reports_via_eu) document.getElementById("cp-eu-note").hidden = false;

    // Assessed documents — clickable, linking to the original source
    const items = p.documents.map((d) => {
        const label = esc(d.version || d.name);
        return d.url
            ? `<a class="cp-hero-doclink" href="${esc(d.url)}" target="_blank"
                 rel="noopener" title="Open the original document">${label}</a>`
            : label;
    });
    document.getElementById("cp-docs-list").innerHTML = items.length
        ? items.join(", ")
        : `<span class="cp-soft">No documents assessed yet.</span>`;

    // Memberships
    const m = p.memberships || {};
    const chips = [];
    if (m.g20) chips.push("G20");
    if (m.g7) chips.push("G7");
    if (m.oecd) chips.push("OECD");
    if (m.eu27) chips.push("EU27");
    if (m.mena) chips.push("MENA");
    document.getElementById("cp-memberships").innerHTML = chips.length
        ? chips.map((c) => `<span class="cp-chip">${esc(c)}</span>`).join("")
        : `<span class="cp-soft">No tracked group memberships.</span>`;

    document.getElementById("cp-annex").textContent = p.annex || "—";

    // Long-term direction
    const lt = [];
    lt.push(p.net_zero_target
        ? `<span class="cp-chip cp-chip-green">Net-zero target ✓</span>`
        : `<span class="cp-chip">No net-zero target</span>`);
    if (p.ice_phaseout && p.ice_phaseout.has) {
        const y = p.ice_phaseout.year ? ` by ${esc(p.ice_phaseout.year)}` : "";
        const t = p.ice_phaseout.type ? ` (${esc(p.ice_phaseout.type)})` : "";
        lt.push(`<span class="cp-chip cp-chip-green">ICE phase-out${y}${t}</span>`);
    } else {
        lt.push(`<span class="cp-chip">No ICE phase-out target</span>`);
    }
    document.getElementById("cp-longterm").innerHTML =
        `<div class="cp-chips">${lt.join("")}</div>`;

    // Emissions
    const e = p.emissions || {};
    const box = document.getElementById("cp-emissions");
    if (e.total_mt == null) {
        box.innerHTML = `<span class="cp-soft">No emissions data available for this country.</span>`;
        return;
    }
    const sharePct = e.transport_share_pct != null
        ? Math.min(100, Math.max(2, e.transport_share_pct)) : 0;
    box.innerHTML = `
      <div class="cp-embar-label"><span>Transport CO₂e</span><span>Total CO₂e (Mt)</span></div>
      <div class="cp-embar">
        <div class="cp-embar-fill" style="width:${sharePct}%;">${fmt(e.transport_mt)}</div>
        <div class="cp-embar-total">${fmt(e.total_mt)}</div>
      </div>
      <p class="cp-emissions-note">Greenhouse-gas emissions in million tonnes CO₂-equivalent, ${e.year}.</p>
      <p class="cp-emissions-share">Transport share of total emissions:
        <strong>${e.transport_share_pct != null ? e.transport_share_pct + "%" : "—"}</strong></p>
      <p class="cp-emissions-source"><strong>Source:</strong> ${esc(e.source)}, ${e.year}</p>`;
}

/* ── Story at a glance ────────────────────────────────────────────── */
function renderStory(p) {
    const ndcs = p.documents.filter((d) => d.type === "NDC");
    const lts = p.documents.filter((d) => d.type === "LTS");
    const firstNdc = ndcs.map((d) => d.date).filter(Boolean).sort()[0];
    const activeNdc = ndcs.find((d) => d.status === "Active");
    const firstTransportTarget = p.documents
        .filter((d) => d.transport.mitigation_target && d.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
    const activeMeasures = p.measures.filter((m) => m.status === "Active").length;

    const bits = [];
    if (ndcs.length) {
        bits.push(`<strong>${esc(p.name)}</strong> has submitted
            <strong>${ndcs.length} NDC document${ndcs.length > 1 ? "s" : ""}</strong>
            ${firstNdc ? `since ${year(firstNdc)}` : ""}${p.reports_via_eu
                ? " (jointly through the European Union)" : ""}`);
    } else {
        bits.push(`<strong>${esc(p.name)}</strong> has no assessed NDC in the database yet`);
    }
    if (lts.length) bits.push(`a long-term strategy is in place`);
    if (firstTransportTarget) {
        bits.push(`a transport target first appeared in the
            <strong>${esc(firstTransportTarget.version || firstTransportTarget.name)}</strong>
            (${year(firstTransportTarget.date)})`);
    } else if (activeNdc && !activeNdc.transport.mitigation_target) {
        bits.push(`the current NDC does not yet set a dedicated transport target`);
    }
    if (activeMeasures) {
        bits.push(`the documents currently in force contain
            <strong>${activeMeasures} transport mitigation measure${activeMeasures > 1 ? "s" : ""}</strong>`);
    }
    const e = p.emissions || {};
    if (e.transport_share_pct != null) {
        bits.push(`transport accounts for <strong>${e.transport_share_pct}%</strong>
            of national emissions (${esc(e.source)}, ${e.year})`);
    }
    document.getElementById("cp-story").innerHTML = bits.join(" · ") + ".";
}

/* ── Emissions trend & target horizon ─────────────────────────────── */
const SCOPE_META = {
    "transport":    { color: GREEN,  label: "Transport GHG target" },
    "economy-wide": { color: NAVY,   label: "Economy-wide GHG target" },
    "net-zero":     { color: ORANGE, label: "Net-zero target" },
};

function renderTrend(p) {
    const section = document.getElementById("cp-trend-section");
    const sub = document.getElementById("cp-trend-sub");
    const card = document.getElementById("cp-trend-card");
    const axis = document.getElementById("cp-target-axis");
    const legend = document.getElementById("cp-trend-legend");
    const ty = p.target_years || [];
    const tr = p.trends;

    if (!tr && !ty.length) return; // nothing honest to show — keep hidden
    section.hidden = false;

    const scopes = [...new Set(ty.map((t) => t.scope))];
    legend.innerHTML = scopes.map((s) =>
        `<span style="--lg:${SCOPE_META[s].color}" class="lg-dyn">${esc(SCOPE_META[s].label)}</span>`
    ).join("");

    if (tr && tr.years && tr.years.length) {
        axis.remove();
        sub.textContent =
            `${p.name}'s emissions over time (${tr.source}) and the years its
             active GHG targets point to.`;
        const maxTargetYear = ty.length ? Math.max(...ty.map((t) => t.year)) : 0;
        const lastDataYear = tr.years[tr.years.length - 1];
        const pad = Math.max(maxTargetYear, lastDataYear) + 2;

        const markerPlugin = {
            id: "cpTargetMarkers",
            afterDatasetsDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                ty.forEach((t) => {
                    const x = scales.x.getPixelForValue(t.year);
                    if (x < chartArea.left || x > chartArea.right) return;
                    ctx.save();
                    ctx.strokeStyle = SCOPE_META[t.scope].color;
                    ctx.setLineDash([5, 4]);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, chartArea.top);
                    ctx.lineTo(x, chartArea.bottom);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = SCOPE_META[t.scope].color;
                    ctx.font = `700 11px ${FONT}`;
                    ctx.textAlign = "center";
                    ctx.fillText(String(t.year), x, chartArea.top - 4);
                    ctx.restore();
                });
            },
        };

        new Chart(document.getElementById("cp-trend-chart"), {
            type: "line",
            data: {
                datasets: [
                    { label: "Total GHG (Mt CO₂e)",
                      data: tr.years.map((y, i) => ({ x: y, y: tr.total[i] })),
                      borderColor: TEAL, backgroundColor: TEAL,
                      pointRadius: 0, borderWidth: 2.5, tension: 0.2 },
                    { label: "Transport GHG (Mt CO₂e)",
                      data: tr.years.map((y, i) => ({ x: y, y: tr.transport[i] })),
                      borderColor: GREEN, backgroundColor: GREEN,
                      pointRadius: 0, borderWidth: 2.5, tension: 0.2 },
                ],
            },
            options: {
                plugins: { legend: { position: "bottom",
                    labels: { font: { family: FONT } } } },
                scales: {
                    x: { type: "linear", min: tr.years[0], max: pad,
                         ticks: { callback: (v) => String(v), precision: 0 } },
                    y: { beginAtZero: true,
                         title: { display: true, text: "Mt CO₂e" } },
                },
            },
            plugins: [markerPlugin],
        });
        return;
    }

    // No EDGAR series yet — show the target horizon as an honest axis strip.
    card.remove();
    sub.textContent =
        `The years ${p.name}'s active GHG targets point to. An emissions
         trend line will appear here once the EDGAR time series is added
         to the repository.`;
    const years_ = ty.map((t) => t.year);
    const now = new Date().getFullYear();
    const min = Math.min(now, ...years_) - 2;
    const max = Math.max(...years_) + 3;
    const posPct = (y) => ((y - min) / (max - min)) * 100;
    axis.innerHTML = `
      <div class="cp-axis">
        <div class="cp-axis-line"></div>
        <div class="cp-axis-now" style="left:${posPct(now)}%;"
             title="Today">${now}</div>
        ${ty.map((t) => `
          <div class="cp-axis-dot" style="left:${posPct(t.year)}%;
               --dot:${SCOPE_META[t.scope].color};"
               title="${esc(SCOPE_META[t.scope].label)} — ${t.year}">
            <span>${t.year}</span>
          </div>`).join("")}
      </div>`;
}

/* ── Policy journey (clickable) ───────────────────────────────────── */
function docSorted(p) {
    return [...p.documents].sort((a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999"));
}

function renderJourney(p) {
    const track = document.getElementById("cp-journey");
    const detail = document.getElementById("cp-journey-detail");
    const docs = docSorted(p);

    const nodes = docs.map((d, i) => {
        const cls = ["cp-jnode",
            d.status === "Active" ? "cp-active" : "cp-archived"].join(" ");
        const transport = d.transport.has_content;
        const tag = transport === true
            ? `<span class="cp-jcard-tag yes">transport content</span>`
            : transport === false
                ? `<span class="cp-jcard-tag no">no transport content</span>` : "";
        const eu = d.via_eu ? `<span class="cp-jcard-tag via-eu">via EU NDC</span>` : "";
        return `
          <div class="${cls}" data-doctype="${esc(d.type)}" data-idx="${i}"
               role="button" tabindex="0"
               aria-label="Show details of ${esc(d.version || d.name)}">
            <span class="cp-jnode-year">${year(d.date) || "—"}</span>
            <div class="cp-jdot">${esc(DOC_LABEL[d.type] || "DOC")}</div>
            <div class="cp-jcard">
              <div class="cp-jcard-name">${esc(d.version || d.name)}</div>
              <div>${esc(d.status)}</div>
              ${tag} ${eu}
            </div>
          </div>`;
    });

    nodes.push(`
      <div class="cp-jnode cp-future" data-doctype="BTR" data-idx="btr"
           role="button" tabindex="0" aria-label="About Biennial Transparency Reports">
        <span class="cp-jnode-year">next</span>
        <div class="cp-jdot">BTR</div>
        <div class="cp-jcard">
          <div class="cp-jcard-name">Biennial Transparency Report</div>
          <span class="cp-jcard-tag soon">analysis coming soon</span>
        </div>
      </div>`);

    track.innerHTML = nodes.join("");

    let openIdx = null;
    const open = (node) => {
        const idx = node.dataset.idx;
        track.querySelectorAll(".cp-jnode").forEach((n) => n.classList.remove("cp-selected"));
        if (idx === openIdx) {              // toggle off
            detail.hidden = true; openIdx = null; return;
        }
        openIdx = idx;
        node.classList.add("cp-selected");
        detail.hidden = false;
        if (idx === "btr") {
            detail.innerHTML = `
              <div class="cp-card cp-doc-card" data-doctype="BTR" style="max-width:560px;">
                <div class="cp-doc-card-head">
                  <div><div class="cp-doc-title">Biennial Transparency Report</div>
                  <div class="cp-doc-date">The next chapter of the story</div></div>
                  <span class="cp-pill soon">Coming soon</span>
                </div>
                <p style="font-size:0.93rem;">BTRs report what countries are
                actually doing. This node will become a real document — with
                its transport measures and implementation status — once BTR
                data for ${esc(p.name)} enters the database.</p>
              </div>`;
        } else {
            detail.innerHTML = docCard(docs[+idx], { showStatus: true });
        }
        if (detail.scrollIntoView)
            detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    track.addEventListener("click", (e) => {
        const node = e.target.closest(".cp-jnode");
        if (node) open(node);
    });
    track.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const node = e.target.closest(".cp-jnode");
        if (node) { e.preventDefault(); open(node); }
    });
}

/* ── Document cards ───────────────────────────────────────────────── */
function docCard(d, opts = {}) {
    const t = d.transport;
    const li = (label, val) =>
        `<li class="${val === true ? "yes" : val === false ? "no" : ""}">${esc(label)}</li>`;
    const counts = d.counts || {};
    const stats = [
        counts.targets ? `${counts.targets} target${counts.targets > 1 ? "s" : ""}` : null,
        counts.measures ? `${counts.measures} mitigation measure${counts.measures > 1 ? "s" : ""}` : null,
        counts.adaptation ? `${counts.adaptation} adaptation entr${counts.adaptation > 1 ? "ies" : "y"}` : null,
    ].filter(Boolean).join(" · ");
    const pill = d.status === "Active"
        ? `<span class="cp-pill active">Active</span>`
        : `<span class="cp-pill archived">${esc(d.status)}</span>`;
    return `
      <article class="cp-card cp-doc-card" data-doctype="${esc(d.type)}">
        <div class="cp-doc-card-head">
          <div>
            <div class="cp-doc-title">${esc(d.version || d.name)}
              ${d.via_eu ? `<span class="cp-jcard-tag via-eu">via EU NDC</span>` : ""}</div>
            <div class="cp-doc-date">${esc(d.type)} · ${fmtDate(d.date)}</div>
          </div>
          ${opts.showStatus || d.status !== "Active" ? pill : `<span class="cp-pill active">Active</span>`}
        </div>
        ${t.target_summary ? `<p><strong>Transport target:</strong> ${esc(t.target_summary)}</p>` : ""}
        <ul class="cp-checklist">
          ${li("Transport mitigation target", t.mitigation_target)}
          ${li("Transport adaptation target", t.adaptation_target)}
          ${li("Transport mitigation measures", t.mitigation_measures)}
          ${li("Transport adaptation measures", t.adaptation_measures)}
          ${li("Co-benefits of transport action", t.benefits)}
          ${t.just_transition != null ? li("Reference to just transition", t.just_transition) : ""}
        </ul>
        ${stats ? `<p class="cp-measure-meta">${stats} assessed in this document</p>` : ""}
        ${d.url ? `<a class="cp-doc-link" href="${esc(d.url)}" target="_blank" rel="noopener">Read the original document ↗</a>` : ""}
      </article>`;
}

function renderDocCards(p) {
    const wrap = document.getElementById("cp-doc-cards");
    const active = p.documents.filter((d) => d.status === "Active");
    const cards = active.map((d) => docCard(d));

    cards.push(`
      <article class="cp-card cp-doc-card" data-doctype="BTR">
        <div class="cp-doc-card-head">
          <div>
            <div class="cp-doc-title">Biennial Transparency Report</div>
            <div class="cp-doc-date">BTR · implementation reporting</div>
          </div>
          <span class="cp-pill soon">Coming soon</span>
        </div>
        <p style="font-size:0.93rem;">
          BTRs report what countries are actually doing — the measures
          implemented, in progress or planned. The tracker is extending its
          methodology to BTRs to show the gap between commitment and
          implementation. This card will populate automatically once BTR
          data for ${esc(p.name)} enters the database.
        </p>
      </article>`);

    wrap.innerHTML = cards.join("");
}

/* ── Targets ──────────────────────────────────────────────────────── */
function renderTargets(p) {
    const all = p.targets.filter((t) =>
        (t.area || "").toLowerCase().includes("transport"));
    const sub = document.getElementById("cp-targets-sub");
    const wrap = document.getElementById("cp-targets");
    const filters = document.getElementById("cp-target-filters");

    if (!all.length) {
        sub.textContent = `No transport-specific targets identified in ${p.name}'s assessed documents.`;
        wrap.innerHTML = `<div class="cp-empty">
            ${esc(p.name)} has not yet set a quantified transport target in its
            NDC or LTS. Economy-wide targets may still cover the sector —
            see the documents above.</div>`;
        filters.remove();
        return;
    }
    sub.textContent =
        `Quantified transport commitments extracted verbatim from the documents.`;

    let mode = "Active";
    const draw = () => {
        const list = all.filter((t) => mode === "All" || t.status === mode);
        wrap.innerHTML = list.length ? list.map((t) => `
          <div class="cp-card cp-target">
            <div class="cp-target-year"><small>target year</small>${esc(t.year || "—")}</div>
            <div>
              <div class="cp-target-meta">
                <span class="cp-tag ${t.ghg === "GHG" ? "ghg" : "nonghg"}">${esc(t.ghg || "")}</span>
                ${t.type ? `<span class="cp-tag">${esc(t.type)}</span>` : ""}
                ${t.conditionality ? `<span class="cp-tag ${/^Conditional/.test(t.conditionality) ? "conditional" : ""}">${esc(t.conditionality)}</span>` : ""}
                ${t.area && t.area.includes("adaptation") ? `<span class="cp-tag">Adaptation</span>` : ""}
                ${t.via_eu ? `<span class="cp-jcard-tag via-eu">via EU NDC</span>` : ""}
              </div>
              ${t.content ? `<p class="cp-target-content">“${esc(t.content)}”</p>` : ""}
              <p class="cp-target-src">${esc(t.version || t.document || "")}
                 ${t.status ? ` · ${esc(t.status)}` : ""}${t.page ? ` · p. ${esc(t.page)}` : ""}</p>
            </div>
          </div>`).join("")
        : `<div class="cp-empty">No ${mode.toLowerCase()} transport targets.</div>`;
    };

    ["Active", "Archived", "All"].forEach((m, i) => {
        const b = document.createElement("button");
        b.className = "cp-filter" + (i === 0 ? " on" : "");
        b.textContent = m === "All" ? "All documents" : m + " documents";
        b.onclick = () => {
            mode = m;
            filters.querySelectorAll(".cp-filter").forEach((x) => x.classList.remove("on"));
            b.classList.add("on");
            draw();
        };
        filters.appendChild(b);
    });
    draw();
}

/* ── Mitigation measures ──────────────────────────────────────────── */
function renderMeasures(p) {
    const sub = document.getElementById("cp-measures-sub");
    const wrap = document.getElementById("cp-measures");
    const filters = document.getElementById("cp-measure-filters");
    const moreBtn = document.getElementById("cp-measures-more");

    const activeCount = p.measures.filter((m) => m.status === "Active").length;
    sub.textContent = p.measures.length
        ? `${activeCount} measures in the documents currently in force
           (${p.measures.length} across all submissions), classified with the
           Avoid–Shift–Improve framework. Filter by document to read the
           story in chronological order.`
        : `No transport mitigation measures identified in ${p.name}'s documents.`;

    drawAsiChart(p.asi_summary);
    drawCatChart(p.category_summary);
    drawModeChart(p);

    if (!p.measures.length) {
        wrap.innerHTML = `<div class="cp-empty">Nothing to show yet — measures
            will appear here as soon as they are assessed.</div>`;
        moreBtn.remove();
        return;
    }

    // Document order = chronological submission order (the story's spine)
    const versionsWithMeasures = new Set(
        p.measures.map((m) => m.version).filter(Boolean));
    const docPills = docSorted(p)
        .filter((d) => d.version && versionsWithMeasures.has(d.version))
        .filter((d, i, arr) =>
            arr.findIndex((x) => x.version === d.version) === i);

    const cats = Object.keys(p.category_summary);
    let docSel = "active";   // "active" | "all" | a specific version
    let catSel = "All";
    let expanded = false;
    const LIMIT = 8;

    const card = (m) => `
      <div class="cp-card cp-measure">
        <div class="cp-measure-top">
          ${m.asi.map((a) => `<span class="cp-asi ${a[0]}" title="${esc(a)}">${a[0]}</span>`).join("")}
          <span class="cp-measure-instrument">${esc(m.instrument || m.purpose || m.category)}</span>
          ${m.status !== "Active" ? `<span class="cp-pill archived">Archived</span>` : ""}
          ${m.via_eu ? `<span class="cp-jcard-tag via-eu">via EU NDC</span>` : ""}
        </div>
        ${m.quote ? `<p class="cp-measure-quote">“${esc(m.quote)}”</p>` : ""}
        <p class="cp-measure-meta">
          ${esc(m.category || "")}${m.modes.length ? ` · Modes: ${esc(m.modes.join(", "))}` : ""}
          ${m.geography.length ? ` · ${esc(m.geography.join(", "))}` : ""}
          · ${esc(m.version || m.document || "")}${m.page ? ` · p. ${esc(m.page)}` : ""}
          ${m.measure_status ? ` · Status: ${esc(m.measure_status)}` : ""}
        </p>
      </div>`;

    const groupHeader = (d) => `
      <div class="cp-measure-group" data-doctype="${esc(d.type)}">
        <span class="cp-jdot" style="width:28px;height:28px;font-size:0.55rem;">
          ${esc(DOC_LABEL[d.type] || "DOC")}</span>
        <span><strong>${esc(d.version || d.name)}</strong>
          · ${fmtDate(d.date)} · ${esc(d.status)}</span>
      </div>`;

    const draw = () => {
        let list = p.measures.filter((m) =>
            (catSel === "All" || m.category === catSel) &&
            (docSel === "all" ? true :
             docSel === "active" ? m.status === "Active" :
             m.version === docSel));

        let html = "";
        let count = 0;
        const shownMax = expanded ? Infinity : LIMIT;

        if (docSel === "all") {
            // chronological grouping by document — read the story in order
            for (const d of docPills) {
                const group = list.filter((m) => m.version === d.version);
                if (!group.length) continue;
                if (count >= shownMax) break;
                html += groupHeader(d);
                for (const m of group) {
                    if (count >= shownMax) break;
                    html += card(m);
                    count++;
                }
            }
        } else {
            for (const m of list) {
                if (count >= shownMax) break;
                html += card(m);
                count++;
            }
        }
        wrap.innerHTML = html ||
            `<div class="cp-empty">No measures match these filters.</div>`;
        moreBtn.hidden = expanded || list.length <= LIMIT;
        moreBtn.textContent = `Show all ${list.length} measures`;
    };

    // Row 1 — documents, in chronological order
    const docRow = document.createElement("div");
    docRow.className = "cp-filterrow";
    const mkDoc = (key, label) => {
        const b = document.createElement("button");
        b.className = "cp-filter" + (key === docSel ? " on" : "");
        b.textContent = label;
        b.onclick = () => {
            docSel = key; expanded = false;
            docRow.querySelectorAll(".cp-filter").forEach((x) => x.classList.remove("on"));
            b.classList.add("on");
            draw();
        };
        docRow.appendChild(b);
    };
    mkDoc("active", "Active documents");
    docPills.forEach((d) => mkDoc(d.version, d.version));
    mkDoc("all", "All — in order");
    filters.appendChild(docRow);

    // Row 2 — categories
    const catRow = document.createElement("div");
    catRow.className = "cp-filterrow";
    ["All", ...cats].forEach((c, i) => {
        const b = document.createElement("button");
        b.className = "cp-filter cp-filter-cat" + (i === 0 ? " on" : "");
        b.textContent = c === "All" ? "All categories" : c;
        b.onclick = () => {
            catSel = c; expanded = false;
            catRow.querySelectorAll(".cp-filter").forEach((x) => x.classList.remove("on"));
            b.classList.add("on");
            draw();
        };
        catRow.appendChild(b);
    });
    filters.appendChild(catRow);

    moreBtn.onclick = () => { expanded = true; draw(); };
    draw();
}

function drawAsiChart(asi) {
    const el = document.getElementById("cp-asi-chart");
    const labels = Object.keys(asi);
    if (!labels.length) { el.closest(".cp-card").innerHTML =
        `<p class="cp-chart-caption">No A-S-I-classified measures in active documents.</p>`; return; }
    new Chart(el, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: labels.map((l) => asi[l]),
                backgroundColor: labels.map((l) =>
                    l === "Avoid" ? NAVY : l === "Shift" ? TEAL : GREEN),
                borderWidth: 2, borderColor: "#fff",
            }],
        },
        options: {
            plugins: { legend: { position: "bottom",
                labels: { font: { family: FONT } } } },
            cutout: "60%",
        },
    });
}

function drawCatChart(cats) {
    const el = document.getElementById("cp-cat-chart");
    const labels = Object.keys(cats);
    if (!labels.length) { el.closest(".cp-card").remove(); return; }
    new Chart(el, {
        type: "bar",
        data: {
            labels,
            datasets: [{ data: labels.map((l) => cats[l]),
                backgroundColor: GREEN, borderRadius: 4 }],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { precision: 0 } },
                y: { ticks: { font: { family: FONT, size: 11 },
                    callback(v) {
                        const l = this.getLabelForValue(v);
                        return l.length > 24 ? l.slice(0, 23) + "…" : l;
                    } } },
            },
        },
    });
}

function drawModeChart(p) {
    const el = document.getElementById("cp-mode-chart");
    const counts = {};
    p.measures.filter((m) => m.status === "Active").forEach((m) =>
        m.modes.forEach((mo) => { counts[mo] = (counts[mo] || 0) + 1; }));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (!entries.length) { el.closest(".cp-card").remove(); return; }
    new Chart(el, {
        type: "bar",
        data: {
            labels: entries.map((e) => e[0]),
            datasets: [{ data: entries.map((e) => e[1]),
                backgroundColor: TEAL, borderRadius: 4 }],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { precision: 0 } },
                y: { ticks: { font: { family: FONT, size: 11 } } },
            },
        },
    });
}

/* ── Adaptation ───────────────────────────────────────────────────── */
function renderAdaptation(p) {
    const wrap = document.getElementById("cp-adaptation");
    const active = p.adaptation.filter((a) => a.status === "Active");
    if (!active.length) {
        wrap.innerHTML = `<div class="cp-empty">No transport adaptation
            measures identified in ${esc(p.name)}'s active documents.</div>`;
        return;
    }
    wrap.innerHTML = active.map((a) => `
      <div class="cp-card cp-measure">
        <div class="cp-measure-top">
          <span class="cp-measure-instrument">${esc(a.measure || a.category || "Adaptation measure")}</span>
          ${a.via_eu ? `<span class="cp-jcard-tag via-eu">via EU NDC</span>` : ""}
        </div>
        ${a.quote ? `<p class="cp-measure-quote">“${esc(a.quote)}”</p>` : ""}
        <p class="cp-measure-meta">
          ${esc(a.category || "")}${a.modes.length ? ` · Modes: ${esc(a.modes.join(", "))}` : ""}
          · ${esc(a.version || a.document || "")}${a.page ? ` · p. ${esc(a.page)}` : ""}
        </p>
      </div>`).join("");
}

/* ── Benefits ─────────────────────────────────────────────────────── */
function renderBenefits(p) {
    const wrap = document.getElementById("cp-benefits");
    const active = p.benefits.filter((b) => b.status === "Active");
    if (!active.length) {
        wrap.innerHTML = `<div class="cp-empty">No co-benefits of transport
            climate action identified in ${esc(p.name)}'s active documents.</div>`;
        return;
    }
    wrap.innerHTML = active.map((b) => `
      <div class="cp-card cp-measure">
        <div class="cp-measure-top">
          <span class="cp-measure-instrument">${esc(b.type || "Benefit")}</span>
        </div>
        ${b.quote ? `<p class="cp-measure-quote">“${esc(b.quote)}”</p>` : ""}
        <p class="cp-measure-meta">${esc(b.document || "")}${b.page ? ` · p. ${esc(b.page)}` : ""}</p>
      </div>`).join("");
}

/* ── BTR outlook ──────────────────────────────────────────────────── */
function renderBtr(p) {
    document.getElementById("cp-btr").innerHTML = `
      <h3 style="color:var(--cp-navy); margin-bottom:0.4rem;">
        Tracking implementation through Biennial Transparency Reports</h3>
      <p style="font-size:0.97rem; max-width:80ch;">
        NDCs and long-term strategies state what ${esc(p.name)}
        <em>commits</em> to. Biennial Transparency Reports, submitted under
        the Paris Agreement's Enhanced Transparency Framework, report what
        is <em>actually being done</em>. The GIZ-SLOCAT Transport Tracker is
        extending its methodology to BTRs so each country profile can show
        the implementation status of transport measures — closing the loop
        between commitment and action. BTR-based indicators for
        ${esc(p.name)} will appear on this page automatically once the data
        enters the database.</p>`;
}

/* ── Coalitions ───────────────────────────────────────────────────── */
function renderCoalitions(p) {
    const box = document.getElementById("cp-coalitions");
    if (!p.coalitions.length) {
        box.outerHTML = `<div class="cp-empty">${esc(p.name)} has not joined
            any of the transport-related coalitions and declarations tracked
            in the database.</div>`;
        return;
    }
    box.innerHTML = `<ul class="cp-linklist">${p.coalitions
        .map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`;
}

/* ── Similar countries (peer discovery, not ranking) ──────────────── */
function simChip(c, extraHtml) {
    return `
      <a class="cp-sim-chip" href="${BASE}country.html?country=${esc(c.code)}">
        ${c.iso2 ? `<img class="cp-sim-flag" loading="lazy"
            src="${flagSrc(c.iso2, 80)}"
            onerror="${flagFallback(c.iso2, 80)}" alt="">` : ""}
        <span><strong>${esc(c.name)}</strong>${extraHtml || ""}</span>
      </a>`;
}

function renderSimilar(p) {
    const box = document.getElementById("cp-similar");
    const s = p.similar || {};
    const blocks = [];

    if (s.region && s.region.length) {
        blocks.push(`
          <div class="cp-sim-block">
            <h3 class="cp-sim-title">In the same region — ${esc(p.region)}</h3>
            <div class="cp-sim-row">${s.region.map((c) => simChip(c)).join("")}</div>
          </div>`);
    }
    if (s.emissions && s.emissions.length) {
        blocks.push(`
          <div class="cp-sim-block">
            <h3 class="cp-sim-title">Similar transport share of emissions
              <span class="cp-sim-note">(${esc(p.name)}: ${p.emissions.transport_share_pct}%)</span></h3>
            <div class="cp-sim-row">${s.emissions.map((c) =>
                simChip(c, `<span class="cp-sim-meta"> · ${c.share}%</span>`)).join("")}</div>
          </div>`);
    }
    if (s.priorities && s.priorities.length) {
        blocks.push(`
          <div class="cp-sim-block">
            <h3 class="cp-sim-title">Betting on the same priorities</h3>
            <p class="cp-sim-note">Countries whose active measures have a
               similar category mix to ${esc(p.name)}'s.</p>
            <div class="cp-sim-row">${s.priorities.map((c) =>
                simChip(c, c.shared_focus
                    ? `<span class="cp-sim-meta"> · shared focus: ${esc(c.shared_focus)}</span>` : "")).join("")}</div>
          </div>`);
    }

    box.innerHTML = blocks.length ? blocks.join("")
        : `<div class="cp-empty">Not enough comparable data yet to suggest peers.</div>`;
}

/* ── Resources: publications, TDC, downloads, references ──────────── */
function toCsv(rows, columns) {
    const q = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [columns.join(",")]
        .concat(rows.map((r) => columns.map((c) => q(r[c])).join(",")))
        .join("\n");
}

function downloadBlob(text, filename, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function renderCompareLink(p) {
    const a = document.getElementById("cp-compare-link");
    if (a) a.href = `${BASE}../comparison/index_c.html?countries=${encodeURIComponent(p.code)}`;
}

function renderResources(p) {
    const pubBox = document.getElementById("cp-publications");
    const pubs = p.publications || [];
    let html = "";
    if (pubs.length) {
        html += `<ul class="cp-linklist">${pubs.map((x) => `
            <li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>
            ${x.date ? `<span class="cp-measure-meta"> · ${fmtDate(x.date)}</span>` : ""}</li>`).join("")}</ul>`;
    } else {
        html += `<p style="font-size:0.95rem;">Knowledge products mentioning
            ${esc(p.name)} are published regularly on Changing Transport.</p>`;
    }
    html += `<a class="cp-resource-cta" href="${esc(p.links.changing_transport_search)}"
        target="_blank" rel="noopener">Search publications for ${esc(p.name)} ↗</a>`;
    pubBox.innerHTML = html;

    document.getElementById("cp-tdc-text").textContent =
        `The Transport Data Commons brings together transport datasets from
         32+ institutions. Use the country filter to find data for ${p.name}.`;
    document.getElementById("cp-tdc-link").href = p.links.tdc_search;

    // Downloads
    const dl = document.getElementById("cp-downloads");
    if (dl) {
        dl.innerHTML = `
          <p style="font-size:0.95rem;">Everything on this page, as data —
             for your own analysis, reuse or country work.</p>
          <div class="cp-dl-row">
            <a class="cp-resource-cta" href="${BASE}data/countries/${esc(p.code)}.json"
               download="${esc(p.code)}_transport_tracker.json">Full profile (JSON)</a>
            <button class="cp-resource-cta cp-dl-btn" id="cp-dl-measures">Measures (CSV)</button>
            <button class="cp-resource-cta cp-dl-btn" id="cp-dl-targets">Targets (CSV)</button>
          </div>`;
        document.getElementById("cp-dl-measures").onclick = () => {
            const rows = p.measures.map((m) => ({
                country: p.name, code: p.code, document: m.document,
                version: m.version, status: m.status, category: m.category,
                purpose: m.purpose, instrument: m.instrument,
                asi: m.asi.join("; "), modes: m.modes.join("; "),
                geography: m.geography.join("; "),
                measure_status: m.measure_status, page: m.page, quote: m.quote,
                via_eu: m.via_eu ? "yes" : "",
            }));
            downloadBlob(toCsv(rows, Object.keys(rows[0] || { country: 1 })),
                `${p.code}_measures.csv`, "text/csv");
        };
        document.getElementById("cp-dl-targets").onclick = () => {
            const rows = p.targets.map((t) => ({
                country: p.name, code: p.code, document: t.document,
                version: t.version, status: t.status, area: t.area,
                ghg: t.ghg, type: t.type, conditionality: t.conditionality,
                target_year: t.year, page: t.page, content: t.content,
                via_eu: t.via_eu ? "yes" : "",
            }));
            downloadBlob(toCsv(rows, Object.keys(rows[0] || { country: 1 })),
                `${p.code}_targets.csv`, "text/csv");
        };
    }

    // Referenced national documents
    const refBox = document.getElementById("cp-references");
    if (refBox) {
        const refs = (p.references || []).filter((r) => r.status === "Active");
        if (!refs.length) {
            refBox.innerHTML = `<p style="font-size:0.95rem;" class="cp-soft-dark">
                The active documents do not reference further national policy
                documents captured in the database.</p>`;
        } else {
            refBox.innerHTML = `<ul class="cp-linklist">${refs.map((r) => `
              <li>${r.url
                  ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.further_type || "National document")}</a>`
                  : esc(r.further_type || "National document")}
                <span class="cp-measure-meta"> · referenced in ${esc(r.document || "")}${r.page ? `, p. ${esc(r.page)}` : ""}</span>
              </li>`).join("")}</ul>`;
        }
    }
}

})();
