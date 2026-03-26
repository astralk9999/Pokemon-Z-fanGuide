// ===== DATA STORE =====
const D = {
  locations: [], pokemon: [], items: [], moves: [], abilities: [],
  types: [], trainers: [], tms: {}, townmap: [], metadata: {}, walkthrough: {},
  locationItems: {}, megas: {}, trainerTypes: {}, formStats: {}, formsManifest: {},
  pokemonByName: {}, moveByName: {}, abilityByName: {}, itemByName: {}, typeByName: {}
};

let currentView = 'home';
let currentDetail = null;
let trainersPage = 0;
let trainersSearch = '';
let trainersClassFilter = '';
let trainerLocationMap = null;

// Simulator state
let simEnemy = null;
let simPlayer = null;
let simEnemySearch = '';
let simPlayerSearch = '';

// ===== TYPE NAMES =====
const TYPE_ES = {
  NORMAL:'Normal', FIRE:'Fuego', WATER:'Agua', ELECTRIC:'Electrico',
  GRASS:'Planta', ICE:'Hielo', FIGHTING:'Lucha', POISON:'Veneno',
  GROUND:'Tierra', FLYING:'Volador', PSYCHIC:'Psiquico', BUG:'Bicho',
  ROCK:'Roca', GHOST:'Fantasma', DRAGON:'Dragon', DARK:'Siniestro',
  STEEL:'Acero', FAIRY:'Hada'
};

const METHOD_ES = {
  Land:'Hierba', Water:'Surf', Cave:'Cueva', OldRod:'Cana Vieja',
  GoodRod:'Cana Buena', SuperRod:'Super Cana', RockSmash:'Golpe Roca',
  HeadbuttLow:'Cabezazo', HeadbuttHigh:'Cabezazo (raro)'
};

// ===== LOAD DATA =====
async function loadData() {
  const files = ['locations','pokemon','items','moves','abilities','types','trainers','tms','townmap','metadata','walkthrough','location-items','megas','trainertypes','form-stats','forms-manifest'];
  const keys  = ['locations','pokemon','items','moves','abilities','types','trainers','tms','townmap','metadata','walkthrough','locationItems','megas','trainerTypes','formStats','formsManifest'];
  const cacheBust = 'v=15';
  const results = await Promise.all(files.map(f =>
    fetch(`data/${f}.json?${cacheBust}`).then(r => r.json()).catch(() => ({}))
  ));
  keys.forEach((k, i) => D[k] = results[i]);

  for (const p of D.pokemon) { if (p.internalName) D.pokemonByName[p.internalName] = p; }
  for (const m of D.moves)   { if (m.internalName) D.moveByName[m.internalName] = m; }
  for (const a of D.abilities){ if (a.internalName) D.abilityByName[a.internalName] = a; }
  D.abilityByDisplayName = {};
  for (const a of D.abilities){ if (a.name) D.abilityByDisplayName[a.name] = a; }
  for (const it of D.items)   { if (it.internalName) D.itemByName[it.internalName] = it; }
  for (const t of D.types)    { if (t.internalName) D.typeByName[t.internalName] = t; }
}

// ===== HELPERS =====
const $ = id => document.getElementById(id);

function pokemonId(p) { return String(p.id).padStart(3, '0'); }
function spriteUrl(p) { return `sprites/${pokemonId(p)}.png`; }
function iconUrl(p) { return `icons/icon${pokemonId(p)}.png`; }

function typeBadge(type) {
  if (!type) return '';
  return `<span class="type-badge type-${type}">${TYPE_ES[type] || type}</span>`;
}

function pokemonLink(internalName) {
  const p = D.pokemonByName[internalName];
  if (!p) return internalName;
  return `<span class="pokemon-cell" onclick="navigate('pokemon',${p.id})">
    <img class="pokemon-icon" src="${iconUrl(p)}" loading="lazy" onerror="this.style.display='none'">
    ${p.name}
  </span>`;
}

function statColor(val) {
  if (val < 50) return 'stat-low';
  if (val < 80) return 'stat-mid';
  if (val < 110) return 'stat-good';
  return 'stat-high';
}

// ===== TYPE EFFECTIVENESS =====
function getTypeEffectiveness(type1, type2) {
  const ALL_TYPES = Object.keys(TYPE_ES);
  const result = {};
  for (const atkType of ALL_TYPES) {
    let mult = 1;
    const t1 = D.typeByName[type1];
    if (t1) {
      if (t1.weaknesses && t1.weaknesses.includes(atkType)) mult *= 2;
      else if (t1.resistances && t1.resistances.includes(atkType)) mult *= 0.5;
      else if (t1.immunities && t1.immunities.includes(atkType)) mult *= 0;
    }
    if (type2) {
      const t2 = D.typeByName[type2];
      if (t2) {
        if (t2.weaknesses && t2.weaknesses.includes(atkType)) mult *= 2;
        else if (t2.resistances && t2.resistances.includes(atkType)) mult *= 0.5;
        else if (t2.immunities && t2.immunities.includes(atkType)) mult *= 0;
      }
    }
    if (mult !== 1) result[atkType] = mult;
  }
  return result;
}

function restoreFocus(inputId) {
  const el = document.getElementById(inputId);
  if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
}

// ===== NAVIGATION (fix: encode/decode URI) =====
function navigate(view, detail) {
  currentView = view;
  currentDetail = detail;
  const hash = detail != null ? `${view}/${encodeURIComponent(detail)}` : view;
  window.location.hash = hash;
  render();
  window.scrollTo(0, 0);
}

function handleHash() {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (!hash) { currentView = 'home'; currentDetail = null; render(); return; }
  const slashIdx = hash.indexOf('/');
  if (slashIdx === -1) {
    currentView = hash;
    currentDetail = null;
  } else {
    currentView = hash.substring(0, slashIdx);
    currentDetail = hash.substring(slashIdx + 1);
  }
  if (currentDetail && !isNaN(currentDetail) && currentView === 'pokemon') {
    currentDetail = parseInt(currentDetail);
  }
  render();
}

// ===== SIDEBAR =====
function renderSidebar() {
  const sb = $('sidebar');
  const main = $('mainContent');
  let html = '';
  const viewsWithSidebar = ['locations','location','pokedex','pokemon','form','walkthrough'];
  const hasSidebar = viewsWithSidebar.includes(currentView);

  if (!hasSidebar) {
    sb.style.display = 'none';
    main.classList.add('no-sidebar');
  } else {
    sb.style.display = '';
    main.classList.remove('no-sidebar');
  }

  if (currentView === 'locations' || currentView === 'location') {
    const routes = D.locations.filter(l => l.name.startsWith('Ruta'));
    const towns = D.locations.filter(l => l.name.match(/^(Pueblo|Ciudad)/));
    const caves = D.locations.filter(l => !l.name.match(/^(Ruta|Pueblo|Ciudad)/));

    const renderGroup = (title, items) => {
      html += `<div class="sidebar-section">${title}</div>`;
      const seen = new Set();
      for (const loc of items) {
        if (seen.has(loc.name)) continue;
        seen.add(loc.name);
        const active = currentView === 'location' && currentDetail === loc.name ? 'active' : '';
        const count = Object.values(loc.encounters).reduce((s, arr) => s + arr.length, 0);
        html += `<div class="sidebar-item ${active}" onclick="navigate('location','${loc.name.replace(/'/g,"\\'")}')">
          ${loc.name} <span class="badge">${count}</span>
        </div>`;
      }
    };
    renderGroup('Rutas', routes);
    renderGroup('Pueblos y Ciudades', towns);
    renderGroup('Cuevas y Otros', caves);
  } else if (currentView === 'pokedex' || currentView === 'pokemon' || currentView === 'form') {
    html += `<div class="sidebar-section">Filtrar por Tipo (max 2)</div>`;
    for (const type of Object.keys(TYPE_ES)) {
      const active = pokedexFilters.includes(type) ? 'active' : '';
      html += `<div class="sidebar-item ${active}" onclick="togglePokedexFilter('${type}')">${typeBadge(type)}</div>`;
    }
    if (pokedexFilters.length) {
      html += `<div class="sidebar-item" onclick="pokedexFilters=[];pokedexPage=0;render()" style="color:var(--accent);text-align:center;margin-top:8px">Limpiar filtros</div>`;
    }
  } else if (currentView === 'walkthrough') {
    html += `<div class="sidebar-section">Secciones</div>`;
    if (D.walkthrough) {
      for (const [key, val] of Object.entries(D.walkthrough)) {
        const active = currentDetail === key ? 'active' : '';
        html += `<div class="sidebar-item ${active}" onclick="navigate('walkthrough','${key}')">${val.title}</div>`;
      }
    }
  }
  sb.innerHTML = html;
}

// ===== RENDER =====
function render() {
  const main = $('mainContent');
  document.querySelectorAll('.nav-tab').forEach(t => {
    const v = t.dataset.view;
    t.classList.toggle('active',
      v === currentView ||
      (currentView === 'location' && v === 'locations') ||
      (currentView === 'pokemon' && v === 'pokedex') ||
      (currentView === 'form' && v === 'pokedex') ||
      (currentView === 'item' && v === 'items')
    );
  });
  renderSidebar();

  switch (currentView) {
    case 'home': renderHome(main); break;
    case 'locations': renderLocations(main); break;
    case 'location': renderLocation(main, currentDetail); break;
    case 'pokedex': renderPokedex(main); break;
    case 'pokemon': renderPokemonDetail(main, currentDetail); break;
    case 'form': renderFormDetail(main, currentDetail); break;
    case 'items': renderItems(main); break;
    case 'item': renderItemDetail(main, currentDetail); break;
    case 'moves': renderMoves(main); break;
    case 'trainers': renderTrainers(main); break;
    case 'walkthrough': renderWalkthrough(main, currentDetail); break;
    case 'simulator': renderSimulator(main); break;
    default: renderHome(main);
  }
}

