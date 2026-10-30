import { useState,useEffect } from "react";

export type meetingstatus='upcoming'|'live'|'ended';

export const statusStyle:Record<meetingstatus,string>={
    upcoming:'bg-amber-50 text-amber-500',
    live:'bg-green-500 text-white',
    ended:'bg-red-200 text-red-700'
}
export function formatduration(minutes:number){
    const h=Math.floor(minutes/60);
    const m=minutes%60;
    if(h && m){
        return `${h} h ${m} min`;
    }
    return h?`${h} h`:`${m} min`;
}
export function formatWhen(startsAt:string, duration:number){
    const start=new Date(startsAt);
    const end=new Date(start.getTime()+duration*60000);
    const date=start.toLocaleDateString(undefined,{
        weekday:"short",
        day:"numeric",
        month:"short",
        year:"numeric"
    });
    const time=(d:Date)=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    return `${date} ${time(start)}-${time(end)}`;
}
export function defaultstartupinput(){
    const d=new Date();
    d.setMinutes(0,0,0);
    d.setHours(d.getHours()+1);
    const pad=(n:number)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function livestatus(startsAt:string,duration:number,serverStatus:meetingstatus,now:number):meetingstatus{
    if(serverStatus==='ended'){
        return 'ended';
    }
    const start=new Date(startsAt).getTime();
    const end=start+duration*60000;
    return now<start?'upcoming':now<end?'live':'ended';
}
export function usenow(intervalMs=5000){
    const [now,setNow]=useState(()=>Date.now());
    useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}