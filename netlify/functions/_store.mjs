import { getStore } from "@netlify/blobs";

export function store(name="masters-pool"){
  return getStore(name);
}

export async function readJSON(key, fallback){
  const s = store();
  const val = await s.get(key,{type:"json"});
  return val ?? fallback;
}

export async function writeJSON(key, value){
  const s = store();
  await s.setJSON(key,value);
  return value;
}
