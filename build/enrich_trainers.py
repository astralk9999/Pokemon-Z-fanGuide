import PyPDF2
import json
import re
import sys
import io

# Setup for character encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TRAINERS_JSON = r'C:/Users/k/Downloads/pokemon z guia/data/trainers.json'
PDF_PATH = r'C:/Users/k/Downloads/pokemon z guia/guia.pdf'
OUTPUT_JSON = r'C:/Users/k/Downloads/pokemon z guia/data/trainers.json' # We'll overwrite it

def normalize_name(n):
    return re.sub(r'[^A-Z0-9]', '', n.upper())

def extract_trainer_data():
    try:
        reader = PyPDF2.PdfReader(PDF_PATH)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n"
        
        # Split text into "Entrenadores" blocks or page blocks
        # We'll use a regex to find moves following pokemon listings
        # Pattern 1: Simple list (● Species, level N. Move1, Move2...)
        simple_pattern = re.compile(r'●\s*([^,]+),\s*nivel\s*(\d+)\.\s*((?:[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+(?:,\s*)?)+)', re.UNICODE)
        
        # Pattern 2: Boss table
        # We look for "NIVEL OBJETO HABILIDAD NATURALEZA" followed by "MOVIMIENTOS"
        boss_pattern = re.compile(r'NIVEL\s+OBJETO\s+HABILIDAD\s+NATURALEZA\s+(\d+)\s+([^\n]+)\s+([^\n]+)\s+([^\n]+)\s+MOVIMIENTOS\s+([^\n]+)', re.IGNORECASE)

        # Load existing trainers
        with open(TRAINERS_JSON, 'r', encoding='utf-8') as f:
            trainers = json.load(f)

        # Match logic:
        # We'll scan the text and try to map moves to species/levels.
        # Since the PDF is mostly sequential with the game, we can try to find the "Entrenadores" section for a zone.
        # But a more global approach: Create a map of (Species + Level) -> List of Moves found in the PDF.
        moves_map = {} # (species, level) -> list of moves
        
        # Scan for simple format
        for match in simple_pattern.finditer(full_text):
            species = match.group(1).strip().upper()
            level = int(match.group(2))
            moves_str = match.group(3).strip()
            # If it looks like moves (multiple words usually, or specific names)
            moves = [m.strip() for m in re.split(r',\s*', moves_str) if m.strip()]
            # Filter matches that are just text (e.g. if the line ends with "Objetos:")
            if moves and len(moves) <= 4 and all(len(m) > 2 for m in moves):
                key = (species, level)
                if key not in moves_map: moves_map[key] = []
                moves_map[key].append(moves)

        # Scan for boss format
        # This is harder because species name is usually ABOVE the table
        # Let's find species name by looking back from the match
        for match in boss_pattern.finditer(full_text):
            level = int(match.group(1))
            moves_str = match.group(5).strip()
            moves = [m.strip() for m in re.split(r'\s+', moves_str) if m.strip()]
            # Look back for species name (it's usually a single line with just the name or name + something)
            # The name is often right before the "NIVEL..." line, but there might be some spacers
            lookback = full_text[max(0, match.start()-100):match.start()]
            # Try to find a known pokemon species in the lookback
            # We'll use the trainers list to know which species to look for
            species_found = None
            for t in trainers:
                for p in t['pokemon']:
                    if p['species'] in lookback.upper() and p['level'] == level:
                        species_found = p['species']
                        break
                if species_found: break
            
            if species_found:
                key = (species_found, level)
                if key not in moves_map: moves_map[key] = []
                moves_map[key].append(moves)

        # Enrich trainers.json
        # NOTE: Trainers can have multiple variants (e.g. starter selection).
        # We'll try to be smart.
        enriched_count = 0
        for t in trainers:
            for p in t['pokemon']:
                key = (p['species'], p['level'])
                if key in moves_map:
                    # If multiple hits, we take the first one for now (usually sequential)
                    # Or we could pop it to avoid reuse, but some trainers might share sets.
                    p['moves'] = moves_map[key][0]
                    enriched_count += 1
        
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(trainers, f, ensure_ascii=False)
        
        print(f"Enriched {enriched_count} pokemon with moves.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_trainer_data()
