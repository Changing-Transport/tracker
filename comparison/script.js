// ============================================================================
// NDC Comparison Dashboard — Sectioned Layout
// ============================================================================

let comparisonData = null;
let selectedCountry = null;
let selectedVersions = {
    gen1: 0,
    gen2: 0,
    gen3: 0
};

// Global tab selection (synchronized across all 3 columns)
let activeTab = 'mitigation';  // 'mitigation' or 'adaptation'

const GEN_CONFIG = {
    gen1: { label: '1st Generation', period: '2015–2019', color: '#003D5C' },
    gen2: { label: '2nd Generation', period: '2020–2024', color: '#00A4BD' },
    gen3: { label: '3rd Generation', period: '2024–ongoing', color: '#E8821A' },
};

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadComparisonData();
        initializeCountrySelector();
        document.getElementById('country-select').addEventListener('change', handleCountryChange);
        document.getElementById('loading').classList.add('hidden');
    } catch (err) {
        console.error('Init error:', err);
        document.getElementById('loading').innerHTML =
            '<p style="color:#c0392b;font-family:sans-serif;padding:2rem">Error loading data. Please refresh the page.</p>';
    }
});

// ============================================================================
// Data Loading
// ============================================================================
async function loadComparisonData() {
    const res = await fetch('../data/processed/comparison-data.json');
    if (!res.ok) throw new Error('comparison-data.json not found');
    comparisonData = await res.json();
}

// ============================================================================
// Country Selector
// ============================================================================
function initializeCountrySelector() {
    const select = document.getElementById('country-select');
    const countries = Object.entries(comparisonData.countries)
        .map(([code, data]) => ({ code, name: data.country_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    countries.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    });
}

function handleCountryChange(e) {
    selectedCountry = e.target.value;
    if (!selectedCountry) {
        document.getElementById('comparison-grid').innerHTML = '';
        return;
    }
    
    // Reset version selections and tab
    selectedVersions = { gen1: 0, gen2: 0, gen3: 0 };
    activeTab = 'mitigation';
    
    renderComparison();
    setupSynchronizedScrolling();
}

// ============================================================================
// Main Render — SECTIONED LAYOUT
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
    if (!selectedCountry) return;
    
    const countryData = comparisonData.countries[selectedCountry];
    if (!countryData) return;
    
    // SECTION 1: Headers (in grid, variable height)
    const headersRow = document.createElement('div');
    headersRow.className = 'section-row headers-row';
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const headerCell = createHeaderCell(gen, countryData.generations[gen]);
        headersRow.appendChild(headerCell);
    });
    grid.appendChild(headersRow);
    
    // SECTION 2: Summary boxes (in grid, fixed height, aligned)
    const summaryRow = document.createElement('div');
    summaryRow.className = 'section-row summary-row';
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const summaryCell = createSummaryCell(gen, countryData.generations[gen]);
        summaryRow.appendChild(summaryCell);
    });
    grid.appendChild(summaryRow);
    
    // SECTION 3: Tab navigation (OUTSIDE grid, full width)
    const tabSection = document.createElement('div');
    tabSection.className = 'tab-section';
    
    const mitigationTab = document.createElement('button');
    mitigationTab.className = 'tab-button' + (activeTab === 'mitigation' ? ' active' : '');
    mitigationTab.textContent = 'Mitigation';
    mitigationTab.addEventListener('click', () => switchTab('mitigation'));
    
    const adaptationTab = document.createElement('button');
    adaptationTab.className = 'tab-button' + (activeTab === 'adaptation' ? ' active' : '');
    adaptationTab.textContent = 'Adaptation';
    adaptationTab.addEventListener('click', () => switchTab('adaptation'));
    
    tabSection.appendChild(mitigationTab);
    tabSection.appendChild(adaptationTab);
    grid.appendChild(tabSection);
    
    // SECTION 4: Content (in grid, scrollable, synchronized)
    const contentRow = document.createElement('div');
    contentRow.className = 'section-row content-row';
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const contentCell = createContentCell(gen, countryData.generations[gen]);
        contentRow.appendChild(contentCell);
    });
    grid.appendChild(contentRow);
}

// ============================================================================
// SECTION 1: Header Cell
// ============================================================================
function createHeaderCell(gen, documents) {
    const config = GEN_CONFIG[gen];
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    cell.style.setProperty('--gen-color', config.color);
    
    const title = document.createElement('h2');
    title.textContent = config.label;
    cell.appendChild(title);
    
    const period = document.createElement('div');
    period.className = 'gen-period';
    period.textContent = config.period;
    cell.appendChild(period);
    
    // Version selector if multiple versions
    if (documents.length > 1) {
        const versionNote = document.createElement('div');
        versionNote.className = 'version-note';
        versionNote.textContent = `${documents.length} versions submitted`;
        cell.appendChild(versionNote);
        
        const versionSelect = document.createElement('select');
        versionSelect.className = 'version-selector';
        documents.forEach((doc, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = doc.version;
            if (idx === selectedVersions[gen]) option.selected = true;
            versionSelect.appendChild(option);
        });
        versionSelect.addEventListener('change', (e) => {
            selectedVersions[gen] = parseInt(e.target.value);
            renderComparison();
            setupSynchronizedScrolling();
        });
        cell.appendChild(versionSelect);
    }
    
    // Date
    if (documents.length > 0) {
        const doc = documents[selectedVersions[gen]];
        if (doc.date) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'header-date';
            dateDiv.innerHTML = `<strong>Submitted:</strong> ${doc.date}`;
            cell.appendChild(dateDiv);
        }
    }
    
    return cell;
}

