const fs = require('fs');
const path = require('path');

const PBS_DIR = 'C:/Users/k/Downloads/Pokemon Z V2.16/PBS';
const DATA_DIR = path.join(__dirname, '..', 'data');

function readPBS(filename) {
  return fs.readFileSync(path.join(PBS_DIR, filename), 'utf-8').replace(/^\uFEFF/, '');
}

// ============ METADATA (mapId -> name) ============
function parseMetadata() {
  const text = readPBS('metadata.txt');
  const map = {};
  let currentId = null;
  for (const line of text.split('\n')) {
    const idMatch = line.match(/^\[(\d+)\]/);
    if (idMatch) { currentId = idMatch[1]; continue; }
    const nameMatch = line.match(/^#\s*(.+)/);
    if (nameMatch && currentId !== null) {
      map[currentId] = nameMatch[1].trim();
    }
  }
  return map;
}

// ============ ENCOUNTERS ============
function parseEncounters(metadataMap) {
  const text = readPBS('encounters.txt');
  const blocks = text.split(/^#{3,}/m).filter(s => s.trim());
  const locations = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) continue;

    const headerMatch = lines[0].match(/^(\d+)\s*#\s*(.+)/);
    if (!headerMatch) continue;

    const mapId = headerMatch[1];
    const name = headerMatch[2].trim();
    // line 1: density info (skip)
    let currentMethod = null;
    const encounters = {};

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^(Land|Water|RockSmash|OldRod|GoodRod|SuperRod|Cave|HeadbuttLow|HeadbuttHigh)$/i)) {
        currentMethod = line;
        encounters[currentMethod] = [];
        continue;
      }
      if (currentMethod) {
        const pkMatch = line.match(/^([A-Za-z0-9_]+),(\d+),(\d+)/);
        if (pkMatch) {
          encounters[currentMethod].push({
            pokemon: pkMatch[1],
            minLv: parseInt(pkMatch[2]),
            maxLv: parseInt(pkMatch[3])
          });
        }
      }
    }

    // Calculate probabilities (slots system: 12 slots per method)
    for (const method of Object.keys(encounters)) {
      const slots = encounters[method];
      const totalSlots = slots.length;
      const grouped = {};
      for (const s of slots) {
        const key = `${s.pokemon}-${s.minLv}-${s.maxLv}`;
        if (!grouped[key]) grouped[key] = { ...s, count: 0 };
        grouped[key].count++;
      }
      encounters[method] = Object.values(grouped).map(g => ({
        pokemon: g.pokemon,
        minLv: g.minLv,
        maxLv: g.maxLv,
        probability: Math.round((g.count / totalSlots) * 100)
      })).sort((a, b) => b.probability - a.probability);
    }

    locations.push({ mapId, name, encounters });
  }
  return locations;
}

// ============ TOWNMAP (order) ============
function parseTownmap() {
  const text = readPBS('townmap.txt');
  const points = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^Point=(\d+),(\d+),"([^"]+)"/);
    if (m) {
      const name = m[3];
      if (!points.find(p => p.name === name)) {
        points.push({ x: parseInt(m[1]), y: parseInt(m[2]), name });
      }
    }
  }
  return points;
}

