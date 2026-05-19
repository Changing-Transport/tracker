// ============================================================================
// NDC Comparison Dashboard — Flexible Column Layout
// ============================================================================

let comparisonData = null;

// Column configurations (independent)
let columns = [
    { country: null, generation: 'gen1', versionIndex: 0 },
    { country: null, generation: 'gen2', versionIndex: 0 },
    { country: null, generation: 'gen3', versionIndex: 0 }
];

// Global tab selection
let activeTab = 'mitigation-targets';  // 4 options: mitigation-targets, mitigation-measures, adaptation-targets, adaptation-measures

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
        initializeDefaultSelection();
        renderComparison();
        setupSynchronizedScrolling();
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
// Initialize Default Selection (random country, 3 generations)
// ============================================================================
function initializeDefaultSelection() {
    const countries = Object.keys(comparisonData.countries);
    if (countries.length === 0) return;
    
    // Pick a random country
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    
    // Set all 3 columns to same country, different generations
    columns[0] = { country: randomCountry, generation: 'gen1', versionIndex: 0 };
    columns[1] = { country: randomCountry, generation: 'gen2', versionIndex: 0 };
    columns[2] = { country: randomCountry, generation: 'gen3', versionIndex: 0 };
}

// ============================================================================
// Main Render — FLEXIBLE COLUMN LAYOUT
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
    // SECTION 1: Column Headers with Selectors
    const headersRow = document.createElement('div');
    headersRow.className = 'section-row headers-row';
    
    columns.forEach((col, index) => {
        const headerCell = createHeaderCell(col, index);
        headersRow.appendChild(headerCell);
    });
    grid.appendChild(headersRow);
    
    // SECTION 2: Summary boxes
    const summaryRow = document.createElement('div');
    summaryRow.className = 'section-row summary-row';
    
    columns.forEach((col, index) => {
        const summaryCell = createSummaryCell(col, index);
        summaryRow.appendChild(summaryCell);
    });
    grid.appendChild(summaryRow);
    
    // SECTION 3: Tab navigation (4 tabs)
    const tabSection = document.createElement('div');
    tabSection.className = 'tab-section';
    
    const tabs = [
        { id: 'mitigation-targets', label: 'Mitigation Targets' },
        { id: 'mitigation-measures', label: 'Mitigation Measures' },
        { id: 'adaptation-targets', label: 'Adaptation Targets' },
        { id: 'adaptation-measures', label: 'Adaptation Measures' }
    ];
    
    tabs.forEach(tab => {
        const button = document.createElement('button');
        button.className = 'tab-button' + (activeTab === tab.id ? ' active' : '');
        button.textContent = tab.label;
        button.addEventListener('click', () => switchTab(tab.id));
        tabSection.appendChild(button);
    });
    
    grid.appendChild(tabSection);
    
    // SECTION 4: Content
    const contentRow = document.createElement('div');
    contentRow.className = 'section-row content-row';
    
    columns.forEach((col, index) => {
        const contentCell = createContentCell(col, index);
        contentRow.appendChild(contentCell);
    });
    grid.appendChild(contentRow);
}

