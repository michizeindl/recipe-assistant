"""Read project references without changing them; write standalone application data."""
import json,re,zipfile,io
from pathlib import Path
import openpyxl

here=Path(__file__).resolve().parent
project=here.parent.parent
out=here/'dist'
plan=json.loads((project/'work/meal_calculation.json').read_text(encoding='utf-8'))
book=openpyxl.load_workbook(project/'work/cofid2021.xlsx',read_only=True,data_only=True)
rows={r[0]:r for r in list(book['1.3 Proximates'].values)[3:]}
miner={r[0]:r for r in list(book['1.4 Inorganics'].values)[3:]}
allergies={'Vollkornnudeln':['Glutenhaltiges Getreide'],'Vollkornbrot':['Glutenhaltiges Getreide'],'Haferflocken':['Glutenhaltiges Getreide'],'Weizenmehl':['Glutenhaltiges Getreide'],'Sojadrink, ungesüßt, angereichert':['Soja'],'Walnüsse':['Schalenfrüchte / Nüsse'],'Pinienkerne':[],'Eier ohne Schale':['Eier'],'Sardinen in Salzlake, abgetropft':['Fisch'],'Forellenfilet':['Fisch'],'Miesmuschelfleisch, gegart':['Weichtiere'],'Staudensellerie':['Sellerie']}
possible={'Vollkornbrot':['Milch','Soja','Sesam'],'Zartbitterschokolade':['Milch','Soja','Schalenfrüchte / Nüsse'],'Essig':['Sulfite / Schwefeldioxid']}
categories={'Rinderschmorfleisch':'Rindfleisch','Hähnchenfilet':'Geflügel','Forellenfilet':'Fisch','Sardinen in Salzlake, abgetropft':'Fisch','Miesmuschelfleisch, gegart':'Meeresfrüchte','Eier ohne Schale':'Eier','Kichererbsenmehl':'Hülsenfrüchte','Kichererbsen, gegart, abgetropft':'Hülsenfrüchte','Weiße Bohnen, gegart, abgetropft':'Hülsenfrüchte','Sojadrink, ungesüßt, angereichert':'Hülsenfrüchte','Kartoffeln':'Kartoffeln','Naturreis':'Reis','Vollkornnudeln':'Nudeln','Äpfel, essbarer Anteil':'Obst'}
def num(v):
 if v=='Tr':return 0
 try:return float(v)
 except (ValueError,TypeError):return None
foods={}
for name,code in plan['cofid_codes'].items():
 r=rows[code]
 kind='meat' if name in ['Rinderschmorfleisch','Hähnchenfilet'] else 'fish' if name in ['Forellenfilet','Sardinen in Salzlake, abgetropft'] else 'seafood' if name=='Miesmuschelfleisch, gegart' else 'egg' if name=='Eier ohne Schale' else 'uncertain-vegan' if name=='Zartbitterschokolade' else 'plant'
 foods[name]={'code':code,'description':r[1],'kcal':num(r[12]),'protein':num(r[9]),'fat':num(r[10]),'carbs':num(r[11]),'fibre':num(r[25]),'calcium':num(miner[code][9]),'allergens':allergies.get(name,[]),'possible':possible.get(name,[]),'kind':kind,'category':categories.get(name,'Gemüse' if name in ['Brokkoli','Spinat','Möhren','Paprika','Zucchini','Dosentomaten','Tomaten','Champignons','Gurke','Fenchel'] else None)}
catalog=[]
with zipfile.ZipFile(project/'sources/recipe_assistant_4000_vollrezepte.zip') as z:
 for f in z.namelist():
  if not f.endswith('.xlsx'):continue
  wb=openpyxl.load_workbook(io.BytesIO(z.read(f)),read_only=True,data_only=True)
  for r in list(wb['Rezepte'].values)[1:]:
   if len(r)<10 or not r[0]:continue
   catalog.append({'id':str(r[0]),'cuisine':r[1],'name':r[3],'yield':r[4],'ingredients':r[5],'instructions':r[6],'complete':bool(r[7]),'sides':r[8],'sourceFile':f,'note':r[9]})
  wb.close()
