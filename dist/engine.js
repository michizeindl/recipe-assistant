import {foods,recipes} from './data.js';
export const days=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
export const slots=['Frühstück','Mittagessen','Abendessen','Snacks'];
export const foodNames=['Rindfleisch','Schweinefleisch','Geflügel','Lamm','Fisch','Meeresfrüchte','Eier','Milchprodukte','Hülsenfrüchte','Gemüse','Obst','Kartoffeln','Reis','Nudeln'];
export const cuisineNames=['Hausmannskost','Italienisch','Französisch','Griechisch','Orientalisch','Chinesisch','Thailändisch','Indisch','Mexikanisch','Amerikanisch'];
const norm=s=>String(s??'').toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
export const blankProfile=()=>({body:{age:'',sex:'',height:'',weight:'',goal:'',notes:''},movement:{activity:'',workdays:'',workhours:'',commute:'',steps:'',sport:[0,1,2].map(()=>({frequency:'Nein',duration:'15 Min.'}))},diets:[],extraDiets:[],allergies:[],extraAllergies:[],foodRatings:{},cuisineRatings:{},extraCuisines:[],snacks:'',people:'',matrix:days.map(()=>slots.map(()=>false)),matrixTouched:false,times:{},budget:'',leftovers:'',pantry:[],pantryVisited:false,wholeDay:true});
const numeric=(value,min,max)=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):null;
export function calculateEnergy(p){
 const assumptions=[],warnings=[];
 const age=numeric(p.body?.age,18,100),weight=numeric(p.body?.weight,20,350),height=numeric(p.body?.height,80,250),sex=p.body?.sex;
 let low,high,personal=false;
 if(age&&weight&&height){
  const base=10*weight+6.25*height-5*age;
  if(sex==='männlich'){low=high=base+5;personal=true;}
  else if(sex==='weiblich'){low=high=base-161;personal=true;}
  else{low=base-161;high=base+5;assumptions.push('Keine passende Geschlechtsangabe für die Formel: beide Formelvarianten bilden einen Bereich.');}
 }else{
  low=high=null;
  assumptions.push('Unvollständige oder für die Erwachsenenformel ungeeignete Körperdaten: 2.000 kcal dienen ausschließlich als vorläufiger Planungswert, nicht als persönlicher Bedarf.');
  for(const [value,label]of [[age,'Alter'],[weight,'Gewicht'],[height,'Körpergröße']])if(!value)assumptions.push(label+' fehlt oder ist für diese Formel nicht verwendbar.');
  if(p.body?.age!==''&&Number(p.body?.age)<18)warnings.push('Für Minderjährige liefert diese App keine persönliche Bedarfsberechnung. Der Planungswert ist keine Empfehlung für dieses Alter.');
 }
 let pal=({'Überwiegend sitzend':1.4,'Überwiegend stehend':1.6,'Überwiegend gehend':1.8,'Körperlich anstrengend':2.0})[p.movement?.activity];
 if(!pal){pal=1.4;assumptions.push('Alltagsaktivität offen: überwiegend sitzende Tätigkeit als vorläufige Annahme.');}
 const workdays=numeric(p.movement?.workdays,1,7)??5;
 const hours=Number(String(p.movement?.workhours||'8').match(/\d+/)?.[0]||8);
 if(p.movement?.activity&&p.movement.activity!=='Überwiegend sitzend')pal=1.4+(pal-1.4)*Math.min(1.25,(workdays/5)*(hours/8));
 pal+=({'Etwas':.05,'Deutlich':.12})[p.movement?.commute]||0;
 const steps=numeric(p.movement?.steps,0,100000);
 if(steps!==null){const stepPal=steps>=12000?1.75:steps>=8000?1.6:steps>=5000?1.45:1.35;pal=Math.max(pal,stepPal);}
 const frequencies={'Nein':0,'1×/Woche':1,'2×/Woche':2,'3×/Woche':3,'4–5×/Woche':4.5,'Täglich':7};
 const sport=(p.movement?.sport||[]).reduce((sum,s,i)=>sum+(frequencies[s.frequency]||0)*Number(String(s.duration||'0').match(/\d+/)?.[0]||0)*[.5,1,1.5][i],0);
 pal=Math.min(2.5,pal+Math.min(.35,sport/3000));
 let range=low===null?[2000,2000]:[Math.round(low*(pal-.05)/50)*50,Math.round(high*(pal+.05)/50)*50];
 let target=low===null?2000:Math.round(((low+high)/2)*pal/50)*50;
 const goal=p.body?.goal||'Kein Gewichtsziel – ausgewogen ernähren';
 if(!p.body?.goal)assumptions.push('Ziel offen: ausgewogen essen, kein beabsichtigtes Defizit.');
 if(goal==='Langsam abnehmen'){
  if(personal&&age>=18){const adjustment=Math.min(250,target*.1);target=Math.round((target-adjustment)/50)*50;range=range.map(v=>Math.round((v-adjustment)/50)*50);}
  else assumptions.push('Ein Abnehmdefizit wird ohne geeignete vollständige Körperdaten nicht festgelegt.');
 }
 if(goal==='Zunehmen'){
  if(personal){target+=200;range=range.map(v=>v+200);}
  else assumptions.push('Ein Energieüberschuss wird ohne geeignete vollständige Körperdaten nicht festgelegt.');
 }
 if(target<1200||target>5000)warnings.push('Das Formelergebnis liegt außerhalb des üblichen Planungsbereichs. Körperdaten prüfen; Portionsvorschläge sind besonders unsicher.');
 if(!p.allergies?.length&&!p.extraAllergies?.length)warnings.push('Allergien sind ungeklärt. Der Vorschlag ist nicht als allergengeprüft freigegeben.');
 if(!p.diets?.length)assumptions.push('Ernährungsform offen: Mischkost als vorläufige Auswahl.');
 if(!numeric(p.people,1,20))assumptions.push('Personenzahl offen oder ungültig: 1 Person.');
 if(foodNames.some(x=>!p.foodRatings?.[x]))assumptions.push('Unbewertete Lebensmittel werden neutral mit 3/5 behandelt.');
 if(cuisineNames.some(x=>!p.cuisineRatings?.[x]))assumptions.push('Unbewertete Küchenrichtungen werden neutral mit 3/5 behandelt.');
 if(!p.matrixTouched)assumptions.push('Mahlzeiten offen: Mittag- und Abendessen an allen sieben Tagen.');
 if(!p.budget)assumptions.push('Budget offen: normale, preisbewusste Auswahl; keine Preiszusage.');
 if(!p.leftovers)assumptions.push('Restelogik offen: jeden Tag frisch kochen.');
 if(!p.pantry?.length)assumptions.push('Keine Vorräte angegeben: es werden keine Mengen vom Einkauf abgezogen.');
 return {target,range,pal:Math.round(pal*100)/100,rest:low===null?null:[Math.round(low),Math.round(high)],personal,assumptions,warnings};
}
export const unitOf=name=>foods[name]?.unit||'g';
export function ingredientAllowed(name,p){
 const f=foods[name];if(!f)return false;
 const allergies=[...(p.allergies||[]),...(p.extraAllergies||[])].filter(x=>x!=='Keine bekannt').map(norm);
 if([...f.allergens,...f.possible].some(x=>allergies.includes(norm(x))))return false;
 const extra=p.extraAllergies||[];
 if(extra.some(a=>norm(name).includes(norm(a))))return false;
 if(p.diets?.includes('Vegan')&&f.kind!=='plant')return false;
 if(p.diets?.includes('Vegetarisch')&&['meat','fish','seafood'].includes(f.kind))return false;
 if(p.diets?.includes('Pescetarisch')&&f.kind==='meat')return false;
 if(f.category&&p.foodRatings?.[f.category]===1)return false;
 return true;
}
function customAllergyUnresolved(p){
 return (p.extraAllergies||[]).some(a=>!Object.keys(foods).some(n=>norm(n).includes(norm(a)))&&!['Glutenhaltiges Getreide','Krebstiere','Eier','Fisch','Erdnüsse','Soja','Milch','Schalenfrüchte / Nüsse','Sellerie','Senf','Sesam','Sulfite / Schwefeldioxid','Lupinen','Weichtiere'].some(n=>norm(n)===norm(a)));
}
export function recipeAllowed(recipe,p){
 if(customAllergyUnresolved(p))return false;
 const mapped={...p,allergies:[...(p.allergies||[]),...(p.extraAllergies||[])]};
 return Object.keys(recipe.ingredients).every(n=>ingredientAllowed(n,mapped));
}
const MEAT=['Rindfleisch','Schweinefleisch','Geflügel','Lamm'];
// share: eaten part per ingredient (bones, bay leaves, frying oil); missing entries count fully.
export function nutrition(ingredients,share={}){
 const total={kcal:0,protein:0,fat:0,carbs:0,fibre:0,calcium:0,missing:[]};
 for(const [name,g]of Object.entries(ingredients)){
  const f=foods[name],eaten=g*(share[name]??1);for(const key of ['kcal','protein','fat','carbs','fibre','calcium']){
   if(typeof f?.[key]!=='number'){total.missing.push({ingredient:name,nutrient:key});continue;}
   total[key]+=f[key]*eaten/100;
  }
 }
 return total;
}
// Recipes already contain their sides; nothing is added.
const completeIngredients=recipe=>({...recipe.ingredients});
const share=recipe=>recipe.eatenShare||{};
const peopleCount=p=>numeric(p.people,1,20)??1;
export function planWeek(p,seed=0){
 const energy=calculateEnergy(p),matrix=p.matrixTouched?p.matrix:days.map(()=>[false,true,true,false]);
 const entries=[],issues=[];const use=new Map();let meatTotal=0;let fishMeals=0;
 // Allergy, diet and nutrition checks are done once per recipe and week, not once per meal slot.
 const unresolved=customAllergyUnresolved(p),mapped={...p,allergies:[...(p.allergies||[]),...(p.extraAllergies||[])]};
 const foodOk=new Map(),recipeOk=new Map(),baseCache=new Map();
 const okFood=n=>{if(!foodOk.has(n))foodOk.set(n,ingredientAllowed(n,mapped));return foodOk.get(n);};
 const allowed=r=>{if(unresolved)return false;if(!recipeOk.has(r.id))recipeOk.set(r.id,Object.keys(r.ingredients).every(okFood));return recipeOk.get(r.id);};
 const baseOf=r=>{if(!baseCache.has(r.id))baseCache.set(r.id,nutrition(r.ingredients,share(r)));return baseCache.get(r.id);};
 const preference=recipe=>{
  const categories=[...new Set(Object.keys(recipe.ingredients).map(n=>foods[n]?.category).filter(Boolean))];
  let score=(p.cuisineRatings?.[recipe.cuisineGroup||recipe.cuisine]||3)*2+categories.reduce((s,c)=>s+(p.foodRatings?.[c]||3),0)/Math.max(1,categories.length);
  for(const item of p.pantry||[])if(Object.keys(recipe.ingredients).some(n=>norm(n).includes(norm(item.name))))score+=item.category==='Muss verbraucht werden'?5:1;
  if(p.budget==='Günstig'&&recipe.costGroup==='higher')score-=3;
  if(p.diets?.includes('Flexitarisch')&&Object.keys(recipe.ingredients).some(n=>MEAT.includes(foods[n]?.category)))score-=3;
  return score;
 };
 for(let d=0;d<7;d++){
  const active=slots.filter((s,i)=>matrix?.[d]?.[i]);
  const weights={'Frühstück':.25,'Mittagessen':.35,'Abendessen':.35,'Snacks':.05};
  const divisor=p.wholeDay===false?1:active.reduce((s,n)=>s+weights[n],0);
  for(const slot of active){
   const desired=energy.target*weights[slot]/divisor;
   let candidates=recipes.filter(r=>r.slots.includes(slot)&&allowed(r));
   if(!candidates.length){issues.push(`${days[d]}, ${slot}: Keine ausreichend prüfbare, passende Mahlzeit im berechenbaren Bestand. Energiebedarf bleibt berechnet.`);continue;}
   const prior=p.leftovers==='Gerne für zwei Tage kochen'&&d%2===1?entries.find(e=>e.dayIndex===d-1&&e.slot===slot):null;
   const ranked=candidates.map((recipe,i)=>{
    const ing=completeIngredients(recipe),base=baseOf(recipe),scale=Math.max(.25,Math.min(2,desired/base.kcal));
    const meat=Object.entries(ing).reduce((s,[n,g])=>s+(MEAT.includes(foods[n].category)?g*(share(recipe)[n]??1)*scale:0),0);
    const fish=Object.entries(ing).some(([n,g])=>foods[n].category==='Fisch'&&g>=40);
    let score=preference(recipe)-(use.get(recipe.id)||0)*7-Math.abs(Math.log(desired/base.kcal))*2;
    score+=Math.sin((i+1)*7.9+(d+seed)*3.6)*1.7;
    if(meatTotal+meat>300)score-=100;
    if(fish&&fishMeals<2)score+=3;
    if(fish&&fishMeals>=2)score-=8;
    if(prior&&prior.recipeId===recipe.id)score+=200;
    return {recipe,ing,base,scale,meat,fish,score};
   }).sort((a,b)=>b.score-a.score);
   // The meat ceiling is enforced for the whole week, not merely scored.
   const chosen=ranked.find(r=>meatTotal+r.meat<=300)||ranked.find(r=>r.meat===0);
   if(!chosen){issues.push(`${days[d]}, ${slot}: Keine passende Mahlzeit innerhalb der Fleischobergrenze.`);continue;}
   const {recipe,ing,scale,meat,fish}=chosen;
   const ingredients=Object.fromEntries(Object.entries(ing).map(([n,g])=>[n,g*scale]));
   const n=nutrition(ingredients,share(recipe));
   const entry={dayIndex:d,day:days[d],slot,recipeId:recipe.id,name:recipe.name,reference:recipe.reference,cuisine:recipe.cuisine,ingredients,eatenShare:share(recipe),nutrition:n,scale,people:peopleCount(p),leftover:Boolean(prior?.recipeId===recipe.id),prepareDouble:false,instructions:recipe.instructions,time:recipe.time,mainIngredientNames:recipe.main||Object.keys(recipe.ingredients)};
   if(entry.leftover)prior.prepareDouble=true;
   entries.push(entry);use.set(recipe.id,(use.get(recipe.id)||0)+1);meatTotal+=meat;if(fish)fishMeals++;
  }
 }
 if(!matrix?.some(row=>row?.some(Boolean)))issues.push('Es sind keine Mahlzeiten aktiviert. Die Energieabschätzung steht oben; zum Planen mindestens eine Mahlzeit auswählen.');
 if(slots.some(s=>p.times?.[s]&&p.times[s]!=='Zeit egal'))issues.push('Die Rezeptquellen enthalten keine belastbaren Kochzeiten. Gewählte Zeitgrenzen können daher nicht bestätigt werden.');
 if(p.extraDiets?.length)issues.push('Zusätzliche Ernährungsformen werden als Hinweis gespeichert. Dafür sind keine verifizierten automatischen Filter hinterlegt.');
 if(p.diets?.includes('Vegan'))issues.push('Vitamin B12 ist durch gewöhnliche nicht angereicherte pflanzliche Lebensmittel nicht zuverlässig gedeckt.');
 if(entries.some(e=>e.scale<=.25||e.scale>=2))issues.push('Einige Portionen stoßen an die Skalierungsgrenze. Die tatsächliche Plansumme kann vom Planungswert abweichen.');
 const daily=days.map((day,dayIndex)=>{const list=entries.filter(e=>e.dayIndex===dayIndex),sum={kcal:0,protein:0,fat:0,carbs:0,fibre:0,calcium:0,missing:[]};for(const e of list){for(const k of ['kcal','protein','fat','carbs','fibre','calcium'])sum[k]+=e.nutrition[k];sum.missing.push(...e.nutrition.missing);}return {day,dayIndex,...sum,count:list.length};});
 return {entries,energy,daily,issues,people:peopleCount(p),meatTotal,seed,wholeDay:p.wholeDay!==false,createdAt:new Date().toISOString(),preliminary:!p.allergies?.length||Boolean(p.extraAllergies?.length)};
}
export function shoppingList(plan,p){
 const totals=new Map();
 for(const e of plan.entries)for(const [name,g]of Object.entries(e.ingredients))if(name!=='Wasser')totals.set(name,(totals.get(name)||0)+g*plan.people);
 return [...totals].map(([name,grams])=>({name,grams,unit:unitOf(name),pantry:(p.pantry||[]).filter(item=>norm(name).includes(norm(item.name))).map(x=>x.category)})).sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
export function completeness(p){return [Boolean(p.body?.age&&p.body?.sex&&p.body?.height&&p.body?.weight&&p.body?.goal),Boolean(p.movement?.activity&&p.movement?.workdays&&p.movement?.workhours&&p.movement?.commute),Boolean((p.diets?.length||p.extraDiets?.length)&&(p.allergies?.length||p.extraAllergies?.length)),foodNames.every(n=>Boolean(p.foodRatings?.[n])),cuisineNames.every(n=>Boolean(p.cuisineRatings?.[n])),Boolean(p.people&&p.matrix?.some(r=>r.some(Boolean))),slots.every(s=>Boolean(p.times?.[s])),Boolean(p.budget&&p.leftovers),Boolean(p.pantryVisited)];}
export function validateImportedProfile(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Keine gültigen Profildaten.');
 const p=blankProfile();
 for(const k of ['body','movement','foodRatings','cuisineRatings','times'])if(value[k]&&typeof value[k]==='object'&&!Array.isArray(value[k]))p[k]={...p[k],...value[k]};
 for(const k of ['diets','allergies','extraDiets','extraAllergies','extraCuisines'])if(Array.isArray(value[k]))p[k]=value[k].filter(x=>typeof x==='string').slice(0,100).map(x=>x.slice(0,300));
 for(const k of ['snacks','people','budget','leftovers'])if(typeof value[k]==='string'||typeof value[k]==='number')p[k]=String(value[k]).slice(0,2000);
 p.matrix=days.map((_,d)=>slots.map((_,s)=>Boolean(value.matrix?.[d]?.[s])));
 p.matrixTouched=value.matrixTouched===true;p.pantryVisited=value.pantryVisited===true;p.wholeDay=value.wholeDay!==false;
 if(Array.isArray(value.pantry))p.pantry=value.pantry.filter(x=>x&&typeof x.name==='string').slice(0,200).map(x=>({name:x.name.slice(0,200),category:['Grundvorrat','Muss verbraucht werden','Optional vorhanden'].includes(x.category)?x.category:'Optional vorhanden'}));
 p.movement.sport=[0,1,2].map(i=>({frequency:typeof value.movement?.sport?.[i]?.frequency==='string'?value.movement.sport[i].frequency:'Nein',duration:typeof value.movement?.sport?.[i]?.duration==='string'?value.movement.sport[i].duration:'15 Min.'}));
 return p;
}
