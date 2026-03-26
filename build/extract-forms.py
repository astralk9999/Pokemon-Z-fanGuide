"""Extract form/mega stats from walkthrough PDF data."""
import json
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_DIR = r'C:/Users/k/Downloads/pokemon z guia/data'
wt = json.load(open(f'{DATA_DIR}/walkthrough.json', encoding='utf-8'))

forms_data = {}

# Combine all sections
full_text = ''
for key, section in wt.items():
    content = section.get('content', '')
    content = content.replace('\n\n', '{{P}}').replace('\n', ' ').replace('{{P}}', '\n\n')
    full_text += content + '\n\n'

# Pattern: PokemonName followed by 6 stat numbers (2-3 digits)
# The PDF format is: "Name HP ATK DEF ATK.ESP DEF.ESP VEL ABILITY"
stat_pattern = re.compile(
    r'([\w\-\.]+(?:\s+Z)?(?:\s+[XY])?)\s+'
    r'(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+'
    r'([\w\s/\.\-ÁÉÍÓÚÑ]+?)(?=\s+\d{2,3}\s+\d{2,3}|\s+Pokémon|\s+Nota:|\s+Si\s|\n\n|$)'
)

# Also try a simpler pattern for entries on the same line
simple_pattern = re.compile(
    r'((?:Mega\s+)?[\w\-]+(?:\s+Z)?(?:\s+[XY])?)\s+'
    r'(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+'
    r'([\w\s/\.\-ÁÉÍÓÚÑ]+?)(?=\s+(?:Mega\s+)?[\w\-]+(?:\s+Z)?\s+\d{2,3}\s+\d{2,3}|\s*Pokémon|\s*Nota|\n\n|$)'
)

for pattern in [stat_pattern, simple_pattern]:
    for m in pattern.finditer(full_text):
        name = m.group(1).strip()
        hp = int(m.group(2))
        atk = int(m.group(3))
        dfn = int(m.group(4))
        spatk = int(m.group(5))
        spdef = int(m.group(6))
        spd = int(m.group(7))
        ability_raw = m.group(8).strip()

        total = hp + atk + dfn + spatk + spdef + spd

        # Skip invalid entries
        if total < 150 or total > 800:
            continue
        if len(name) > 25 or len(name) < 3:
            continue

        # Only keep Z forms and Megas
        is_z = name.endswith(' Z')
        is_mega = name.startswith('Mega ')
        if not is_z and not is_mega:
            continue

        # Clean ability: remove line-break artifacts
        ability = re.sub(r'\s*-\s*', '', ability_raw)  # "RELAMP A- GUEO" -> "RELAMPAGUEO"
        ability = re.sub(r'\s{2,}', ' ', ability).strip()
        # Remove trailing partial words
        ability = re.sub(r'\s+\w{1,2}\s*$', '', ability).strip()

        # Split multiple abilities
        abilities = []
        if '/' in ability:
            abilities = [a.strip() for a in ability.split('/') if a.strip()]
        else:
            abilities = [ability]

        if name not in forms_data:
            forms_data[name] = {
                'name': name,
                'stats': {'hp': hp, 'atk': atk, 'def': dfn, 'spatk': spatk, 'spdef': spdef, 'spd': spd},
                'abilities': abilities
            }

# Also manually extract some that the regex misses by looking at the structured tables
# Pattern: "Pokemon Name HP ATK DEF ATK. ESP DEF. ESP VEL HABILIDAD [NORMAL] [HABILIDAD OCUL TA]"
# Then: "ActualName stats ability"
table_pattern = re.compile(
    r'(?:HABILIDAD(?:\s+NORMAL)?(?:\s+HABILIDAD\s+OCUL\s*TA)?)\s+'
    r'([\w\-\.]+(?:\s+Z)?)\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+'
    r'([\w\s/\.\-ÁÉÍÓÚÑ]+?)(?=\s+(?:[\w\-]+(?:\s+Z)?\s+\d{2,3})|\s*Pokémon|\s*Nota|\n\n|$)'
)

for m in table_pattern.finditer(full_text):
    name = m.group(1).strip()
    hp = int(m.group(2))
    atk = int(m.group(3))
    dfn = int(m.group(4))
    spatk = int(m.group(5))
    spdef = int(m.group(6))
    spd = int(m.group(7))
    ability_raw = m.group(8).strip()

    total = hp + atk + dfn + spatk + spdef + spd
    if total < 150 or total > 800:
        continue
    if len(name) > 25 or len(name) < 3:
        continue

    is_z = name.endswith(' Z')
    is_mega = name.startswith('Mega ')
    if not is_z and not is_mega:
        continue

    ability = re.sub(r'\s*-\s*', '', ability_raw)
    ability = re.sub(r'\s{2,}', ' ', ability).strip()
    abilities = [a.strip() for a in ability.split('/') if a.strip()] if '/' in ability else [ability]

    if name not in forms_data:
        forms_data[name] = {
            'name': name,
            'stats': {'hp': hp, 'atk': atk, 'def': dfn, 'spatk': spatk, 'spdef': spdef, 'spd': spd},
            'abilities': abilities
        }

