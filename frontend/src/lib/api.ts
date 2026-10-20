

const BASE=import.meta.env.VITE_API_URL ?? '/api';

export async function api<T>(path: string , options:RequestInit={}):Promise<T>{
    const res=await fetch(`${BASE}${path}`,{
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        ...options
    })
    const data= await res.json().catch(()=>({}));
    if(!res.ok){
        throw new Error(data?.error??`Request failed${res.status}`);
    }
    return data as T;
}
export const apiUrl=(path:string)=>`${BASE}${path}`;