"""Extract structured data from the Pokemon Z guide PDF."""
import PyPDF2
import json
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF_PATH = r'C:/Users/k/Downloads/pokemon z guia/Guía Oficial de Pokémon Z.pdf'
DATA_DIR = r'C:/Users/k/Downloads/pokemon z guia/data'

reader = PyPDF2.PdfReader(PDF_PATH)
total_pages = len(reader.pages)

# Extract all pages preserving paragraph breaks better
all_pages = []
for i in range(total_pages):
    try:
        text = reader.pages[i].extract_text() or ''
        # Normalize spaces but keep newlines as paragraph markers
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = re.sub(r'  +', ' ', line).strip()
            if line:
                cleaned_lines.append(line)
        all_pages.append('\n'.join(cleaned_lines))
    except:
        all_pages.append('')

print(f"Extracted {total_pages} pages")

# ===== WALKTHROUGH with better formatting =====
sections = {
    "dudas_frecuentes": {"start": 2, "end": 5, "title": "Dudas Frecuentes"},
    "modos": {"start": 5, "end": 6, "title": "Modos del Z"},
    "historia": {"start": 6, "end": 424, "title": "Historia Principal"},
    "postgame": {"start": 424, "end": 436, "title": "Postgame"},
    "habitantes_acrilico": {"start": 436, "end": 441, "title": "Habitantes de Acrilico"},
    "recetas_crafteo": {"start": 441, "end": 443, "title": "Recetas de Crafteos"},
    "ubicacion_mts": {"start": 443, "end": 447, "title": "Ubicacion de MTs"},
    "nidos_alfa": {"start": 446, "end": 449, "title": "Nidos Alfa"},
    "pokemon_legendarios": {"start": 449, "end": 483, "title": "Pokemon Legendarios"},
    "megapiedras": {"start": 483, "end": 489, "title": "Megapiedras"},
    "formas_regionales": {"start": 489, "end": 508, "title": "Formas Regionales y Fakemon"},
    "ubicacion_pokemon": {"start": 508, "end": 558, "title": "Ubicacion de Pokemon"},
    "creditos": {"start": 558, "end": 559, "title": "Creditos"}
}

walkthrough = {}
for key, section in sections.items():
    start = section["start"]
    end = min(section["end"], total_pages)
    text = '\n\n'.join(all_pages[start:end])
    walkthrough[key] = {
        "title": section["title"],
        "content": text
    }

# Post-process: trim content before the actual heading when it starts mid-page
section_headings = {
    "habitantes_acrilico": r'(?i)listado\s+de\s+habitantes\s+de\s+acr[ií]lico',
    "nidos_alfa": r'(?i)NIDOS\s+ALFA',
    "megapiedras": r'(?i)LIST\s*ADO\s+DE\s+MEGAPIEDRAS',
    "creditos": r'(?i)CR[ÉE]DITOS\s+DE\s+LA\s+GU[ÍI]A',
}
for key, pattern in section_headings.items():
    if key in walkthrough:
        content = walkthrough[key]["content"]
        m = re.search(pattern, content)
        if m:
            walkthrough[key]["content"] = content[m.start():]
            print(f"  Trimmed {key}: removed {m.start()} chars before heading")

with open(f"{DATA_DIR}/walkthrough.json", 'w', encoding='utf-8') as f:
    json.dump(walkthrough, f, ensure_ascii=False)

print("Walkthrough saved")

# ===== EXTRACT ITEMS PER LOCATION =====
# The PDF has words on separate lines, so we need to join into a single text first
# Use the page-joined text but collapse all whitespace
full_text_flat = re.sub(r'\s+', ' ', '\n'.join(all_pages))

location_items = {}
# Pattern: "Objetos obtenibles en LOCATION:" followed by bullet items (●)
pattern = re.compile(
    r'Objetos\s+obtenibles\s+en\s+(.+?)\s*:\s*((?:●.+?)+?)(?=Objetos\s+obtenibles|Lista\s+de\s+Pok[eé]mon|NOTA:|Entrenadores|$)',
    re.IGNORECASE
)

for match in pattern.finditer(full_text_flat):
    location_name = match.group(1).strip()
    items_text = match.group(2)

    items = []
    for bullet in re.finditer(r'●\s*(.+?)(?=●|$)', items_text):
        item_text = bullet.group(1).strip()
        if item_text:
            colon_match = re.match(r'^([^:]+?):\s*(.+)', item_text)
            if colon_match:
                items.append({
                    "item": colon_match.group(1).strip(),
                    "location": colon_match.group(2).strip()
                })
            else:
                items.append({
                    "item": item_text,
                    "location": ""
                })

    if items:
        loc_key = location_name.strip()
        if loc_key in location_items:
            location_items[loc_key].extend(items)
        else:
            location_items[loc_key] = items

with open(f"{DATA_DIR}/location-items.json", 'w', encoding='utf-8') as f:
    json.dump(location_items, f, ensure_ascii=False)

print(f"Location items: {len(location_items)} locations with items")
for loc, items in sorted(location_items.items())[:10]:
    print(f"  {loc}: {len(items)} items")

# ===== EXTRACT MEGA EVOLUTION DATA =====
# Look for mega evolution info in the formas_regionales section and elsewhere
megas_data = {}

# Parse mega stones from items data
items_json = json.load(open(f"{DATA_DIR}/items.json", encoding='utf-8'))
for item in items_json:
    desc = item.get('description', '')
    if 'megaevolucionar' in desc.lower():
        # Extract pokemon name from description
        match = re.search(r'megaevolucionar\s+a\s+(.+?)[\.\,]', desc, re.IGNORECASE)
        if match:
            pokemon_names = match.group(1).strip()
            # Handle cases like "Flapple, Appletun e Hydrapple"
            names = re.split(r',\s*|\s+[ey]\s+', pokemon_names)
            for name in names:
                name = name.strip()
                # Remove trailing noise like "en combate", "Z", etc
                name = re.sub(r'\s*(en combate|Z)$', '', name, flags=re.IGNORECASE).strip()
                if name and len(name) > 1:
                    megas_data[name.upper()] = {
                        "pokemon": name,
                        "stone": item['name'],
                        "stoneInternal": item['internalName']
                    }

with open(f"{DATA_DIR}/megas.json", 'w', encoding='utf-8') as f:
    json.dump(megas_data, f, ensure_ascii=False)

print(f"Mega evolutions: {len(megas_data)} pokemon with megas")
for name, data in sorted(megas_data.items())[:10]:
    print(f"  {name}: {data['stone']}")
