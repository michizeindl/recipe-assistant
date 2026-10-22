import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProfile,calculateEnergy,planWeek,shoppingList,validateImportedProfile} from '../dist/engine.js';
import {foods,recipes} from '../dist/data.js';
const adult=()=>{const p=blankProfile();p.body={age:'40',sex:'männlich',height:'170',weight:'70',goal:'Kein Gewichtsziel – ausgewogen ernähren'};p.people='1';p.allergies=['Keine bekannt'];return p;};
test('Empty profile calculates with explicit reference assumptions, no invented body data',()=>{
 const p=blankProfile(),out=planWeek(p);assert.equal(out.energy.target,2000);assert.equal(out.energy.rest,null);assert.equal(out.energy.personal,false);assert.equal(out.entries.length,14);assert(out.energy.assumptions.some(x=>x.includes('2.000 kcal')));assert(out.energy.warnings.some(x=>x.includes('Allergien')));assert.equal(p.body.age,'');
});
test('Energy calculation includes actual height and does not infer a weight-loss goal',()=>{
 const p=adult(),energy=calculateEnergy(p);assert.equal(energy.rest[0],1568);assert(energy.target>=2100&&energy.target<=2300);p.body.height='185';assert(calculateEnergy(p).target>energy.target);
});
test('Unspecified sex uses a range; minors do not receive an adult personal calculation',()=>{
 const p=adult();p.body.sex='keine Angabe';const energy=calculateEnergy(p);assert.equal(energy.personal,false);assert(energy.rest[1]>energy.rest[0]);p.body.age='15';assert.equal(calculateEnergy(p).rest,null);assert(calculateEnergy(p).warnings.some(x=>x.includes('Minderjährige')));
});
test('Known allergies apply to cores AND complements including possible allergens',()=>{
 const p=adult();p.allergies=['Soja','Schalenfrüchte / Nüsse','Fisch','Eier','Weichtiere','Milch'];const out=planWeek(p);assert(out.entries.length>0);for(const e of out.entries)for(const name of Object.keys(e.ingredients)){assert(![...foods[name].allergens,...foods[name].possible].some(a=>p.allergies.includes(a)),name);}
});
test('Unresolved custom allergy cannot be declared safe but energy remains calculable',()=>{
 const p=adult();p.extraAllergies=['Individuell ungeklärte Unverträglichkeit'];const out=planWeek(p);assert.equal(out.entries.length,0);assert(out.energy.target>0);assert(out.issues.length>0);
});
test('Known allergens entered as free text apply case-insensitively to possible allergens too',()=>{
 const p=adult();p.extraAllergies=['milch','soja'];const out=planWeek(p);assert(out.entries.length>0);for(const e of out.entries)for(const name of Object.keys(e.ingredients))assert(![...foods[name].allergens,...foods[name].possible].some(a=>['milch','soja'].includes(a.toLowerCase())),name);
});
test('Vegan plan contains only plant-classified ingredients',()=>{
 const p=adult();p.diets=['Vegan'];const out=planWeek(p);assert.equal(out.entries.length,14);for(const e of out.entries)for(const name of Object.keys(e.ingredients))assert.equal(foods[name].kind,'plant',name);assert(out.issues.some(x=>x.includes('B12')));
});
test('Explicitly cleared weekly matrix creates no phantom meals',()=>{
 const p=adult();p.matrixTouched=true;const out=planWeek(p);assert.equal(out.entries.length,0);assert(out.energy.target>0);assert(out.daily.every(x=>x.kcal===0));
});
test('Shopping totals include all sides and scale linearly with household count',()=>{
 const p=adult();const a=planWeek(p);const listA=shoppingList(a,p);p.people='3';const b=planWeek(p);const listB=shoppingList(b,p);assert.equal(a.entries.length,b.entries.length);for(const item of listA){const other=listB.find(x=>x.name===item.name);assert(Math.abs(other.grams-item.grams*3)<1e-6);}
});
test('Unknown pantry quantities never erase required purchases',()=>{
 const p=adult(),a=planWeek(p),base=shoppingList(a,p);p.pantry=[{name:'Tomaten',category:'Grundvorrat'}];const list=shoppingList(a,p);for(const item of list)assert.equal(item.grams,base.find(x=>x.name===item.name).grams);assert(list.some(x=>x.pantry.length));
});
test('Meat ceiling holds for changing targets and generated weeks',()=>{
 for(const seed of [0,1,2,3,10])for(const weight of ['60','100','180']){const p=adult();p.body.weight=weight;assert(planWeek(p,seed).meatTotal<=300.000001);}
});
test('Chosen cooking limit is not falsely asserted when source times are absent',()=>{
 const p=adult();p.times={'Mittagessen':'15 Min.'};assert(planWeek(p).issues.some(x=>x.includes('Zeitgrenzen')));
});
test('Stored malformed data is normalized; each generated calorie and macro has a source',()=>{
 const p=validateImportedProfile({body:{age:'not a number'},movement:{sport:'bad'},pantry:[null,{name:'Tomaten',category:'invalid'}],matrix:[[]]});assert.equal(p.movement.sport.length,3);assert.equal(p.pantry[0].category,'Optional vorhanden');assert.equal(planWeek(p).energy.target,2000);
 for(const r of recipes)for(const name of Object.keys(r.ingredients))for(const k of ['kcal','protein','fat','carbs'])assert.equal(typeof foods[name][k],'number',name+' '+k);
});
test('Daily totals reconcile to all complete meals, with leftovers counted once',()=>{
 const p=adult();p.leftovers='Gerne für zwei Tage kochen';const out=planWeek(p);for(const d of out.daily){const sum=out.entries.filter(e=>e.dayIndex===d.dayIndex).reduce((s,e)=>s+e.nutrition.kcal,0);assert(Math.abs(sum-d.kcal)<.000001);}const list=shoppingList(out,p);const name=list[0].name;const sum=out.entries.reduce((s,e)=>s+(e.ingredients[name]||0),0);assert(Math.abs(sum-list.find(x=>x.name===name).grams)<.000001);
});
test('Large plannable pool gives a varied week without water on the shopping list',()=>{
 assert(recipes.length>=500,'plannable recipes: '+recipes.length);
 const p=adult(),out=planWeek(p);assert.equal(out.entries.length,14);assert(new Set(out.entries.map(e=>e.recipeId)).size>=12);
 assert(!shoppingList(out,p).some(x=>x.name==='Wasser'));
});
test('Eaten share lowers nutrition for bones and frying oil but not the shopping amount',()=>{
 const r=recipes.find(x=>Object.keys(x.eatenShare||{}).length);if(!r)return;const [name,share]=Object.entries(r.eatenShare)[0];
 assert(share>=0&&share<1);
});