recipes=[]
for i,m in enumerate(plan['meals']):
 match=next((r for r in catalog if r['id']==m['recipe_reference']),None)
 recipes.append({'id':m['recipe_reference']+'-plan','reference':m['recipe_reference'],'name':m['name'],'cuisine':'Hausmannskost' if m['recipe_reference']=='KL074' else 'Spanisch' if m['recipe_reference']=='VEG099' else 'Italienisch','slots':['Mittagessen','Abendessen'],'ingredients':m['main_ingredients_g'],'instructions':None,'time':None,'complete':True,'adapted':True,'sourceFile':match['sourceFile'] if match else None,'costGroup':'higher' if any(k in m['main_ingredients_g'] for k in ['Rinderschmorfleisch','Forellenfilet','Miesmuschelfleisch, gegart']) else 'regular'})
# These are explicit assistant meal compositions, not missing source data.
recipes.extend([
 {'id':'own-breakfast-1','reference':'Eigene Zusammenstellung','name':'Apfel-Hafer-Schale mit Walnüssen','cuisine':'Hausmannskost','slots':['Frühstück'],'ingredients':{'Haferflocken':70,'Sojadrink, ungesüßt, angereichert':250,'Äpfel, essbarer Anteil':150,'Walnüsse':15},'instructions':'Haferflocken mit Sojadrink verrühren. Apfel klein schneiden und mit Walnüssen darübergeben. Bei Bedarf mit Wasser verdünnen.','time':None,'complete':True,'adapted':True,'costGroup':'regular'},
 {'id':'own-breakfast-2','reference':'Eigene Zusammenstellung','name':'Vollkornbrot mit Ei und Tomaten','cuisine':'Hausmannskost','slots':['Frühstück'],'ingredients':{'Vollkornbrot':100,'Eier ohne Schale':100,'Tomaten':200,'Äpfel, essbarer Anteil':100},'instructions':'Eier vollständig garen und mit Brot, Tomatenscheiben und Apfel servieren.','time':None,'complete':True,'adapted':True,'costGroup':'regular'},
 {'id':'own-snack-1','reference':'Eigene Zusammenstellung','name':'Apfel mit Walnüssen','cuisine':'Hausmannskost','slots':['Snacks'],'ingredients':{'Äpfel, essbarer Anteil':150,'Walnüsse':15},'instructions':'Apfel waschen, in Spalten schneiden und mit Walnüssen servieren.','time':None,'complete':True,'adapted':True,'costGroup':'regular'},
 {'id':'own-snack-2','reference':'Eigene Zusammenstellung','name':'Kleine Hafer-Schoko-Schale','cuisine':'Hausmannskost','slots':['Snacks'],'ingredients':{'Haferflocken':25,'Sojadrink, ungesüßt, angereichert':150,'Zartbitterschokolade':10},'instructions':'Haferflocken mit Sojadrink verrühren und mit gehackter Schokolade bestreuen.','time':None,'complete':True,'adapted':True,'costGroup':'regular'}
])
# Finished, independently phrased instructions already written for these variants.
report=(project/'outputs/wochenplan.md').read_text(encoding='utf-8')
blocks=report.split('\n## ')[1:15]
for recipe,block in zip(recipes[:14],blocks):
 paragraphs=block.split('\n\n')
 recipe['instructions']=paragraphs[3] if len(paragraphs)>3 else 'Zutaten entsprechend dem Rezeptbezug zubereiten.'
(out/'data.js').write_text('export const foods='+json.dumps(foods,ensure_ascii=False,separators=(',',':'))+';\nexport const recipes='+json.dumps(recipes,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
source=(project/'sources/profilmaske-app(1).md').read_text(encoding='utf-8')
fragment=re.search(r'``` html\s*\n(.*?)\n```',source,re.S).group(1)
fragment=re.sub(r'<style>.*?</style>|<script>.*?</script>','',fragment,flags=re.S)
fragment=fragment.replace('id="ra-finish" type="button" disabled','id="ra-finish" type="button"')
fragment=fragment.replace('Alle Eingaben werden zu einem einzigen Planungsprofil zusammengeführt.','Auch mit offenen Angaben berechnen. Annahmen werden im Ergebnis einzeln ausgewiesen.')
template=(here/'index.template.html').read_text(encoding='utf-8')
(out/'index.html').write_text(template.replace('<!--PROFILE-->',fragment),encoding='utf-8')
print(json.dumps({'catalog':len(catalog),'calculable':len(recipes),'foods':len(foods),'profileSections':len(re.findall('data-section="',fragment))}))
