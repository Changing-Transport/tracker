// ============================================================================
// NDC Comparison Dashboard — Main JavaScript
// ============================================================================

let comparisonData = null;
let selectedCountry = null;
let selectedVersions = {
    gen1: 0,  // Index of selected version in gen1 array
    gen2: 0,
    gen3: 0
};
let activeCategoryMitigation = {};  // Per generation active category
let activeCategoryAdaptation = {};  // Per generation active category

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
    
    // Reset version selections
    selectedVersions = { gen1: 0, gen2: 0, gen3: 0 };
    activeCategoryMitigation = {};
    activeCategoryAdaptation = {};
    
    renderComparison();
}

// ============================================================================
// Main Render
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
    if (!selectedCountry) return;
    
    const countryData = comparisonData.countries[selectedCountry];
    if (!countryData) return;
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const column = createGenerationColumn(gen, countryData.generations[gen]);
        grid.appendChild(column);
    });
}

// ============================================================================
// Generation Column
// ============================================================================
function createGenerationColumn(gen, documents) {
    const config = GEN_CONFIG[gen];
    const column = document.createElement('div');
    column.className = 'gen-column';
    column.style.setProperty('--gen-color', config.color);
    
    // Header
    const header = document.createElement('div');
    header.className = 'gen-header';
    
    const title = document.createElement('h2');
    title.textContent = config.label;
    header.appendChild(title);
    
    const period = document.createElement('div');
    period.className = 'gen-period';
    period.textContent = config.period;
    header.appendChild(period);
    
    // Version selector if multiple versions
    if (documents.length > 1) {
        const versionNote = document.createElement('div');
        versionNote.className = 'version-note';
        versionNote.textContent = `${documents.length} versions submitted in this generation`;
        header.appendChild(versionNote);
        
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
        });
        header.appendChild(versionSelect);
    }
    
    column.appendChild(header);
    
    // Content
    const content = document.createElement('div');
    content.className = 'gen-content';
    
    if (documents.length === 0) {
        content.innerHTML = '<div class="no-data">No NDC submitted in this generation</div>';
    } else {
        const doc = documents[selectedVersions[gen]];
        content.appendChild(createDocumentContent(gen, doc));
    }
    
    column.appendChild(content);
    return column;
}

// ============================================================================
// Document Content
// ============================================================================
function createDocumentContent(gen, doc) {
    const container = document.createElement('div');
    
    // Date
    if (doc.date) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'doc-date';
        dateDiv.innerHTML = `<strong>Date:</strong> ${doc.date}`;
        container.appendChild(dateDiv);
    }
    
    // SECTION 1: TARGETS
    container.appendChild(createTargetsSection(doc));
    
    // SECTION 2: MEASURES
    container.appendChild(createMeasuresSection(gen, doc));
    
    return container;
}

// ============================================================================
// TARGETS SECTION
// ============================================================================
function createTargetsSection(doc) {
    const section = document.createElement('div');
    section.className = 'section';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Targets';
    section.appendChild(title);
    
    // Group targets by type
    const mitigationTargets = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target');
    const adaptationTargets = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target');
    const netZeroTargets = doc.targets.filter(t => t.target_area === 'Net zero target');
    
    // Mitigation Targets
    section.appendChild(createTargetSubsection('Transport Mitigation Targets', mitigationTargets));
    
    // Adaptation Targets
    section.appendChild(createTargetSubsection('Transport Adaptation Targets', adaptationTargets));
    
    // Net Zero Targets
    section.appendChild(createTargetSubsection('Net Zero Targets', netZeroTargets));
    
    return section;
}

function createTargetSubsection(title, targets) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = title;
    subsection.appendChild(subsectionTitle);
    
    if (targets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
    } else {
        targets.forEach(target => {
            const item = document.createElement('div');
            item.className = 'target-item';
            
            // Content/quote
            const content = document.createElement('div');
            content.className = 'target-content';
            content.textContent = target.content;
            item.appendChild(content);
            
            // Meta information
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
            subsection.appendChild(item);
        });
    }
    
    return subsection;
}

// ============================================================================
// MEASURES SECTION
// ============================================================================
function createMeasuresSection(gen, doc) {
    const section = document.createElement('div');
    section.className = 'section';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Measures';
    section.appendChild(title);
    
    // Mitigation Measures
    section.appendChild(createMitigationSubsection(gen, doc.mitigation_measures));
    
    // Adaptation Measures
    section.appendChild(createAdaptationSubsection(gen, doc.adaptation_measures));
    
    return section;
}

function createMitigationSubsection(gen, measures) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = 'Mitigation Measures';
    subsection.appendChild(subsectionTitle);
    
    const categories = Object.keys(measures);
    
    if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
        return subsection;
    }
    
    // Initialize active category if not set
    if (!activeCategoryMitigation[gen]) {
        activeCategoryMitigation[gen] = categories[0];
    }
    
    // Category tabs
    const tabs = document.createElement('div');
    tabs.className = 'category-tabs';
    categories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        if (cat === activeCategoryMitigation[gen]) tab.classList.add('active');
        tab.textContent = cat;
        tab.addEventListener('click', () => {
            activeCategoryMitigation[gen] = cat;
            renderComparison();
        });
        tabs.appendChild(tab);
    });
    subsection.appendChild(tabs);
    
    // Measures for active category
    const activeMeasures = measures[activeCategoryMitigation[gen]] || [];
    activeMeasures.forEach(measure => {
        const item = document.createElement('div');
        item.className = 'measure-item';
        
        const quote = document.createElement('div');
        quote.className = 'measure-quote';
        quote.textContent = measure.quote;
        item.appendChild(quote);
        
        const meta = document.createElement('div');
        meta.className = 'measure-meta';
        
        if (measure.asi && measure.asi !== '—') {
            const asiRow = document.createElement('div');
            asiRow.className = 'measure-meta-row';
            asiRow.innerHTML = `<span class="measure-meta-label">ASI:</span><span>${measure.asi}</span>`;
            meta.appendChild(asiRow);
        }
        
        if (measure.modes && measure.modes !== '—') {
            const modesRow = document.createElement('div');
            modesRow.className = 'measure-meta-row';
            modesRow.innerHTML = `<span class="measure-meta-label">Modes:</span><span>${measure.modes}</span>`;
            meta.appendChild(modesRow);
        }
        
        item.appendChild(meta);
        subsection.appendChild(item);
    });
    
    return subsection;
}

function createAdaptationSubsection(gen, measures) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = 'Adaptation Measures';
    subsection.appendChild(subsectionTitle);
    
    const categories = Object.keys(measures);
    
    if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
        return subsection;
    }
    
    // Initialize active category if not set
    if (!activeCategoryAdaptation[gen]) {
        activeCategoryAdaptation[gen] = categories[0];
    }
    
    // Category tabs
    const tabs = document.createElement('div');
    tabs.className = 'category-tabs';
    categories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        if (cat === activeCategoryAdaptation[gen]) tab.classList.add('active');
        tab.textContent = cat;
        tab.addEventListener('click', () => {
            activeCategoryAdaptation[gen] = cat;
            renderComparison();
        });
        tabs.appendChild(tab);
    });
    subsection.appendChild(tabs);
    
    // Measures for active category
    const activeMeasures = measures[activeCategoryAdaptation[gen]] || [];
    activeMeasures.forEach(measure => {
        const item = document.createElement('div');
        item.className = 'measure-item';
        
        const quote = document.createElement('div');
        quote.className = 'measure-quote';
        quote.textContent = measure.quote;
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
        
        subsection.appendChild(item);
    });
    
    return subsection;
}