import { useEffect, useState,useMemo, type ComponentProps } from "react";
type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Calendar,Clock } from "lucide-react";
import { createSocket } from "../lib/socket";
import { defaultstartupinput, type meetingstatus } from "../lib/meetingTime";
import { type Role } from "../store/projectstore";
import Meetblocks from "./Meetblocks";

interface MeetingSummary {
    id: string;
    title: string;
    topic: string;
    startsAt: string;
    duration: number;
    status: meetingstatus;
    startedFrom: string | null;
    myRole: Role;
}
const duration = [15, 30, 45, 60, 90, 120, 180];

const bystartdesc = (a: MeetingSummary, b: MeetingSummary) =>
    new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
const bystartasc = (a: MeetingSummary, b: MeetingSummary) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

type Tab='current'|'earlier';
export default function MeetingsSection({ projectId, isLeader, }: { projectId: string; isLeader: boolean; }) {
    const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
    const [tab,setTab]=useState<Tab>('current');
    function capitalize(word:string):string{
        return word.charAt(0).toUpperCase()+word.slice(1);
    }
    const currentMeetings=useMemo(()=>{
        const live=meetings.filter((m)=>m.status==='live').sort(bystartasc);
        const upcoming=meetings.filter((m)=>m.status==='upcoming').sort(bystartasc);
        return[...live,...upcoming];
    },[meetings]);
    
    const earlierMeetings=useMemo(()=>meetings.filter((m)=>m.status==='ended').sort(bystartdesc)
    ,[meetings]);
    const visible=tab==='current'?currentMeetings:earlierMeetings;
    const [form, setForm] = useState({
        title: '',
        topic: '',
        startsAt: defaultstartupinput(),
        duration: '60',
        startedFrom: '',
    });
    const [loading, setLoading] = useState(true);
    const [countmeeting, setCountmeeting] = useState(0);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    useEffect(() => {
        if (!projectId) {
            return;
        }
        const socket = createSocket();
        const subscribe = () => socket.emit('project:subscribe', { projectId });
        socket.on('connect', subscribe);
        socket.on('meetings:changed', () => setCountmeeting((prev) => prev + 1));
        socket.connect();
        return () => {
            socket.disconnect();
        }
    }, [projectId])
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await api<MeetingSummary[]>(`/projects/${projectId}/meetings`);
                if (!cancelled) {
                    setMeetings(list);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load meetings');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        }
    }, [projectId, countmeeting]);
    async function CreateMeeting(e: FormSubmitEvent) {
        setTab('current');
        
        e.preventDefault();
        setError('');
        setCreating(true);
        try {
            const created = await api<MeetingSummary>(`/projects/${projectId}/meetings`, {
                method: 'POST',
                body: JSON.stringify({
                    title: form.title,
                    topic: form.topic,
                    startsAt: new Date(form.startsAt).toISOString(),
                    duration: Number(form.duration),
                    startedFrom: form.startedFrom || undefined
                }),
            });
            setMeetings((ms) => [created, ...ms].sort(bystartdesc));
            setForm({ ...form, title: '', topic: '', startedFrom: '' });

        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create meeting');
        }
        finally {
            setCreating(false);
        }
    }
    const input = 'w-full rounded-lg border border-black px-3 py-2 outline-none focus:border-indigo-400';
    return (
        <section className="mt-10 flex bg-transparent items-center justify-center flex-col ">
            <h2 className="font-medium text-xl">Meetings</h2>
            <div className="mt-4 flex gap-3" role='tablist'  >
                <button type='button' role='tab' aria-selected={tab==='current'} onClick={()=>setTab('current') } className={`font-semibold px-2 py-4 ${tab==='current'? 'underline underline-offset-8 decoration-2 border-black' :''}`} >Current</button>
            <button type='button' role='tab' aria-selected={tab==='earlier'} onClick={()=>setTab('earlier')}  className={`font-semibold px-2 py-4 ${tab==='earlier'? 'underline border-black underline-offset-8 decoration-2' :''}`} >Earlier</button></div>
            {isLeader && tab==='current' && (
                <form onSubmit={CreateMeeting} className="mt-3 w-9/10 border gap-2 rounded-2xl hover:border-indigo-600  border-black hover: shadow-2xl backdrop-blur-2xl p-4 z-10  m-7 space-y-3">
                    <label htmlFor="" className="font-semibold" >Meeting Title</label>
                    <input type="text" className={input} value={form.title} placeholder="Meeting title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <label htmlFor="" className="font-semibold" >Meeting Topic</label>
                    <input type="text" className={input} value={form.topic} placeholder="Meeting's topic" onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label htmlFor="" className=" text-black">
                            <div className="flex gap-2" ><Calendar/> <p className="font-semibold">Starts At</p></div>
                            <input type="datetime-local" className={`${input} mt-1`} value={form.startsAt} placeholder="Meeting's topic" onChange={(e) => { setForm({ ...form, startsAt: e.target.value }); }} />
                        </label>
                        <label htmlFor="" className=" text-black">
                            <div className="flex gap-2" ><Clock/> <p className="font-semibold" >Duration</p></div>
                            <select name="" id="" className={`${input} mt-1 `} value={form.duration} onChange={(e) => { setForm({ ...form, duration: e.target.value }); e.target.blur(); }} >
                                {duration.map((d) => (
                                    <option value={d} className="bg-transparent" key={d}>
                                        {d >= 60 ? `${d / 60} h${d % 60 ? ` ${d % 60}min ` : ''}` : `${d} min`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex gap-7  justify-between" >
                    <select name="" id="" value={form.startedFrom} onChange={(e) => setForm({ ...form, startedFrom: e.target.value })}>

                        <option value=''>
                            Continue from:(None)
                        </option>
                        {meetings.map((m) => (
                            <option value={m.id} key={m.id}>
                                Continue from:{m.title}
                            </option>
                        ))}
                    </select>
                    <button type="submit" disabled={creating} className='rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60'>{creating ? 'Creating..' : 'New Meeting'}</button>
                </div>
                </form>
            )}
            {error && (
                <p className=" mt-3 text-sm text-red-600">{error}</p>
            )}
            {loading ? (
                <p className="mt-3 text-gray-500">Loading ...</p>
            ) : visible.length === 0 ? (
                <p className="w-full text-center" >{tab==='current'?`No live or upcoming meetings${isLeader ? ' Create the first meeting':''}`:'No earlier meeting yet'}</p>
            ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),20rem))] xl:grid-cols-2">
                    {
                        visible.map((m) => (

                            <Link key={m.id} to={`/projects/${projectId}/meetings/${m.id}`}>
                                <Meetblocks title={m.title} topic={m.topic} duration={m.duration} startsAt={m.startsAt} status={m.status} startedFrom={m.startedFrom} />
                            </Link>

                        ))
                    }
                </div>
            )
            }
        </section>
    )
}