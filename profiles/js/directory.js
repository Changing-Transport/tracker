/* Country directory — search and filter the index, link to profiles. */
(function () {
"use strict";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const grid = document.getElementById("dir-grid");
const search = document.getElementById("dir-search");
const regionSel = document.getElementById("dir-region");
const transportSel = document.getElementById("dir-transport");
const count = document.getElementById("dir-count");

let all = [];

fetch("data/countries/index.json")
    .then((r) => r.json())
    .then((idx) => {
        all = idx.countries;
        const regions = [...new Set(all.map((c) => c.region).filter(Boolean))].sort();
        regions.forEach((r) => {
            const o = document.createElement("option");
            o.value = r; o.textContent = r;
            regionSel.appendChild(o);
        });
        draw();
    })
    .catch(() => {
        grid.innerHTML = `<div class="cp-empty">Could not load the country
            index. Run update_data.py to generate the data files.</div>`;
    });

function draw() {
    const q = search.value.trim().toLowerCase();
    const region = regionSel.value;
    const t = transportSel.value;
    const list = all.filter((c) =>
        (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) &&
        (!region || c.region === region) &&
        (t !== "yes" || c.has_transport_content) &&
        (t !== "lts" || c.has_lts));

    count.textContent = `${list.length} of ${all.length} countries`;
    grid.innerHTML = list.map((c) => `
      <a class="cp-card cp-dir-card" href="country.html?country=${esc(c.code)}">
        ${c.iso2 ? `<img class="cp-dir-flag" loading="lazy"
            src="../assets/flags/${esc(c.iso2)}.png"
            onerror="this.onerror=null;this.src='https://flagcdn.com/w80/${esc(c.iso2)}.png'" alt="">` : ""}
        <span>
          <span class="cp-dir-name">${esc(c.name)}</span><br>
          <span class="cp-dir-meta">
            ${esc(c.ndc_version || "No NDC")}${c.has_lts ? " · LTS" : ""}${c.eu_member ? " · EU" : ""}
            ${c.transport_share_pct != null ? ` · transport ${c.transport_share_pct}% of emissions` : ""}
          </span>
        </span>
      </a>`).join("") ||
      `<div class="cp-empty">No countries match. Try a different search.</div>`;
}

search.addEventListener("input", draw);
regionSel.addEventListener("change", draw);
transportSel.addEventListener("change", draw);
})();