// ============ POKEMON ============
function parsePokemon() {
  const text = readPBS('pokemon.txt');
  const pokemon = [];
  let current = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const idMatch = trimmed.match(/^\[(\d+)\]/);
    if (idMatch) {
      if (current) pokemon.push(current);
      current = { id: parseInt(idMatch[1]) };
      continue;
    }
    if (!current) continue;
    const kvMatch = trimmed.match(/^(\w+)=(.+)/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;

    switch (key) {
      case 'Name': current.name = val; break;
      case 'InternalName': current.internalName = val; break;
      case 'Type1': current.type1 = val; break;
      case 'Type2': current.type2 = val; break;
      case 'BaseStats': {
        const s = val.split(',').map(Number);
        current.stats = { hp: s[0], atk: s[1], def: s[2], spd: s[3], spatk: s[4], spdef: s[5] };
        break;
      }
      case 'Abilities': current.abilities = val.split(','); break;
      case 'HiddenAbility': current.hiddenAbility = val; break;
      case 'Moves': {
        const parts = val.split(',');
        const moves = [];
        for (let i = 0; i < parts.length - 1; i += 2) {
          moves.push({ level: parseInt(parts[i]), move: parts[i + 1] });
        }
        current.moves = moves;
        break;
      }
      case 'EggMoves': current.eggMoves = val.split(','); break;
      case 'Evolutions': {
        const parts = val.split(',');
        const evos = [];
        for (let i = 0; i < parts.length - 2; i += 3) {
          evos.push({ to: parts[i], method: parts[i + 1], param: parts[i + 2] });
        }
        current.evolutions = evos;
        break;
      }
      case 'Pokedex': current.pokedex = val; break;
      case 'Height': current.height = parseFloat(val); break;
      case 'Weight': current.weight = parseFloat(val); break;
      case 'Color': current.color = val; break;
      case 'Kind': current.kind = val; break;
      case 'GenderRate': current.genderRate = val; break;
      case 'GrowthRate': current.growthRate = val; break;
      case 'Rareness': current.catchRate = parseInt(val); break;
      case 'Happiness': current.happiness = parseInt(val); break;
      case 'BaseEXP': current.baseExp = parseInt(val); break;
      case 'WildItemCommon': current.wildItemCommon = val; break;
      case 'WildItemUncommon': current.wildItemUncommon = val; break;
      case 'WildItemRare': current.wildItemRare = val; break;
      case 'FormNames': current.formNames = val.split(',').map(s => s.trim()); break;
    }
  }
  if (current) pokemon.push(current);
  return pokemon;
}

// ============ ITEMS ============
function parseItems() {
  const text = readPBS('items.txt');
  const items = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Format: id,INTERNAL,Name,PluralName,pocket,price,"description",field_use,battle_use,type,
    // Parse carefully because description is quoted and may contain commas
    const descMatch = trimmed.match(/"([^"]*)"/);
    const desc = descMatch ? descMatch[1] : '';
    // Get everything before the quoted description
    const beforeDesc = trimmed.substring(0, trimmed.indexOf('"')).replace(/,\s*$/, '');
    const parts = beforeDesc.split(',');
    if (parts.length < 6) continue;
    items.push({
      id: parseInt(parts[0]),
      internalName: parts[1],
      name: parts[2],
      namePlural: parts[3],
      pocket: parseInt(parts[4]),
      price: parseInt(parts[5]) || 0,
      description: desc
    });
  }
  return items;
}

// ============ MOVES ============
function parseMoves() {
  const text = readPBS('moves.txt');
  const moves = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Format: id,INTERNAL,Name,flags,power,type,category,accuracy,pp,effectChance,...,"description"
    const descMatch = trimmed.match(/"([^"]*)"$/);
    const desc = descMatch ? descMatch[1] : '';
    const beforeDesc = descMatch ? trimmed.slice(0, trimmed.lastIndexOf('"' + desc + '"')) : trimmed;
    const parts = beforeDesc.split(',');
    if (parts.length < 9) continue;
    moves.push({
      id: parseInt(parts[0]),
      internalName: parts[1],
      name: parts[2],
      power: parseInt(parts[4]) || 0,
      type: parts[5],
      category: parts[6],
      accuracy: parseInt(parts[7]) || 0,
      pp: parseInt(parts[8]) || 0,
      effectChance: parseInt(parts[9]) || 0,
      description: desc
    });
  }
  return moves;
}

// ============ ABILITIES ============
function parseAbilities() {
  const text = readPBS('abilities.txt');
  const abilities = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const descMatch = trimmed.match(/"([^"]*)"$/);
    const desc = descMatch ? descMatch[1] : '';
    const parts = trimmed.split(',');
    if (parts.length < 3) continue;
    abilities.push({
      id: parseInt(parts[0]),
      internalName: parts[1],
      name: parts[2],
      description: desc
    });
  }
  return abilities;
}

// ============ TYPES ============
function parseTypes() {
  const text = readPBS('types.txt');
  const types = [];
  let current = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.match(/^\[\d+\]/)) {
      if (current) types.push(current);
      current = {};
      continue;
    }
    if (!current) continue;
    const kvMatch = trimmed.match(/^(\w+)=(.+)/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;
    switch (key) {
      case 'Name': current.name = val; break;
      case 'InternalName': current.internalName = val; break;
      case 'Weaknesses': current.weaknesses = val.split(','); break;
      case 'Resistances': current.resistances = val.split(','); break;
      case 'Immunities': current.immunities = val.split(','); break;
    }
  }
  if (current) types.push(current);
  return types;
}

