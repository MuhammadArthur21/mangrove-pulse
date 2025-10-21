document.addEventListener("DOMContentLoaded", () => {
  // === KONFIGURASI & VARIABEL GLOBAL ===
  const API_BASE_URL = ""; // The backend is now on the same domain
  let map, activeLayer, drawnItems, drawControl, timeSeriesChart, pieChart;
  let currentLang = 'id';

  // DOM Elements
  let layerControlContainer, analyzeBtn, exportPdfBtn, exportTiffBtn, exportDriveBtn, analysisPanel, legendContainer, themeSwitcher, langSwitcher, yearSelector;

  // === KAMUS TERJEMAHAN (i18n) ===
  const translations = {
    id: {
        title: "MangrovePulse Dashboard", theme: "Tema", mapLayers: "Layer Peta", analysisTools: "Alat Analisis", analyzeArea: "Analisis Area", exportPDF: "Ekspor Laporan (PDF)", exportTIFF: "Ekspor GeoTIFF", exportToDrive: "Ekspor ke Drive (Area Besar)", legend: "Legenda", analysisResult: "Hasil Analisis", footer: "Dikembangkan oleh Muhammad Yusyaf Arthur — UGM 🌿 2025", pointAnalysis: "Analisis Titik", zonalStatistics: "Statistik Zonal", meanNDVI: "Rerata NDVI", meanNDWI: "Rerata NDWI", meanMVI: "Rerata MVI", totalArea: "Total Area", fetching_indices: "Mengambil nilai indeks...", analyzing_area: "Menganalisis area, harap tunggu...", loading_timeseries: "Memuat grafik time series...", preparing_pdf: "Menyiapkan PDF...", preparing_tiff: "Menyiapkan GeoTIFF...", preparing_drive_export: "Memulai ekspor ke Drive...", drive_export_started: "Tugas ekspor ke Google Drive telah dimulai. Periksa folder 'MangrovePulse_Exports' di Drive Anda dalam beberapa menit.", year: "Tahun",
        legend_ndvi: [ { color: '#1a9850', label: 'Vegetasi Sangat Padat (> 0.6)' }, { color: '#a6d96a', label: 'Vegetasi Padat (0.4 - 0.6)' }, { color: '#ffffbf', label: 'Vegetasi Sedang (0.2 - 0.4)' }, { color: '#fdae61', label: 'Vegetasi Jarang (0 - 0.2)' }, { color: '#d73027', label: 'Non-Vegetasi / Tanah (< 0)' } ],
        legend_ndwi: [ { color: '#ff0000', label: 'Lahan Kering (< -0.2)' }, { color: '#ffff00', label: 'Lahan Lembab (-0.2 - 0)' }, { color: '#00ffff', label: 'Air Dangkal (0 - 0.2)' }, { color: '#0000ff', label: 'Air Dalam (> 0.2)' } ],
        legend_mvi: [ { color: '#1a9850', label: 'Mangrove Padat (> 0.6)' }, { color: '#a6d96a', label: 'Mangrove Sedang (0.3 - 0.6)' }, { color: '#ffffbf', label: 'Mangrove Jarang (0.1 - 0.3)' }, { color: '#fdae61', label: 'Non-Mangrove (< 0.1)' } ],
        no_legend: "Tidak ada legenda untuk layer ini."
    },
    en: {
        title: "MangrovePulse Dashboard", theme: "Theme", mapLayers: "Map Layers", analysisTools: "Analysis Tools", analyzeArea: "Analyze Area", exportPDF: "Export Report (PDF)", exportTIFF: "Export GeoTIFF", exportToDrive: "Export to Drive (Large Area)", legend: "Legend", analysisResult: "Analysis Result", footer: "Developed by Muhammad Yusyaf Arthur — UGM 🌿 2025", pointAnalysis: "Point Analysis", zonalStatistics: "Zonal Statistics", meanNDVI: "Mean NDVI", meanNDWI: "Mean NDWI", meanMVI: "Mean MVI", totalArea: "Total Area", fetching_indices: "Fetching indices...", analyzing_area: "Analyzing area, please wait...", loading_timeseries: "Loading time series chart...", preparing_pdf: "Preparing PDF...", preparing_tiff: "Preparing GeoTIFF...", preparing_drive_export: "Starting export to Drive...", drive_export_started: "Export task to Google Drive has been started. Check your 'MangrovePulse_Exports' folder in your Drive in a few minutes.", year: "Year",
        legend_ndvi: [ { color: '#1a9850', label: 'Very Dense Vegetation (> 0.6)' }, { color: '#a6d96a', label: 'Dense Vegetation (0.4 - 0.6)' }, { color: '#ffffbf', label: 'Moderate Vegetation (0.2 - 0.4)' }, { color: '#fdae61', label: 'Sparse Vegetation (0 - 0.2)' }, { color: '#d73027', label: 'Non-Vegetation / Soil (< 0)' } ],
        legend_ndwi: [ { color: '#ff0000', label: 'Dry Land (< -0.2)' }, { color: '#ffff00', label: 'Moist Land (-0.2 - 0)' }, { color: '#00ffff', label: 'Shallow Water (0 - 0.2)' }, { color: '#0000ff', label: 'Deep Water (> 0.2)' } ],
        legend_mvi: [ { color: '#1a9850', label: 'Dense Mangrove (> 0.6)' }, { color: '#a6d96a', label: 'Moderate Mangrove (0.3 - 0.6)' }, { color: '#ffffbf', label: 'Sparse Mangrove (0.1 - 0.3)' }, { color: '#fdae61', label: 'Non-Mangrove (< 0.1)' } ],
        no_legend: "No legend for this layer."
    }
  };

  // === INISIALISASI APLIKASI ===
  function init() {
    layerControlContainer = document.getElementById("layer-control");
    analyzeBtn = document.getElementById("analyze-btn");
    exportPdfBtn = document.getElementById("export-pdf-btn");
    exportTiffBtn = document.getElementById("export-tiff-btn");
    exportDriveBtn = document.getElementById("export-drive-btn");
    analysisPanel = document.getElementById("analysis-panel");
    legendContainer = document.getElementById("legend");
    themeSwitcher = document.getElementById("theme-switcher");
    langSwitcher = document.getElementById("lang-switcher");
    yearSelector = document.getElementById("year-selector");

    setupMap();
    setupLayerControls();
    setupYearSelector();
    setupDrawControls();
    loadTheme();
    loadLanguage();
    setupEventListeners();
    switchLayer();
  }

  // === FUNGSI BAHASA & TEMA ===
  function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mangrovePulseLang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
    const activeLayerName = document.querySelector('input[name="layer"]:checked')?.value;
    if(activeLayerName) {
        updateLegend(activeLayerName);
    }
  }

  function loadLanguage() {
    const savedLang = localStorage.getItem('mangrovePulseLang') || 'id';
    switchLanguage(savedLang);
  }

  function switchTheme(themeName) {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-ocean');
    document.documentElement.classList.add(themeName);
    localStorage.setItem('mangrovePulseTheme', themeName);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem('mangrovePulseTheme') || 'theme-dark';
    switchTheme(savedTheme);
  }

  // === FUNGSI-FUNGSI PETA & LEGENDA ===

  function setupMap() {
    map = L.map("map").setView([-7.8, 110.4], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  }

  async function switchLayer() {
    const layerName = document.querySelector('input[name="layer"]:checked').value;
    const selectedYear = yearSelector.value;
    updateLegend(layerName);
    if (activeLayer) map.removeLayer(activeLayer);
    if (layerName === "Satellite") {
        activeLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: '&copy; Google Satellite' }).addTo(map);
        return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/map_layer/${layerName}?year=${selectedYear}`);
      const data = await response.json();
      if (data.tile_url) {
        activeLayer = L.tileLayer(data.tile_url, { attribution: `MangrovePulse | ${layerName} (${selectedYear})`, opacity: 0.7 }).addTo(map);
      } else { 
        console.error("Error fetching tile layer:", data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (error) { console.error(`Failed to load ${layerName} layer:`, error); }
  }

  function updateLegend(layerName) {
    legendContainer.innerHTML = "";
    const key = `legend_${layerName.toLowerCase()}`;
    const items = translations[currentLang][key];
    if (!items || items.length === 0) {
        legendContainer.innerHTML = `<p class="text-[var(--color-text-muted)]">${translations[currentLang].no_legend}</p>`;
        return;
    }
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `<div class="w-4 h-4 mr-2" style="background-color: ${item.color};"></div> ${item.label}`;
        legendContainer.appendChild(div);
    });
  }

  function setupLayerControls() {
    const layers = ["NDVI", "NDWI", "MVI", "Satellite"];
    layers.forEach((layer) => {
      const label = document.createElement("label");
      label.className = "flex items-center space-x-2 cursor-pointer";
      label.innerHTML = `<input type="radio" name="layer" value="${layer}" class="form-radio text-[var(--color-primary)]" ${layer === "NDVI" ? "checked" : ""}><span>${layer}</span>`;
      layerControlContainer.appendChild(label);
    });
    layerControlContainer.addEventListener("change", switchLayer);
  }

  function setupYearSelector() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2016; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.innerText = year;
        yearSelector.appendChild(option);
    }
  }

  function setupDrawControls() {
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawControl = new L.Control.Draw({ edit: { featureGroup: drawnItems }, draw: { polygon: { shapeOptions: { color: 'var(--color-primary)' } }, rectangle: { shapeOptions: { color: 'var(--color-primary)' } }, polyline: { shapeOptions: { color: '#f3de2c' } }, marker: {}, circle: false, circlemarker: false } });
    map.addControl(drawControl);
  }

  // === FUNGSI INTERAKSI & EVENT ===

  function setupEventListeners() {
    map.on("click", onMapClick);
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      const type = event.layerType;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      if (type === 'polygon' || type === 'rectangle') {
        analyzeBtn.classList.remove("hidden");
        exportTiffBtn.classList.remove("hidden");
        exportDriveBtn.classList.remove("hidden");
      } else {
        analyzeBtn.classList.add("hidden");
        exportTiffBtn.classList.add("hidden");
        exportDriveBtn.classList.add("hidden");
      }
      exportPdfBtn.classList.add("hidden");
    });
    analyzeBtn.addEventListener("click", () => { if (drawnItems.getLayers().length > 0) analyzeArea(drawnItems.toGeoJSON().features[0].geometry); });
    exportPdfBtn.addEventListener("click", exportToPDF);
    exportTiffBtn.addEventListener("click", exportToTIFF);
    exportDriveBtn.addEventListener("click", exportToDrive);
    themeSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('theme-btn')) switchTheme(e.target.dataset.theme); });
    langSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('lang-btn')) switchLanguage(e.target.dataset.lang); });
    yearSelector.addEventListener('change', switchLayer);
  }

  async function onMapClick(e) {
    const { lat, lng } = e.latlng;
    const popup = L.popup().setLatLng(e.latlng).setContent(translations[currentLang].fetching_indices).openOn(map);
    try {
      const response = await fetch(`${API_BASE_URL}/indices?lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.status === "OK") {
        const { NDVI, NDWI, MVI } = data.indices;
        const content = `
          <div class="font-sans">
            <h4 class="font-bold text-md mb-1">${translations[currentLang].pointAnalysis}</h4>
            <strong>NDVI:</strong> ${NDVI?.toFixed(3) ?? "N/A"}<br>
            <strong>NDWI:</strong> ${NDWI?.toFixed(3) ?? "N/A"}<br>
            <strong>MVI:</strong> ${MVI?.toFixed(3) ?? "N/A"}<br>
            <hr class="my-1 border-[var(--color-border)]">
            <small class="text-[var(--color-text-muted)]">Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}</small>
          </div>
        `;
        popup.setContent(content);
      } else { popup.setContent(`Error: ${data.error}`); }
    } catch (error) { popup.setContent("Gagal mengambil data."); console.error("Error on map click:", error); }
  }

  // === FUNGSI ANALISIS & CHART ===

  async function analyzeArea(geoJson) {
    analysisPanel.classList.remove("hidden");
    exportPdfBtn.classList.add("hidden");
    const statsContainer = document.getElementById("stats-container");
    statsContainer.innerHTML = `<p class='text-lg'>${translations[currentLang].analyzing_area}</p>`;
    if (timeSeriesChart) timeSeriesChart.destroy();
    if (pieChart) pieChart.destroy();
    document.getElementById("chart-container").innerHTML = '<canvas id="timeseries-chart"></canvas>';
    document.getElementById("pie-chart-container").innerHTML = '<canvas id="pie-chart"></canvas>';
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-area`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geoJson) });
      const results = await response.json();
      if (results.status === "OK") {
        const { NDVI, NDWI, MVI } = results.stats;
        const areaHa = (results.area_m2 / 10000).toFixed(2);
        statsContainer.innerHTML = `
            <h3 class="font-bold text-xl mb-2">${translations[currentLang].zonalStatistics} (${results.year})</h3>
            <div class="space-y-1">
                <p><strong>${translations[currentLang].meanNDVI}:</strong> <span class="font-mono text-lg text-[var(--color-primary)]">${NDVI?.toFixed(3) ?? 'N/A'}</span></p>
                <p><strong>${translations[currentLang].meanNDWI}:</strong> <span class="font-mono text-lg text-blue-400">${NDWI?.toFixed(3) ?? 'N/A'}</span></p>
                <p><strong>${translations[currentLang].meanMVI}:</strong> <span class="font-mono text-lg text-yellow-400">${MVI?.toFixed(3) ?? 'N/A'}</span></p>
                <hr class="my-2 border-[var(--color-border)]">
                <p><strong>${translations[currentLang].totalArea}:</strong> <span class="font-mono text-lg">${areaHa} ha</span></p>
            </div>
        `;
        const centroid = drawnItems.getBounds().getCenter();
        renderTimeSeriesChart(centroid.lat, centroid.lng);
        renderPieChart(results.land_cover);
        exportPdfBtn.classList.remove("hidden");
      } else { statsContainer.innerHTML = `<p class="text-red-500">Error: ${results.error}</p>`; }
    } catch (error) { statsContainer.innerHTML = `<p class="text-red-500">Gagal terhubung ke server analisis.</p>`; console.error("Error analyzing area:", error); }
  }

  async function renderTimeSeriesChart(lat, lon) {
    const chartContainer = document.getElementById("chart-container");
    chartContainer.innerHTML = `<p>${translations[currentLang].loading_timeseries}</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/timeseries?lat=${lat}&lon=${lon}`);
        const result = await response.json();
        if (result.status === "OK") {
            const labels = result.timeline.map(d => d.year);
            const data = result.timeline.map(d => d.ndvi);
            chartContainer.innerHTML = '<canvas id="timeseries-chart"></canvas>';
            const ctx = document.getElementById('timeseries-chart').getContext('2d');
            timeSeriesChart = new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'Mean NDVI Trend', data: data, borderColor: 'var(--color-primary)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: translations[currentLang].ndvi_timeseries_title, color: 'var(--color-text-muted)' } }, scales: { y: { ticks: { color: 'var(--color-text-muted)' }, grid: { color: 'rgba(107, 114, 128, 0.3)' } }, x: { ticks: { color: 'var(--color-text-muted)' }, grid: { color: 'rgba(107, 114, 128, 0.3)' } } } }
            });
        } else { chartContainer.innerHTML = `<p class="text-red-500">Error: ${result.error}</p>`; }
    } catch (error) { chartContainer.innerHTML = `<p class="text-red-500">Gagal memuat data time series.</p>`; console.error("Error fetching time series:", error); }
  }

  function renderPieChart(landCoverData) {
    const { mangrove_area_m2, total_area_m2 } = landCoverData;
    const non_mangrove_area_m2 = total_area_m2 - mangrove_area_m2;
    const ctx = document.getElementById('pie-chart').getContext('2d');
    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [translations[currentLang].mangrove, translations[currentLang].non_mangrove], datasets: [{ data: [mangrove_area_m2, non_mangrove_area_m2], backgroundColor: ['var(--color-primary)', '#F97316'], borderColor: 'var(--color-surface)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'var(--color-text-muted)' } }, title: { display: true, text: translations[currentLang].land_cover_title, color: 'var(--color-text-muted)' } } }
    });
  }

  // === FUNGSI EKSPOR ===
  function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const reportPanel = document.getElementById('analysis-panel');
    exportPdfBtn.innerText = translations[currentLang].preparing_pdf;
    exportPdfBtn.disabled = true;
    const timeSeriesImgData = timeSeriesChart.toBase64Image();
    const pieChartImgData = pieChart.toBase64Image();
    const printableArea = reportPanel.cloneNode(true);
    const clonedTsCanvas = printableArea.querySelector('#timeseries-chart');
    const tsImg = document.createElement('img');
    tsImg.src = timeSeriesImgData;
    clonedTsCanvas.parentNode.replaceChild(tsImg, clonedTsCanvas);
    const clonedPieCanvas = printableArea.querySelector('#pie-chart');
    const pieImg = document.createElement('img');
    pieImg.src = pieChartImgData;
    clonedPieCanvas.parentNode.replaceChild(pieImg, clonedPieCanvas);
    printableArea.style.position = 'absolute';
    printableArea.style.top = '-9999px';
    printableArea.style.left = '0px';
    printableArea.style.height = 'auto';
    printableArea.style.width = reportPanel.offsetWidth + 'px';
    document.body.appendChild(printableArea);
    html2canvas(printableArea, { useCORS: true, allowTaint: true, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save("mangrove-pulse-report.pdf");
        document.body.removeChild(printableArea);
        exportPdfBtn.innerText = translations[currentLang].exportPDF;
        exportPdfBtn.disabled = false;
    });
  }

  async function exportToTIFF() {
    if (drawnItems.getLayers().length === 0) return;
    const layerName = document.querySelector('input[name="layer"]:checked').value;
    if (layerName === 'Satellite') {
        alert("Cannot export Satellite layer.");
        return;
    }
    exportTiffBtn.innerText = translations[currentLang].preparing_tiff;
    exportTiffBtn.disabled = true;
    try {
        const payload = { polygon: drawnItems.toGeoJSON().features[0].geometry, year: parseInt(yearSelector.value), index_name: layerName };
        const response = await fetch(`${API_BASE_URL}/export-tiff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "OK" && result.download_url) {
            window.open(result.download_url, '_blank');
        } else { alert(`Error exporting TIFF: ${result.error}`); }
    } catch (error) { alert("Failed to connect to the export server."); console.error("Error exporting TIFF:", error); }
    exportTiffBtn.innerText = translations[currentLang].exportTIFF;
    exportTiffBtn.disabled = false;
  }

  async function exportToDrive() {
    if (drawnItems.getLayers().length === 0) return;
    const layerName = document.querySelector('input[name="layer"]:checked').value;
    if (layerName === 'Satellite') {
        alert("Cannot export Satellite layer.");
        return;
    }
    exportDriveBtn.innerText = translations[currentLang].preparing_drive_export;
    exportDriveBtn.disabled = true;
    try {
        const payload = { polygon: drawnItems.toGeoJSON().features[0].geometry, year: parseInt(yearSelector.value), index_name: layerName };
        const response = await fetch(`${API_BASE_URL}/export-to-drive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "OK") {
            alert(result.message);
        } else { alert(`Error starting Drive export: ${result.error}`); }
    } catch (error) { alert("Failed to connect to the export server."); console.error("Error exporting to Drive:", error); }
    exportDriveBtn.innerText = translations[currentLang].exportToDrive;
    exportDriveBtn.disabled = false;
  }

  // === JALANKAN APLIKASI ===
  init();
});