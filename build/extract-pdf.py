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
print(f"Total pages: {total_pages}")

# Extract all text
all_text = []
for i in range(total_pages):
    try:
        text = reader.pages[i].extract_text() or ''
        # Clean up the weird spacing from PDF extraction
        # The PDF has spaces between every word/letter
        cleaned = re.sub(r'\s+', ' ', text).strip()
        all_text.append(cleaned)
    except Exception as e:
        all_text.append('')
        print(f"Error on page {i+1}: {e}")

print("Text extraction complete.")

# Define sections based on the PDF index (page numbers are 1-indexed in the PDF)
# PDF page numbers -> 0-indexed array
sections = {
    "dudas_frecuentes": {"start": 2, "end": 5, "title": "Dudas Frecuentes"},
    "modos": {"start": 5, "end": 6, "title": "Modos del Z"},
    "historia": {"start": 6, "end": 424, "title": "Historia Principal"},
    "postgame": {"start": 424, "end": 430, "title": "Postgame"},
    "habitantes_acrilico": {"start": 430, "end": 432, "title": "Listado de Habitantes de Acrílico"},
    "recetas_crafteo": {"start": 432, "end": 436, "title": "Ubicación de Recetas de Crafteos"},
    "ubicacion_mts": {"start": 436, "end": 440, "title": "Ubicación de MTs"},
    "nidos_alfa": {"start": 440, "end": 441, "title": "Ubicación de Nidos Alfa"},
    "pokemon_legendarios": {"start": 441, "end": 477, "title": "Pokémon Legendarios"},
    "megapiedras": {"start": 477, "end": 482, "title": "Ubicación de Megapiedras"},
    "formas_regionales": {"start": 482, "end": 498, "title": "Formas Regionales y Fakemon"},
    "ubicacion_pokemon": {"start": 498, "end": 548, "title": "Ubicación de todos los Pokémon"},
    "creditos": {"start": 548, "end": 559, "title": "Créditos"}
}

walkthrough = {}
for key, section in sections.items():
    start = section["start"]
    end = min(section["end"], total_pages)
    text = "\n\n".join(all_text[start:end])
    walkthrough[key] = {
        "title": section["title"],
        "content": text
    }

# For the main historia, try to split by location names
# Look for patterns like "PUEBLO LIENZO", "RUTA 1", "CIUDAD GRISALLA", etc.
historia_text = walkthrough["historia"]["content"]
location_pattern = re.compile(
    r'((?:PUEBLO|CIUDAD|RUTA|CUEVA|BOSQUE|CATACUMBAS|PANTANO|SANTUARIO|ISLA|TORRE|TALLER|COLINA|GRUTA|MADRIGUERA|CHATEAU|PIRINEOS|FARO|HUERTO|HOSPICIO|VILLA|MANANTIAL|BALNEARIO|FORJA|RUINAS|EXPANSIONES|SIMA|COSTA|BAHIA|PRISIÓN|FÁBRICA|ESTACIÓN|ARMA)\s+[\wÁÉÍÓÚÀÈÌÒÙÑáéíóúàèìòùñ\s]+)',
    re.IGNORECASE
)

# Save the walkthrough data
with open(f"{DATA_DIR}/walkthrough.json", 'w', encoding='utf-8') as f:
    json.dump(walkthrough, f, ensure_ascii=False)

print(f"Walkthrough sections saved: {len(walkthrough)}")
for key, val in walkthrough.items():
    print(f"  {key}: {val['title']} ({len(val['content'])} chars)")
