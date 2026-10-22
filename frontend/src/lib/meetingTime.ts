export type meetingstatus='upcoming'|'live'|'ended';

export const statusStyle:Record<meetingstatus,string>={
    upcoming:'bg-amber-50 text-amber-500',
    live:'bg-green-50 text-green-700',
    ended:'bg-gray-100 text-gray-700'
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