// ============================================================================
// SECTION 1: Header Cell with Selectors
// ============================================================================
function createHeaderCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-selection">No country selected</div>';
        return cell;
    }
    
    const countryData = comparisonData.countries[col.country];
    const config = GEN_CONFIG[col.generation];
    
    cell.style.setProperty('--gen-color', config.color);
    
    // Country Selector
    const countrySelect = document.createElement('select');
    countrySelect.className = 'country-selector';
    
    const countriesSorted = Object.entries(comparisonData.countries)
        .map(([code, data]) => ({ code, name: data.country_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    countriesSorted.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === col.country) option.selected = true;
        countrySelect.appendChild(option);
    });
    
    countrySelect.addEventListener('change', (e) => {
        columns[colIndex].country = e.target.value;
        columns[colIndex].versionIndex = 0;
        renderComparison();
        setupSynchronizedScrolling();
    });
    
    cell.appendChild(countrySelect);
    
    // Generation Selector
    const genSelect = document.createElement('select');
    genSelect.className = 'generation-selector';
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const option = document.createElement('option');
        option.value = gen;
        option.textContent = GEN_CONFIG[gen].label;
        if (gen === col.generation) option.selected = true;
        genSelect.appendChild(option);
    });
    
    genSelect.addEventListener('change', (e) => {
        columns[colIndex].generation = e.target.value;
        columns[colIndex].versionIndex = 0;
        renderComparison();
        setupSynchronizedScrolling();
    });
    
    cell.appendChild(genSelect);
    
    // Version Selector (if multiple versions)
    const documents = countryData.generations[col.generation];
    
    if (documents.length > 1) {
        const versionSelect = document.createElement('select');
        versionSelect.className = 'version-selector';
        
        documents.forEach((doc, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = doc.version;
            if (idx === col.versionIndex) option.selected = true;
            versionSelect.appendChild(option);
        });
        
        versionSelect.addEventListener('change', (e) => {
            columns[colIndex].versionIndex = parseInt(e.target.value);
            renderComparison();
            setupSynchronizedScrolling();
        });
        
        cell.appendChild(versionSelect);
    }
    
    // Date
    if (documents.length > 0) {
        const doc = documents[col.versionIndex];
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
function createSummaryCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'summary-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-data-summary">—</div>';
        return cell;
    }
    
    const countryData = comparisonData.countries[col.country];
    const documents = countryData.generations[col.generation];
    
    if (documents.length === 0) {
        cell.innerHTML = '<div class="no-data-summary">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[col.versionIndex];
    
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
function createContentCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'content-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-data">No country selected</div>';
        return cell;
    }
    
    const countryData = comparisonData.countries[col.country];
    const documents = countryData.generations[col.generation];
    
    if (documents.length === 0) {
        cell.innerHTML = '<div class="no-data">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[col.versionIndex];
    
    // Render based on active tab
    if (activeTab === 'mitigation-targets') {
        cell.appendChild(createMitigationTargetsContent(doc));
    } else if (activeTab === 'mitigation-measures') {
        cell.appendChild(createMitigationMeasuresContent(doc));
    } else if (activeTab === 'adaptation-targets') {
        cell.appendChild(createAdaptationTargetsContent(doc));
    } else if (activeTab === 'adaptation-measures') {
        cell.appendChild(createAdaptationMeasuresContent(doc));
    }
    
    return cell;
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
// CONTENT CREATORS (4 types)
// ============================================================================

// 1. MITIGATION TARGETS
function createMitigationTargetsContent(doc) {
    const container = document.createElement('div');
    
    const mitigationTargets = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target');
    const netZeroTargets = doc.targets.filter(t => t.target_area === 'Net zero target');
    
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
    
    if (mitigationTargets.length === 0 && netZeroTargets.length === 0) {
        container.innerHTML = '<div class="no-data">No mitigation targets</div>';
    }
    
    return container;
}

// 2. MITIGATION MEASURES
function createMitigationMeasuresContent(doc) {
    const container = document.createElement('div');
    const categories = Object.keys(doc.mitigation_measures).sort();
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-data">No mitigation measures</div>';
        return container;
    }
    
    const section = document.createElement('div');
    section.className = 'content-section-block';
    
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
    return container;
}

// 3. ADAPTATION TARGETS
function createAdaptationTargetsContent(doc) {
    const container = document.createElement('div');
    const adaptationTargets = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target');
    
    if (adaptationTargets.length === 0) {
        container.innerHTML = '<div class="no-data">No adaptation targets</div>';
        return container;
    }
    
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
    return container;
}

// 4. ADAPTATION MEASURES
function createAdaptationMeasuresContent(doc) {
    const container = document.createElement('div');
    const categories = Object.keys(doc.adaptation_measures).sort();
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-data">No adaptation measures</div>';
        return container;
    }
    
    const section = document.createElement('div');
    section.className = 'content-section-block';
    
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