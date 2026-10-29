export const STAGES = ['Não reivindicado','Reivindicado','Entrando','Pré-Abertura','Cooperando','Fechado','Offline'];
export const ROLES = ['Administrador','Operador','Visualizador'];
export const FIELDS = ['name','contact','method','owner','city'];
export const normalizeCode = value => String(value ?? '').trim().normalize('NFKC').toUpperCase();
export function validateStore(input) {
 const code=normalizeCode(input.code), name=String(input.name ?? '').trim();
 if(!code || code.length>80 || !name || name.length>200) throw new Error('Código (até 80 caracteres) e nome (até 200) são obrigatórios.');
 const out={code,name};
 for(const key of FIELDS.filter(k=>k!=='name')) {out[key]=String(input[key]??'').trim(); if(out[key].length>500) throw new Error('Campo muito longo: '+key);}
 return out;
}
export function planImport(rows, existing) {
 const seen=new Set();
 return rows.map((row,i)=>{try{const item=validateStore(row);if(seen.has(item.code))return {row:i+2,kind:'duplicate',message:'Código repetido no arquivo',item};seen.add(item.code);return {row:i+2,kind:existing.has(item.code)?'existing':'new',item:{...item,initialStage:row.initialStage??0,source:row.source||{}}};}catch(e){return {row:i+2,kind:'invalid',message:e.message};}});
}