# Also search with "Mega " prefix pattern
mega_pattern = re.compile(
    r'(Mega\s+[\w\-]+(?:\s+[XY])?(?:\s+Z)?)\s+'
    r'(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+'
    r'([\w\s/\.\-ÁÉÍÓÚÑ]+?)(?=\s+Pokémon|\s+Si\s|\n\n|$)'
)

for m in mega_pattern.finditer(full_text):
    name = m.group(1).strip()
    hp = int(m.group(2))
    atk = int(m.group(3))
    dfn = int(m.group(4))
    spatk = int(m.group(5))
    spdef = int(m.group(6))
    spd = int(m.group(7))
    ability_raw = m.group(8).strip()

    total = hp + atk + dfn + spatk + spdef + spd
    if total < 150 or total > 800:
        continue

    ability = re.sub(r'\s*-\s*', '', ability_raw)
    ability = re.sub(r'\s{2,}', ' ', ability).strip()
    abilities = [a.strip() for a in ability.split('/') if a.strip()] if '/' in ability else [ability]

    if name not in forms_data:
        forms_data[name] = {
            'name': name,
            'stats': {'hp': hp, 'atk': atk, 'def': dfn, 'spatk': spatk, 'spdef': spdef, 'spd': spd},
            'abilities': abilities
        }

# Clean up: remove entries with garbage names
to_remove = []
for name in forms_data:
    if any(c.isdigit() for c in name.replace(' Z', '').replace('Mega ', '')):
        to_remove.append(name)
    if name.startswith('d Z') or name.startswith('t Z'):
        to_remove.append(name)
for name in to_remove:
    if name in forms_data:
        del forms_data[name]

# Fix broken names from PDF word-wrapping
name_fixes = {
    'ght Z': 'Chesnaught Z',
    'gus Z': 'Cofagrigus Z',
    'tune Z': 'Kricketune Z',
}
for old_name, new_name in name_fixes.items():
    if old_name in forms_data and new_name not in forms_data:
        forms_data[new_name] = forms_data.pop(old_name)
        forms_data[new_name]['name'] = new_name

# Known ability names in the game (for cleaning)
KNOWN_ABILITIES = [
    'SIMPLE', 'IGNORANTE', 'SEBO', 'PELUCHE', 'MUDAR', 'FUGA',
    'PRESENCIA RARA', 'FUERZA CEREBRAL', 'MOMIA', 'CABEZA ROCA',
    'PARARRAYOS', 'ARMADURA BATALLA', 'POTENCIA BRUTA',
    'RASTRO', 'DESCARGA', 'CÁLCULO FINAL', 'ADAPTABLE',
    'LIVIANO', 'PIEL CELESTE', 'ÍMPETU ARDIENTE',
    'LEVITACIÓN', 'COLEÓPTERO', 'ALQUIMIA VIL', 'REGENERACIÓN',
    'ESPESURA', 'AFORTUNADO', 'MAR LLAMAS', 'ELECTRICIDAD ESTÁTICA',
    'TORRENTE', 'EXPERTO', 'ENSAÑAMIENTO', 'RELAMPAGUEO',
    'TOQUE TÓXICO', 'PUNTO TÓXICO', 'CUERPO LLAMA', 'ESPANTO',
    'FORMA ILUSORIA', 'SEQUÍA', 'TOQUE MÁGICO', 'VOZ FLUIDA',
    'POTENCIA BRUTA', 'CONTRAGUARDIA', 'CORTANTE',
    'PUNTA ACERO', 'DESPIERTALLAMA', 'NINGUNA',
]

