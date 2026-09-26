const ROUTES = [
  { id:"dover-calais", label:"Dover → Calais", from:"Dover", to:"Calais", operator:"DFDS", source:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-france/dover-calais" },
  { id:"calais-dover", label:"Calais → Dover", from:"Calais", to:"Dover", operator:"DFDS", source:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-uk/calais-dover" },
  { id:"dover-dunkirk", label:"Dover → Dunkirk", from:"Dover", to:"Dunkirk", operator:"DFDS", source:"https://www.dfds.com/en-gb/passenger-ferries/ferry-crossings/ferries-to-france/dover-dunkirk" },
  { id:"dunkirk-dover", label:"Dunkirk → Dover", from:"Dunkirk", to:"Dover", operator:"DFDS", source:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-uk/dunkirk-dover" }
];

const STATUS_LABEL = {
  on_time:"IDŐBEN", boarding:"BESZÁLLÁS", departing:"INDUL",
  delayed:"KÉSIK", cancelled:"TÖRÖLVE", arrived:"MEGÉRKEZETT", unknown:"NINCS ADAT"
};

const select = document.getElementById("routeSelect");
const body = document.getElementById("boardBody");
const routeName = document.getElementById("routeName");
const routeMeta = document.getElementById("routeMeta");
const sourceLabel = document.getElementById("sourceLabel");
const sourceLink = document.getElementById("sourceLink");
const refreshText = document.getElementById("refreshText");
const liveDot = document.getElementById("liveDot");

for (const route of ROUTES) {
  const option = document.createElement("option");
  option.value = route.id;
  option.textContent = route.label;
  select.append(option);
}

const savedRoute = localStorage.getItem("idesuss:ferry-route");
if (savedRoute && ROUTES.some(r => r.id === savedRoute)) select.value = savedRoute;

function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function renderRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Ehhez a relációhoz most nincs megjeleníthető indulási adat.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(row => {
    const status = row.status || "unknown";
    const expected = row.estimatedDeparture || row.departure || "—";
    return `<tr>
      <td class="time">${esc(row.departure || "—")}</td>
      <td class="operator">${esc(row.operator || "—")}</td>
      <td>${esc(row.vessel || "—")}</td>
      <td>${esc(expected)}</td>
      <td><span class="status ${esc(status)}">${esc(STATUS_LABEL[status] || status.toUpperCase())}</span></td>
    </tr>`;
  }).join("");
}

async function loadRoute() {
  const route = ROUTES.find(r => r.id === select.value) || ROUTES[0];
  localStorage.setItem("idesuss:ferry-route", route.id);
  routeName.textContent = route.label;
  routeMeta.textContent = `${route.operator} • élő / dinamikus forrás`;
  sourceLabel.textContent = `Forrás: ${route.operator}`;
  sourceLink.href = route.source;
  refreshText.textContent = "Frissítés…";
  liveDot.className = "live-dot";
  body.innerHTML = '<tr><td colspan="5" class="empty">Adatok betöltése…</td></tr>';

  try {
    const response = await fetch(`/api/ferry-board?route=${encodeURIComponent(route.id)}`, { headers:{Accept:"application/json"}, cache:"no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderRows(payload.departures || []);
    refreshText.textContent = payload.updatedAt ? `frissítve: ${new Date(payload.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}` : "frissítve";
    liveDot.classList.add(payload.stale ? "warn" : "ok");
  } catch (error) {
    console.warn("Ferry board backend unavailable", error);
    renderRows([]);
    refreshText.textContent = "élő adatforrás bekötés alatt";
    liveDot.classList.add("warn");
  }
}

select.addEventListener("change", loadRoute);
loadRoute();
setInterval(loadRoute, 60_000);
