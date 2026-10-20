import { useEffect,useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatduration,formatWhen,statusStyle, type meetingstatus } from "../lib/meetingTime";
import type{ Role } from "../store/projectstore";
import CanvasBoard from "../Components/CanvasBoard";
import IdeasPanel from "../Components/IdeasPanel";
interface MeetingDetail{
    id:string,
    title:string,
    topic:string,
    duration:number,
    projectId:string,
    startsAt:string,
    status:meetingstatus,
    startedFrom:string | null,
    myRole:Role,
}

interface Member{
    userId:string,
    name:string,
    role:Role,
    email?:string
}
export default function MeetingPage(){
    const {projectId,meetingId}=useParams();
    const [meeting,setMeeting]=useState<MeetingDetail | null>(null);
    const [ending,setEnding]=useState(false);
    const[members,setMembers]=useState<Member[]>([]);
    const [error,setError]=useState('');
    const base=`/projects/${projectId}/meetings/${meetingId}`;
    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            try{
                const [mt,mb]=await Promise.all([
                    api<MeetingDetail>(base),
                    api<Member[]>(`${base}/members`)
                ]);
                if(!cancelled){
                    setMeeting(mt);
                    setMembers(mb);
                }
            }
            catch(err){
                if(!cancelled){
                    setError(err instanceof Error ? err.message:'Could not load the meeting')
                }
            }
        })();
        return ()=>{
            cancelled=true;
        }
    },[base]);
    async function endMeeting(){
        if(!window.confirm('End this meeting for everyone')){
            return;
        }
        setEnding(true);
        setError('');
        try{
            await api(`${base}/end`,{method:'POST'});
            setMeeting(await api<MeetingDetail>(base));
        }
        catch(err){
            setError(err instanceof Error ? err.message:'Could not end this meeting')
        }
        finally{
            setEnding(false);
        }
    }
    async function changeRole(userId:string, role:Role){
        setError('');
        try{
            await api (`${base}/members/${userId}`,{
                method:'PATCH',
                body:JSON.stringify({role}),
            })
        }
        catch(err){
            setError(err instanceof Error? err.message:'Could not change role');
        }
    }
    if(error && !meeting){
        return(
            <div className="p-8" >
                <p className="text-red-600">{error}</p>
                <Link className="mt-3 inline-block text-indigi-600 hover:underline" to={`/projects/${projectId}`} >Back to Project</Link>
            </div>
        )
    }
    if(!meeting){
        return (
            <p className="p-8 text-gray-500">Loading...</p>
        )
    }
    const isLeader=meeting.myRole==='leader';
    const canEdit=meeting.myRole==='leader' || meeting.myRole==='editor';
    return (
        <div>
            <Link to={`/projects/${projectId}`}> Back to Project</Link>
            <div>
                <div>
                    <h1>{meeting.title}</h1>
                    {meeting.topic && <p>{meeting.topic}</p> }
                    <span>
                        {meeting.status}
                    </span>
                    {isLeader && meeting.status==='live' && (
                        <button onClick={()=>endMeeting()} disabled={ending} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                            {ending ?'Ending...':'End Meeting'}
                        </button>
                    )}
                </div>
            </div>
            <p>{formatWhen(meeting.startsAt,meeting.duration)}.{formatduration(meeting.duration)}</p>
            <p>{`Your role in this meeting: ${meeting.myRole}` }</p>
            {error && <p className=" mt-4 text-sm text-red-500">{error}</p> }
            <div className="mt-6">
                {projectId && meetingId &&(
                    <CanvasBoard
                    key={meetingId}
                    projectId={projectId}
                    meetingId={meetingId}
                    onRoleChange={(r)=>setMeeting((m)=>(m?{...m,myRole:r}:m))}
                    />
                )}
            </div>
            {projectId && meetingId &&(
                <IdeasPanel key={meetingId} projectId={projectId} meetingId={meetingId} isLeader={isLeader} />
            )}
            <h2>who can do what in this meeting</h2>
            <ul>
                {members.map((m)=>(
                    <li key={m.userId}>
                        <div>
                            <p>{m.name}</p>
                        </div>
                        {isLeader && m.role !='leader'?(
                            <select name="" id="" value={m.role} onChange={(e)=>changeRole(m.userId, e.target.value as Role)}>
                                <option value="editor">editor</option>
                                <option value="viewer">viewer</option>
                            </select>
                        ):(
                            <span>{m.role}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}