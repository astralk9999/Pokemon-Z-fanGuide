/**
 * Generate a forms manifest from sprite files, megas.json, and form-stats.json.
 * Outputs data/forms-manifest.json mapping pokemonId -> array of form info.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SPRITES_DIR = path.join(__dirname, '..', 'sprites');

// Load existing data
const pokemon = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'pokemon.json'), 'utf-8'));
const megas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'megas.json'), 'utf-8'));
const formStats = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'form-stats.json'), 'utf-8'));
const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'items.json'), 'utf-8'));

// Mega stats dictionary keyed by 'pokemonId_formIndex'
// Official megas use canonical stats; custom Pokemon Z megas use game-specific stats
const MEGA_STATS = {
  // Gen 1
  '3_1':   { stats:{hp:80,atk:100,def:123,spatk:122,spdef:120,spd:80}, abilities:['Sebo'] }, // Mega Venusaur
  '6_1':   { stats:{hp:78,atk:130,def:111,spatk:130,spdef:85,spd:100}, abilities:['Garra Dura'] }, // Mega Charizard X
  '6_2':   { stats:{hp:78,atk:104,def:78,spatk:159,spdef:115,spd:100}, abilities:['Sequía'] }, // Mega Charizard Y
  '9_1':   { stats:{hp:79,atk:103,def:120,spatk:135,spdef:115,spd:78}, abilities:['Megadisparador'] }, // Mega Blastoise
  '15_1':  { stats:{hp:65,atk:150,def:40,spatk:15,spdef:80,spd:145}, abilities:['Adaptable'] }, // Mega Beedrill
  '18_1':  { stats:{hp:83,atk:80,def:80,spatk:135,spdef:80,spd:121}, abilities:['Indefenso'] }, // Mega Pidgeot
  '65_1':  { stats:{hp:55,atk:50,def:65,spatk:175,spdef:105,spd:150}, abilities:['Rastro'] }, // Mega Alakazam
  '80_2':  { stats:{hp:95,atk:75,def:180,spatk:130,spdef:80,spd:30}, abilities:['Caparazón'] }, // Mega Slowbro
  '94_1':  { stats:{hp:60,atk:65,def:80,spatk:170,spdef:95,spd:130}, abilities:['Sombratrampa'] }, // Mega Gengar
  '115_1': { stats:{hp:105,atk:125,def:100,spatk:60,spdef:100,spd:100}, abilities:['Amor Filial'] }, // Mega Kangaskhan
  '127_1': { stats:{hp:65,atk:155,def:120,spatk:65,spdef:90,spd:105}, abilities:['Piel Celeste'] }, // Mega Pinsir
  '130_1': { stats:{hp:95,atk:155,def:109,spatk:70,spdef:130,spd:81}, abilities:['Rompemoldes'] }, // Mega Gyarados
  '142_1': { stats:{hp:80,atk:135,def:85,spatk:70,spdef:95,spd:150}, abilities:['Garra Dura'] }, // Mega Aerodactyl
  '150_1': { stats:{hp:106,atk:190,def:100,spatk:154,spdef:100,spd:130}, abilities:['Impasible'] }, // Mega Mewtwo X
  '150_2': { stats:{hp:106,atk:150,def:70,spatk:194,spdef:120,spd:140}, abilities:['Insomnio'] }, // Mega Mewtwo Y
  // Gen 2
  '181_1': { stats:{hp:90,atk:95,def:105,spatk:165,spdef:110,spd:45}, abilities:['Rompemoldes'] }, // Mega Ampharos
  '208_1': { stats:{hp:75,atk:125,def:230,spatk:55,spdef:95,spd:30}, abilities:['Poder Arena'] }, // Mega Steelix
  '212_1': { stats:{hp:70,atk:150,def:140,spatk:65,spdef:100,spd:75}, abilities:['Experto'] }, // Mega Scizor
  '214_1': { stats:{hp:80,atk:185,def:115,spatk:40,spdef:105,spd:75}, abilities:['Encadenado'] }, // Mega Heracross
  '229_1': { stats:{hp:75,atk:90,def:90,spatk:140,spdef:90,spd:115}, abilities:['Poder Solar'] }, // Mega Houndoom
  '248_1': { stats:{hp:100,atk:164,def:150,spatk:95,spdef:120,spd:71}, abilities:['Chorro Arena'] }, // Mega Tyranitar
  // Gen 3
  '254_1': { stats:{hp:70,atk:110,def:75,spatk:145,spdef:85,spd:145}, abilities:['Pararrayos'] }, // Mega Sceptile
  '257_1': { stats:{hp:80,atk:160,def:80,spatk:130,spdef:80,spd:100}, abilities:['Impulso'] }, // Mega Blaziken
  '260_1': { stats:{hp:100,atk:150,def:110,spatk:95,spdef:110,spd:70}, abilities:['Nado Rápido'] }, // Mega Swampert
  '282_1': { stats:{hp:68,atk:85,def:65,spatk:165,spdef:135,spd:100}, abilities:['Piel Feérica'] }, // Mega Gardevoir
  '302_1': { stats:{hp:50,atk:85,def:125,spatk:85,spdef:115,spd:20}, abilities:['Espejomágico'] }, // Mega Sableye
  '306_1': { stats:{hp:70,atk:140,def:230,spatk:60,spdef:80,spd:50}, abilities:['Filtro'] }, // Mega Aggron
  '308_1': { stats:{hp:60,atk:100,def:85,spatk:80,spdef:85,spd:100}, abilities:['Energía Pura'] }, // Mega Medicham
  '310_1': { stats:{hp:70,atk:75,def:80,spatk:135,spdef:80,spd:135}, abilities:['Intimidación'] }, // Mega Manectric
  '319_1': { stats:{hp:70,atk:140,def:70,spatk:110,spdef:65,spd:105}, abilities:['Mandíbula Fuerte'] }, // Mega Sharpedo
  '323_1': { stats:{hp:70,atk:120,def:100,spatk:145,spdef:105,spd:20}, abilities:['Potencia Bruta'] }, // Mega Camerupt
  '334_1': { stats:{hp:75,atk:110,def:110,spatk:110,spdef:105,spd:80}, abilities:['Piel Feérica'] }, // Mega Altaria
  '359_1': { stats:{hp:65,atk:150,def:60,spatk:115,spdef:60,spd:115}, abilities:['Espejomágico'] }, // Mega Absol
  '362_1': { stats:{hp:80,atk:120,def:80,spatk:120,spdef:80,spd:100}, abilities:['Piel Gélida'] }, // Mega Glalie
  '373_1': { stats:{hp:95,atk:145,def:130,spatk:120,spdef:90,spd:120}, abilities:['Piel Celeste'] }, // Mega Salamence
  '376_1': { stats:{hp:80,atk:145,def:150,spatk:105,spdef:110,spd:110}, abilities:['Garra Dura'] }, // Mega Metagross
  '384_1': { stats:{hp:105,atk:180,def:100,spatk:180,spdef:100,spd:115}, abilities:['Ráfaga Delta'] }, // Mega Rayquaza
  // Gen 4
  '428_1': { stats:{hp:65,atk:136,def:94,spatk:54,spdef:96,spd:135}, abilities:['Intrépido'] }, // Mega Lopunny
  '445_1': { stats:{hp:108,atk:170,def:115,spatk:120,spdef:95,spd:92}, abilities:['Poder Arena'] }, // Mega Garchomp
  '448_1': { stats:{hp:70,atk:145,def:88,spatk:140,spdef:70,spd:112}, abilities:['Adaptable'] }, // Mega Lucario
  '460_1': { stats:{hp:90,atk:132,def:105,spatk:132,spdef:105,spd:30}, abilities:['Alerta Nieve'] }, // Mega Abomasnow
  '475_1': { stats:{hp:68,atk:165,def:95,spatk:65,spdef:115,spd:110}, abilities:['Foco Interno'] }, // Mega Gallade
  // Gen 6
  '719_1': { stats:{hp:50,atk:160,def:110,spatk:160,spdef:110,spd:110}, abilities:['Espejomágico'] }, // Mega Diancie
  // ===== Custom Pokemon Z megas (stats from game, +100 BST over base typically) =====
  '68_1':  { stats:{hp:90,atk:160,def:100,spatk:65,spdef:85,spd:100}, abilities:['Indefenso'] }, // Mega Machamp
  '99_1':  { stats:{hp:80,atk:150,def:115,spatk:80,spdef:80,spd:95}, abilities:['Potencia Bruta'] }, // Mega Kingler
  '121_1': { stats:{hp:60,atk:75,def:85,spatk:150,spdef:115,spd:115}, abilities:['Analítico'] }, // Mega Starmie
  '131_1': { stats:{hp:130,atk:85,def:100,spatk:115,spdef:115,spd:80}, abilities:['Absorbe Agua'] }, // Mega Lapras
  '149_1': { stats:{hp:91,atk:164,def:95,spatk:120,spdef:120,spd:100}, abilities:['Compensación'] }, // Mega Dragonite
  '154_1': { stats:{hp:80,atk:82,def:120,spatk:123,spdef:120,spd:100}, abilities:['Espesura'] }, // Mega Meganium
  '160_1': { stats:{hp:85,atk:155,def:120,spatk:79,spdef:83,spd:98}, abilities:['Potencia Bruta'] }, // Mega Feraligatr
  '227_1': { stats:{hp:65,atk:100,def:170,spatk:40,spdef:90,spd:100}, abilities:['Acero Templado'] }, // Mega Skarmory
  '358_1': { stats:{hp:75,atk:50,def:95,spatk:125,spdef:120,spd:85}, abilities:['Levitación'] }, // Mega Chimecho
  '359_2': { stats:{hp:65,atk:160,def:70,spatk:115,spdef:70,spd:125}, abilities:['Espejomágico'] }, // Mega Absol Z
  '398_1': { stats:{hp:85,atk:140,def:80,spatk:60,spdef:70,spd:120}, abilities:['Audaz'] }, // Mega Staraptor
  '445_2': { stats:{hp:108,atk:180,def:115,spatk:120,spdef:95,spd:102}, abilities:['Poder Arena'] }, // Mega Garchomp Z
  '448_2': { stats:{hp:70,atk:155,def:98,spatk:145,spdef:80,spd:122}, abilities:['Adaptable'] }, // Mega Lucario Z
  '478_1': { stats:{hp:70,atk:80,def:70,spatk:130,spdef:110,spd:110}, abilities:['Alerta Nieve'] }, // Mega Froslass
  '485_1': { stats:{hp:91,atk:130,def:126,spatk:150,spdef:126,spd:77}, abilities:['Absorbe Fuego'] }, // Mega Heatran
  '491_1': { stats:{hp:70,atk:90,def:110,spatk:155,spdef:110,spd:145}, abilities:['Mal Sueño'] }, // Mega Darkrai
  '500_1': { stats:{hp:110,atk:153,def:85,spatk:100,spdef:75,spd:85}, abilities:['Audaz'] }, // Mega Emboar
  '530_1': { stats:{hp:110,atk:155,def:80,spatk:50,spdef:75,spd:108}, abilities:['Rompemoldes'] }, // Mega Excadrill
  '545_1': { stats:{hp:60,atk:120,def:99,spatk:55,spdef:89,spd:132}, abilities:['Impulso'] }, // Mega Scolipede
  '560_1': { stats:{hp:65,atk:130,def:125,spatk:45,spdef:125,spd:78}, abilities:['Intimidación'] }, // Mega Scrafty
  '569_1': { stats:{hp:80,atk:95,def:112,spatk:80,spdef:112,spd:95}, abilities:['Ímpetu Tóxico'] }, // Mega Garbodor
  '604_1': { stats:{hp:85,atk:135,def:90,spatk:125,spdef:90,spd:75}, abilities:['Absorbe Elec.'] }, // Mega Eelektross
  '609_1': { stats:{hp:60,atk:55,def:100,spatk:165,spdef:100,spd:100}, abilities:['Absorbe Fuego'] }, // Mega Chandelure
  '623_1': { stats:{hp:89,atk:154,def:100,spatk:55,spdef:100,spd:65}, abilities:['Puño Férreo'] }, // Mega Golurk
  '628_1': { stats:{hp:100,atk:143,def:95,spatk:57,spdef:95,spd:100}, abilities:['Audaz'] }, // Mega Braviary
  '652_1': { stats:{hp:88,atk:147,def:142,spatk:74,spdef:95,spd:84}, abilities:['Antibalas'] }, // Mega Chesnaught
  '668_1': { stats:{hp:86,atk:118,def:82,spatk:119,spdef:66,spd:116}, abilities:['Potencia Bruta'] }, // Mega Pyroar
  '687_1': { stats:{hp:86,atk:122,def:88,spatk:98,spdef:95,spd:83}, abilities:['Respondón'] }, // Mega Malamar
  '689_1': { stats:{hp:72,atk:135,def:135,spatk:86,spdef:96,spd:78}, abilities:['Garra Dura'] }, // Mega Barbaracle
  '691_1': { stats:{hp:65,atk:75,def:100,spatk:137,spdef:133,spd:64}, abilities:['Adaptable'] }, // Mega Dragalge
  '701_1': { stats:{hp:78,atk:122,def:85,spatk:84,spdef:73,spd:138}, abilities:['Audaz'] }, // Mega Hawlucha
  '740_1': { stats:{hp:97,atk:152,def:97,spatk:65,spdef:87,spd:63}, abilities:['Puño Férreo'] }, // Mega Crabominable
  '768_1': { stats:{hp:75,atk:145,def:160,spatk:60,spdef:110,spd:50}, abilities:['Regia Presencia'] }, // Mega Golisopod
  '780_1': { stats:{hp:78,atk:60,def:100,spatk:145,spdef:120,spd:56}, abilities:['Cólera'] }, // Mega Drampa
  '807_1': { stats:{hp:88,atk:152,def:75,spatk:112,spdef:80,spd:143}, abilities:['Absorbe Elec.'] }, // Mega Zeraora
  '812_1': { stats:{hp:100,atk:145,def:110,spatk:70,spdef:80,spd:95}, abilities:['Herbívoro'] }, // Mega Rillaboom
  '815_1': { stats:{hp:80,atk:146,def:85,spatk:75,spdef:80,spd:139}, abilities:['Mutatipo'] }, // Mega Cinderace
  '818_1': { stats:{hp:70,atk:85,def:75,spatk:145,spdef:85,spd:140}, abilities:['Francotirador'] }, // Mega Inteleon
  '823_1': { stats:{hp:98,atk:107,def:145,spatk:53,spdef:110,spd:87}, abilities:['Espejomágico'] }, // Mega Corviknight
  '826_1': { stats:{hp:60,atk:45,def:130,spatk:140,spdef:130,spd:96}, abilities:['Ojocompuesto'] }, // Mega Orbeetle
  '834_1': { stats:{hp:90,atk:145,def:125,spatk:58,spdef:90,spd:84}, abilities:['Mandíbula Fuerte'] }, // Mega Drednaw
  '839_1': { stats:{hp:110,atk:80,def:140,spatk:130,spdef:110,spd:30}, abilities:['Motor Vapor'] }, // Mega Coalossal
  '841_1': { stats:{hp:70,atk:130,def:90,spatk:105,spdef:80,spd:100}, abilities:['Potencia Bruta'] }, // Mega Flapple
  '844_1': { stats:{hp:72,atk:137,def:145,spatk:65,spdef:100,spd:81}, abilities:['Poder Arena'] }, // Mega Sandaconda
  '851_1': { stats:{hp:100,atk:135,def:85,spatk:95,spdef:100,spd:85}, abilities:['Absorbe Fuego'] }, // Mega Centiskorch
  '858_1': { stats:{hp:57,atk:90,def:115,spatk:146,spdef:133,spd:49}, abilities:['Regia Presencia'] }, // Mega Hatterene
  '869_1': { stats:{hp:65,atk:60,def:105,spatk:130,spdef:151,spd:84}, abilities:['Dulce Velo'] }, // Mega Alcremie
  '870_1': { stats:{hp:65,atk:130,def:130,spatk:70,spdef:80,spd:95}, abilities:['Audaz'] }, // Mega Falinks
  '879_1': { stats:{hp:122,atk:150,def:99,spatk:60,spdef:89,spd:50}, abilities:['Potencia Bruta'] }, // Mega Copperajah
  '884_1': { stats:{hp:70,atk:115,def:145,spatk:130,spdef:80,spd:95}, abilities:['Acero Templado'] }, // Mega Duraludon
  '908_1': { stats:{hp:76,atk:130,def:70,spatk:121,spdef:70,spd:143}, abilities:['Mutatipo'] }, // Mega Meowscarada
  '940_1': { stats:{hp:85,atk:85,def:100,spatk:145,spdef:100,spd:85}, abilities:['Absorbe Fuego'] }, // Mega Armarouge/Scovillain
  '947_1': { stats:{hp:74,atk:95,def:94,spatk:66,spdef:94,spd:111}, abilities:['Experto'] }, // Mega Maushold
  '952_1': { stats:{hp:115,atk:155,def:102,spatk:80,spdef:96,spd:87}, abilities:['Rompearmadura'] }, // Mega Baxcalibur
  '953_1': { stats:{hp:150,atk:85,def:145,spatk:85,spdef:130,spd:35}, abilities:['Ignorante'] }, // Mega Dondozo/Tatsugiri
  '968_1': { stats:{hp:83,atk:55,def:110,spatk:140,spdef:110,spd:101}, abilities:['Ímpetu Tóxico'] }, // Mega Glimmora
};

// Alternate form stats (non-mega) keyed by 'pokemonId_formIndex'
const ALT_FORM_STATS = {
  // === Regional Forms (Alola) ===
  '19_1':  { stats:{hp:30,atk:56,def:35,spatk:25,spdef:35,spd:72}, abilities:['Gula','Afán'] }, // Rattata Alola
  '20_1':  { stats:{hp:75,atk:71,def:70,spatk:40,spdef:80,spd:77}, abilities:['Gula','Afán'] }, // Raticate Alola
  '26_1':  { stats:{hp:60,atk:85,def:50,spatk:95,spdef:85,spd:110}, abilities:['Oleaje'] }, // Raichu Alola
  '27_1':  { stats:{hp:50,atk:75,def:90,spatk:10,spdef:35,spd:40}, abilities:['Manto Níveo'] }, // Sandshrew Alola
  '28_1':  { stats:{hp:75,atk:100,def:120,spatk:25,spdef:65,spd:65}, abilities:['Manto Níveo'] }, // Sandslash Alola
  '37_1':  { stats:{hp:38,atk:41,def:40,spatk:50,spdef:65,spd:65}, abilities:['Manto Níveo'] }, // Vulpix Alola
  '38_1':  { stats:{hp:73,atk:67,def:75,spatk:81,spdef:100,spd:109}, abilities:['Manto Níveo'] }, // Ninetales Alola
  '50_1':  { stats:{hp:10,atk:55,def:30,spatk:35,spdef:45,spd:90}, abilities:['Rizos Rebeldes','Poder Arena'] }, // Diglett Alola
  '51_1':  { stats:{hp:35,atk:100,def:60,spatk:50,spdef:70,spd:110}, abilities:['Rizos Rebeldes','Poder Arena'] }, // Dugtrio Alola
  '52_1':  { stats:{hp:40,atk:35,def:35,spatk:50,spdef:40,spd:90}, abilities:['Recogida','Experto'] }, // Meowth Alola
  '53_1':  { stats:{hp:65,atk:60,def:60,spatk:75,spdef:65,spd:115}, abilities:['Pelambre'] }, // Persian Alola
  '74_1':  { stats:{hp:40,atk:80,def:100,spatk:30,spdef:30,spd:20}, abilities:['Magnetismo','Robustez'] }, // Geodude Alola
  '75_1':  { stats:{hp:55,atk:95,def:115,spatk:45,spdef:45,spd:35}, abilities:['Magnetismo','Robustez'] }, // Graveler Alola
  '76_1':  { stats:{hp:80,atk:120,def:130,spatk:55,spdef:65,spd:45}, abilities:['Magnetismo','Robustez'] }, // Golem Alola
  '88_1':  { stats:{hp:80,atk:80,def:50,spatk:40,spdef:50,spd:25}, abilities:['Hedor','Gula'] }, // Grimer Alola
  '89_1':  { stats:{hp:105,atk:105,def:75,spatk:65,spdef:100,spd:50}, abilities:['Hedor','Gula'] }, // Muk Alola
  '103_1': { stats:{hp:95,atk:105,def:85,spatk:125,spdef:75,spd:45}, abilities:['Zancudo'] }, // Exeggutor Alola
  '105_1': { stats:{hp:60,atk:80,def:110,spatk:50,spdef:80,spd:45}, abilities:['Poseído','Pararrayos'] }, // Marowak Alola
  // === Regional Forms (Galar) ===
  '52_2':  { stats:{hp:50,atk:65,def:55,spatk:40,spdef:40,spd:40}, abilities:['Recogida','Garra Dura'] }, // Meowth Galar
  '77_1':  { stats:{hp:50,atk:85,def:55,spatk:65,spdef:65,spd:90}, abilities:['Fuga','Velo Pastel'] }, // Ponyta Galar
  '78_1':  { stats:{hp:65,atk:100,def:70,spatk:80,spdef:80,spd:105}, abilities:['Fuga','Velo Pastel'] }, // Rapidash Galar
  '79_1':  { stats:{hp:90,atk:65,def:65,spatk:40,spdef:40,spd:15}, abilities:['Aclimatación','Ritmo Propio'] }, // Slowpoke Galar
  '80_1':  { stats:{hp:95,atk:100,def:95,spatk:100,spdef:70,spd:30}, abilities:['Disparo Certero','Ritmo Propio'] }, // Slowbro Galar
  '83_1':  { stats:{hp:52,atk:95,def:55,spatk:58,spdef:62,spd:55}, abilities:['Impasible'] }, // Farfetch'd Galar
  '110_1': { stats:{hp:65,atk:90,def:120,spatk:85,spdef:70,spd:60}, abilities:['Levitación'] }, // Weezing Galar
  '122_1': { stats:{hp:50,atk:65,def:65,spatk:90,spdef:90,spd:100}, abilities:['Diligencia','Muro Espejo'] }, // Mr. Mime Galar
  '144_1': { stats:{hp:90,atk:85,def:85,spatk:125,spdef:100,spd:95}, abilities:['Competitivo'] }, // Articuno Galar
  '145_1': { stats:{hp:90,atk:125,def:90,spatk:85,spdef:90,spd:100}, abilities:['Justiciero'] }, // Zapdos Galar
  '146_1': { stats:{hp:90,atk:85,def:90,spatk:100,spdef:125,spd:90}, abilities:['Cólera'] }, // Moltres Galar
  '199_1': { stats:{hp:95,atk:65,def:80,spatk:110,spdef:110,spd:30}, abilities:['Ritmo Propio','Regeneración'] }, // Slowking Galar
  '222_1': { stats:{hp:60,atk:55,def:100,spatk:65,spdef:100,spd:30}, abilities:['Cuerpo Débil'] }, // Corsola Galar
  '263_1': { stats:{hp:38,atk:30,def:41,spatk:30,spdef:41,spd:60}, abilities:['Recogida','Gula'] }, // Zigzagoon Galar
  '554_1': { stats:{hp:70,atk:90,def:45,spatk:15,spdef:45,spd:50}, abilities:['Afán','Foco Interno'] }, // Darumaka Galar
  '555_2': { stats:{hp:105,atk:140,def:55,spatk:30,spdef:55,spd:95}, abilities:['Modo Gorila'] }, // Darmanitan Galar
  '555_3': { stats:{hp:105,atk:160,def:55,spatk:30,spdef:55,spd:135}, abilities:['Modo Daruma'] }, // Darmanitan Galar Zen
  '618_1': { stats:{hp:109,atk:81,def:99,spatk:66,spdef:84,spd:32}, abilities:['Mimetismo'] }, // Stunfisk Galar
  // === Regional Forms (Hisui) ===
  '58_1':  { stats:{hp:60,atk:75,def:45,spatk:65,spdef:50,spd:55}, abilities:['Intimidación','Absorbe Fuego'] }, // Growlithe Hisui
  '59_1':  { stats:{hp:95,atk:115,def:80,spatk:95,spdef:80,spd:90}, abilities:['Intimidación','Absorbe Fuego'] }, // Arcanine Hisui
  '100_1': { stats:{hp:40,atk:30,def:50,spatk:55,spdef:55,spd:100}, abilities:['Electroestática','Insonoro'] }, // Voltorb Hisui
  '101_1': { stats:{hp:60,atk:50,def:70,spatk:80,spdef:80,spd:150}, abilities:['Electroestática','Insonoro'] }, // Electrode Hisui
  '157_1': { stats:{hp:73,atk:84,def:78,spatk:119,spdef:85,spd:95}, abilities:['Mar Llamas'] }, // Typhlosion Hisui
  '211_1': { stats:{hp:65,atk:95,def:85,spatk:55,spdef:55,spd:85}, abilities:['Toxico','Nado Rápido'] }, // Qwilfish Hisui
  '215_1': { stats:{hp:55,atk:95,def:55,spatk:35,spdef:75,spd:115}, abilities:['Foco Interno','Vista Lince'] }, // Sneasel Hisui
  '503_1': { stats:{hp:90,atk:108,def:80,spatk:100,spdef:65,spd:85}, abilities:['Torrente'] }, // Samurott Hisui
  '549_1': { stats:{hp:70,atk:105,def:75,spatk:50,spdef:75,spd:105}, abilities:['Clorofila'] }, // Lilligant Hisui
  '570_1': { stats:{hp:35,atk:60,def:40,spatk:85,spdef:40,spd:70}, abilities:['Ilusión'] }, // Zorua Hisui
  '571_1': { stats:{hp:55,atk:100,def:60,spatk:125,spdef:60,spd:110}, abilities:['Ilusión'] }, // Zoroark Hisui
  '705_1': { stats:{hp:58,atk:75,def:83,spatk:83,spdef:113,spd:40}, abilities:['Hidratación','Baba'] }, // Sliggoo Hisui
  '706_1': { stats:{hp:80,atk:100,def:100,spatk:110,spdef:150,spd:60}, abilities:['Hidratación','Baba'] }, // Goodra Hisui
  '713_1': { stats:{hp:95,atk:127,def:184,spatk:34,spdef:36,spd:38}, abilities:['Robustez'] }, // Avalugg Hisui
  '724_1': { stats:{hp:88,atk:112,def:80,spatk:95,spdef:95,spd:60}, abilities:['Espesura'] }, // Decidueye Hisui
  // === Paldea ===
  '128_1': { stats:{hp:75,atk:110,def:105,spatk:30,spdef:70,spd:100}, abilities:['Intimidación'] }, // Tauros Paldea Fuego
  // === Game Forms (different stats) ===
  '351_1': { stats:{hp:70,atk:70,def:70,spatk:70,spdef:70,spd:70}, abilities:['Pronóstico'] }, // Castform Sunny
  '351_2': { stats:{hp:70,atk:70,def:70,spatk:70,spdef:70,spd:70}, abilities:['Pronóstico'] }, // Castform Rainy
  '351_3': { stats:{hp:70,atk:70,def:70,spatk:70,spdef:70,spd:70}, abilities:['Pronóstico'] }, // Castform Snowy
  '382_1': { stats:{hp:100,atk:150,def:90,spatk:180,spdef:160,spd:90}, abilities:['Mar del Albor'] }, // Kyogre Primal
  '383_1': { stats:{hp:100,atk:180,def:160,spatk:150,spdef:90,spd:90}, abilities:['Tierra del Ocaso'] }, // Groudon Primal
  '386_1': { stats:{hp:50,atk:180,def:20,spatk:180,spdef:20,spd:150}, abilities:['Presión'] }, // Deoxys Attack
  '386_2': { stats:{hp:50,atk:70,def:160,spatk:70,spdef:160,spd:90}, abilities:['Presión'] }, // Deoxys Defense
  '386_3': { stats:{hp:50,atk:95,def:90,spatk:95,spdef:90,spd:180}, abilities:['Presión'] }, // Deoxys Speed
  '413_1': { stats:{hp:60,atk:79,def:105,spatk:59,spdef:85,spd:36}, abilities:['Anticipación'] }, // Wormadam Sandy
  '413_2': { stats:{hp:60,atk:69,def:95,spatk:69,spdef:95,spd:36}, abilities:['Anticipación'] }, // Wormadam Trash
  '479_1': { stats:{hp:50,atk:65,def:107,spatk:105,spdef:107,spd:86}, abilities:['Levitación'] }, // Rotom Heat
  '479_2': { stats:{hp:50,atk:65,def:107,spatk:105,spdef:107,spd:86}, abilities:['Levitación'] }, // Rotom Wash
  '479_3': { stats:{hp:50,atk:65,def:107,spatk:105,spdef:107,spd:86}, abilities:['Levitación'] }, // Rotom Frost
  '479_4': { stats:{hp:50,atk:65,def:107,spatk:105,spdef:107,spd:86}, abilities:['Levitación'] }, // Rotom Fan
  '479_5': { stats:{hp:50,atk:65,def:107,spatk:105,spdef:107,spd:86}, abilities:['Levitación'] }, // Rotom Mow
  '487_1': { stats:{hp:150,atk:120,def:100,spatk:120,spdef:100,spd:90}, abilities:['Levitación'] }, // Giratina Origin
  '555_1': { stats:{hp:105,atk:30,def:105,spatk:140,spdef:105,spd:55}, abilities:['Modo Daruma'] }, // Darmanitan Zen
  '641_1': { stats:{hp:79,atk:100,def:80,spatk:110,spdef:90,spd:121}, abilities:['Regeneración'] }, // Tornadus Therian
  '642_1': { stats:{hp:79,atk:105,def:70,spatk:145,spdef:80,spd:101}, abilities:['Absorbe Elec.'] }, // Thundurus Therian
  '646_1': { stats:{hp:125,atk:120,def:90,spatk:170,spdef:100,spd:95}, abilities:['Turbollama'] }, // Kyurem White
  '646_2': { stats:{hp:125,atk:170,def:100,spatk:120,spdef:90,spd:95}, abilities:['Teravoltaje'] }, // Kyurem Black
  '648_1': { stats:{hp:100,atk:128,def:90,spatk:77,spdef:77,spd:128}, abilities:['Dicha'] }, // Meloetta Pirouette
  '678_1': { stats:{hp:74,atk:48,def:76,spatk:83,spdef:81,spd:104}, abilities:['Vista Lince','Infiltración'] }, // Meowstic Female
  '681_1': { stats:{hp:60,atk:150,def:50,spatk:150,spdef:50,spd:60}, abilities:['Cambio Táctico'] }, // Aegislash Blade
  '718_1': { stats:{hp:54,atk:100,def:71,spatk:61,spdef:85,spd:115}, abilities:['Rompeaura'] }, // Zygarde 10%
  '718_2': { stats:{hp:108,atk:100,def:121,spatk:81,spdef:95,spd:95}, abilities:['Rompeaura'] }, // Zygarde 50%
  '718_3': { stats:{hp:216,atk:100,def:121,spatk:91,spdef:95,spd:85}, abilities:['Rompeaura'] }, // Zygarde Complete
  '720_1': { stats:{hp:80,atk:160,def:60,spatk:170,spdef:130,spd:80}, abilities:['Manos Brutas'] }, // Hoopa Unbound
  '745_1': { stats:{hp:85,atk:115,def:75,spatk:55,spdef:75,spd:82}, abilities:['Vista Lince','Espíritu Vital'] }, // Lycanroc Midnight
  '745_2': { stats:{hp:75,atk:117,def:65,spatk:55,spdef:65,spd:110}, abilities:['Garra Dura'] }, // Lycanroc Dusk
  '746_1': { stats:{hp:45,atk:140,def:130,spatk:140,spdef:135,spd:30}, abilities:['Banco'] }, // Wishiwashi School
  '800_1': { stats:{hp:97,atk:157,def:127,spatk:113,spdef:109,spd:77}, abilities:['Escudo Prisma'] }, // Necrozma Dusk Mane
  '800_2': { stats:{hp:97,atk:113,def:109,spatk:157,spdef:127,spd:77}, abilities:['Escudo Prisma'] }, // Necrozma Dawn Wings
  '800_3': { stats:{hp:97,atk:167,def:97,spatk:167,spdef:97,spd:129}, abilities:['Escudo Prisma'] }, // Necrozma Ultra
  '849_1': { stats:{hp:75,atk:98,def:70,spatk:114,spdef:70,spd:75}, abilities:['Punk Rock','Más'] }, // Toxtricity Low Key
  '892_1': { stats:{hp:100,atk:130,def:100,spatk:63,spdef:60,spd:97}, abilities:['Invisible Fist'] }, // Urshifu Rapid Strike
  '898_1': { stats:{hp:100,atk:165,def:150,spatk:85,spdef:130,spd:50}, abilities:['Jinete Gélido'] }, // Calyrex Ice Rider
  '898_2': { stats:{hp:100,atk:85,def:80,spatk:165,spdef:100,spd:150}, abilities:['Jinete Espectral'] }, // Calyrex Shadow Rider
};

// Build pokemon lookup by ID
const pokemonById = {};
const pokemonByName = {};
for (const p of pokemon) {
  pokemonById[p.id] = p;
  if (p.name) pokemonByName[p.name.toUpperCase()] = p;
  if (p.internalName) pokemonByName[p.internalName.toUpperCase()] = p;
}

// Find all mega stones from items (more complete than megas.json)
const megaStonesByPokemon = {};
for (const item of items) {
  if (!item.description) continue;
  const desc = item.description.toLowerCase();
  if (!desc.includes('megaevolucionar')) continue;
  const match = desc.match(/megaevolucionar\s+a\s+(.+?)[.,]/i);
  if (!match) continue;
  const names = match[1].split(/,\s*|\s+[ey]\s+/).map(n => n.trim().replace(/\s*(en combate|Z)$/i, '').trim());
  for (const name of names) {
    if (!name || name.length < 2) continue;
    const upper = name.toUpperCase();
    if (!megaStonesByPokemon[upper]) megaStonesByPokemon[upper] = [];
    megaStonesByPokemon[upper].push({
      stone: item.name,
      stoneInternal: item.internalName,
      // Detect X/Y variants
      variant: item.name.toLowerCase().includes(' x') ? 'X' : item.name.toLowerCase().includes(' y') ? 'Y' : ''
    });
  }
}

// Also add from megas.json
for (const [key, data] of Object.entries(megas)) {
  if (!megaStonesByPokemon[key]) megaStonesByPokemon[key] = [];
  const existing = megaStonesByPokemon[key];
  if (!existing.some(s => s.stone === data.stone)) {
    existing.push({ stone: data.stone, stoneInternal: data.stoneInternal, variant: '' });
  }
}

// Scan sprites directory for form variants
const spriteFiles = fs.readdirSync(SPRITES_DIR);
const formSprites = {}; // id -> [form indices]
for (const file of spriteFiles) {
  const match = file.match(/^(\d+)_(\d+)\.png$/);
  if (!match) continue;
  const id = parseInt(match[1]);
  const formIdx = parseInt(match[2]);
  if (!formSprites[id]) formSprites[id] = new Set();
  formSprites[id].add(formIdx);
}
for (const id of Object.keys(formSprites)) {
  formSprites[id] = [...formSprites[id]].sort((a, b) => a - b);
}

// Well-known form names for common Pokemon
// Form index -> name (for Pokemon that have known forms in the main series)
// NOTE: Pokemon with mega stones are auto-detected below - only need explicit entries
// for megas with special naming (X/Y variants, Z variants) or non-mega forms.
const KNOWN_FORMS = {
  // Alolan forms
  19: { 1: 'Alola' }, 20: { 1: 'Alola' }, 26: { 1: 'Alola' },
  27: { 1: 'Alola' }, 28: { 1: 'Alola' }, 37: { 1: 'Alola' }, 38: { 1: 'Alola' },
  50: { 1: 'Alola' }, 51: { 1: 'Alola' }, 52: { 1: 'Alola', 2: 'Galar' },
  53: { 1: 'Alola' }, 58: { 1: 'Hisui' }, 59: { 1: 'Hisui' },
  74: { 1: 'Alola' }, 75: { 1: 'Alola' }, 76: { 1: 'Alola' },
  77: { 1: 'Galar' }, 78: { 1: 'Galar' }, 79: { 1: 'Galar' }, 80: { 1: 'Galar', 2: 'Mega' },
  83: { 1: 'Galar' }, 88: { 1: 'Alola' }, 89: { 1: 'Alola' },
  100: { 1: 'Hisui' }, 101: { 1: 'Hisui' }, 103: { 1: 'Alola' }, 105: { 1: 'Alola' },
  110: { 1: 'Galar' }, 122: { 1: 'Galar' },
  128: { 1: 'Paldea (Fuego)', 2: 'Paldea (Agua)', 3: 'Paldea (Lucha)' },
  144: { 1: 'Galar' }, 145: { 1: 'Galar' }, 146: { 1: 'Galar' },
  157: { 1: 'Hisui' },
  194: { 1: 'Paldea' },
  199: { 1: 'Galar' },
  211: { 1: 'Hisui' },
  215: { 1: 'Hisui' },
  222: { 1: 'Galar' },
  263: { 1: 'Galar' }, 264: { 1: 'Galar' },

  // Megas with special naming (X/Y, dual mega+Z, multiple sprites)
  3: { 1: 'Mega', 2: 'Forma Alterna' }, // Venusaur: _1=Mega, _2=variant
  6: { 1: 'Mega X', 2: 'Mega Y', 3: 'Z' },
  9: { 1: 'Mega', 2: 'Forma Alterna' }, // Blastoise: _1=Mega, _2=variant
  94: { 1: 'Mega', 2: 'Z', 3: 'Forma Alterna' }, // Gengar: _1=Mega, _2=Z, _3=variant
  150: { 1: 'Mega X', 2: 'Mega Y', 5: 'Forma Alterna' },
  248: { 1: 'Mega', 2: 'Forma Alterna' }, // Tyranitar
  359: { 1: 'Mega', 2: 'Mega Z' }, // Absol: has Absolita + Absolita Z
  373: { 1: 'Mega', 2: 'Forma Alterna' }, // Salamence
  445: { 1: 'Mega', 2: 'Mega Z' }, // Garchomp: has Garchompita + Garchompita Z
  448: { 1: 'Mega', 2: 'Mega Z' }, // Lucario: has Lucarita + Lucarionita Z
  652: { 1: 'Mega', 2: 'Z' }, // Chesnaught
  655: { 1: 'Mega', 2: 'Z' }, // Delphox
  658: { 1: 'Ash', 2: 'Mega', 3: 'Z', 4: 'Z Shiny' }, // Greninja
  908: { 1: 'Mega', 2: 'Z' }, // Meowscarada
  637: { 1: 'Mega', 2: 'Mega Z', 3: 'Z' }, // Volcarona: 3 sprites
  26: { 1: 'Alola', 2: 'Mega' }, // Raichu: _1=Alola, _2=Mega (has Raichuita)

  // Z forms (Pokemon Z regional forms)
  12: { 1: 'Z' },
  25: { 1: 'Z', 2: 'Cosplay' },
  36: { 1: 'Z' },
  46: { 1: 'Z' }, 47: { 1: 'Z' },
  71: { 1: 'Z' }, 73: { 1: 'Z' },
  104: { 1: 'Z' },
  105: { 1: 'Alola', 2: 'Z' },
  137: { 1: 'Z' }, // Porygon
  233: { 1: 'Z' }, // Porygon2
  474: { 1: 'Z' }, // Porygon-Z
  320: { 1: 'Z' }, 321: { 1: 'Z' },
  329: { 1: 'Z' }, 330: { 1: 'Z' },
  399: { 1: 'Z' }, 400: { 1: 'Z' },
  401: { 1: 'Z' }, 402: { 1: 'Z' },
  549: { 1: 'Hisui', 2: 'Z' },
  562: { 1: 'Galar', 2: 'Z' },
  563: { 1: 'Z' },
  574: { 1: 'Z' }, 575: { 1: 'Z' }, 576: { 1: 'Z' },
  577: { 1: 'Z' }, 578: { 1: 'Z' }, 579: { 1: 'Z' },
  651: { 1: 'Z' },
  653: { 1: 'Z' }, 654: { 1: 'Z' },
  657: { 1: 'Z' },

  // Rotom forms + Z
  479: { 1: 'Calor', 2: 'Lavado', 3: 'Frio', 4: 'Ventilador', 5: 'Corte', 6: 'Z' },

  // Standard game forms (not megas)
  133: { 1: 'Partner' }, // Eevee
  143: { 1: 'Forma Alterna' }, // Snorlax
  151: { 1: 'Forma Alterna' }, // Mew
  197: { 1: 'Forma Alterna' }, // Umbreon
  201: { 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: '?', 27: '!' }, // Unown
  225: { 1: 'Forma Alterna' }, // Delibird
  232: { 1: 'Forma Alterna' }, // Donphan
  245: { 1: 'Forma Alterna' }, // Suicune
  249: { 1: 'Forma Alterna' }, // Lugia
  297: { 1: 'Forma Alterna' }, // Hariyama
  351: { 1: 'Soleado', 2: 'Lluvioso', 3: 'Nevado' }, // Castform
  382: { 1: 'Primal' }, 383: { 1: 'Primal' },
  386: { 1: 'Ataque', 2: 'Defensa', 3: 'Velocidad' }, // Deoxys
  412: { 1: 'Arenoso', 2: 'Basura' }, 413: { 1: 'Arenoso', 2: 'Basura' },
  421: { 1: 'Florecido' }, // Cherrim
  422: { 1: 'Este' }, 423: { 1: 'Este' }, // Shellos/Gastrodon
  462: { 1: 'Forma Alterna' }, // Magnezone
  487: { 1: 'Origen' }, // Giratina
  492: { 1: 'Cielo' }, // Shaymin
  493: { 1: 'Lucha', 2: 'Volador', 3: 'Veneno', 4: 'Tierra', 5: 'Roca', 6: 'Bicho', 7: 'Fantasma', 8: 'Acero', 9: 'Fuego', 10: 'Agua', 11: 'Planta', 12: 'Electrico', 13: 'Psiquico', 14: 'Hielo', 15: 'Dragon', 16: 'Siniestro', 17: 'Hada', 18: 'Normal' }, // Arceus
  503: { 1: 'Hisui' }, // Samurott
  550: { 1: 'Azul' }, // Basculin
  554: { 1: 'Galar' }, // Darumaka
  555: { 1: 'Modo Daruma', 2: 'Galar', 3: 'Galar Daruma' },
  570: { 1: 'Hisui' }, 571: { 1: 'Hisui' }, // Zorua/Zoroark
  586: { 1: 'Verano', 2: 'Otono', 3: 'Invierno' }, // Sawsbuck
  591: { 1: 'Forma Alterna' }, // Amoonguss
  618: { 1: 'Galar' }, // Stunfisk
  641: { 1: 'Totem' }, 642: { 1: 'Totem' }, 645: { 1: 'Totem' },
  646: { 1: 'Blanco', 2: 'Negro' },
  648: { 1: 'Danza' }, // Meloetta
  649: { 1: 'Agua', 2: 'Electro', 3: 'Fuego', 4: 'Hielo' }, // Genesect
  669: { 1: 'Amarilla', 2: 'Naranja', 3: 'Azul', 4: 'Blanca' }, // Flabebe
  670: { 1: 'Amarilla', 2: 'Naranja', 3: 'Eterna' }, // Floette
  676: { 1: 'Corazon', 2: 'Estrella', 3: 'Diamante', 4: 'Dama', 5: 'Kabuki', 6: 'Faraon', 7: 'Dandy', 8: 'Señorita', 9: 'Natural' }, // Furfrou
  678: { 1: 'Hembra' }, // Meowstic (has mega stone too, but sprite_1 is female form)
  681: { 1: 'Filo' }, // Aegislash
  705: { 1: 'Hisui' }, 706: { 1: 'Hisui' }, // Sliggoo/Goodra
  713: { 1: 'Hisui' }, // Avalugg
  716: { 1: 'Activo' }, // Xerneas
  718: { 1: '10%', 2: '50%', 3: 'Completa' }, // Zygarde
  720: { 1: 'Desatado' }, // Hoopa
  724: { 1: 'Hisui' }, // Decidueye
  741: { 1: 'Pa\'u', 2: 'Baile', 3: 'Sensu' }, // Oricorio
  745: { 1: 'Nocturno', 2: 'Crepusculo' }, // Lycanroc
  746: { 1: 'Banco' }, // Wishiwashi
  778: { 1: 'Descubierto' }, // Mimikyu
  800: { 1: 'Melena Crepuscular', 2: 'Alas del Alba', 3: 'Ultra' }, // Necrozma
  801: { 1: '500 Años' }, // Magearna
  809: { 1: 'Forma Alterna' }, // Melmetal (no mega stone)
  845: { 1: 'Tragar', 2: 'Escupir' }, // Cramorant (no mega stone)
  849: { 1: 'Grave' }, // Toxtricity
  875: { 1: 'Noice' }, // Eiscue
  877: { 1: 'Voraz' }, // Morpeko
  890: { 1: 'Forma Alterna' }, // Eternatus (no mega stone)
  892: { 1: 'Flujo Continuo' }, // Urshifu
  898: { 1: 'Jinete Helado', 2: 'Jinete Espectral' }, // Calyrex
  902: { 1: 'Hembra' }, // Basculegion
  905: { 1: 'Totem' }, // Enamorus
  947: { 1: 'Mega' }, // Maushold
  964: { 1: 'Heroe' }, // Palafin
  999: { 1: 'Errante' }, // Gimmighoul
  1006: { 1: 'Forma Alterna' }, // Hydrapple
  1012: { 1: 'Forma Alterna' }, // Constellar
  1017: { 1: 'Pozo', 2: 'Hogar', 3: 'Cimiento' }, // Ogerpon
};

// Auto-detect mega forms: if a Pokemon has a mega stone and a sprite _1.png
// but no explicit KNOWN_FORMS entry for that index, label it as 'Mega'
const megaPokemonIds = new Set();
for (const [nameUpper, stones] of Object.entries(megaStonesByPokemon)) {
  const p = pokemonByName[nameUpper];
  if (p) megaPokemonIds.add(p.id);
}
// Special: Corviknight is spelled "Corvinight" in items
megaPokemonIds.add(823);

for (const [idStr, indices] of Object.entries(formSprites)) {
  const id = parseInt(idStr);
  if (!megaPokemonIds.has(id)) continue;
  if (!KNOWN_FORMS[id]) KNOWN_FORMS[id] = {};
  // Find the first sprite index that isn't already named
  for (const idx of indices) {
    if (!KNOWN_FORMS[id][idx]) {
      KNOWN_FORMS[id][idx] = 'Mega';
    }
  }
}

// Type overrides for forms: "pokemonId_formIndex" -> [type1, type2?]
// This covers regional forms, Z forms, and megas with type changes
const FORM_TYPES = {
  // Alolan forms
  '19_1': ['DARK','NORMAL'], '20_1': ['DARK','NORMAL'], '26_1': ['ELECTRIC','PSYCHIC'],
  '27_1': ['ICE','STEEL'], '28_1': ['ICE','STEEL'],
  '37_1': ['ICE'], '38_1': ['ICE','FAIRY'],
  '50_1': ['GROUND','STEEL'], '51_1': ['GROUND','STEEL'],
  '52_1': ['DARK'], '53_1': ['DARK'],
  '74_1': ['ROCK','ELECTRIC'], '75_1': ['ROCK','ELECTRIC'], '76_1': ['ROCK','ELECTRIC'],
  '88_1': ['POISON','DARK'], '89_1': ['POISON','DARK'],
  '103_1': ['GRASS','DRAGON'], '105_1': ['FIRE','GHOST'],
  // Galarian forms
  '52_2': ['STEEL'], '77_1': ['PSYCHIC'], '78_1': ['PSYCHIC','FAIRY'],
  '79_1': ['POISON','PSYCHIC'], '80_1': ['POISON','PSYCHIC'],
  '83_1': ['FIGHTING'], '110_1': ['POISON','FAIRY'], '122_1': ['ICE','PSYCHIC'],
  '144_1': ['PSYCHIC','FLYING'], '145_1': ['FIGHTING','FLYING'], '146_1': ['DARK','FLYING'],
  '199_1': ['POISON','PSYCHIC'], '222_1': ['GHOST'],
  '263_1': ['DARK','NORMAL'], '264_1': ['DARK','NORMAL'],
  '554_1': ['ICE'], '555_2': ['ICE'], '555_3': ['ICE','FIRE'],
  '562_1': ['GROUND','GHOST'],
  // Hisui forms
  '58_1': ['FIRE','ROCK'], '59_1': ['FIRE','ROCK'],
  '100_1': ['ELECTRIC','GRASS'], '101_1': ['ELECTRIC','GRASS'],
  '157_1': ['FIRE','GHOST'], '211_1': ['DARK','POISON'], '215_1': ['FIGHTING','POISON'],
  '549_1': ['GRASS','FIGHTING'], '724_1': ['GRASS','FIGHTING'],
  // Paldea forms
  '128_1': ['FIGHTING','FIRE'], '128_2': ['FIGHTING','WATER'],
  '194_1': ['POISON','GROUND'],
  // Z forms (Pokemon Z regional forms)
  '25_1': ['ELECTRIC','POISON'], '26_2': ['ELECTRIC','FIGHTING'],
  '36_1': ['FAIRY','FIRE'], '46_1': ['BUG','PSYCHIC'], '47_1': ['BUG','PSYCHIC'],
  '94_3': ['GHOST','POISON'], '104_1': ['GROUND','STEEL'], '105_2': ['GROUND','STEEL'],
  '137_1': ['NORMAL','STEEL'], '233_1': ['NORMAL','STEEL'], '474_1': ['NORMAL','STEEL'],
  '320_1': ['WATER','FIRE'], '321_1': ['WATER','FIRE'],
  '329_1': ['GROUND','BUG'], '330_1': ['GROUND','BUG'],
  '399_1': ['NORMAL','GROUND'], '400_1': ['NORMAL','WATER'],
  '401_1': ['BUG','FIGHTING'], '402_1': ['BUG','FIGHTING'],
  '479_6': ['ELECTRIC','FIGHTING'],
  '549_2': ['GRASS','FIRE'], '562_2': ['GHOST','STEEL'], '563_1': ['GHOST','STEEL'],
  '576_1': ['PSYCHIC','FIRE'], '577_1': ['PSYCHIC','POISON'], '578_1': ['PSYCHIC','POISON'], '579_1': ['PSYCHIC','POISON'],
  '651_1': ['GRASS','FIGHTING'], '652_2': ['GRASS','FIGHTING'],
  '654_1': ['FIRE','ELECTRIC'], '655_2': ['FIRE','ELECTRIC'],
  '657_1': ['WATER','DARK'], '658_3': ['WATER','DARK'],
  // Mega type changes (official megas)
  '3_1': ['GRASS','POISON'], // Venusaur Mega (same types)
  '6_1': ['FIRE','DRAGON'], '6_2': ['FIRE','FLYING'], // Charizard X/Y
  '9_1': ['WATER'], // Blastoise Mega (same)
  '15_1': ['BUG','POISON'], // Beedrill Mega (same)
  '18_1': ['NORMAL','FLYING'], // Pidgeot Mega (same)
  '65_1': ['PSYCHIC'], // Alakazam Mega (same)
  '68_1': ['FIGHTING'], // Machamp Mega (same)
  '80_2': ['WATER','PSYCHIC'], // Slowbro Mega (same)
  '94_1': ['GHOST','POISON'], // Gengar Mega (same)
  '115_1': ['NORMAL'], // Kangaskhan Mega (same)
  '127_1': ['BUG','FLYING'], // Pinsir Mega (type change!)
  '130_1': ['WATER','DARK'], // Gyarados Mega (type change!)
  '142_1': ['ROCK','FLYING'], // Aerodactyl Mega (same)
  '150_1': ['PSYCHIC','FIGHTING'], '150_2': ['PSYCHIC'], // Mewtwo X/Y
  '181_1': ['ELECTRIC','DRAGON'], // Ampharos Mega (type change!)
  '208_1': ['STEEL','GROUND'], // Steelix Mega (same)
  '212_1': ['BUG','STEEL'], // Scizor Mega (same)
  '214_1': ['BUG','FIGHTING'], // Heracross Mega (same)
  '229_1': ['DARK','FIRE'], // Houndoom Mega (same)
  '248_1': ['ROCK','DARK'], // Tyranitar Mega (same)
  '254_1': ['GRASS','DRAGON'], // Sceptile Mega (type change!)
  '257_1': ['FIRE','FIGHTING'], // Blaziken Mega (same)
  '260_1': ['WATER','GROUND'], // Swampert Mega (same)
  '282_1': ['PSYCHIC','FAIRY'], // Gardevoir Mega (same)
  '302_1': ['DARK','GHOST'], // Sableye Mega (same)
  '303_1': ['STEEL','FAIRY'], // Mawile Mega (same)
  '306_1': ['STEEL'], // Aggron Mega (type change! loses Rock)
  '308_1': ['FIGHTING','PSYCHIC'], // Medicham Mega (same)
  '310_1': ['ELECTRIC'], // Manectric Mega (same)
  '319_1': ['WATER','DARK'], // Sharpedo Mega (same)
  '323_1': ['FIRE','GROUND'], // Camerupt Mega (same)
  '334_1': ['DRAGON','FAIRY'], // Altaria Mega (type change!)
  '354_1': ['GHOST'], // Banette Mega (same)
  '359_1': ['DARK'], // Absol Mega (same)
  '362_1': ['ICE'], // Glalie Mega (same)
  '373_1': ['DRAGON','FLYING'], // Salamence Mega (same)
  '376_1': ['STEEL','PSYCHIC'], // Metagross Mega (same)
  '380_1': ['DRAGON','PSYCHIC'], '381_1': ['DRAGON','PSYCHIC'], // Lati@s (same)
  '384_1': ['DRAGON','FLYING'], // Rayquaza Mega (same)
  '428_1': ['NORMAL','FIGHTING'], // Lopunny Mega (type change!)
  '445_1': ['DRAGON','GROUND'], // Garchomp Mega (same)
  '448_1': ['FIGHTING','STEEL'], // Lucario Mega (same)
  '460_1': ['GRASS','ICE'], // Abomasnow Mega (same)
  '475_1': ['PSYCHIC','FIGHTING'], // Gallade Mega (same)
  '531_1': ['NORMAL','FAIRY'], // Audino Mega (type change!)
  '719_1': ['ROCK','FAIRY'], // Diancie Mega (same)
  // Custom megas in Pokemon Z
  // Note: 12_1, 25_1, 36_1 are Z forms - types come from Z form section above
  '71_1': ['GRASS','POISON'], // Victreebel Mega
  '121_1': ['WATER','PSYCHIC'], // Starmie Mega
  '131_1': ['WATER','ICE'], // Lapras Mega
  '149_1': ['DRAGON','FLYING'], // Dragonite Mega
  '154_1': ['GRASS'], // Meganium Mega
  '160_1': ['WATER'], // Feraligatr Mega
  '227_1': ['STEEL','FLYING'], // Skarmory Mega
  '244_1': ['FIRE'], // Entei Mega
  '336_1': ['POISON'], // Seviper Mega (no sprite)
  '358_1': ['PSYCHIC'], // Chimecho Mega
  '398_1': ['NORMAL','FLYING'], // Staraptor Mega
  '478_1': ['ICE','GHOST'], // Froslass Mega
  '485_1': ['FIRE','STEEL'], // Heatran Mega
  '491_1': ['DARK'], // Darkrai Mega
  '500_1': ['FIRE','FIGHTING'], // Emboar Mega
  '530_1': ['GROUND','STEEL'], // Excadrill Mega
  '545_1': ['BUG','POISON'], // Scolipede Mega
  '560_1': ['DARK','FIGHTING'], // Scrafty Mega
  '569_1': ['POISON'], // Garbodor Mega
  '604_1': ['ELECTRIC'], // Eelektross Mega
  '609_1': ['GHOST','FIRE'], // Chandelure Mega
  '623_1': ['GROUND','GHOST'], // Golurk Mega
  '628_1': ['NORMAL','FLYING'], // Braviary Mega
  '637_1': ['BUG','FIRE'], // Volcarona Mega
  '668_1': ['FIRE','NORMAL'], // Pyroar Mega
  // 670 Floette: sprite colors, not type changes
  '671_1': ['FAIRY'], // Florges Mega
  '687_1': ['DARK','PSYCHIC'], // Malamar Mega
  '689_1': ['ROCK','WATER'], // Barbaracle Mega
  '691_1': ['POISON','DRAGON'], // Dragalge Mega
  '701_1': ['FIGHTING','FLYING'], // Hawlucha Mega
  '740_1': ['FIGHTING','ICE'], // Crabominable Mega
  '768_1': ['BUG','WATER'], // Golisopod Mega
  '780_1': ['NORMAL','DRAGON'], // Drampa Mega
  '807_1': ['ELECTRIC'], // Zeraora Mega
  '812_1': ['GRASS'], // Rillaboom Mega
  '815_1': ['FIRE'], // Cinderace Mega
  '818_1': ['WATER'], // Inteleon Mega
  '823_1': ['FLYING','STEEL'], // Corviknight Mega
  '826_1': ['BUG','PSYCHIC'], // Orbeetle Mega
  '834_1': ['WATER','ROCK'], // Drednaw Mega
  '839_1': ['ROCK','FIRE'], // Coalossal Mega
  '841_1': ['GRASS','DRAGON'], // Flapple Mega
  '842_1': ['GRASS','DRAGON'], // Appletun Mega
  '844_1': ['GROUND'], // Sandaconda Mega
  '849_1': ['ELECTRIC','POISON'], // Toxtricity (Grave form, not mega)
  '851_1': ['FIRE','BUG'], // Centiskorch Mega
  '858_1': ['PSYCHIC','FAIRY'], // Hatterene Mega
  '861_1': ['DARK','FAIRY'], // Grimmsnarl Mega
  '865_1': ['FIGHTING'], // Sirfetch'd Mega
  '869_1': ['FAIRY'], // Alcremie Mega
  '870_1': ['FIGHTING'], // Falinks Mega
  '879_1': ['STEEL'], // Copperajah Mega
  '884_1': ['STEEL','DRAGON'], // Duraludon Mega
  '940_1': ['GRASS','FIRE'], // Scovillain Mega
  '952_1': ['DRAGON','ICE'], // Baxcalibur Mega
  '953_1': ['DRAGON','WATER'], // Tatsugiri Mega
  '968_1': ['ROCK','POISON'], // Glimmora Mega
  '99_1': ['WATER'], // Kingler Mega
  '359_2': ['DARK'], // Absol Mega Z
  '445_2': ['DRAGON','GROUND'], // Garchomp Mega Z
  '448_2': ['FIGHTING','STEEL'], // Lucario Mega Z
  '652_1': ['GRASS','FIGHTING'], // Chesnaught Mega
  '655_1': ['FIRE','PSYCHIC'], // Delphox Mega
  '908_1': ['GRASS','DARK'], // Meowscarada Mega
  '947_1': ['NORMAL'], // Maushold Mega
  // Deoxys
  '386_1': ['PSYCHIC'], '386_2': ['PSYCHIC'], '386_3': ['PSYCHIC'],
  // Rotom
  '479_1': ['ELECTRIC','FIRE'], '479_2': ['ELECTRIC','WATER'],
  '479_3': ['ELECTRIC','ICE'], '479_4': ['ELECTRIC','FLYING'], '479_5': ['ELECTRIC','GRASS'],
  // Giratina
  '487_1': ['GHOST','DRAGON'],
  // Shaymin
  '492_1': ['GRASS','FLYING'],
  // Kyurem
  '646_1': ['DRAGON','ICE'], '646_2': ['DRAGON','ICE'],
  // Hoopa
  '720_1': ['PSYCHIC','DARK'],
  // Oricorio
  '741_1': ['PSYCHIC','FLYING'], '741_2': ['FIRE','FLYING'], '741_3': ['GHOST','FLYING'],
  // Necrozma
  '800_1': ['PSYCHIC','STEEL'], '800_2': ['PSYCHIC','GHOST'], '800_3': ['PSYCHIC','DRAGON'],
  // Calyrex
  '898_1': ['PSYCHIC','ICE'], '898_2': ['PSYCHIC','GHOST'],
  // Urshifu
  '892_1': ['FIGHTING','WATER'],
  // Morpeko
  '877_1': ['ELECTRIC','DARK'],
  // Darmanitan
  '555_1': ['FIRE','PSYCHIC'],
};

// Build the manifest
const manifest = {};

for (const [idStr, formIndices] of Object.entries(formSprites)) {
  const id = parseInt(idStr);
  const p = pokemonById[id];
  if (!p) continue;

  const forms = [];
  const nameUpper = (p.name || '').toUpperCase();
  const hasMega = megaStonesByPokemon[nameUpper];
  const knownForms = KNOWN_FORMS[id] || {};

  for (const idx of formIndices) {
    let formName = knownForms[idx] || null;
    let formType = 'form'; // 'mega', 'z-form', 'regional', 'form'
    let stats = null;
    let abilities = null;
    let stone = null;

    // Try to identify the form
    if (!formName) {
      // Check if it's a Z form
      const zKey = `${p.name} Z`;
      if (D_formStats_has(zKey)) {
        formName = 'Z';
        formType = 'z-form';
      }
    }

    // Determine form type from name
    if (formName) {
      if (formName.startsWith('Mega')) formType = 'mega';
      else if (formName === 'Z') formType = 'z-form';
      else if (['Alola', 'Galar', 'Hisui', 'Paldea'].some(r => formName.startsWith(r))) formType = 'regional';
    }

    // Look up stats from form-stats.json
    const possibleKeys = [];
    if (formName && formName.startsWith('Mega')) {
      const suffix = formName.replace('Mega', '').trim();
      possibleKeys.push(`Mega ${p.name}${suffix ? ' ' + suffix : ''}`);
      possibleKeys.push(`Mega ${p.name}`);
      possibleKeys.push(`Mega ${p.name} Z`); // Some megas stored as "Mega X Z"
    }
    if (formType === 'z-form' || formName === 'Z') {
      possibleKeys.push(`${p.name} Z`);
    }
    possibleKeys.push(`${p.name} ${formName || idx}`);

    for (const key of possibleKeys) {
      if (formStats[key]) {
        stats = formStats[key].stats;
        abilities = formStats[key].abilities;
        break;
      }
    }

    // Fallback to MEGA_STATS and ALT_FORM_STATS dictionaries
    if (!stats) {
      const formKey = `${id}_${idx}`;
      const dictEntry = MEGA_STATS[formKey] || ALT_FORM_STATS[formKey];
      if (dictEntry) {
        stats = dictEntry.stats;
        if (!abilities) abilities = dictEntry.abilities;
      }
    }

    // Look up mega stone
    if (formType === 'mega' && hasMega) {
      const variant = formName.replace('Mega', '').trim();
      const stoneMatch = hasMega.find(s =>
        (variant === 'X' && s.variant === 'X') ||
        (variant === 'Y' && s.variant === 'Y') ||
        (!variant || variant === '')
      ) || hasMega[0];
      if (stoneMatch) stone = stoneMatch.stone;
    }

    if (!formName) formName = `Forma ${idx}`;

    // Look up types for this form (FORM_TYPES dict first, then formStats)
    const typeKey = `${id}_${idx}`;
    let formTypes = FORM_TYPES[typeKey] || null;
    // Also check formStats for types (e.g. Z forms have types in form-stats.json)
    if (!formTypes) {
      for (const key of possibleKeys) {
        if (formStats[key] && formStats[key].types && formStats[key].types.length) {
          formTypes = formStats[key].types;
          break;
        }
      }
    }

    forms.push({
      index: idx,
      name: formName,
      type: formType,
      types: formTypes,
      stats: stats || null,
      abilities: abilities || null,
      stone: stone || null
    });
  }

  if (forms.length > 0) {
    manifest[id] = forms;
  }
}

function D_formStats_has(key) {
  return formStats[key] !== undefined;
}

// Write manifest
fs.writeFileSync(path.join(DATA_DIR, 'forms-manifest.json'), JSON.stringify(manifest, null, 0));

console.log(`Forms manifest: ${Object.keys(manifest).length} Pokemon with forms`);

// Show some stats
let megaCount = 0, zCount = 0, regionalCount = 0, otherCount = 0;
for (const forms of Object.values(manifest)) {
  for (const f of forms) {
    if (f.type === 'mega') megaCount++;
    else if (f.type === 'z-form') zCount++;
    else if (f.type === 'regional') regionalCount++;
    else otherCount++;
  }
}
console.log(`  Megas: ${megaCount}, Z-forms: ${zCount}, Regional: ${regionalCount}, Other: ${otherCount}`);

// Show first 20 entries
let shown = 0;
for (const [id, forms] of Object.entries(manifest)) {
  if (shown++ >= 20) break;
  const p = pokemonById[parseInt(id)];
  console.log(`  #${id} ${p?.name}: ${forms.map(f => `${f.name}${f.stats ? '*' : ''}`).join(', ')}`);
}