// ===== HOME =====
function renderHome(main) {
  // Count megas and Z forms from manifest
  let megaCount = 0, zFormCount = 0;
  for (const [id, forms] of Object.entries(D.formsManifest)) {
    for (const f of forms) {
      if (f.type === 'mega') megaCount++;
      else if (f.type === 'z-form') zFormCount++;
    }
  }
  // Count unique trainer classes
  const trainerClasses = new Set(D.trainers.map(t => {
    const tc = D.trainerTypes[t.class];
    return tc ? tc.displayName : t.class;
  }));
  // Pick 6 random pokemon for showcase
  const showcasePokemon = [];
  const pool = D.pokemon.filter(p => p.id > 0);
  for (let i = 0; i < 6 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    showcasePokemon.push(pool.splice(idx, 1)[0]);
  }

  main.innerHTML = `
    <div class="home-hero">
      <h1>Pokemon Z</h1>
      <p class="home-subtitle">Guia completa v2.16</p>
      <p>Toda la informacion sobre zonas, Pokemon, objetos, entrenadores y mas del fangame.</p>
      <div class="home-stats">
        <div class="home-stat-card" onclick="navigate('pokedex')" style="cursor:pointer">
          <div class="number">${D.pokemon.length}</div><div class="label">Pokemon</div>
        </div>
        <div class="home-stat-card" onclick="navigate('locations')" style="cursor:pointer">
          <div class="number">${D.locations.length}</div><div class="label">Zonas</div>
        </div>
        <div class="home-stat-card" onclick="navigate('trainers')" style="cursor:pointer">
          <div class="number">${D.trainers.length}</div><div class="label">Entrenadores</div>
        </div>
        <div class="home-stat-card" onclick="navigate('items')" style="cursor:pointer">
          <div class="number">${D.items.length}</div><div class="label">Objetos</div>
        </div>
        <div class="home-stat-card" onclick="navigate('moves')" style="cursor:pointer">
          <div class="number">${D.moves.length}</div><div class="label">Movimientos</div>
        </div>
        <div class="home-stat-card">
          <div class="number">${megaCount}</div><div class="label">Mega Evoluciones</div>
        </div>
      </div>
      <div class="quick-links">
        <div class="quick-link" onclick="navigate('pokedex')"><div class="ql-title">Pokedex</div><div class="ql-desc">Todos los Pokemon con stats, movimientos y formas</div></div>
        <div class="quick-link" onclick="navigate('locations')"><div class="ql-title">Zonas</div><div class="ql-desc">Rutas, ciudades y cuevas con encuentros</div></div>
        <div class="quick-link" onclick="navigate('trainers')"><div class="ql-title">Entrenadores</div><div class="ql-desc">${D.trainers.length} entrenadores con sus equipos</div></div>
        <div class="quick-link" onclick="navigate('items')"><div class="ql-title">Objetos</div><div class="ql-desc">Catalogo completo de items</div></div>
        <div class="quick-link" onclick="navigate('moves')"><div class="ql-title">Movimientos</div><div class="ql-desc">${D.moves.length} movimientos con detalles</div></div>
        <div class="quick-link" onclick="navigate('walkthrough')"><div class="ql-title">Guia Completa</div><div class="ql-desc">Walkthrough paso a paso de la historia</div></div>
      </div>
    </div>
    <div class="home-showcase">
      <div class="card"><div class="card-title">Pokemon al azar</div>
        <div class="pokemon-grid" style="margin:0">
          ${showcasePokemon.map(p => `<div class="pokemon-grid-item" onclick="navigate('pokemon',${p.id})" style="padding:8px">
            <img src="${spriteUrl(p)}" loading="lazy" onerror="this.src='${iconUrl(p)}'" style="width:64px;height:64px">
            <div class="number">#${pokemonId(p)}</div>
            <div class="name">${p.name}</div>
            <div>${typeBadge(p.type1)}${p.type2 ? ' ' + typeBadge(p.type2) : ''}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ===== LOCATIONS LIST =====
function getMergedLocations() {
  const ordered = [];
  const seen = new Set();
  for (const tp of D.townmap) {
    const locs = D.locations.filter(l => l.name === tp.name);
    if (locs.length && !seen.has(tp.name)) {
      seen.add(tp.name);
      const merged = { name: tp.name, mapId: locs[0].mapId, encounters: {} };
      for (const loc of locs) {
        for (const [method, encs] of Object.entries(loc.encounters)) {
          if (!merged.encounters[method]) merged.encounters[method] = [];
          for (const enc of encs) {
            if (!merged.encounters[method].find(e => e.pokemon === enc.pokemon && e.minLv === enc.minLv))
              merged.encounters[method].push(enc);
          }
        }
      }
      ordered.push(merged);
    }
  }
  for (const loc of D.locations) {
    if (!seen.has(loc.name)) { seen.add(loc.name); ordered.push(loc); }
  }
  return ordered;
}

function renderLocations(main) {
  const ordered = getMergedLocations();
  let html = `<div class="location-header"><h1>Zonas de Kalos</h1>
    <p class="subtitle">${ordered.length} zonas con Pokemon salvajes</p></div>`;
  html += `<table class="data-table"><thead><tr>
    <th>Zona</th><th>Pokemon</th><th>Metodos</th><th>Niveles</th>
  </tr></thead><tbody>`;
  for (const loc of ordered) {
    const methods = Object.keys(loc.encounters);
    const allPokemon = new Set();
    let minLv = 999, maxLv = 0;
    for (const encs of Object.values(loc.encounters)) {
      for (const e of encs) { allPokemon.add(e.pokemon); if (e.minLv < minLv) minLv = e.minLv; if (e.maxLv > maxLv) maxLv = e.maxLv; }
    }
    html += `<tr onclick="navigate('location','${loc.name.replace(/'/g,"\\'")}');" style="cursor:pointer">
      <td><strong>${loc.name}</strong></td><td>${allPokemon.size}</td>
      <td>${methods.map(m => METHOD_ES[m] || m).join(', ')}</td>
      <td>${minLv === 999 ? '-' : `${minLv}-${maxLv}`}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  main.innerHTML = html;
}

// ===== LOCATION DETAIL =====
function renderLocation(main, name) {
  const locs = D.locations.filter(l => l.name === name);
  if (!locs.length) { main.innerHTML = `<p>Zona no encontrada: "${name}"</p>`; return; }

  const encounters = {};
  for (const loc of locs) {
    for (const [method, encs] of Object.entries(loc.encounters)) {
      if (!encounters[method]) encounters[method] = [];
      for (const enc of encs) {
        if (!encounters[method].find(e => e.pokemon === enc.pokemon && e.minLv === enc.minLv))
          encounters[method].push(enc);
      }
    }
  }

  let html = `<div class="location-header"><h1>${name}</h1></div>`;

  // Pokemon encounters
  for (const [method, encs] of Object.entries(encounters)) {
    html += `<div class="card">
      <div class="card-title">${METHOD_ES[method] || method}</div>
      <table class="data-table"><thead><tr>
        <th>Pokemon</th><th>Tipo</th><th>Nivel</th><th>Probabilidad</th>
      </tr></thead><tbody>`;
    for (const enc of encs.sort((a, b) => b.probability - a.probability)) {
      const p = D.pokemonByName[enc.pokemon];
      const types = p ? `${typeBadge(p.type1)}${p.type2 ? ' ' + typeBadge(p.type2) : ''}` : '';
      html += `<tr>
        <td>${pokemonLink(enc.pokemon)}</td>
        <td>${types}</td>
        <td>${enc.minLv}-${enc.maxLv}</td>
        <td><span class="probability-bar"><span class="probability-bar-fill" style="width:${enc.probability}%"></span></span> ${enc.probability}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
  }

  // ===== ITEMS IN THIS LOCATION (from PDF) =====
  const locItems = findLocationItems(name);
  if (locItems.length) {
    html += `<div class="card">
      <div class="card-title">Objetos Obtenibles</div>
      <table class="data-table"><thead><tr><th>Objeto</th><th>Ubicacion / Como Obtenerlo</th></tr></thead><tbody>`;
    for (const item of locItems) {
      html += `<tr><td><strong>${item.item}</strong></td><td style="font-size:0.83rem;color:var(--text-secondary)">${item.location}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // ===== TRAINERS IN THIS LOCATION =====
  const routeTrainers = findRouteTrainers(name);
  if (routeTrainers.length) {
    html += `<div class="card"><div class="card-title">Entrenadores</div>`;
    for (const { combatNum, trainer: t } of routeTrainers) {
      const displayClass = (D.trainerTypes[t.class] && D.trainerTypes[t.class].displayName) || t.class;
      html += `<div class="trainer-card">
        <div class="trainer-header">Combate N°${combatNum} - <strong>${displayClass} ${t.name}</strong></div>
        <div class="trainer-team">`;
      for (const pk of t.pokemon) {
        const p = D.pokemonByName[pk.species];
        const types = p ? `${typeBadge(p.type1)}${p.type2 ? ' ' + typeBadge(p.type2) : ''}` : '';
        html += `<div class="trainer-pokemon">
          ${pokemonLink(pk.species)}
          <span class="trainer-pokemon-level">Nv.${pk.level}</span>
          ${types}
          ${pk.item ? `<span class="trainer-pokemon-item">${(D.itemByName[pk.item] && D.itemByName[pk.item].name) || pk.item}</span>` : ''}
        </div>`;
      }
      html += '</div></div>';
    }
    html += '</div>';
  }

  // Walkthrough excerpt
  if (D.walkthrough && D.walkthrough.historia) {
    const content = D.walkthrough.historia.content;
    const nameUpper = name.toUpperCase();
    const idx = content.toUpperCase().indexOf(nameUpper);
    if (idx !== -1) {
      let excerpt = content.substring(idx, idx + 2000);
      const nextLoc = excerpt.substring(nameUpper.length + 10).search(/(?:PUEBLO|CIUDAD|RUTA|CUEVA|BOSQUE)\s+[A-ZÁÉÍÓÚÑ]/);
      if (nextLoc > 0) excerpt = excerpt.substring(0, nameUpper.length + 10 + nextLoc);
      html += `<div class="card">
        <div class="card-title">Informacion de la Guia</div>
        <div class="walkthrough-content">${formatWalkthroughText(excerpt)}</div>
      </div>`;
    }
  }

  main.innerHTML = html;
}

// Find items for a location (fuzzy match across location-items keys)
function findLocationItems(name) {
  const nameLower = name.toLowerCase().trim();
  // 1. Exact match first
  for (const [key, val] of Object.entries(D.locationItems)) {
    if (key.toLowerCase().trim() === nameLower) return val;
  }
  // 2. Fallback: word-boundary match (prevents "Ruta 1" matching "Ruta 10")
  const items = [];
  const escaped = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?:^|\\s)' + escaped + '(?:\\s|$)', 'i');
  for (const [key, val] of Object.entries(D.locationItems)) {
    if (re.test(key)) items.push(...val);
  }
  return items;
}

// Find trainers for a location from walkthrough text
function findRouteTrainers(locationName) {
  if (!D.walkthrough || !D.walkthrough.historia) return [];
  let content = D.walkthrough.historia.content;
  // Apply same word-joining normalization
  content = content.replace(/\n\n+/g, '{{PARA}}');
  content = content.replace(/\n/g, ' ');
  content = content.replace(/\{\{PARA\}\}/g, '\n\n');

  const nameUpper = locationName.toUpperCase();
  const idx = content.toUpperCase().indexOf(nameUpper);
  if (idx === -1) return [];

  let excerpt = content.substring(idx, idx + 8000);
  const nextLoc = excerpt.substring(nameUpper.length + 5).search(/(?:PUEBLO|CIUDAD|RUTA|CUEVA|BOSQUE|CATACUMBAS|PANTANO|SANTUARIO|ISLA|TORRE|VILLA|BASTIÓN|FÁBRICA)\s+[A-ZÁÉÍÓÚÑ]/i);
  if (nextLoc > 0) excerpt = excerpt.substring(0, nameUpper.length + 5 + nextLoc);

  const combatRegex = /COMBATE\s+N[°º]\s*(\d+)\s+CONTRA\s+(.+?)(?:\n\n|$)/gi;
  const found = [];
  const seen = new Set();
  let match;
  while ((match = combatRegex.exec(excerpt)) !== null) {
    const combatNum = match[1];
    const contraText = match[2].trim();

    let matched = null;
    for (const t of D.trainers) {
      const displayClass = (D.trainerTypes[t.class] && D.trainerTypes[t.class].displayName) || t.class;
      const tNameUpper = t.name.toUpperCase();
      if (contraText.toUpperCase().includes(tNameUpper)) {
        const key = `${t.class}-${t.name}-${t.variant}`;
        if (!seen.has(key)) {
          seen.add(key);
          matched = t;
          break;
        }
      }
    }
    if (matched) found.push({ combatNum, trainer: matched });
  }
  return found;
}

// ===== POKEDEX (dual type filter) =====
let pokedexFilters = []; // array of up to 2 types
let pokedexPage = 0;
const POKEDEX_PER_PAGE = 60;

function togglePokedexFilter(type) {
  const idx = pokedexFilters.indexOf(type);
  if (idx !== -1) {
    pokedexFilters.splice(idx, 1);
  } else if (pokedexFilters.length < 2) {
    pokedexFilters.push(type);
  } else {
    pokedexFilters = [type]; // replace both with new one
  }
  pokedexPage = 0;
  render();
}

function renderPokedex(main) {
  let filtered = D.pokemon.filter(p => p.name);
  if (pokedexFilters.length === 1) {
    filtered = filtered.filter(p => p.type1 === pokedexFilters[0] || p.type2 === pokedexFilters[0]);
  } else if (pokedexFilters.length === 2) {
    filtered = filtered.filter(p =>
      (p.type1 === pokedexFilters[0] || p.type2 === pokedexFilters[0]) &&
      (p.type1 === pokedexFilters[1] || p.type2 === pokedexFilters[1])
    );
  }

  if (pokedexNameFilter) {
    const q = pokedexNameFilter.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  const totalPages = Math.ceil(filtered.length / POKEDEX_PER_PAGE);
  const page = filtered.slice(pokedexPage * POKEDEX_PER_PAGE, (pokedexPage + 1) * POKEDEX_PER_PAGE);

  const filterDesc = pokedexFilters.map(t => TYPE_ES[t]).join(' + ');
  let html = `<div class="location-header"><h1>Pokedex</h1>
    <p class="subtitle">${filtered.length} Pokemon${filterDesc ? ` de tipo ${filterDesc}` : ''}</p></div>`;

  html += `<div class="filter-bar">
    <input type="text" id="pokedexSearch" placeholder="Filtrar por nombre..." value="${pokedexNameFilter}" oninput="pokedexNameFilter=this.value.toLowerCase();pokedexPage=0;render()" style="flex:1;max-width:300px">
    ${pokedexFilters.map(t => `<button class="tab-pill active" onclick="togglePokedexFilter('${t}')">${TYPE_ES[t]} x</button>`).join('')}
  </div>`;

  html += '<div class="pokemon-grid">';
  for (const p of page) {
    html += `<div class="pokemon-grid-item" onclick="navigate('pokemon',${p.id})">
      <img src="${spriteUrl(p)}" loading="lazy" onerror="this.src='${iconUrl(p)}'">
      <div class="number">#${pokemonId(p)}</div>
      <div class="name">${p.name}</div>
      <div>${typeBadge(p.type1)}${p.type2 ? ' ' + typeBadge(p.type2) : ''}</div>
    </div>`;
  }
  html += '</div>';

  if (totalPages > 1) {
    html += '<div class="pagination">';
    if (pokedexPage > 0) html += `<button class="page-btn" onclick="pokedexPage=${pokedexPage - 1};render()">Anterior</button>`;
    for (let i = 0; i < totalPages; i++) {
      if (totalPages > 10 && Math.abs(i - pokedexPage) > 3 && i !== 0 && i !== totalPages - 1) {
        if (i === pokedexPage - 4 || i === pokedexPage + 4) html += `<span style="color:var(--text-muted);padding:6px">...</span>`;
        continue;
      }
      html += `<button class="page-btn ${i === pokedexPage ? 'active' : ''}" onclick="pokedexPage=${i};render()">${i + 1}</button>`;
    }
    if (pokedexPage < totalPages - 1) html += `<button class="page-btn" onclick="pokedexPage=${pokedexPage + 1};render()">Siguiente</button>`;
    html += '</div>';
  }
  main.innerHTML = html;
  if (pokedexNameFilter) restoreFocus('pokedexSearch');
}

let pokedexNameFilter = '';

// ===== POKEMON DETAIL =====
function renderPokemonDetail(main, id) {
  const p = D.pokemon.find(pk => pk.id === id);
  if (!p) { main.innerHTML = '<p>Pokemon no encontrado</p>'; return; }

  const stats = p.stats || {};
  const total = Object.values(stats).reduce((s, v) => s + v, 0);
  const statNames = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spatk: 'At.Esp', spdef: 'Def.Esp', spd: 'Velocidad' };

  let html = `<div class="pokemon-detail-header">
    <div class="sprite-container">
      <img class="pokemon-sprite-large" src="${spriteUrl(p)}" onerror="this.src='${iconUrl(p)}'">
    </div>
    <div class="info">
      <div class="pokemon-number">#${pokemonId(p)} - ${p.kind || ''} Pokemon</div>
      <h1>${p.name}</h1>
      <div class="types">${typeBadge(p.type1)}${p.type2 ? typeBadge(p.type2) : ''}</div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:12px">${p.pokedex || ''}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.85rem;max-width:300px">
        <div><span style="color:var(--text-muted)">Altura:</span> ${p.height || '?'}m</div>
        <div><span style="color:var(--text-muted)">Peso:</span> ${p.weight || '?'}kg</div>
        <div><span style="color:var(--text-muted)">Captura:</span> ${p.catchRate || '?'}</div>
        <div><span style="color:var(--text-muted)">Exp Base:</span> ${p.baseExp || '?'}</div>
      </div>
    </div>
  </div>`;

  // Type effectiveness
  const eff = getTypeEffectiveness(p.type1, p.type2);
  const effGroups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  for (const [type, mult] of Object.entries(eff)) {
    if (effGroups[mult] !== undefined) effGroups[mult].push(type);
  }
  const effLabels = [[4, 'x4 (Muy debil)'], [2, 'x2 (Debil)'], [0.5, 'x½ (Resiste)'], [0.25, 'x¼ (Muy resistente)'], [0, 'x0 (Inmune)']];
  const effColors = { 4: 'eff-4', 2: 'eff-2', 0.5: 'eff-05', 0.25: 'eff-025', 0: 'eff-0' };
  html += '<div class="card"><div class="card-title">Eficacia de Tipo</div><div class="type-effectiveness">';
  for (const [mult, label] of effLabels) {
    const types = effGroups[mult];
    if (types.length) {
      html += `<div class="eff-group"><span class="eff-label ${effColors[mult]}">${label}</span><div class="eff-types">${types.map(t => typeBadge(t)).join(' ')}</div></div>`;
    }
  }
  html += '</div></div>';

  // Stats
  html += `<div class="card"><div class="card-title">Estadisticas Base</div><div class="stats-grid">`;
  for (const [key, label] of Object.entries(statNames)) {
    const val = stats[key] || 0;
    const pct = Math.min(100, (val / 180) * 100);
    html += `<div class="stat-label">${label}</div>
      <div class="stat-value">${val}</div>
      <div class="stat-bar"><div class="stat-bar-fill ${statColor(val)}" style="width:${pct}%"></div></div><div></div>`;
  }
  html += `<div class="stat-label" style="font-weight:800">Total</div><div class="stat-total">${total}</div><div></div><div></div>`;
  html += '</div></div>';

  // Abilities
  const abilities = (p.abilities || []).map(a => {
    const ab = D.abilityByName[a];
    return ab ? `<strong>${ab.name}</strong>: ${ab.description}` : a;
  });
  if (p.hiddenAbility) {
    const hab = D.abilityByName[p.hiddenAbility];
    abilities.push(`<strong>${hab ? hab.name : p.hiddenAbility}</strong> (Oculta): ${hab ? hab.description : ''}`);
  }
  html += `<div class="card"><div class="card-title">Habilidades</div>
    <ul style="list-style:none;padding:0">${abilities.map(a => `<li style="margin-bottom:6px;font-size:0.85rem">${a}</li>`).join('')}</ul></div>`;

  // Evolution chain (full chain)
  html += renderEvolutionChain(p);

  // Formas alternativas y Mega evoluciones (unified)
  html += renderAllForms(p);

  // Wild held items
  if (p.wildItemCommon || p.wildItemUncommon || p.wildItemRare) {
    html += `<div class="card"><div class="card-title">Objetos Salvajes</div>
      <table class="data-table"><thead><tr><th>Objeto</th><th>Probabilidad</th></tr></thead><tbody>`;
    if (p.wildItemCommon) {
      const it = D.itemByName[p.wildItemCommon];
      const name = it ? `<span style="cursor:pointer;color:var(--accent)" onclick="navigate('item','${p.wildItemCommon}')">${it.name}</span>` : p.wildItemCommon;
      html += `<tr><td>${name}</td><td>Comun (50%)</td></tr>`;
    }
    if (p.wildItemUncommon) {
      const it = D.itemByName[p.wildItemUncommon];
      const name = it ? `<span style="cursor:pointer;color:var(--accent)" onclick="navigate('item','${p.wildItemUncommon}')">${it.name}</span>` : p.wildItemUncommon;
      html += `<tr><td>${name}</td><td>Poco comun (5%)</td></tr>`;
    }
    if (p.wildItemRare) {
      const it = D.itemByName[p.wildItemRare];
      const name = it ? `<span style="cursor:pointer;color:var(--accent)" onclick="navigate('item','${p.wildItemRare}')">${it.name}</span>` : p.wildItemRare;
      html += `<tr><td>${name}</td><td>Raro (1%)</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // Moves by level
  if (p.moves && p.moves.length) {
    html += `<div class="card"><div class="card-title">Movimientos por Nivel</div>
      <table class="data-table"><thead><tr>
        <th>Nv</th><th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th><th>PP</th>
      </tr></thead><tbody>`;
    for (const mv of p.moves) {
      const m = D.moveByName[mv.move];
      if (!m) { html += `<tr><td>${mv.level}</td><td>${mv.move}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; continue; }
      const catClass = m.category === 'Physical' ? 'category-physical' : m.category === 'Special' ? 'category-special' : 'category-status';
      const catName = m.category === 'Physical' ? 'Fisico' : m.category === 'Special' ? 'Especial' : 'Estado';
      html += `<tr><td>${mv.level}</td><td><strong>${m.name}</strong></td><td>${typeBadge(m.type)}</td>
        <td><span class="${catClass}">${catName}</span></td><td>${m.power || '-'}</td><td>${m.accuracy || '-'}</td><td>${m.pp}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // TMs
  const learnableTMs = [];
  for (const [move, pkList] of Object.entries(D.tms)) {
    if (pkList.includes(p.internalName)) { const m = D.moveByName[move]; if (m) learnableTMs.push(m); }
  }
  if (learnableTMs.length) {
    html += `<div class="card"><div class="card-title">MTs Compatibles (${learnableTMs.length})</div>
      <table class="data-table"><thead><tr><th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th></tr></thead><tbody>`;
    for (const m of learnableTMs.sort((a, b) => a.name.localeCompare(b.name))) {
      const catClass = m.category === 'Physical' ? 'category-physical' : m.category === 'Special' ? 'category-special' : 'category-status';
      const catName = m.category === 'Physical' ? 'Fisico' : m.category === 'Special' ? 'Especial' : 'Estado';
      html += `<tr><td><strong>${m.name}</strong></td><td>${typeBadge(m.type)}</td>
        <td><span class="${catClass}">${catName}</span></td><td>${m.power || '-'}</td><td>${m.accuracy || '-'}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // Where to find
  const foundIn = [];
  for (const loc of D.locations) {
    for (const [method, encs] of Object.entries(loc.encounters)) {
      for (const enc of encs) {
        if (enc.pokemon === p.internalName) foundIn.push({ location: loc.name, method: METHOD_ES[method] || method, ...enc });
      }
    }
  }
  if (foundIn.length) {
    const unique = []; const seen = new Set();
    for (const f of foundIn) { const key = `${f.location}-${f.method}`; if (!seen.has(key)) { seen.add(key); unique.push(f); } }
    html += `<div class="card"><div class="card-title">Donde Encontrar</div>
      <table class="data-table"><thead><tr><th>Zona</th><th>Metodo</th><th>Nivel</th><th>Probabilidad</th></tr></thead><tbody>`;
    for (const f of unique) {
      html += `<tr style="cursor:pointer" onclick="navigate('location','${f.location.replace(/'/g,"\\'")}')">
        <td><strong>${f.location}</strong></td><td>${f.method}</td><td>${f.minLv}-${f.maxLv}</td>
        <td><span class="probability-bar"><span class="probability-bar-fill" style="width:${f.probability}%"></span></span> ${f.probability}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
  }

  main.innerHTML = html;
}

// ===== EVOLUTION CHAIN =====
function renderEvolutionChain(p) {
  // Find the base of the chain
  let base = p;
  let safety = 0;
  while (safety++ < 10) {
    const pre = D.pokemon.find(pk => pk.evolutions && pk.evolutions.some(e => e.to === base.internalName));
    if (pre) base = pre; else break;
  }

  // Build chain forward (deduplicate same target from multiple evo methods)
  const chain = [];
  function buildChain(pk, depth) {
    chain.push({ pokemon: pk, depth });
    if (pk.evolutions) {
      const seen = new Set();
      for (const evo of pk.evolutions) {
        if (seen.has(evo.to)) continue;
        seen.add(evo.to);
        const ep = D.pokemonByName[evo.to];
        if (ep) buildChain(ep, depth + 1);
      }
    }
  }
  buildChain(base, 0);

  if (chain.length <= 1) return '';

  // Helper to translate evolution methods to Spanish
  function evoMethodText(evos) {
    if (!evos || !evos.length) return '';
    const texts = evos.map(evo => {
      const param = evo.param || '';
      const itemObj = param ? D.itemByName[param] : null;
      const itemName = itemObj ? itemObj.name : param;
      switch (evo.method) {
        case 'Level': return `Nv. ${param}`;
        case 'LevelMale': return `Nv. ${param} (♂)`;
        case 'LevelFemale': return `Nv. ${param} (♀)`;
        case 'LevelDay': return `Nv. ${param} (dia)`;
        case 'LevelNight': return `Nv. ${param} (noche)`;
        case 'Item': return itemName;
        case 'ItemMale': return `${itemName} (♂)`;
        case 'ItemFemale': return `${itemName} (♀)`;
        case 'DayHoldItem': return `Llevar ${itemName} de dia`;
        case 'NightHoldItem': return `Llevar ${itemName} de noche`;
        case 'Trade': return 'Intercambio';
        case 'TradeItem': return `Intercambio con ${itemName}`;
        case 'TradeSpecies': return `Intercambio por ${itemName}`;
        case 'Happiness': return 'Amistad';
        case 'HappinessDay': return 'Amistad (dia)';
        case 'HappinessNight': return 'Amistad (noche)';
        case 'Beauty': return 'Belleza';
        case 'HasMove': return `Saber ${itemName}`;
        case 'Location': return `Lugar especial`;
        default: return `${evo.method} ${param}`.trim();
      }
    });
    // Deduplicate identical texts
    const unique = [...new Set(texts)];
    return unique.join(' / ');
  }

  let html = `<div class="card"><div class="card-title">Cadena Evolutiva</div><div class="evo-chain">`;
  let lastDepth = -1;
  for (const entry of chain) {
    if (lastDepth >= 0 && entry.depth > lastDepth) {
      const parent = chain.find(c => c.depth === entry.depth - 1 && c.pokemon.evolutions?.some(e => e.to === entry.pokemon.internalName));
      const evos = parent?.pokemon.evolutions?.filter(e => e.to === entry.pokemon.internalName) || [];
      const methodText = evoMethodText(evos);
      html += `<div class="evo-arrow"><div>→</div><div class="method">${methodText}</div></div>`;
    }
    const isCurrent = entry.pokemon.id === p.id;
    html += `<div class="evo-item ${isCurrent ? 'evo-current' : ''}" onclick="navigate('pokemon',${entry.pokemon.id})">
      <img src="${spriteUrl(entry.pokemon)}" onerror="this.src='${iconUrl(entry.pokemon)}'">
      <div class="name">${entry.pokemon.name}</div>
    </div>`;
    lastDepth = entry.depth;
  }
  html += '</div></div>';
  return html;
}

// ===== FORMS & MEGA SECTION (unified) =====
// ===== FORM DETAIL VIEW (full page, like Pokemon detail) =====
function renderFormDetail(main, detail) {
  if (!detail || typeof detail !== 'string' || !detail.includes('/')) {
    main.innerHTML = '<p>Forma no encontrada</p>'; return;
  }
  const [pidStr, fidxStr] = detail.split('/');
  const pokemonIdNum = parseInt(pidStr);
  const formIdx = parseInt(fidxStr);
  const p = D.pokemon.find(pk => pk.id === pokemonIdNum);
  if (!p) { main.innerHTML = '<p>Pokemon no encontrado</p>'; return; }

  const pid = pokemonId(p);
  const manifest = D.formsManifest[p.id];
  const form = manifest ? manifest.find(f => f.index === formIdx) : null;
  if (!form) { main.innerHTML = '<p>Forma no encontrada</p>'; return; }

  // Resolve form data
  const nameUpper = (p.name || '').toUpperCase();
  const suffix = form.name.replace('Mega', '').trim();
  const isZ = form.type === 'z-form' || form.name === 'Z';
  const isMega = form.type === 'mega';
  const isRegional = form.type === 'regional';

  // Build display name
  let formDisplayName;
  if (isMega) formDisplayName = `Mega ${p.name}${suffix ? ' ' + suffix : ''}`;
  else if (isZ) formDisplayName = `${p.name} (Forma Z)`;
  else if (isRegional) formDisplayName = `${p.name} (${form.name})`;
  else formDisplayName = `${p.name} (${form.name})`;

  // Get stats from manifest or formStats
  let fdata = null;
  if (form.stats) {
    fdata = { stats: form.stats, abilities: form.abilities || [] };
  } else {
    const possibleKeys = [];
    if (isMega) {
      possibleKeys.push(`Mega ${p.name}${suffix ? ' ' + suffix : ''}`);
      possibleKeys.push(`Mega ${p.name}`);
      possibleKeys.push(`Mega ${p.name} Z`);
    }
    if (isZ) possibleKeys.push(`${p.name} Z`);
    possibleKeys.push(`${p.name} ${form.name}`);
    for (const key of possibleKeys) {
      if (D.formStats[key]) { fdata = D.formStats[key]; break; }
    }
  }

  // Types: form manifest > formStats > base pokemon
  const formTypes = form.types || (fdata && fdata.types) || null;
  const type1 = formTypes ? formTypes[0] : p.type1;
  const type2 = formTypes ? (formTypes[1] || null) : p.type2;

  // Stats: form data or base
  const stats = (fdata && fdata.stats) ? fdata.stats : p.stats;
  const hasOwnStats = !!(fdata && fdata.stats);
  const total = Object.values(stats).reduce((s, v) => s + v, 0);
  const baseTotal = Object.values(p.stats).reduce((s, v) => s + v, 0);
  const statNames = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spatk: 'At.Esp', spdef: 'Def.Esp', spd: 'Velocidad' };

  // Abilities
  const formAbilities = (fdata && fdata.abilities && fdata.abilities.length) ? fdata.abilities : null;

  // Mega stone
  let stoneName = form.stone || null;
  if (!stoneName && isMega) {
    const megaStone = D.items.find(it =>
      it.description && it.description.toLowerCase().includes('megaevolucionar') &&
      it.description.toLowerCase().includes(p.name.toLowerCase())
    );
    if (megaStone) stoneName = megaStone.name;
  }

  // Sprite
  const formSpriteUrl = `sprites/${pid}_${formIdx}.png`;

  // ===== RENDER =====
  let html = `<div class="form-detail-back" onclick="navigate('pokemon',${p.id})">← Volver a ${p.name}</div>`;

  // Header
  html += `<div class="pokemon-detail-header">
    <div class="sprite-container">
      <img class="pokemon-sprite-large" src="${formSpriteUrl}" onerror="this.src='${spriteUrl(p)}'">
    </div>
    <div class="info">
      <div class="pokemon-number">#${pid} - ${form.type === 'mega' ? 'Mega Evolucion' : form.type === 'z-form' ? 'Forma Z' : form.type === 'regional' ? 'Forma Regional' : 'Forma Alternativa'}</div>
      <h1>${formDisplayName}</h1>
      <div class="types">${typeBadge(type1)}${type2 ? typeBadge(type2) : ''}</div>
      ${stoneName ? `<p style="color:var(--text-secondary);font-size:0.85rem;margin-top:8px">Mega Piedra: <strong>${stoneName}</strong></p>` : ''}
      <p style="margin-top:8px"><span class="pokemon-cell" onclick="navigate('pokemon',${p.id})">
        <img class="pokemon-icon" src="${iconUrl(p)}" loading="lazy" onerror="this.style.display='none'"> Forma base: ${p.name}
      </span></p>
    </div>
  </div>`;

  // Type effectiveness
  const eff = getTypeEffectiveness(type1, type2);
  const effGroups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  for (const [type, mult] of Object.entries(eff)) {
    if (effGroups[mult] !== undefined) effGroups[mult].push(type);
  }
  const effLabels = [[4, 'x4 (Muy debil)'], [2, 'x2 (Debil)'], [0.5, 'x½ (Resiste)'], [0.25, 'x¼ (Muy resistente)'], [0, 'x0 (Inmune)']];
  const effColors = { 4: 'eff-4', 2: 'eff-2', 0.5: 'eff-05', 0.25: 'eff-025', 0: 'eff-0' };
  html += '<div class="card"><div class="card-title">Eficacia de Tipo</div><div class="type-effectiveness">';
  for (const [mult, label] of effLabels) {
    const types = effGroups[mult];
    if (types.length) {
      html += `<div class="eff-group"><span class="eff-label ${effColors[mult]}">${label}</span><div class="eff-types">${types.map(t => typeBadge(t)).join(' ')}</div></div>`;
    }
  }
  html += '</div></div>';

  // Stats
  html += `<div class="card"><div class="card-title">Estadisticas${hasOwnStats ? '' : ' (Base)'}</div><div class="stats-grid">`;
  for (const [key, label] of Object.entries(statNames)) {
    const val = stats[key] || 0;
    const baseVal = p.stats[key] || 0;
    const diff = hasOwnStats ? val - baseVal : 0;
    const diffStr = diff > 0 ? `<span style="color:#4caf50;font-size:0.75rem"> +${diff}</span>` : diff < 0 ? `<span style="color:#f44336;font-size:0.75rem"> ${diff}</span>` : '';
    const pct = Math.min(100, (val / 180) * 100);
    html += `<div class="stat-label">${label}</div>
      <div class="stat-value">${val}${diffStr}</div>
      <div class="stat-bar"><div class="stat-bar-fill ${statColor(val)}" style="width:${pct}%"></div></div><div></div>`;
  }
  const totalDiff = hasOwnStats ? total - baseTotal : 0;
  const totalDiffStr = totalDiff > 0 ? `<span style="color:#4caf50;font-size:0.75rem"> +${totalDiff}</span>` : totalDiff < 0 ? `<span style="color:#f44336;font-size:0.75rem"> ${totalDiff}</span>` : '';
  html += `<div class="stat-label" style="font-weight:800">Total</div><div class="stat-total">${total}${totalDiffStr}</div><div></div><div></div>`;
  html += '</div></div>';

  // Abilities
  if (formAbilities && formAbilities.length) {
    html += `<div class="card"><div class="card-title">Habilidades</div>
      <ul style="list-style:none;padding:0">${formAbilities.map(a => {
        const cleanName = a.replace(/\s*\(Oculta\)\s*/i, '');
        const isHidden = /oculta/i.test(a);
        const ab = D.abilityByName[cleanName] || D.abilityByDisplayName[cleanName];
        const desc = ab ? ab.description : '';
        return `<li style="margin-bottom:6px;font-size:0.85rem"><strong>${cleanName}</strong>${isHidden ? ' (Oculta)' : ''}${desc ? ': ' + desc : ''}</li>`;
      }).join('')}</ul></div>`;
  } else {
    // Show base Pokemon abilities
    const abilities = (p.abilities || []).map(a => {
      const ab = D.abilityByName[a];
      return ab ? `<strong>${ab.name}</strong>: ${ab.description}` : a;
    });
    if (p.hiddenAbility) {
      const hab = D.abilityByName[p.hiddenAbility];
      abilities.push(`<strong>${hab ? hab.name : p.hiddenAbility}</strong> (Oculta): ${hab ? hab.description : ''}`);
    }
    html += `<div class="card"><div class="card-title">Habilidades (Base)</div>
      <ul style="list-style:none;padding:0">${abilities.map(a => `<li style="margin-bottom:6px;font-size:0.85rem">${a}</li>`).join('')}</ul></div>`;
  }

  // Evolution chain of base Pokemon
  html += renderEvolutionChain(p);

  // Other forms of this Pokemon
  html += renderAllForms(p);

  // Moves by level (same as base Pokemon)
  if (p.moves && p.moves.length) {
    html += `<div class="card"><div class="card-title">Movimientos por Nivel</div>
      <table class="data-table"><thead><tr>
        <th>Nv</th><th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th><th>PP</th>
      </tr></thead><tbody>`;
    for (const mv of p.moves) {
      const m = D.moveByName[mv.move];
      if (!m) { html += `<tr><td>${mv.level}</td><td>${mv.move}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; continue; }
      const catClass = m.category === 'Physical' ? 'category-physical' : m.category === 'Special' ? 'category-special' : 'category-status';
      const catName = m.category === 'Physical' ? 'Fisico' : m.category === 'Special' ? 'Especial' : 'Estado';
      html += `<tr><td>${mv.level}</td><td><strong>${m.name}</strong></td><td>${typeBadge(m.type)}</td>
        <td><span class="${catClass}">${catName}</span></td><td>${m.power || '-'}</td><td>${m.accuracy || '-'}</td><td>${m.pp}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // TMs
  const learnableTMs = [];
  for (const [move, pkList] of Object.entries(D.tms)) {
    if (pkList.includes(p.internalName)) { const m = D.moveByName[move]; if (m) learnableTMs.push(m); }
  }
  if (learnableTMs.length) {
    html += `<div class="card"><div class="card-title">MTs Compatibles (${learnableTMs.length})</div>
      <table class="data-table"><thead><tr><th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th></tr></thead><tbody>`;
    for (const m of learnableTMs.sort((a, b) => a.name.localeCompare(b.name))) {
      const catClass = m.category === 'Physical' ? 'category-physical' : m.category === 'Special' ? 'category-special' : 'category-status';
      const catName = m.category === 'Physical' ? 'Fisico' : m.category === 'Special' ? 'Especial' : 'Estado';
      html += `<tr><td><strong>${m.name}</strong></td><td>${typeBadge(m.type)}</td>
        <td><span class="${catClass}">${catName}</span></td><td>${m.power || '-'}</td><td>${m.accuracy || '-'}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // Where to find
  const foundIn = [];
  for (const loc of D.locations) {
    for (const [method, encs] of Object.entries(loc.encounters)) {
      for (const enc of encs) {
        if (enc.pokemon === p.internalName) foundIn.push({ location: loc.name, method: METHOD_ES[method] || method, ...enc });
      }
    }
  }
  if (foundIn.length) {
    const unique = []; const seen = new Set();
    for (const f of foundIn) { const key = `${f.location}-${f.method}`; if (!seen.has(key)) { seen.add(key); unique.push(f); } }
    html += `<div class="card"><div class="card-title">Donde Encontrar</div>
      <table class="data-table"><thead><tr><th>Zona</th><th>Metodo</th><th>Nivel</th><th>Probabilidad</th></tr></thead><tbody>`;
    for (const f of unique) {
      html += `<tr style="cursor:pointer" onclick="navigate('location','${f.location.replace(/'/g,"\\'")}')">
        <td><strong>${f.location}</strong></td><td>${f.method}</td><td>${f.minLv}-${f.maxLv}</td>
        <td><span class="probability-bar"><span class="probability-bar-fill" style="width:${f.probability}%"></span></span> ${f.probability}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
  }

  main.innerHTML = html;
}

function renderAllForms(p) {
  const pid = pokemonId(p);
  const manifest = D.formsManifest[p.id];
  const nameLower = (p.name || '').toLowerCase();
  const nameUpper = (p.name || '').toUpperCase();

  // Find mega stones
  const megaStones = D.items.filter(it =>
    it.description && it.description.toLowerCase().includes('megaevolucionar') &&
    it.description.toLowerCase().includes(nameLower)
  );
  if (!megaStones.length && D.megas[nameUpper]) {
    megaStones.push({ name: D.megas[nameUpper].stone || '?', internalName: D.megas[nameUpper].stoneInternal });
  }

  // Build mega stone map (index -> stone)
  const megaStoneMap = {};
  if (megaStones.length === 1) {
    // Single mega: find which form index is the mega
    const megaIdx = manifest ? manifest.find(f => f.name.startsWith('Mega'))?.index : 1;
    megaStoneMap[megaIdx || 1] = megaStones[0];
  } else if (megaStones.length > 1) {
    for (let i = 0; i < megaStones.length; i++) {
      const s = megaStones[i];
      const isX = s.name && (s.name.toLowerCase().includes(' x') || s.name.toLowerCase().endsWith('x'));
      const isY = s.name && (s.name.toLowerCase().includes(' y') || s.name.toLowerCase().endsWith('y'));
      if (isX) megaStoneMap[1] = s;
      else if (isY) megaStoneMap[2] = s;
      else megaStoneMap[i + 1] = s;
    }
  }

  // If no manifest entries and no megas, check for Z forms in formStats
  const hasZForm = D.formStats[`${p.name} Z`];
  if (!manifest && !megaStones.length && !hasZForm) return '';

  let html = '';
  const forms = manifest || [];

  // Separate megas from other forms (Gmax is NOT mega)
  const megaForms = forms.filter(f => (f.name.startsWith('Mega') || f.type === 'mega') && !f.name.startsWith('Gmax'));
  const otherForms = forms.filter(f => (!f.name.startsWith('Mega') && f.type !== 'mega') || f.name.startsWith('Gmax'));

  // Also add megas from megaStones that aren't in the manifest
  if (megaStones.length && !megaForms.length) {
    for (let i = 0; i < megaStones.length; i++) {
      const s = megaStones[i];
      const suffix = megaStones.length > 1 ? (s.name.includes('X') || s.name.toLowerCase().includes(' x') ? ' X' : s.name.includes('Y') || s.name.toLowerCase().includes(' y') ? ' Y' : '') : '';
      megaForms.push({
        index: megaStones.length > 1 ? i + 1 : 1,
        name: `Mega${suffix}`,
        type: 'mega',
        stats: null,
        abilities: null,
        stone: s.name
      });
    }
  }

  // Render Mega section
  if (megaForms.length) {
    html += `<div class="card"><div class="card-title">Mega Evolucion</div>`;
    for (const form of megaForms) {
      const formSpriteUrl = `sprites/${pid}_${form.index}.png`;
      const suffix = form.name.replace('Mega', '').trim();
      const megaName = `Mega ${p.name}${suffix ? ' ' + suffix : ''}`;
      const stone = form.stone || megaStoneMap[form.index]?.name || '?';
      const formTypes = form.types || null;

      html += `<div class="form-entry" onclick="navigate('form','${p.id}/${form.index}')">
        <div class="form-header">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div class="evo-item">
              <img src="${spriteUrl(p)}" onerror="this.style.display='none'" style="width:68px;height:68px;image-rendering:pixelated">
            </div>
            <div class="evo-arrow"><div>→</div><div class="method">${stone}</div></div>
            <div class="evo-item">
              <img src="${formSpriteUrl}" onerror="this.src='${spriteUrl(p)}'" style="width:68px;height:68px;image-rendering:pixelated">
            </div>
            <div><strong>${megaName}</strong>
              ${formTypes ? ' ' + formTypes.map(t => typeBadge(t)).join(' ') : ''}
            </div>
          </div>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  // Render other forms (Z, regional, etc.)
  // Also include forms from formStats that might not be in the manifest (e.g. Z forms without sprites)
  const extraZForms = [];
  if (hasZForm && !otherForms.some(f => f.name === 'Z' || f.type === 'z-form')) {
    extraZForms.push({ index: null, name: 'Z', type: 'z-form', stats: hasZForm.stats, abilities: hasZForm.abilities, stone: null });
  }
  const allOtherForms = [...otherForms, ...extraZForms];

  if (allOtherForms.length) {
    html += `<div class="card"><div class="card-title">Formas Alternativas</div>`;
    for (const form of allOtherForms) {
      const formSpriteUrl = form.index !== null ? `sprites/${pid}_${form.index}.png` : spriteUrl(p);

      // Determine display name
      const typeLabel = form.type === 'z-form' ? 'Forma Z' :
                        form.type === 'regional' ? `Forma ${form.name}` :
                        form.name;

      const formTypes = form.types || null;
      const canNavigate = form.index !== null;

      html += `<div class="form-entry" ${canNavigate ? `onclick="navigate('form','${p.id}/${form.index}')"` : ''}>
        <div class="form-header">
          <img src="${formSpriteUrl}" onerror="this.style.display='none'" style="width:64px;height:64px;image-rendering:pixelated">
          <div><strong>${typeLabel}</strong>
            ${formTypes ? ' ' + formTypes.map(t => typeBadge(t)).join(' ') : ''}
          </div>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  return html;
}

// ===== ITEMS LIST =====
let itemsPage = 0;
const ITEMS_PER_PAGE = 50;
let itemsSearch = '';

function renderItems(main) {
  let filtered = D.items;
  if (itemsSearch) {
    const q = itemsSearch.toLowerCase();
    filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const page = filtered.slice(itemsPage * ITEMS_PER_PAGE, (itemsPage + 1) * ITEMS_PER_PAGE);

  let html = `<div class="location-header"><h1>Objetos</h1>
    <p class="subtitle">${filtered.length} objetos</p></div>`;
  html += `<div class="filter-bar">
    <input type="text" id="itemsSearch" placeholder="Buscar objeto..." value="${itemsSearch}" oninput="itemsSearch=this.value;itemsPage=0;renderItems($('mainContent'))" style="flex:1;max-width:300px">
  </div>`;

  html += '<div class="items-grid">';
  for (const item of page) {
    html += `<div class="item-card" style="cursor:pointer" onclick="navigate('item','${item.internalName}')">
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.description || ''}</div>
      ${item.price ? `<div class="item-price">Precio: ${item.price.toLocaleString()}$</div>` : ''}
    </div>`;
  }
  html += '</div>';

  if (totalPages > 1) {
    html += renderPagination(totalPages, itemsPage, 'itemsPage', "renderItems($('mainContent'))");
  }
  main.innerHTML = html;
  if (itemsSearch) restoreFocus('itemsSearch');
}

// ===== ITEM DETAIL =====
function renderItemDetail(main, internalName) {
  const item = D.itemByName[internalName];
  if (!item) { main.innerHTML = '<p>Objeto no encontrado</p>'; return; }

  let html = `<div class="location-header"><h1>${item.name}</h1>
    <p class="subtitle">${item.internalName}</p></div>`;

  html += `<div class="card">
    <div class="card-title">Informacion</div>
    <p style="font-size:0.9rem;margin-bottom:8px">${item.description || 'Sin descripcion'}</p>
    ${item.price ? `<p style="font-size:0.85rem;color:var(--text-secondary)">Precio: <strong>${item.price.toLocaleString()}$</strong></p>` : ''}
  </div>`;

  // Search in walkthrough for mentions of this item
  const mentions = findItemMentions(item.name);
  if (mentions.length) {
    html += `<div class="card"><div class="card-title">Donde encontrar / Como obtener</div>
      <div class="walkthrough-content">`;
    for (const mention of mentions) {
      html += `<div class="item-mention-card"><p>${mention}</p></div>`;
    }
    html += '</div></div>';
  }

  // Check if it's a mega stone
  const megaEntry = Object.values(D.megas).find(m => m.stoneInternal === internalName || m.stone === item.name);
  if (megaEntry) {
    html += `<div class="card"><div class="card-title">Mega Piedra</div>
      <p style="font-size:0.9rem">Permite la mega evolucion de <strong>${megaEntry.pokemon}</strong></p>
    </div>`;
  }

  // Check location-items for this item name
  const foundInLocations = [];
  for (const [loc, items] of Object.entries(D.locationItems)) {
    for (const li of items) {
      if (li.item.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(li.item.toLowerCase())) {
        foundInLocations.push({ location: loc, detail: li.location });
      }
    }
  }
  if (foundInLocations.length) {
    html += `<div class="card"><div class="card-title">Ubicaciones Especificas</div>
      <table class="data-table"><thead><tr><th>Zona</th><th>Detalle</th></tr></thead><tbody>`;
    for (const f of foundInLocations) {
      html += `<tr><td><strong>${f.location}</strong></td><td style="font-size:0.83rem;color:var(--text-secondary)">${f.detail}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  // Pokemon that drop this item in the wild
  const droppers = [];
  for (const p of D.pokemon) {
    if (p.wildItemCommon === internalName) droppers.push({ pokemon: p, rarity: 'Comun (50%)' });
    else if (p.wildItemUncommon === internalName) droppers.push({ pokemon: p, rarity: 'Poco comun (5%)' });
    else if (p.wildItemRare === internalName) droppers.push({ pokemon: p, rarity: 'Raro (1%)' });
  }
  if (droppers.length) {
    html += `<div class="card"><div class="card-title">Pokemon que lo Sueltan</div>
      <table class="data-table"><thead><tr><th>Pokemon</th><th>Tipo</th><th>Probabilidad</th></tr></thead><tbody>`;
    for (const d of droppers) {
      const types = `${typeBadge(d.pokemon.type1)}${d.pokemon.type2 ? ' ' + typeBadge(d.pokemon.type2) : ''}`;
      html += `<tr><td>${pokemonLink(d.pokemon.internalName)}</td><td>${types}</td><td>${d.rarity}</td></tr>`;
    }
    html += '</tbody></table></div>';
  }

  main.innerHTML = html;
}

function findItemMentions(itemName) {
  const mentions = [];
  if (!D.walkthrough) return mentions;
  const nameLower = itemName.toLowerCase();

  for (const [key, section] of Object.entries(D.walkthrough)) {
    const content = section.content || '';
    const contentLower = content.toLowerCase();
    let idx = 0;
    let count = 0;
    while ((idx = contentLower.indexOf(nameLower, idx)) !== -1 && count < 5) {
      // Extract surrounding context
      const start = Math.max(0, idx - 100);
      const end = Math.min(content.length, idx + itemName.length + 200);
      let excerpt = content.substring(start, end);
      // Highlight the item name
      excerpt = excerpt.replace(new RegExp(itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        `<strong style="color:var(--accent)">$&</strong>`);
      if (start > 0) excerpt = '...' + excerpt;
      if (end < content.length) excerpt += '...';
      mentions.push(excerpt);
      idx += itemName.length;
      count++;
    }
  }
  return mentions;
}

// ===== MOVES =====
let movesPage = 0;
const MOVES_PER_PAGE = 50;
let movesSearch = '';
let movesTypeFilter = '';

function renderMoves(main) {
  let filtered = D.moves;
  if (movesSearch) { const q = movesSearch.toLowerCase(); filtered = filtered.filter(m => m.name.toLowerCase().includes(q)); }
  if (movesTypeFilter) { filtered = filtered.filter(m => m.type === movesTypeFilter); }

  const totalPages = Math.ceil(filtered.length / MOVES_PER_PAGE);
  const page = filtered.slice(movesPage * MOVES_PER_PAGE, (movesPage + 1) * MOVES_PER_PAGE);

  let html = `<div class="location-header"><h1>Movimientos</h1>
    <p class="subtitle">${filtered.length} movimientos</p></div>`;
  html += `<div class="filter-bar">
    <input type="text" id="movesSearch" placeholder="Buscar movimiento..." value="${movesSearch}" oninput="movesSearch=this.value;movesPage=0;renderMoves($('mainContent'))" style="flex:1;max-width:300px">
    <select onchange="movesTypeFilter=this.value;movesPage=0;renderMoves($('mainContent'))">
      <option value="">Todos los tipos</option>
      ${Object.entries(TYPE_ES).map(([k, v]) => `<option value="${k}" ${k === movesTypeFilter ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
  </div>`;

  html += `<table class="data-table"><thead><tr>
    <th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th><th>PP</th><th>Descripcion</th>
  </tr></thead><tbody>`;
  for (const m of page) {
    const catClass = m.category === 'Physical' ? 'category-physical' : m.category === 'Special' ? 'category-special' : 'category-status';
    const catName = m.category === 'Physical' ? 'Fisico' : m.category === 'Special' ? 'Especial' : 'Estado';
    html += `<tr><td><strong>${m.name}</strong></td><td>${typeBadge(m.type)}</td>
      <td><span class="${catClass}">${catName}</span></td><td>${m.power || '-'}</td><td>${m.accuracy || '-'}</td><td>${m.pp}</td>
      <td style="font-size:0.78rem;color:var(--text-secondary);max-width:300px">${m.description || ''}</td></tr>`;
  }
  html += '</tbody></table>';

  if (totalPages > 1) {
    html += renderPagination(totalPages, movesPage, 'movesPage', "renderMoves($('mainContent'))");
  }
  main.innerHTML = html;
  if (movesSearch) restoreFocus('movesSearch');
}

// ===== TRAINERS =====
const TRAINERS_PER_PAGE = 30;

function buildTrainerLocationMap() {
  if (trainerLocationMap) return trainerLocationMap;
  trainerLocationMap = {};
  for (const loc of D.locations) {
    const trainers = findRouteTrainers(loc.name);
    for (const { trainer: t } of trainers) {
      const key = `${t.class}-${t.name}-${t.variant}`;
      if (!trainerLocationMap[key]) trainerLocationMap[key] = loc.name;
    }
  }
  return trainerLocationMap;
}

function renderTrainers(main) {
  const locMap = buildTrainerLocationMap();

  // Build unique display classes for filter
  const classMap = {};
  for (const t of D.trainers) {
    const tc = D.trainerTypes[t.class];
    const displayClass = tc ? tc.displayName : t.class;
    if (!classMap[displayClass]) classMap[displayClass] = 0;
    classMap[displayClass]++;
  }
  const sortedClasses = Object.entries(classMap).sort((a, b) => b[1] - a[1]);

  // Filter trainers
  let filtered = D.trainers;
  if (trainersSearch) {
    const q = trainersSearch.toLowerCase();
    filtered = filtered.filter(t => {
      const tc = D.trainerTypes[t.class];
      const displayClass = tc ? tc.displayName : t.class;
      const nameMatch = t.name.toLowerCase().includes(q);
      const classMatch = displayClass.toLowerCase().includes(q);
      const pokemonMatch = t.pokemon.some(pk => {
        const p = D.pokemonByName[pk.species];
        return p && p.name.toLowerCase().includes(q);
      });
      return nameMatch || classMatch || pokemonMatch;
    });
  }
  if (trainersClassFilter) {
    filtered = filtered.filter(t => {
      const tc = D.trainerTypes[t.class];
      const displayClass = tc ? tc.displayName : t.class;
      return displayClass === trainersClassFilter;
    });
  }

  const totalPages = Math.ceil(filtered.length / TRAINERS_PER_PAGE);
  const page = filtered.slice(trainersPage * TRAINERS_PER_PAGE, (trainersPage + 1) * TRAINERS_PER_PAGE);

  let html = `<div class="location-header"><h1>Entrenadores</h1>
    <p class="subtitle">${filtered.length} entrenadores</p></div>`;

  html += `<div class="filter-bar">
    <input type="text" id="trainersSearch" placeholder="Buscar por nombre, clase o pokemon..." value="${trainersSearch}" oninput="trainersSearch=this.value;trainersPage=0;renderTrainers($('mainContent'))" style="flex:1;max-width:300px">
    <select onchange="trainersClassFilter=this.value;trainersPage=0;renderTrainers($('mainContent'))">
      <option value="">Todas las clases</option>
      ${sortedClasses.map(([cls, count]) => `<option value="${cls}" ${cls === trainersClassFilter ? 'selected' : ''}>${cls} (${count})</option>`).join('')}
    </select>
  </div>`;

  for (const t of page) {
    const tc = D.trainerTypes[t.class];
    const displayClass = tc ? tc.displayName : t.class;
    const key = `${t.class}-${t.name}-${t.variant}`;
    const location = locMap[key];
    const maxLv = Math.max(...t.pokemon.map(pk => pk.level));
    const avgLv = Math.round(t.pokemon.reduce((s, pk) => s + pk.level, 0) / t.pokemon.length);

    html += `<div class="trainer-card">
      <div class="trainer-header">
        <strong>${displayClass} ${t.name}</strong>${t.variant > 0 ? ` <span style="color:var(--text-muted);font-size:0.8rem">(Combate ${t.variant + 1})</span>` : ''}
        <span style="float:right;font-size:0.78rem;color:var(--text-muted)">
          ${t.pokemon.length} Pokemon | Nv. ${avgLv}${avgLv !== maxLv ? '-' + maxLv : ''}
        </span>
      </div>`;

    if (location) {
      html += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;cursor:pointer" onclick="navigate('location','${location.replace(/'/g, "\\'")}')">
        Ubicacion: <strong style="color:var(--accent)">${location}</strong>
      </div>`;
    }

    html += `<div class="trainer-team">`;
    for (const pk of t.pokemon) {
      const p = D.pokemonByName[pk.species];
      const types = p ? `${typeBadge(p.type1)}${p.type2 ? ' ' + typeBadge(p.type2) : ''}` : '';
      const itemObj = pk.item ? D.itemByName[pk.item] : null;
      const itemName = itemObj ? itemObj.name : (pk.item || '');
      html += `<div class="trainer-pokemon" ${p ? `onclick="navigate('pokemon',${p.id})" style="cursor:pointer"` : ''}>
        ${p ? `<img class="pokemon-icon" src="${iconUrl(p)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <strong>${p ? p.name : pk.species}</strong>
        <span class="trainer-pokemon-level">Nv.${pk.level}</span>
        ${types}
        ${itemName ? `<span class="trainer-pokemon-item">${itemName}</span>` : ''}
      </div>`;
    }
    html += '</div></div>';
  }

  if (totalPages > 1) {
    html += renderPagination(totalPages, trainersPage, 'trainersPage', "renderTrainers($('mainContent'))");
  }
  main.innerHTML = html;
  if (trainersSearch) restoreFocus('trainersSearch');
}

// ===== WALKTHROUGH (improved formatting) =====
function formatWalkthroughText(text) {
  if (!text) return '';
  let html = text;
  // Normalize: \n\n = paragraph break, single \n = space (join words from PDF extraction)
  html = html.replace(/\n\n+/g, '{{PARA}}');
  html = html.replace(/\n/g, ' ');
  html = html.replace(/\{\{PARA\}\}/g, '\n\n');
  // Fix broken words from PDF extraction (e.g. "ENT ONCES" -> "ENTONCES")
  // Dictionary of common broken words found in the PDF
  const brokenWords = {
    'ENT ONCES': 'ENTONCES', 'NECESIT O': 'NECESITO', 'CONSER VO': 'CONSERVO',
    'TRASP ASO': 'TRASPASO', 'RECUPE- RACIÓN': 'RECUPERACIÓN', 'RECUPE RACIÓN': 'RECUPERACIÓN',
    'CARGA- AGRESIÓN': 'CARGA-AGRESIÓN', 'CARGA AGRESIÓN': 'CARGA-AGRESIÓN',
    'GIGA- DRENADO': 'GIGADRENADO', 'GIGA DRENADO': 'GIGADRENADO',
    'OJOCOM- PUESTO': 'OJOCOMPUESTO', 'OJOCOM PUESTO': 'OJOCOMPUESTO',
    'TOQ.TÓXICO': 'TOQ. TÓXICO', 'PARARRA YOS': 'PARARRAYOS',
    'PUNT O TÓXICO': 'PUNTO TÓXICO', 'PUNT A ACERO': 'PUNTA ACERO',
    'ENSAÑAMIENT O': 'ENSAÑAMIENTO', 'RELAMP AGUEO': 'RELAMPAGUEO',
    'ADAPT ABLE': 'ADAPTABLE', 'LEVIT ACIÓN': 'LEVITACIÓN',
    'EXPERT O': 'EXPERTO', 'CORT ANTE': 'CORTANTE',
    'DESPIERT ALLAMA': 'DESPIERTALLAMA', 'POT. BRUT A': 'POT. BRUTA',
    'POTENCIA BRUT A': 'POTENCIA BRUTA', 'ELECTRICIDA D': 'ELECTRICIDAD',
    'COLEÓPTE RO': 'COLEÓPTERO', 'CONTRAGUARDIA': 'CONTRAGUARDIA',
    'ELECTROGÉN ESIS': 'ELECTROGÉNESIS', 'NERVIOSISMO': 'NERVIOSISMO',
    'VOLTIOCAM BIO': 'VOLTIOCAMBIO', 'FALSOTORTA ZO': 'FALSOTORTAZO',
    'TERRATEMBLO R': 'TERRATEMBLOR', 'DEMOLICIÓ N': 'DEMOLICIÓN',
    'ONDA VOLTIO': 'ONDA VOLTIO', 'CÁLCU LO': 'CÁLCULO',
    'INTIMI DACIÓN': 'INTIMIDACIÓN', 'REGENERA CIÓN': 'REGENERACIÓN',
    'COMBA TE': 'COMBATE', 'MOVIMIEN TOS': 'MOVIMIENTOS',
    'HABILIDA D': 'HABILIDAD', 'NATURALE ZA': 'NATURALEZA',
    'OBJE TO': 'OBJETO', 'NINGUNO': 'NINGUNO'
  };
  for (const [broken, fixed] of Object.entries(brokenWords)) {
    html = html.split(broken).join(fixed);
  }
  // Generic fix: merge a trailing 1-2 char uppercase fragment back into the previous word
  // e.g. "IMPORTAN TE" -> "IMPORTANTE", "COMBINAR LO" stays (LO is a real word)
  html = html.replace(/([A-ZÁÉÍÓÚÑ]{3,})\s([A-ZÁÉÍÓÚÑ]{1,2})(?=[\s,.\-:;!?)])/g, '$1$2');
  // Fix hyphenated line breaks: "RECUPE- RACIÓN" already handled, but catch others
  html = html.replace(/([A-ZÁÉÍÓÚÑa-záéíóúñ])-\s+([A-ZÁÉÍÓÚÑa-záéíóúñ])/g, '$1$2');
  // Convert bullet points (●) into proper list items
  html = html.replace(/●\s*/g, '</p><li>');
  // Detect location headers (ALL CAPS zone names)
  html = html.replace(/((?:PUEBLO|CIUDAD|RUTA|CUEVA|BOSQUE|CATACUMBAS|PANTANO|SANTUARIO|ISLA|TORRE|TALLER|COLINA|GRUTA|VILLA|BASTIÓN|FÁBRICA|ESTACIÓN|SIMA|COSTA|EXPANSIONES|PRISIÓN|FORJA|RUINAS|PIRINEOS|BALNEARIO|MANANTIAL|FARO|HUERTO|HOSPICIO|MADRIGUERA)\s+[A-ZÁÉÍÓÚÑ\s]+)/g,
    '</p><h3 class="wt-location">$1</h3><p>');
  // Detect "COMBATE" sections
  html = html.replace(/(COMBATE\s+N[°º]\s*\d+[^.]*)/g, '<strong class="wt-combat">$1</strong>');
  // Detect "NOTA:" sections
  html = html.replace(/(NOTA|Nota|PISTA DE ENTRENADOR|PISTA PARA ENTRENADORES|IMPORTANTE):\s*/g, '<br><strong class="wt-note">$1:</strong> ');
  // Wrap loose <li> in <ul>
  html = html.replace(/(<li>(?:(?!<\/li>|<li>).)*)/g, '$1</li>');
  // Group consecutive <li> into <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul class="wt-list">$1</ul>');
  // Newlines to paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = `<p>${html}</p>`;
  return html;
}

function renderWalkthrough(main, section) {
  if (!D.walkthrough || !Object.keys(D.walkthrough).length) {
    main.innerHTML = '<p>No hay datos del walkthrough disponibles</p>';
    return;
  }

  const key = section || 'historia';
  const data = D.walkthrough[key];
  if (!data) { main.innerHTML = '<p>Seccion no encontrada</p>'; return; }

  let html = `<div class="location-header"><h1>${data.title}</h1></div>`;

  html += `<div class="walkthrough-section-nav">`;
  for (const [k, v] of Object.entries(D.walkthrough)) {
    html += `<button class="walkthrough-section-btn ${k === key ? 'active' : ''}" onclick="navigate('walkthrough','${k}')">${v.title}</button>`;
  }
  html += '</div>';

  const content = data.content || '';
  html += `<div class="walkthrough-content">${formatWalkthroughText(content)}</div>`;

  main.innerHTML = html;
}

// ===== PAGINATION HELPER =====
function renderPagination(totalPages, currentPage, varName, renderCall) {
  let html = '<div class="pagination">';
  if (currentPage > 0) html += `<button class="page-btn" onclick="${varName}=${currentPage - 1};${renderCall}">Anterior</button>`;
  for (let i = 0; i < totalPages; i++) {
    if (totalPages > 10 && Math.abs(i - currentPage) > 3 && i !== 0 && i !== totalPages - 1) {
      if (i === currentPage - 4 || i === currentPage + 4) html += `<span style="color:var(--text-muted);padding:6px">...</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${varName}=${i};${renderCall}">${i + 1}</button>`;
  }
  if (currentPage < totalPages - 1) html += `<button class="page-btn" onclick="${varName}=${currentPage + 1};${renderCall}">Siguiente</button>`;
  html += '</div>';
  return html;
}

// ===== SEARCH =====
function setupSearch() {
  const input = $('searchInput');
  const results = $('searchResults');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (q.length < 2) { results.classList.remove('active'); return; }

    const matches = [];
    for (const p of D.pokemon) {
      if (p.name && p.name.toLowerCase().includes(q))
        matches.push({ type: 'Pokemon', name: p.name, action: () => navigate('pokemon', p.id) });
      if (matches.length > 20) break;
    }
    const seenLoc = new Set();
    for (const l of D.locations) {
      if (l.name.toLowerCase().includes(q) && !seenLoc.has(l.name)) {
        seenLoc.add(l.name);
        matches.push({ type: 'Zona', name: l.name, action: () => navigate('location', l.name) });
      }
    }
    for (const i of D.items) {
      if (i.name && i.name.toLowerCase().includes(q))
        matches.push({ type: 'Objeto', name: i.name, action: () => navigate('item', i.internalName) });
      if (matches.length > 30) break;
    }
    for (const m of D.moves) {
      if (m.name && m.name.toLowerCase().includes(q))
        matches.push({ type: 'Movimiento', name: m.name });
      if (matches.length > 40) break;
    }

    if (!matches.length) { results.classList.remove('active'); return; }

    results.innerHTML = matches.slice(0, 15).map((m, i) =>
      `<div class="search-result-item" data-idx="${i}">
        <span class="result-type">${m.type}</span><span>${m.name}</span>
      </div>`
    ).join('');

    results.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        if (matches[i].action) matches[i].action();
        input.value = '';
        results.classList.remove('active');
      });
    });
    results.classList.add('active');
  });

  input.addEventListener('blur', () => setTimeout(() => results.classList.remove('active'), 200));
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('sidebarOverlay').classList.toggle('active');
}

// ===== SIMULATOR =====
function calcHP(base, level) {
  if (base === 1) return 1; // Shedinja
  return Math.floor((2 * base + 31) * level / 100) + level + 10;
}
function calcStat(base, level) {
  return Math.floor(((2 * base + 31) * level / 100) + 5);
}
function calcDamageRange(level, power, atk, def, stab, typeEff) {
  if (!power || power <= 0 || typeEff === 0) return { min: 0, max: 0 };
  const base = Math.floor(((2 * level / 5 + 2) * power * atk / def) / 50 + 2);
  const max = Math.floor(base * stab * typeEff);
  const min = Math.floor(max * 0.85);
  return { min, max };
}

function getResolvedPokemon(simSlot) {
  if (!simSlot) return null;
  const p = simSlot.pokemon;
  const level = simSlot.level || 50;
  let stats = p.stats, type1 = p.type1, type2 = p.type2 || null;
  let abilities = [...(p.abilities || [])];
  if (p.hiddenAbility) abilities.push(p.hiddenAbility);
  let formName = p.name;

  if (simSlot.formIndex != null) {
    const forms = D.formsManifest[p.id];
    if (forms && forms[simSlot.formIndex]) {
      const f = forms[simSlot.formIndex];
      formName = f.name || formName;
      if (f.stats) stats = f.stats;
      if (f.types && f.types.length) { type1 = f.types[0]; type2 = f.types[1] || null; }
      if (f.abilities && f.abilities.length) abilities = f.abilities;
    }
  }

  const hp = calcHP(stats.hp, level);
  return {
    name: formName, type1, type2, stats, abilities, level, hp,
    atkStat: calcStat(stats.atk, level),
    defStat: calcStat(stats.def, level),
    spatkStat: calcStat(stats.spatk, level),
    spdefStat: calcStat(stats.spdef, level),
    spdStat: calcStat(stats.spd, level),
    pokemon: p,
    formIndex: simSlot.formIndex
  };
}

function getAllMoves(pokemon) {
  const seen = new Set();
  const result = [];
  for (const mv of (pokemon.moves || [])) {
    if (!seen.has(mv.move)) {
      seen.add(mv.move);
      const m = D.moveByName[mv.move];
      if (m) result.push({ ...m, source: 'Nv.' + mv.level });
    }
  }
  for (const [move, pkList] of Object.entries(D.tms)) {
    if (pkList.includes(pokemon.internalName) && !seen.has(move)) {
      seen.add(move);
      const m = D.moveByName[move];
      if (m) result.push({ ...m, source: 'MT' });
    }
  }
  for (const moveName of (pokemon.eggMoves || [])) {
    if (!seen.has(moveName)) {
      seen.add(moveName);
      const m = D.moveByName[moveName];
      if (m) result.push({ ...m, source: 'Huevo' });
    }
  }
  return result;
}

function analyzeMoves(attacker, defender) {
  const moves = getAllMoves(attacker.pokemon);
  const eff = getTypeEffectiveness(defender.type1, defender.type2);
  return moves.map(m => {
    if (m.category === 'Status') return { move: m, damage: {min:0,max:0}, effectiveness: 1, percentHP: {min:0,max:0}, canKO: false, isStatus: true };
    const atkVal = m.category === 'Physical' ? attacker.atkStat : attacker.spatkStat;
    const defVal = m.category === 'Physical' ? defender.defStat : defender.spdefStat;
    const stab = (m.type === attacker.type1 || m.type === attacker.type2) ? 1.5 : 1;
    const typeEff = eff[m.type] || 1;
    const damage = calcDamageRange(attacker.level, m.power, atkVal, defVal, stab, typeEff);
    const pMin = defender.hp > 0 ? Math.round(damage.min / defender.hp * 100) : 0;
    const pMax = defender.hp > 0 ? Math.round(damage.max / defender.hp * 100) : 0;
    return { move: m, damage, effectiveness: typeEff, percentHP: {min: pMin, max: pMax}, canKO: damage.max >= defender.hp, isStatus: false };
  }).sort((a, b) => {
    if (a.isStatus && !b.isStatus) return 1;
    if (!a.isStatus && b.isStatus) return -1;
    return b.damage.max - a.damage.max;
  });
}

function effLabel(e) {
  if (e === 0) return 'Inmune';
  if (e === 0.25) return 'x0.25';
  if (e === 0.5) return 'x0.5';
  if (e === 1) return 'x1';
  if (e === 2) return 'x2';
  if (e === 4) return 'x4';
  return 'x' + e;
}
function effClass(e) {
  if (e === 0) return 'eff-0x';
  if (e <= 0.5) return 'eff-05x';
  if (e === 1) return 'eff-1x';
  if (e >= 4) return 'eff-4x';
  if (e >= 2) return 'eff-2x';
  return 'eff-1x';
}

function simSearchPokemon(prefix, query) {
  if (prefix === 'enemy') simEnemySearch = query;
  else simPlayerSearch = query;
  const box = document.getElementById(prefix + 'Suggestions');
  if (!box) return;
  if (!query || query.length < 2) { box.innerHTML = ''; box.classList.remove('active'); return; }
  const q = query.toLowerCase();
  const matches = D.pokemon.filter(p => p.name && p.name.toLowerCase().includes(q)).slice(0, 12);
  if (!matches.length) { box.innerHTML = '<div class="sim-suggestion" style="color:var(--text-muted)">Sin resultados</div>'; box.classList.add('active'); return; }
  box.innerHTML = matches.map(p => {
    const pid = String(p.id).padStart(3, '0');
    return `<div class="sim-suggestion" onclick="simSelectPokemon('${prefix}',${p.id})"><img src="icons/icon${pid}.png" width="32" height="32" onerror="this.src='sprites/${pid}.png'"> <span>#${p.id} ${p.name}</span> <span style="margin-left:auto">${typeBadge(p.type1)}${p.type2 ? typeBadge(p.type2) : ''}</span></div>`;
  }).join('');
  box.classList.add('active');
}

function simSelectPokemon(prefix, id) {
  const p = D.pokemon.find(pk => pk.id === id);
  if (!p) return;
  const slot = { pokemon: p, formIndex: null, level: 50 };
  if (prefix === 'enemy') { simEnemy = slot; simEnemySearch = ''; }
  else { simPlayer = slot; simPlayerSearch = ''; }
  renderSimulator($('mainContent'));
}

function simSelectForm(prefix, val) {
  const slot = prefix === 'enemy' ? simEnemy : simPlayer;
  if (!slot) return;
  slot.formIndex = val === '' ? null : parseInt(val);
  renderSimulatorResults();
}

function simSetLevel(prefix, val) {
  const slot = prefix === 'enemy' ? simEnemy : simPlayer;
  if (!slot) return;
  slot.level = Math.max(1, Math.min(100, parseInt(val) || 50));
  renderSimulatorResults();
}

function simClear(prefix) {
  if (prefix === 'enemy') { simEnemy = null; simEnemySearch = ''; }
  else { simPlayer = null; simPlayerSearch = ''; }
  renderSimulator($('mainContent'));
}

function renderSimPokemonPanel(prefix, slot, search) {
  const isEnemy = prefix === 'enemy';
  const title = isEnemy ? 'Pokemon Enemigo' : 'Tu Pokemon';
  const cls = isEnemy ? 'enemy' : 'player';
  let html = `<div class="sim-panel ${cls}"><h3>${title}</h3>`;

  if (!slot) {
    html += `<div class="sim-selector"><input type="text" id="${prefix}Search" placeholder="Buscar Pokemon..." value="${search}" oninput="simSearchPokemon('${prefix}',this.value)" autocomplete="off"><div class="sim-suggestions" id="${prefix}Suggestions"></div></div>`;
  } else {
    const p = slot.pokemon;
    const resolved = getResolvedPokemon(slot);
    const pid = String(p.id).padStart(3, '0');
    const spriteFile = slot.formIndex != null ? `${pid}_${slot.formIndex}.png` : `${pid}.png`;
    html += `<div class="sim-selected-pokemon">`;
    html += `<div class="sim-selected-header"><img src="sprites/${spriteFile}" onerror="this.src='sprites/${pid}.png'" width="80" height="80">`;
    html += `<div><strong>${resolved.name}</strong><div>${typeBadge(resolved.type1)}${resolved.type2 ? typeBadge(resolved.type2) : ''}</div>`;

    // Form selector
    const forms = D.formsManifest[p.id];
    if (forms && forms.length) {
      html += `<select onchange="simSelectForm('${prefix}',this.value)" style="margin-top:4px">`;
      html += `<option value="" ${slot.formIndex == null ? 'selected' : ''}>Forma base</option>`;
      forms.forEach((f, i) => {
        html += `<option value="${i}" ${slot.formIndex === i ? 'selected' : ''}>${f.name || 'Forma ' + (i+1)}</option>`;
      });
      html += `</select>`;
    }

    html += `</div></div>`;

    // Level
    html += `<div class="sim-controls"><label>Nivel: <input type="number" value="${slot.level}" min="1" max="100" onchange="simSetLevel('${prefix}',this.value)"></label>`;
    html += `<button class="sim-clear" onclick="simClear('${prefix}')">Cambiar</button></div>`;

    // Mini stats
    const sn = {hp:'PS',atk:'Atk',def:'Def',spatk:'SpA',spdef:'SpD',spd:'Spe'};
    html += `<div class="sim-mini-stats">`;
    html += `<div class="sim-stat-item"><span>PS</span><strong>${resolved.hp}</strong></div>`;
    html += `<div class="sim-stat-item"><span>Atk</span><strong>${resolved.atkStat}</strong></div>`;
    html += `<div class="sim-stat-item"><span>Def</span><strong>${resolved.defStat}</strong></div>`;
    html += `<div class="sim-stat-item"><span>SpA</span><strong>${resolved.spatkStat}</strong></div>`;
    html += `<div class="sim-stat-item"><span>SpD</span><strong>${resolved.spdefStat}</strong></div>`;
    html += `<div class="sim-stat-item"><span>Spe</span><strong>${resolved.spdStat}</strong></div>`;
    html += `</div>`;

    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function renderSimulatorResults() {
  const container = document.getElementById('simResults');
  if (!container) return;
  if (!simEnemy || !simPlayer) { container.innerHTML = ''; return; }

  const enemy = getResolvedPokemon(simEnemy);
  const player = getResolvedPokemon(simPlayer);
  let html = '';

  // 1. Type matchup summary
  const effVsPlayer = getTypeEffectiveness(player.type1, player.type2);
  const effVsEnemy = getTypeEffectiveness(enemy.type1, enemy.type2);

  html += `<div class="card sim-section"><h3>Resumen de Tipos</h3><div class="sim-type-matchup">`;
  // Enemy types vs player
  html += `<div class="sim-type-col"><h4>Debilidades de tu ${player.name}</h4>`;
  const playerWeakTypes = Object.entries(effVsPlayer).filter(([,v]) => v > 1).sort((a,b) => b[1]-a[1]);
  const playerResistTypes = Object.entries(effVsPlayer).filter(([,v]) => v > 0 && v < 1).sort((a,b) => a[1]-b[1]);
  const playerImmuneTypes = Object.entries(effVsPlayer).filter(([,v]) => v === 0);
  if (playerWeakTypes.length) html += playerWeakTypes.map(([t,v]) => `${typeBadge(t)} <span class="eff-bad">${effLabel(v)}</span>`).join(' ');
  else html += '<span style="color:var(--text-muted)">Ninguna debilidad</span>';
  html += `</div>`;

  html += `<div class="sim-type-col"><h4>Debilidades de ${enemy.name}</h4>`;
  const enemyWeakTypes = Object.entries(effVsEnemy).filter(([,v]) => v > 1).sort((a,b) => b[1]-a[1]);
  if (enemyWeakTypes.length) html += enemyWeakTypes.map(([t,v]) => `${typeBadge(t)} <span class="eff-bad">${effLabel(v)}</span>`).join(' ');
  else html += '<span style="color:var(--text-muted)">Ninguna debilidad</span>';
  html += `</div>`;

  html += `<div class="sim-type-col"><h4>Resistencias de tu ${player.name}</h4>`;
  if (playerResistTypes.length) html += playerResistTypes.map(([t,v]) => `${typeBadge(t)} <span class="eff-good">${effLabel(v)}</span>`).join(' ');
  else html += '<span style="color:var(--text-muted)">Ninguna</span>';
  if (playerImmuneTypes.length) html += `<br>` + playerImmuneTypes.map(([t]) => `${typeBadge(t)} <span class="eff-immune">Inmune</span>`).join(' ');
  html += `</div>`;

  html += `<div class="sim-type-col"><h4>Resistencias de ${enemy.name}</h4>`;
  const enemyResistTypes = Object.entries(effVsEnemy).filter(([,v]) => v > 0 && v < 1).sort((a,b) => a[1]-b[1]);
  const enemyImmuneTypes = Object.entries(effVsEnemy).filter(([,v]) => v === 0);
  if (enemyResistTypes.length) html += enemyResistTypes.map(([t,v]) => `${typeBadge(t)} <span class="eff-good">${effLabel(v)}</span>`).join(' ');
  else html += '<span style="color:var(--text-muted)">Ninguna</span>';
  if (enemyImmuneTypes.length) html += `<br>` + enemyImmuneTypes.map(([t]) => `${typeBadge(t)} <span class="eff-immune">Inmune</span>`).join(' ');
  html += `</div>`;
  html += `</div></div>`;

  // 2. Speed comparison
  const faster = player.spdStat > enemy.spdStat ? 'player' : player.spdStat < enemy.spdStat ? 'enemy' : 'tie';
  html += `<div class="card sim-section"><h3>Velocidad</h3><div class="sim-speed">`;
  if (faster === 'player') html += `<span class="faster">Tu ${player.name} (${player.spdStat})</span> ataca primero que <span class="slower">${enemy.name} (${enemy.spdStat})</span>`;
  else if (faster === 'enemy') html += `<span class="faster">${enemy.name} (${enemy.spdStat})</span> ataca primero que <span class="slower">tu ${player.name} (${player.spdStat})</span>`;
  else html += `Misma velocidad (${player.spdStat}) — el orden es aleatorio`;
  html += `</div></div>`;

  // 3. Enemy moves vs player
  const enemyMoves = analyzeMoves(enemy, player);
  html += `<div class="card sim-section"><h3>Movimientos de ${enemy.name} contra tu ${player.name}</h3>`;
  html += renderMoveTable(enemyMoves, false, enemy.type1, enemy.type2);
  html += `</div>`;

  // 4. Player moves vs enemy
  const playerMoves = analyzeMoves(player, enemy);
  html += `<div class="card sim-section"><h3>Tus movimientos contra ${enemy.name}</h3>`;
  html += renderMoveTable(playerMoves, true, player.type1, player.type2);
  html += `</div>`;

  // 5. Verdict
  const bestPlayerDmg = playerMoves.filter(m => !m.isStatus).reduce((max, m) => Math.max(max, m.percentHP.max), 0);
  const bestEnemyDmg = enemyMoves.filter(m => !m.isStatus).reduce((max, m) => Math.max(max, m.percentHP.max), 0);
  const playerCanKO = playerMoves.some(m => m.canKO);
  const enemyCanKO = enemyMoves.some(m => m.canKO);
  const speedAdv = faster === 'player';

  let verdictClass, verdictText, verdictDetail;
  if (playerCanKO && !enemyCanKO) {
    verdictClass = 'advantage'; verdictText = 'Ventaja clara';
    verdictDetail = `Tu ${player.name} puede noquear a ${enemy.name} de un golpe, pero el enemigo no puede noquearte.`;
  } else if (playerCanKO && enemyCanKO && speedAdv) {
    verdictClass = 'advantage'; verdictText = 'Ventaja (por velocidad)';
    verdictDetail = `Ambos pueden noquear de un golpe, pero tu ${player.name} es mas rapido y ataca primero.`;
  } else if (playerCanKO && enemyCanKO && !speedAdv) {
    verdictClass = 'disadvantage'; verdictText = 'Desventaja (por velocidad)';
    verdictDetail = `Ambos pueden noquear de un golpe, pero ${enemy.name} es mas rapido y ataca primero.`;
  } else if (!playerCanKO && enemyCanKO) {
    verdictClass = 'disadvantage'; verdictText = 'Desventaja clara';
    verdictDetail = `${enemy.name} puede noquearte de un golpe, pero tu no puedes hacer lo mismo.`;
  } else if (bestPlayerDmg > bestEnemyDmg + 15) {
    verdictClass = 'slight-advantage'; verdictText = 'Ventaja ligera';
    verdictDetail = `Tu mejor ataque hace ~${bestPlayerDmg}% PS vs ~${bestEnemyDmg}% PS del enemigo.`;
  } else if (bestEnemyDmg > bestPlayerDmg + 15) {
    verdictClass = 'slight-disadvantage'; verdictText = 'Desventaja ligera';
    verdictDetail = `El mejor ataque enemigo hace ~${bestEnemyDmg}% PS vs tu mejor ~${bestPlayerDmg}% PS.`;
  } else {
    verdictClass = 'neutral'; verdictText = 'Combate parejo';
    verdictDetail = `Dano similar: tu mejor ~${bestPlayerDmg}% PS vs enemigo ~${bestEnemyDmg}% PS.`;
  }

  html += `<div class="card sim-verdict ${verdictClass}"><h3>${verdictText}</h3><p>${verdictDetail}</p>`;

  // Suggestion to switch
  if (verdictClass === 'disadvantage' || verdictClass === 'slight-disadvantage') {
    const goodTypes = enemyWeakTypes.map(([t]) => t);
    if (goodTypes.length) {
      html += `<p class="sim-suggestion-text">Considera cambiar a un Pokemon de tipo ${goodTypes.map(t => `<strong>${TYPE_ES[t] || t}</strong>`).join(', ')} para tener ventaja.</p>`;
    }
  }
  html += `</div>`;

  container.innerHTML = html;
}

function effBarColor(e) {
  if (e >= 4) return '#ff4444';
  if (e >= 2) return '#ff8800';
  if (e === 1) return '#6690F0';
  if (e > 0) return '#51cf66';
  return '#555';
}

let simShowAllEnemy = false;
let simShowAllPlayer = false;
let simShowStatusEnemy = false;
let simShowStatusPlayer = false;

function simToggleAll(which) {
  if (which === 'enemy') simShowAllEnemy = !simShowAllEnemy;
  else simShowAllPlayer = !simShowAllPlayer;
  renderSimulatorResults();
}
function simToggleStatus(which) {
  if (which === 'enemy') simShowStatusEnemy = !simShowStatusEnemy;
  else simShowStatusPlayer = !simShowStatusPlayer;
  renderSimulatorResults();
}

function renderMoveTable(moves, isPlayer, attackerType1, attackerType2) {
  if (!moves.length) return '<p style="color:var(--text-muted)">No se encontraron movimientos.</p>';
  const damaging = moves.filter(m => !m.isStatus);
  const status = moves.filter(m => m.isStatus);
  const which = isPlayer ? 'player' : 'enemy';
  const showAll = isPlayer ? simShowAllPlayer : simShowAllEnemy;
  const showStatus = isPlayer ? simShowStatusPlayer : simShowStatusEnemy;
  const TOP_N = 10;

  let html = `<div class="sim-table-wrap"><table class="sim-table"><thead><tr><th>Movimiento</th><th>Tipo</th><th>Cat.</th><th>Poder</th><th>Prec.</th><th>Eficacia</th><th>Dano / % PS</th><th></th></tr></thead><tbody>`;

  const visibleDamaging = showAll ? damaging : damaging.slice(0, TOP_N);
  let first = true;
  for (const entry of visibleDamaging) {
    const m = entry.move;
    const ec = effClass(entry.effectiveness);
    const best = isPlayer && first ? ' best' : '';
    first = false;
    const stab = (m.type === attackerType1 || m.type === attackerType2) ? ' <span class="sim-stab">STAB</span>' : '';
    const catCls = m.category === 'Physical' ? 'cat-physical' : 'cat-special';
    const catTxt = m.category === 'Physical' ? 'Fisico' : 'Especial';
    const effBdg = entry.effectiveness !== 1 ? `<span class="sim-eff-badge ${ec}">${effLabel(entry.effectiveness)}</span>` : '<span class="sim-eff-badge eff-1x">x1</span>';
    const barPct = Math.min(entry.percentHP.max, 100);
    const barCol = effBarColor(entry.effectiveness);
    const koCell = entry.canKO ? '<span class="sim-ko">KO</span>' : (entry.percentHP.max >= 50 ? '<span class="sim-half">50%+</span>' : '');

    html += `<tr class="sim-row ${ec}${best}">`;
    html += `<td class="sim-td-name">${m.name || m.internalName}${stab}</td>`;
    html += `<td>${typeBadge(m.type)}</td>`;
    html += `<td><span class="sim-cat ${catCls}">${catTxt}</span></td>`;
    html += `<td class="sim-td-num">${m.power}</td>`;
    html += `<td class="sim-td-num">${m.accuracy}%</td>`;
    html += `<td>${effBdg}</td>`;
    html += `<td class="sim-td-dmg"><div class="sim-dmg-bar-wrap"><div class="sim-dmg-bar" style="width:${barPct}%;background:${barCol}"></div></div><span class="sim-dmg-text">${entry.damage.min}-${entry.damage.max} <strong>(${entry.percentHP.min}-${entry.percentHP.max}%)</strong></span></td>`;
    html += `<td>${koCell}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  if (damaging.length > TOP_N) {
    html += `<button class="sim-moves-toggle" onclick="simToggleAll('${which}')">${showAll ? 'Mostrar menos' : `Mostrar todos (${damaging.length - TOP_N} mas)`}</button>`;
  }

  if (status.length) {
    html += `<button class="sim-moves-toggle status" onclick="simToggleStatus('${which}')">${showStatus ? 'Ocultar' : 'Ver'} ${status.length} mov. de estado</button>`;
    if (showStatus) {
      html += `<div class="sim-table-wrap"><table class="sim-table status"><tbody>`;
      for (const entry of status) {
        const m = entry.move;
        html += `<tr class="sim-row eff-status"><td class="sim-td-name">${m.name || m.internalName}</td><td>${typeBadge(m.type)}</td><td><span class="sim-cat cat-status">Estado</span></td><td class="sim-td-num">-</td><td class="sim-td-num">${m.accuracy || '-'}%</td><td>-</td><td>-</td><td>${m.source}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
  }

  return html;
}

function renderSimulator(main) {
  let html = `<h2 class="section-title">Simulador de Combate</h2>`;
  html += `<p style="color:var(--text-secondary);margin-bottom:16px">Selecciona dos Pokemon para analizar el enfrentamiento. Los calculos usan stats base con 31 IVs y 0 EVs.</p>`;
  html += `<div class="sim-layout">`;
  html += renderSimPokemonPanel('enemy', simEnemy, simEnemySearch);
  html += renderSimPokemonPanel('player', simPlayer, simPlayerSearch);
  html += `</div>`;
  html += `<div id="simResults"></div>`;
  main.innerHTML = html;

  // Restore search focus if typing
  if (!simEnemy && simEnemySearch) restoreFocus('enemySearch');
  if (!simPlayer && simPlayerSearch) restoreFocus('playerSearch');

  // Render results if both selected
  if (simEnemy && simPlayer) renderSimulatorResults();
}

// ===== INIT =====
async function init() {
  await loadData();
  setupSearch();
  handleHash();
  window.addEventListener('hashchange', handleHash);
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.view));
  });
}

init();
