// =============================================================
// SUPABASE CONFIGURATION
// Handles cloud storage for GeoJSON files only
// =============================================================
const SUPABASE_URL = "https://lffazhbwvorwxineklsy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lfh2zlIiTSMB0U-Fe5o6Jg_mJ1qkznh";

// Storage bucket for GeoJSON layers
const GEOJSON_BUCKET = "geojson-files";

// Create Supabase client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =============================================================
// MAP INITIALIZATION
// Sets up Leaflet map and base layers
// =============================================================
const map = L.map("map").setView([0, 0], 2);

const baseMaps = {
  streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  )
};

// Default basemap
baseMaps.streets.addTo(map);

// Layer group for GeoJSON
const geojsonLayerGroup = L.layerGroup().addTo(map);

// Basemap selector dropdown
document.getElementById("baseMapSelect").addEventListener("change", e => {
  Object.values(baseMaps).forEach(l => map.removeLayer(l));
  baseMaps[e.target.value].addTo(map);
});


// =============================================================
// GEOJSON LOADING
// Downloads GeoJSON from Supabase and renders on map
// =============================================================
async function loadGeoJSONFile(name) {
  const { data } = sb.storage.from(GEOJSON_BUCKET).getPublicUrl(name);

  const res = await fetch(data.publicUrl);
  const geojson = await res.json();

  // Random color per layer (GIS-style)
  const color = "#" + Math.floor(Math.random() * 16777215).toString(16);

  const layer = L.geoJSON(geojson, {
    style: { color, weight: 2 },

    onEachFeature: (feature, layer) => {
      if (!feature.properties) return;

      const content = Object.entries(feature.properties)
        .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
        .join("<br>");

      layer.bindPopup(content);
    }
  });

  geojsonLayerGroup.addLayer(layer);
  map.fitBounds(layer.getBounds());

  // Track for legend
  openLayers.set(name, color);
  updateLegend();
}
// =============================================================
// MAP LEGEND
// Shows currently visible GeoJSON layers
// =============================================================
const legend = document.getElementById("mapLegend");
const legendList = document.getElementById("legendList");

// Track open layers
const openLayers = new Map();

function updateLegend() {
  legendList.innerHTML = "";

  if (openLayers.size === 0) {
    legend.style.display = "none";
    return;
  }

  legend.style.display = "block";

  openLayers.forEach((color, name) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span style="
        display:inline-block;
        width:12px;
        height:12px;
        background:${color};
        margin-right:6px;
        border-radius:2px;
      "></span>
      ${name}
    `;

    legendList.appendChild(li);
  });
}



// =============================================================
// FILE LISTING FROM SUPABASE
// Shows Open/Delete buttons for GeoJSON
// =============================================================
async function listFiles() {
  const ul = document.getElementById("savedFiles");
  ul.innerHTML = "";

  const { data: geoFiles } = await sb.storage.from(GEOJSON_BUCKET).list();

  geoFiles?.forEach(file => {
    const li = document.createElement("li");

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.onclick = () => loadGeoJSONFile(file.name);

    const delBtn = document.createElement("button");
delBtn.textContent = "Delete";
delBtn.onclick = async () => {
  await sb.storage.from(GEOJSON_BUCKET).remove([file.name]);

  // Remove from legend tracking
  openLayers.delete(file.name);
  updateLegend();

  listFiles();
};


    li.append(openBtn, delBtn, document.createTextNode(" " + file.name));
    ul.appendChild(li);
  });
}


// =============================================================
// FILE UPLOAD HANDLER
// Uploads GeoJSON files to Supabase and displays them
// =============================================================
async function uploadFile(file) {
  if (!file) return;

  await sb.storage.from(GEOJSON_BUCKET).upload(file.name, file, { upsert: true });
  await loadGeoJSONFile(file.name);

  listFiles();
}


// =============================================================
// DRAG & DROP + FILE INPUT
// Connects UI upload box to upload handler
// =============================================================
const dropZone = document.getElementById("dropZone");

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".geojson,.json";

dropZone.onclick = () => fileInput.click();

dropZone.ondragover = e => e.preventDefault();

dropZone.ondrop = e => {
  e.preventDefault();
  uploadFile(e.dataTransfer.files[0]);
};

fileInput.onchange = e => uploadFile(e.target.files[0]);


// =============================================================
// INITIAL LOAD
// Pulls existing GeoJSON files from Supabase on page open
// =============================================================
// =============================================================
// RESET MAP VIEW BUTTON
// Zooms out, removes open layers, and clears legend
// =============================================================
const resetMapBtn = document.getElementById("resetMapBtn");

if (resetMapBtn) {
  resetMapBtn.onclick = () => {
    // Remove all GeoJSON layers from map
    geojsonLayerGroup.clearLayers();

    // Clear legend tracking
    openLayers.clear();
    updateLegend();

    // Return to world view
    map.setView([0, 0], 2);
  };
}

}
// =============================================================
// SIDEBAR / MOBILE MENU CONTROL
// Handles opening/closing sidebar on phones and desktop
// =============================================================
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const sidebar = document.querySelector(".sidebar");
const appContainer = document.querySelector(".app-container");

// Mobile menu button
if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");

    // Keep readable label for non-technical users
    mobileMenuBtn.innerHTML = isOpen ? "✕ Close" : "☰ Menu";

    // Fix Leaflet sizing after layout change
    setTimeout(() => map.invalidateSize(), 250);
  });
}

// Desktop collapse toggle
if (toggleSidebarBtn && appContainer) {
  toggleSidebarBtn.addEventListener("click", () => {
    appContainer.classList.toggle("collapsed");

    toggleSidebarBtn.textContent =
      appContainer.classList.contains("collapsed") ? "▶" : "◀";

    setTimeout(() => map.invalidateSize(), 250);
  });
}


listFiles();