// ============ TRAINERS ============
function parseTrainers() {
  const text = readPBS('trainers.txt');
  const trainers = [];
  // Split by #--- separator lines
  const blocks = text.split(/^#-+\s*$/m);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.replace(/\r/, '').trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length < 3) continue;
    const trainerClass = lines[0];
    const nameParts = lines[1].split(',');
    const trainerName = nameParts[0];
    const variant = nameParts[1] ? parseInt(nameParts[1]) : 0;
    const numPokemon = parseInt(lines[2]);
    if (isNaN(numPokemon)) continue;

    const pokemon = [];
    for (let i = 3; i < 3 + numPokemon && i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        pokemon.push({
          species: parts[0],
          level: parseInt(parts[1]),
          item: parts[2] || undefined
        });
      }
    }
    trainers.push({
      class: trainerClass,
      name: trainerName,
      variant,
      pokemon
    });
  }
  return trainers;
}

// ============ TMs ============
function parseTMs() {
  const text = readPBS('tm.txt');
  const tms = {};
  let currentMove = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const moveMatch = trimmed.match(/^\[(\w+)\]/);
    if (moveMatch) {
      currentMove = moveMatch[1];
      tms[currentMove] = [];
      continue;
    }
    if (currentMove && trimmed) {
      const pokemon = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      tms[currentMove].push(...pokemon);
    }
  }
  return tms;
}

// ============ TRAINER TYPES ============
function parseTrainerTypes() {
  const text = readPBS('trainertypes.txt');
  const types = {};
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/\r/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(',');
    if (parts.length < 3) continue;
    types[parts[1]] = {
      id: parseInt(parts[0]),
      internalName: parts[1],
      displayName: parts[2],
      gender: parts[7] || 'Male'
    };
  }
  return types;
}

// ============ MAIN ============
console.log('Parsing metadata...');
const metadataMap = parseMetadata();

console.log('Parsing encounters...');
const locations = parseEncounters(metadataMap);

console.log('Parsing townmap...');
const townmap = parseTownmap();

console.log('Parsing pokemon...');
const pokemon = parsePokemon();

console.log('Parsing items...');
const items = parseItems();

console.log('Parsing moves...');
const moves = parseMoves();

console.log('Parsing abilities...');
const abilities = parseAbilities();

console.log('Parsing types...');
const types = parseTypes();

console.log('Parsing trainers...');
const trainers = parseTrainers();

console.log('Parsing TMs...');
const tms = parseTMs();

console.log('Parsing trainer types...');
const trainerTypes = parseTrainerTypes();

// Create pokemon name map for lookups
const pokemonByName = {};
for (const p of pokemon) {
  if (p.internalName) pokemonByName[p.internalName] = p;
}

// Create move name map
const moveByName = {};
for (const m of moves) {
  if (m.internalName) moveByName[m.internalName] = m;
}

// Create ability name map
const abilityByName = {};
for (const a of abilities) {
  if (a.internalName) abilityByName[a.internalName] = a;
}

// Write all JSON files
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

fs.writeFileSync(path.join(DATA_DIR, 'locations.json'), JSON.stringify(locations, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'pokemon.json'), JSON.stringify(pokemon, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'moves.json'), JSON.stringify(moves, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'abilities.json'), JSON.stringify(abilities, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'types.json'), JSON.stringify(types, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'trainers.json'), JSON.stringify(trainers, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'tms.json'), JSON.stringify(tms, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'townmap.json'), JSON.stringify(townmap, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'metadata.json'), JSON.stringify(metadataMap, null, 0));
fs.writeFileSync(path.join(DATA_DIR, 'trainertypes.json'), JSON.stringify(trainerTypes, null, 0));

console.log(`\nDone! Generated files in ${DATA_DIR}`);
console.log(`  Locations: ${locations.length}`);
console.log(`  Pokemon: ${pokemon.length}`);
console.log(`  Items: ${items.length}`);
console.log(`  Moves: ${moves.length}`);
console.log(`  Abilities: ${abilities.length}`);
console.log(`  Types: ${types.length}`);
console.log(`  Trainers: ${trainers.length}`);
console.log(`  TMs: ${Object.keys(tms).length}`);
console.log(`  Trainer Types: ${Object.keys(trainerTypes).length}`);
