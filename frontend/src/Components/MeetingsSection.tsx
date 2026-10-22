import { useEffect,useState, type ComponentProps } from "react";
type FormSubmitEvent=Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { defaultstartupinput,formatWhen, statusStyle,type meetingstatus } from "../lib/meetingTime";
import { type Role } from "../store/projectstore";
import Meetblocks from "./Meetblocks";

interface MeetingSummary{
    id:string;
    title:string;
    topic:string;
    startsAt:string;
    duration:number;
    status:meetingstatus;
    startedFrom:string|null;
    myRole:Role;
}
const duration=[15,30,45,60,90,120,180];

const bystartdesc=(a:MeetingSummary, b:MeetingSummary)=>
    new Date(b.startsAt).getTime()- new Date(a.startsAt).getTime();


export default function MeetingsSection({projectId,isLeader,}:{projectId:string;isLeader:boolean;}){
    const[meetings,setMeetings]=useState<MeetingSummary[]>([]);
    const [form,setForm]=useState({
        title:'',
        topic:'',
        startsAt:defaultstartupinput(),
        duration:'60',
        startedFrom:'',
    });
    const[loading,setLoading]=useState(true);
    const [error,setError]=useState('');
    const [creating,setCreating]=useState(false);
    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            try{
                const list =await api<MeetingSummary[]>(`/projects/${projectId}/meetings`);
                if(!cancelled){
                    setMeetings(list);
                }
            }
            catch(err){
                if(!cancelled){
                    setError(err instanceof Error?err.message:'Failed to load meetings');
                }
            }
            finally{
                if(!cancelled){
                    setLoading(false);
                }
            }
        })();
        return ()=>{
            cancelled=true;
        }
    },[projectId]);
    async function onCreate(e:FormSubmitEvent){
        e.preventDefault();
        setError('');
        setCreating(true);
        try{const created=await api<MeetingSummary>(`/projects/${projectId}/meetings`,{
            method:'POST',
            body:JSON.stringify({
                title:form.title,
                topic:form.topic,
                startsAt:new Date(form.startsAt).toISOString(),
                duration:Number(form.duration),
                startedFrom:form.startedFrom || undefined
            }),
        });
        setMeetings((ms)=>[created,...ms].sort(bystartdesc));
        setForm({...form,title:'',topic:'',startedFrom:''});

        }
        catch(err){
            setError(err instanceof Error?err.message:'Could not create meeting');
        }
        finally{
            setCreating(false);
        }
    }
    const input='w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
    const titleOf=(id:string |null)=>meetings.find((m)=>m.id===id)?.title;
    return (
        <section className="mt-10 flex items-center justify-center flex-col ">
            <h2 className="font-medium">Meetings</h2>
            {isLeader && (
                <form onSubmit={onCreate}  className="mt-3 w-9/10 border-1 gap-2 rounded-2xl bg-white/5 shadow-2xl backdrop-blur-2xl p-4 z-10  m-7 space-y-3">
                    <input type="text" className={input} value={form.title} placeholder="Meeting title" onChange={(e)=>setForm({...form, title:e.target.value})} />
                    <input type="text" className={input} value={form.topic} placeholder="Meeting's topic" onChange={(e)=>setForm({...form, topic:e.target.value})} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label htmlFor="" className="text-m text-gray-900">
                            Starts At
                            <input type="datetime-local" className={`${input} mt-1`} value={form.startsAt} placeholder="Meeting's topic" onChange={(e)=>setForm({...form, startsAt:e.target.value})} />
                        </label>
                        <label htmlFor="" className="text-m text-gray-900">
                            Duration
                            <select name="" id="" className={`${input} mt-1`} value={form.duration} onChange={(e)=>setForm({...form, duration:e.target.value})} >
                                {duration.map((d)=>(
                                    <option value={d} key={d}>
                                        {d>=60 ? `${d/60} h${d%60 ?` ${d%60 }min `:''}`:`${d} min`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <select name="" id="" value={form.startedFrom} onChange={(e)=>setForm({...form, startedFrom:e.target.value})}>
                        
                            <option value=''>
                                Continue from:(None)
                            </option>
                            {meetings.map((m)=>(
                                <option value={m.id} key={m.id}>
                                    Continue from:{m.title}
                                </option>
                        ))}
                    </select>
                    <button type="submit" disabled={creating} className='rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60'>{creating?'Creating..':'New Meeting'}</button>
                </form>
            )}
            {error && (
                <p className=" mt-3 text-sm text-red-600">{error}</p>
            )}
            {loading ?(
                <p className="mt-3 text-gray-500">Loading ...</p>
                ):meetings.length===0?(
                    <p>No meetings yet{isLeader ? 'Create the first meeting':''}</p>
                ):(
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {
                            meetings.map((m)=>(
                                
                                    <Link to={`/projects/${projectId}/meetings/${m.id}`}>
                                    <Meetblocks title={m.title} topic={m.topic} duration={m.duration} startsAt={m.startsAt} status={m.status} startedFrom={m.startedFrom}  />
                                    </Link>
                                
                            ))
                        }
                    </div>
                )
            }
        </section>
    )
}