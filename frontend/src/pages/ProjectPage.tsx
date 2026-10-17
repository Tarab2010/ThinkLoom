import { useEffect, useState } from "react";
import {Link,useParams} from 'react-router-dom';
import type { Role } from "../store/projectstore";
import MeetingsSection from "../Components/MeetingsSection";
import {api} from '../lib/api';

interface ProjectDetail{
    id:string;
    name:string;
    description:string;
    category:string;
    role:Role;
    invitecode?:string;
}
interface Member{
    userId:string;
    name:string;
    role:Role;
    email?:string;
}

export default function ProjectPage(){
    const {projectId}=useParams();
    const [project,setProject]=useState<ProjectDetail|null>(null);
    const [members, setMembers]=useState<Member[]>([]);
    const [error, setError]=useState('');
    const [copied, setCopied]=useState(false);
    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            try{
                const [p,m]=await Promise.all([
                    api<ProjectDetail>(`/projects/${projectId}`),
                    api<Member[]>(`/projects/${projectId}/members`)
                ]);
                if(!cancelled){
                    setProject(p);
                    setMembers(m);
                }
            }
            catch(err){
                if(!cancelled){
                    setError(err instanceof Error?err.message:'Failed to load project');
                }
            }
        })();
        return ()=>{
            cancelled=true;
        };
    },[projectId])
    async function changeRole(userId:string, role:Role){
        try{
            await api(`/projects/${projectId}/members/${userId}`,{
                method:'PATCH',
                body:JSON.stringify({role}),
            });
            setMembers((ms)=>ms.map((m)=>(m.userId===userId?{...m,role}:m)))
        }
        catch(err){
            setError(err instanceof Error?err.message:'Could not change role');
        }
    }
    async function CopyInvite(){
        const link=`${window.location.origin}/join/${project?.invitecode}`
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(()=>setCopied(false),2000);
    }
    if(error && !project){
        return (
            <div className="p-8">
                <p className="text-red-600">{error}</p>
                <Link className="mt-3 inline-block text-indigo-600 hover:underline" to='/' >Back to Dashboard</Link>
            </div>
        )
    }
    if(!project){
        return <p className="p-8 text-gray-500">Loading...</p>
    }
    const isleader= project.role==='leader';
    return (
        <div className="mx-full max-w-3xl p-8">
            <Link className="text-smtext-indigo-600 hover:underline" to='/'>Dashboard</Link>
            <div className="mt-3 flex item-center justify-between">
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                <span className="rounded-full bg-indigo-50 text-xs px-3 py-1 font-medium text-indigo-700">You are a {project.role} in this meeting</span>
            </div>
            <p className="mt-1text-gray-500">{project.category}
                {project.description}
            </p>
            {
                isleader && project.invitecode &&(
                    <div className="mt-6 rounded-xl border bg-white p-4">
                        <p className="text-sm font-medium">Invite Link</p>
                        <p className="mt-1 break-all text-sm text-gray-600">{window.location.origin}/join/{project.invitecode}</p>
                        <button onClick={CopyInvite} className="mt-3 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">{copied?'Copied':'copy link'}</button>
                    </div>
                )
            }
            {error &&(<p className="mt-2 text-xs text-gray-500">{error}</p>)}
            <h2 className="mt-8 font-medium">Members</h2>
            <ul className="mt-3 divide-y rounded-xl border bg-white">
                {members.map((m)=>(
                    <li key={m.userId} className="flex item-center justify-between p-3">
                        <div>
                            <p className="font-medium">{m.name}</p>
                            {m.email && (<p className="text-sm text-gray-500">{m.email}</p>)}
                        </div>
                        {isleader && m.role!=='leader'?(
                            <select value={m.role} className="rounded-lg border text-sm px-2 py-1" onChange={(e)=>changeRole(m.userId,e.target.value as Role)}>
                                <option value="editor">editor</option>
                                <option value="viewer">viewer</option>
                            </select>
                        ):(
                            <span className="text-sm text-gray-600">{m.role}</span>
                        )}
                    </li>
                ))}
            </ul>
            <MeetingsSection projectId={project.id} isLeader={isleader}/>
            <p className="mt-8 text-sm text-gray-500">Meetings and canvas will appear here next</p>
        </div>
    )
}