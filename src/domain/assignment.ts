import { catalog, type Quest } from './catalog';
import { shiftDate } from './progression';
export const attributes=['Strength','Intelligence','Vitality','Charisma','Perception'] as const;
export type Attribute=typeof attributes[number];
export type CompletionHistory={questId:string;questVersion:number;date:string;attribute:Attribute;xp:number};
export type AssignmentInput={userId:string;date:string;focus:Attribute;history:CompletionHistory[];catalogVersion?:number};
export async function hash(seed:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed))),v=>v.toString(16).padStart(2,'0')).join('');}
async function sorted<T>(values:T[],seed:(value:T)=>string){const pairs=await Promise.all(values.map(async(value,index)=>({value,index,key:await hash(seed(value))})));return pairs.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:a.index-b.index).map(p=>p.value);}
export async function assignQuests(input:AssignmentInput,quests:Quest[]=catalog){
 const {userId,date,focus}=input;const version=input.catalogVersion??1;const prefix=`${userId}|${date}|${version}`;
 const history=input.history.filter(c=>c.date<date);const xp=Object.fromEntries(attributes.map(a=>[a,history.filter(c=>c.attribute===a).reduce((sum,c)=>sum+c.xp,0)]));
 const min=Math.min(...attributes.map(a=>xp[a]));const weakest=(await sorted(attributes.filter(a=>xp[a]===min),a=>`${prefix}|weakest|${a}`))[0];
 const balance=(await sorted(attributes.filter(a=>a!==focus&&a!==weakest),a=>`${prefix}|balance|${a}`))[0];const selected:Quest[]=[];
 for(const [index,attribute] of [focus,weakest,balance].entries()){
  const pool=quests.filter(q=>q.catalogVersion===version&&q.attribute===attribute&&!selected.some(s=>s.id===q.id)).sort((a,b)=>a.id.localeCompare(b.id)||a.version-b.version);
  const eligible=pool.filter(q=>q.repeatable||!history.some(c=>c.questId===q.id&&c.date>=shiftDate(date,-7)));
  const chosen=(await sorted(eligible.length?eligible:pool,q=>`${prefix}|${['focus','weakest','balance'][index]}|${q.id}|${q.version}`))[0];
  if(!chosen)throw new Error('Catalog cannot supply three distinct quests');selected.push(chosen);
 }return selected;
}
