"""Build the app data (dist/data.js, dist/catalog.json) from the recipe source and the ingredient mapping.

python build_data.py <rezepte.xlsx> <cofid2021.xlsx>

Inputs in this repository (data-src/):
  zutaten.json      every ingredient line of every recipe -> [line, food, grams bought, eaten share], plus meal type
  lebensmittel.json every food name -> CoFID 2021 code, kind, allergens, category, unit
Recipes are only plannable when every ingredient has a CoFID entry with numeric energy, protein, fat and carbohydrate.
"""
import json, re, sys, collections
from pathlib import Path
import openpyxl

here = Path(__file__).resolve().parent
src, out = here / 'data-src', here / 'dist'
rezepte_xlsx, cofid_xlsx = sys.argv[1], sys.argv[2]

# --- CoFID 2021 ---
book = openpyxl.load_workbook(cofid_xlsx, read_only=True, data_only=True)
prox = {r[0]: r for r in list(book['1.3 Proximates'].values)[3:] if r[0]}
inorg = {r[0]: r for r in list(book['1.4 Inorganics'].values)[3:] if r[0]}
def num(v):
    if v == 'Tr': return 0.0
    try: return float(v)
    except (TypeError, ValueError): return None

# --- foods ---
foods, food_raw = {}, json.load(open(src / 'lebensmittel.json', encoding='utf-8'))
for f in food_raw:
    r = prox.get(f['Code'])
    if not r: continue
    foods[f['Name']] = {
        'code': f['Code'], 'description': r[1], 'exact': f['Genau'],
        'kcal': num(r[12]), 'protein': num(r[9]), 'fat': num(r[10]), 'carbs': num(r[11]),
        'fibre': num(r[25]), 'calcium': num(inorg[f['Code']][9]) if f['Code'] in inorg else None,
        'allergens': f['Allergene'], 'possible': f['Möglich'], 'kind': f['Art'], 'category': f['Kategorie'], 'unit': f['Einheit'],
    }
def complete(name):
    f = foods.get(name)
    return bool(f) and all(isinstance(f[k], float) for k in ('kcal', 'protein', 'fat', 'carbs'))

# --- recipe texts from the spreadsheet ---
wb = openpyxl.load_workbook(rezepte_xlsx, read_only=True)
ws = next(s for s in wb.worksheets if s.title.startswith('Rezepte'))
rows = list(ws.values)
head_i = next(i for i, r in enumerate(rows) if r and r[0] == 'ID')
head = rows[head_i]
texts = {r[0]: dict(zip(head, r)) for r in rows[head_i + 1:] if r and r[0]}

# --- ingredient mapping ---
zutaten = json.load(open(src / 'zutaten.json', encoding='utf-8'))
SLOTS = {'Hauptgericht': ['Mittagessen', 'Abendessen'], 'Snack': ['Snacks']}
CUISINE_GROUPS = [  # cuisine names of the profile form -> keywords in the recipe cuisines
    ('Italienisch', ['italien']), ('Französisch', ['franz']), ('Griechisch', ['griech', 'zypr']),
    ('Chinesisch', ['chines', 'taiwan']), ('Thailändisch', ['thail']), ('Indisch', ['indisch', 'ayurved', 'sri-lank', 'südasien']),
    ('Mexikanisch', ['mexik', 'latein', 'zentralamerik']), ('Amerikanisch', ['amerik']),
    ('Orientalisch', ['orient', 'levant', 'liban', 'israel', 'persisch', 'iran', 'ägypt', 'marokk', 'türk', 'tunes', 'naher osten', 'arab']),
    ('Hausmannskost', ['hausmannskost', 'deutsch', 'alpen', 'österreich', 'schweiz']),
]
def cuisine_group(c):
    c = (c or '').lower()
    return next((g for g, keys in CUISINE_GROUPS if any(k in c for k in keys)), None)
MIN_KCAL = {'Hauptgericht': 200, 'Snack': 80}  # lighter dishes are sides, not meals

recipes, catalog, skipped = [], [], collections.Counter()
for z in zutaten:
    t = texts.get(z['ID'])
    if not t: skipped['ohne Rezepttext'] += 1; continue
    portions = int(re.search(r'\d+', str(t['Portionen / Yield'])).group()) if re.search(r'\d+', str(t['Portionen / Yield'] or '')) else 4
    bought, eaten = collections.defaultdict(float), collections.defaultdict(float)
    for line, name, grams, share in z['Z']:
        bought[name] += grams / portions; eaten[name] += grams * share / portions
    plannable = z['Mahlzeit'] in SLOTS and all(complete(n) for n in bought)
    kcal = sum(eaten[n] * foods[n]['kcal'] / 100 for n in eaten if complete(n)) if plannable else 0
    if z['Mahlzeit'] not in SLOTS: skipped['Mahlzeit ' + z['Mahlzeit']] += 1
    elif not plannable: skipped['Nährwerte unvollständig'] += 1
    elif kcal < MIN_KCAL[z['Mahlzeit']]: plannable = False; skipped['zu wenig kcal pro Portion für eine Mahlzeit'] += 1
    allergens = sorted({a for n in bought if n in foods for a in foods[n]['allergens']})
    catalog.append({'id': z['ID'], 'cuisine': t['Küchenrichtung'], 'name': t['Gericht'], 'yield': portions,
                    'ingredients': '; '.join(str(t['Zutaten mit Mengen']).split('\n')), 'instructions': t['Zubereitung'],
                    'meal': z['Mahlzeit'], 'calculable': plannable, 'allergens': allergens, 'note': t.get('Bearbeitungshinweis')})
    if not plannable: continue
    names = [n for n in bought if bought[n] > 0]
    ingredients = {n: round(bought[n], 1) for n in names}
    ratio = {n: round(eaten[n] / bought[n], 3) for n in names if eaten[n] < bought[n] - 1e-9}
    main = sorted((n for n in names if n not in ('Wasser', 'Salz')), key=lambda n: -eaten[n])
    higher = any(foods[n]['category'] in ('Rindfleisch', 'Lamm', 'Fisch', 'Meeresfrüchte') and eaten[n] >= 40 for n in names)
    recipes.append({'id': z['ID'], 'reference': z['ID'], 'name': t['Gericht'], 'cuisine': t['Küchenrichtung'],
                    'cuisineGroup': cuisine_group(t['Küchenrichtung']), 'slots': SLOTS[z['Mahlzeit']], 'meal': z['Mahlzeit'],
                    'ingredients': ingredients, 'eatenShare': ratio, 'main': main[:4], 'instructions': t['Zubereitung'],
                    'time': None, 'complete': True, 'costGroup': 'higher' if higher else 'regular'})

used = {n for r in recipes for n in r['ingredients']}
foods_out = {n: f for n, f in foods.items() if n in used}
(out / 'data.js').write_text('export const foods=' + json.dumps(foods_out, ensure_ascii=False, separators=(',', ':')) +
                             ';\nexport const recipes=' + json.dumps(recipes, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
(out / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'catalog': len(catalog), 'plannable': len(recipes), 'foods': len(foods_out),
                  'slots': collections.Counter(s for r in recipes for s in r['slots']), 'skipped': skipped}, ensure_ascii=False))