# Clean abilities: remove trailing Pokemon names, evolution text, and fix broken words
def clean_ability_text(abilities_list):
    cleaned = []
    for raw_ab in abilities_list:
        ab = raw_ab.strip()
        # Fix known broken words
        ab = ab.replace('PARARRA YOS', 'PARARRAYOS')
        ab = ab.replace('PUNT O TÓXICO', 'PUNTO TÓXICO')
        ab = ab.replace('PUNT A ACERO', 'PUNTA ACERO')
        ab = ab.replace('RELAMP AGUEO', 'RELAMPAGUEO')
        ab = ab.replace('ADAPT ABLE', 'ADAPTABLE')
        ab = ab.replace('LEVIT ACIÓN', 'LEVITACIÓN')
        ab = ab.replace('LEVIT ACIÓ N', 'LEVITACIÓN')
        ab = ab.replace('EXPERT O', 'EXPERTO')
        ab = ab.replace('CORT ANTE', 'CORTANTE')
        ab = ab.replace('DESPIERT ALLAMA', 'DESPIERTALLAMA')
        ab = ab.replace('POT. BRUT A', 'POTENCIA BRUTA')
        ab = ab.replace('POTENCIA BRUT A', 'POTENCIA BRUTA')
        ab = ab.replace('ELECTRICIDA D', 'ELECTRICIDAD')
        ab = ab.replace('COLEÓPTE RO', 'COLEÓPTERO')
        ab = ab.replace('ENSAÑAMIENT', 'ENSAÑAMIENTO')
        ab = ab.replace('ELECTRICIDAD ESTÁTICA', 'ELECTRICIDAD ESTÁTICA')
        # Remove trailing text after last known ability word
        # Pattern: everything after a Pokemon name or "evoluciona" or "Z ."
        ab = re.sub(r'\s+(?:evoluciona|Z\s*\.|Si deseas|Nota:).*$', '', ab, flags=re.IGNORECASE)
        # Remove trailing Pokemon names (capitalized word that's not an ability)
        # Split by space and find where the ability ends
        for pokemon_name in ['Raichu', 'Parasect', 'Cofagrigus', 'Marowak', 'Porygon2',
                             'Wailmer', 'Wailord', 'Flygon', 'Bibarel', 'Kricketune',
                             'Kricketot', 'Duosion', 'Chesnaught', 'Delphox', 'Greninja',
                             'Cofagri-']:
            idx = ab.find(pokemon_name)
            if idx > 0:
                ab = ab[:idx].strip()
        # Remove "NINGUNA" if it's after a real ability
        parts = [p.strip() for p in ab.split(',') if p.strip()]
        final_parts = []
        for part in parts:
            # Further split by space and check for "NINGUNA" appended to ability
            if ' NINGUNA' in part and part != 'NINGUNA':
                sub = part.split(' NINGUNA')[0].strip()
                final_parts.append(sub)
                final_parts.append('NINGUNA (Oculta)')
            else:
                final_parts.append(part)
        cleaned.extend(final_parts)
    return cleaned

for name, data in forms_data.items():
    data['abilities'] = clean_ability_text(data['abilities'])

# Manual ability overrides (PDF extraction is unreliable for ability separation)
ABILITY_OVERRIDES = {
    'Pikachu Z': ['Toque Toxico', 'Punto Toxico (Oculta)'],
    'Raichu Z': ['Ensañamiento'],
    'Paras Z': ['Presencia Rara', 'Fuerza Cerebral (Oculta)'],
    'Parasect Z': ['Presencia Rara', 'Fuerza Cerebral (Oculta)'],
    'Cubone Z': ['Cabeza Roca', 'Pararrayos', 'Armadura Batalla (Oculta)'],
    'Marowak Z': ['Cabeza Roca', 'Potencia Bruta', 'Armadura Batalla (Oculta)'],
    'Porygon Z': ['Rastro', 'Descarga', 'Calculo Final (Oculta)'],
    'Porygon-Z Z': ['Adaptable', 'Descarga', 'Calculo Final (Oculta)'],
    'Wailmer Z': ['Liviano', 'Piel Celeste', 'Impetu Ardiente (Oculta)'],
    'Wailord Z': ['Liviano', 'Piel Celeste', 'Impetu Ardiente (Oculta)'],
    'Bidoof Z': ['Simple', 'Ignorante', 'Sebo (Oculta)'],
    'Bibarel Z': ['Simple', 'Sebo', 'Peluche (Oculta)'],
    'Kricketot Z': ['Mudar', 'Fuga (Oculta)'],
    'Kricketune Z': ['Contraguardia', 'Cortante (Oculta)'],
    'Rotom Z': ['Levitacion'],
    'Lilligant Z': ['Despiertallama', 'Cuerpo Llama (Oculta)'],
    'Yamask Z': ['Momia'],
    'Cofagrigus Z': ['Punta Acero'],
    'Gothitelle Z': ['Cuerpo Llama', 'Espanto (Oculta)'],
    'Solosis Z': ['Alquimia Vil', 'Regeneracion (Oculta)'],
    'Duosion Z': ['Alquimia Vil', 'Regeneracion (Oculta)'],
    'Reuniclus Z': ['Alquimia Vil', 'Regeneracion (Oculta)'],
    'Quilladin Z': ['Espesura', 'Afortunado (Oculta)'],
    'Chesnaught Z': ['Espesura', 'Afortunado (Oculta)'],
    'Braixen Z': ['Mar Llamas', 'Electricidad Estatica (Oculta)'],
    'Delphox Z': ['Mar Llamas', 'Relampagueo (Oculta)'],
    'Frogadier Z': ['Torrente', 'Experto (Oculta)'],
    'Greninja Z': ['Torrente', 'Forma Ilusoria (Oculta)'],
    'Vibrava Z': ['Levitacion'],
    'Flygon Z': ['Coleoptero'],
    'Mega Raichu Z': ['Ensañamiento'],
    'Mega Entei': ['Sequia'],
    'Mega Volcarona': ['Sequia'],
    'Mega Delphox': ['Relampagueo'],
    'Mega Greninja': ['Toque Magico'],
    'Mega Florges': ['Voz Fluida'],
    'Mega Grimmsnarl': ['Potencia Bruta'],
}
for name, abilities in ABILITY_OVERRIDES.items():
    if name in forms_data:
        forms_data[name]['abilities'] = abilities