// ============================================================================
// SECTION 2: Summary Cell
// ============================================================================
function createSummaryCell(gen, documents) {
    const cell = document.createElement('div');
    cell.className = 'summary-cell';
    
    if (documents.length === 0) {
        cell.innerHTML = '<div class="no-data-summary">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[selectedVersions[gen]];
    
    const mitCount = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target').length;
    const adaptCount = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target').length;
    const netzeroCount = doc.targets.filter(t => t.target_area === 'Net zero target').length;
    
    const mitMeasuresCount = Object.values(doc.mitigation_measures).reduce((sum, arr) => sum + arr.length, 0);
    const adaptMeasuresCount = Object.values(doc.adaptation_measures).reduce((sum, arr) => sum + arr.length, 0);
    
    cell.innerHTML = `
        <div class="summary-box">
            <div class="summary-row-text">
                <strong>Targets:</strong> ${mitCount} mitigation • ${adaptCount} adaptation • ${netzeroCount} net zero
            </div>
            <div class="summary-row-text">
                <strong>Measures:</strong> ${mitMeasuresCount} mitigation • ${adaptMeasuresCount} adaptation
            </div>
        </div>
    `;
    
    return cell;
}

// ============================================================================
// SECTION 4: Content Cell
// ============================================================================
function createContentCell(gen, documents) {
    const cell = document.createElement('div');
    cell.className = 'content-cell';
    
    if (documents.length === 0) {
        cell.innerHTML = '<div class="no-data">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[selectedVersions[gen]];
    
    if (activeTab === 'mitigation') {
        cell.appendChild(createMitigationContent(doc));
    } else {
        cell.appendChild(createAdaptationContent(doc));
    }
    
    return cell;
}

// ============================================================================
// Synchronized Scrolling
// ============================================================================
function setupSynchronizedScrolling() {
    const cells = document.querySelectorAll('.content-cell');
    let isSyncing = false;
    
    cells.forEach(cell => {
        cell.replaceWith(cell.cloneNode(true));
    });
    
    const freshCells = document.querySelectorAll('.content-cell');
    
    freshCells.forEach(cell => {
        cell.addEventListener('scroll', function() {
            if (isSyncing) return;
            
            isSyncing = true;
            const scrollTop = this.scrollTop;
            
            freshCells.forEach(otherCell => {
                if (otherCell !== this) {
                    otherCell.scrollTop = scrollTop;
                }
            });
            
            setTimeout(() => { isSyncing = false; }, 10);
        });
    });
}

// ============================================================================
// Equalize Column Heights (not needed anymore, but keeping for compatibility)
// ============================================================================
function equalizeColumnHeights() {
    // Not needed with new layout, but kept to avoid errors
}

// ============================================================================
// Tab Switching
// ============================================================================
function switchTab(tab) {
    const cells = document.querySelectorAll('.content-cell');
    const scrollPos = cells[0] ? cells[0].scrollTop : 0;
    
    activeTab = tab;
    renderComparison();
    
    requestAnimationFrame(() => {
        const newCells = document.querySelectorAll('.content-cell');
        newCells.forEach(cell => {
            cell.scrollTop = scrollPos;
        });
        setupSynchronizedScrolling();
    });
}

// ============================================================================
// MITIGATION CONTENT
// ============================================================================
function createMitigationContent(doc) {
    const container = document.createElement('div');
    
    // MITIGATION TARGETS
    const mitigationTargets = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target');
    if (mitigationTargets.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Transport Mitigation Targets';
        section.appendChild(title);
        
        mitigationTargets.forEach(target => {
            section.appendChild(createTargetItem(target, doc.url));
        });
        
        container.appendChild(section);
    }
    
    // NET ZERO TARGETS
    const netZeroTargets = doc.targets.filter(t => t.target_area === 'Net zero target');
    if (netZeroTargets.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Net Zero Targets';
        section.appendChild(title);
        
        netZeroTargets.forEach(target => {
            section.appendChild(createTargetItem(target, doc.url));
        });
        
        container.appendChild(section);
    }
    
    // MITIGATION MEASURES
    const categories = Object.keys(doc.mitigation_measures).sort();
    if (categories.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Mitigation Measures';
        section.appendChild(title);
        
        categories.forEach(category => {
            const catHeader = document.createElement('div');
            catHeader.className = 'category-header';
            catHeader.textContent = category;
            section.appendChild(catHeader);
            
            const measures = doc.mitigation_measures[category] || [];
            measures.forEach(measure => {
                section.appendChild(createMeasureItem(measure, doc.url));
            });
        });
        
        container.appendChild(section);
    }
    
    // If no mitigation content at all
    if (mitigationTargets.length === 0 && netZeroTargets.length === 0 && categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-data';
        empty.textContent = 'No mitigation targets or measures';
        container.appendChild(empty);
    }
    
    return container;
}

// ============================================================================
// ADAPTATION CONTENT
// ============================================================================
function createAdaptationContent(doc) {
    const container = document.createElement('div');
    
    // ADAPTATION TARGETS
    const adaptationTargets = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target');
    if (adaptationTargets.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Transport Adaptation Targets';
        section.appendChild(title);
        
        adaptationTargets.forEach(target => {
            section.appendChild(createTargetItem(target, doc.url));
        });
        
        container.appendChild(section);
    }
    
    // ADAPTATION MEASURES
    const categories = Object.keys(doc.adaptation_measures).sort();
    if (categories.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Adaptation Measures';
        section.appendChild(title);
        
        categories.forEach(category => {
            const catHeader = document.createElement('div');
            catHeader.className = 'category-header';
            catHeader.textContent = category;
            section.appendChild(catHeader);
            
            const measures = doc.adaptation_measures[category] || [];
            measures.forEach(measure => {
                section.appendChild(createAdaptationMeasureItem(measure, doc.url));
            });
        });
        
        container.appendChild(section);
    }
    
    // If no adaptation content at all
    if (adaptationTargets.length === 0 && categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-data';
        empty.textContent = 'No adaptation targets or measures';
        container.appendChild(empty);
    }
    
    return container;
}

// ============================================================================
// HELPER: Create Target Item
// ============================================================================
function createTargetItem(target, docUrl) {
    const item = document.createElement('div');
    item.className = 'target-item';
    
    const content = document.createElement('div');
    content.className = 'target-content';
    const em = document.createElement('em');
    em.textContent = target.content;
    content.appendChild(em);
    
    if (target.page && target.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${target.page})`;
        content.appendChild(pageLink);
    }
    
    item.appendChild(content);
    
    const meta = document.createElement('div');
    meta.className = 'target-meta';
    
    const addMetaRow = (label, value) => {
        if (value && value !== '—') {
            const row = document.createElement('div');
            row.className = 'target-meta-row';
            row.innerHTML = `<span class="target-meta-label">${label}:</span><span>${value}</span>`;
            meta.appendChild(row);
        }
    };
    
    addMetaRow('GHG Target', target.ghg_target);
    addMetaRow('Target Type', target.target_type);
    addMetaRow('Conditionality', target.conditionality);
    addMetaRow('Target Year', target.target_year);
    
    item.appendChild(meta);
    return item;
}

// ============================================================================
// HELPER: Create Measure Item (Mitigation)
// ============================================================================
function createMeasureItem(measure, docUrl) {
    const item = document.createElement('div');
    item.className = 'measure-item';
    
    const quote = document.createElement('div');
    quote.className = 'measure-quote';
    const em = document.createElement('em');
    em.textContent = measure.quote;
    quote.appendChild(em);
    
    if (measure.page && measure.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${measure.page})`;
        quote.appendChild(pageLink);
    }
    
    item.appendChild(quote);
    
    const meta = document.createElement('div');
    meta.className = 'measure-meta';
    
    if (measure.asi && measure.asi !== '—') {
        const asiRow = document.createElement('div');
        asiRow.className = 'measure-meta-row';
        asiRow.innerHTML = `<span class="measure-meta-label">A-S-I:</span><span>${measure.asi}</span>`;
        meta.appendChild(asiRow);
    }
    
    if (measure.modes && measure.modes !== '—') {
        const modesRow = document.createElement('div');
        modesRow.className = 'measure-meta-row';
        modesRow.innerHTML = `<span class="measure-meta-label">Modes:</span><span>${measure.modes}</span>`;
        meta.appendChild(modesRow);
    }
    
    item.appendChild(meta);
    return item;
}

// ============================================================================
// HELPER: Create Measure Item (Adaptation)
// ============================================================================
function createAdaptationMeasureItem(measure, docUrl) {
    const item = document.createElement('div');
    item.className = 'measure-item';
    
    const quote = document.createElement('div');
    quote.className = 'measure-quote';
    const em = document.createElement('em');
    em.textContent = measure.quote;
    quote.appendChild(em);
    
    if (measure.page && measure.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${measure.page})`;
        quote.appendChild(pageLink);
    }
    
    item.appendChild(quote);
    
    if (measure.modes && measure.modes !== '—') {
        const meta = document.createElement('div');
        meta.className = 'measure-meta';
        const modesRow = document.createElement('div');
        modesRow.className = 'measure-meta-row';
        modesRow.innerHTML = `<span class="measure-meta-label">Modes:</span><span>${measure.modes}</span>`;
        meta.appendChild(modesRow);
        item.appendChild(meta);
    }
    
    return item;
}