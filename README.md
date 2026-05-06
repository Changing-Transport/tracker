# NDC Transport Tracker Dashboard

Interactive dashboard for visualizing NDC transport targets and mitigation measures.

## Live Dashboard

**Dashboard URL:** `https://belentdc.github.io/tracker/`

Embed in WordPress:
```html
<iframe 
  src="https://belentdc.github.io/tracker/" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border: none;">
</iframe>
```

---

## How to Update Data

### Method: GitHub Repository

1. Replace the Excel file `GIZ-SLOCAT_Transport-Tracker-database.xlsx` in the `data/` folder
2. Click "Commit to main" 
3. Click "Push origin"
4. Done!

---

## 📁 Repository Structure

```
ndc-tracker/
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx  ← UPDATE THIS
│   └── processed/
│       └── data.json                               ← Auto-generated
│
├── .github/
│   └── workflows/
│       └── update-data.yml                         ← GitHub Actions config
│
├── index.html                                      ← Dashboard HTML
├── styles.css                                      ← Styles
├── script.js                                       ← JavaScript
├── update_data.py                                  ← Data processing script
└── README.md                                       ← This file
```

---

## How It Works

1. **You upload** a new Excel file to the `data/` folder
2. **GitHub Actions** automatically detects the change
3. **Python script** processes the Excel and generates `data.json`
4. **Dashboard** reads the JSON and updates visualizations
5. **Changes go live** on GitHub Pages automatically

---

## Dashboard Features

### Tab 1: Progress in NDC Transport Targets
- Bar chart showing % of NDCs with transport targets across 3 generations
- Interactive map with country-level data
- Filters: Generation, Region

### Tab 2: Leading Measures for Decarbonisation
- Bar chart of top mitigation measure categories
- Heat map showing measure mentions by country
- Filters: Generation, Region

---

## 🔧 Technical Details

**Frontend:**
- Pure HTML/CSS/JavaScript
- Chart.js for visualizations
- Leaflet.js for maps
- Fully responsive

**Data Processing:**
- Python 3.11+
- openpyxl library
- Runs automatically in GitHub Actions

**Hosting:**
- GitHub Pages (free)
- Auto-deploys on every update
- HTTPS included

---

## Troubleshooting

### Dashboard not updating after uploading Excel?

1. Check GitHub Actions tab in your repository
2. Look for the "Update Dashboard Data" workflow
3. If it failed, check the error logs
4. Common issues:
   - Excel file name changed (must be exact: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`)
   - Excel file corrupted
   - Wrong folder (must be in `data/` folder)

### How to check if data updated?

Visit: `https://[your-username].github.io/ndc-tracker/data/processed/data.json`

You should see the JSON data. Check the modification date.

### Dashboard shows old data?

- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Wait 2-3 minutes after uploading (GitHub Pages takes time to deploy)

---

## 📄 License

Data: GIZ-SLOCAT Transport Tracker Database  
Dashboard: Custom implementation for GIZ/SLOCAT

---

## 🎉 Credits

**Data Source:** GIZ-SLOCAT Partnership
**Dashboard:** Interactive visualization platform for NDC tracking

Last updated: Auto-generated on each data update