# Type overrides for Z forms and Megas with type changes
TYPE_OVERRIDES = {
    'Pikachu Z': ['ELECTRIC', 'POISON'],
    'Raichu Z': ['ELECTRIC', 'FIGHTING'],
    'Paras Z': ['BUG', 'PSYCHIC'],
    'Parasect Z': ['BUG', 'PSYCHIC'],
    'Cubone Z': ['GROUND', 'STEEL'],
    'Marowak Z': ['GROUND', 'STEEL'],
    'Porygon Z': ['NORMAL', 'STEEL'],
    'Porygon-Z Z': ['NORMAL', 'STEEL'],
    'Wailmer Z': ['WATER', 'FIRE'],
    'Wailord Z': ['WATER', 'FIRE'],
    'Bidoof Z': ['NORMAL', 'GROUND'],
    'Bibarel Z': ['NORMAL', 'WATER'],
    'Kricketot Z': ['BUG', 'FIGHTING'],
    'Kricketune Z': ['BUG', 'FIGHTING'],
    'Rotom Z': ['ELECTRIC', 'FIGHTING'],
    'Lilligant Z': ['GRASS', 'FIRE'],
    'Yamask Z': ['GHOST', 'STEEL'],
    'Cofagrigus Z': ['GHOST', 'STEEL'],
    'Gothitelle Z': ['PSYCHIC', 'FIRE'],
    'Solosis Z': ['PSYCHIC', 'POISON'],
    'Duosion Z': ['PSYCHIC', 'POISON'],
    'Reuniclus Z': ['PSYCHIC', 'POISON'],
    'Quilladin Z': ['GRASS', 'FIGHTING'],
    'Chesnaught Z': ['GRASS', 'FIGHTING'],
    'Braixen Z': ['FIRE', 'ELECTRIC'],
    'Delphox Z': ['FIRE', 'ELECTRIC'],
    'Frogadier Z': ['WATER', 'DARK'],
    'Greninja Z': ['WATER', 'DARK'],
    'Vibrava Z': ['GROUND', 'BUG'],
    'Flygon Z': ['GROUND', 'BUG'],
    'Mega Raichu Z': ['ELECTRIC', 'FIGHTING'],
    'Mega Delphox': ['FIRE', 'ELECTRIC'],
    'Mega Greninja': ['WATER', 'DARK'],
    'Mega Entei': ['FIRE'],
    'Mega Volcarona': ['BUG', 'FIRE'],
    'Mega Florges': ['FAIRY'],
    'Mega Grimmsnarl': ['DARK', 'FAIRY'],
}
for name, types in TYPE_OVERRIDES.items():
    if name in forms_data:
        forms_data[name]['types'] = types

# Save
with open(f'{DATA_DIR}/form-stats.json', 'w', encoding='utf-8') as f:
    json.dump(forms_data, f, ensure_ascii=False)

print(f'Extracted {len(forms_data)} form/mega stat entries:')
for name in sorted(forms_data.keys()):
    d = forms_data[name]
    s = d['stats']
    total = sum(s.values())
    ab = ', '.join(d['abilities'])[:40]
    print(f'  {name}: {s["hp"]}/{s["atk"]}/{s["def"]}/{s["spatk"]}/{s["spdef"]}/{s["spd"]} = {total} | {ab}')
