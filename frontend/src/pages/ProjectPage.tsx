import { useEffect, useState } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Role } from "../store/projectstore";
import MeetingsSection from "../Components/MeetingsSection";
import { api } from '../lib/api';
import { create } from "zustand";
import { createSocket } from "../lib/socket";

interface ProjectDetail {
    id: string;
    name: string;
    description: string;
    category: string;
    role: Role;
    invitecode?: string;
}
interface Member {
    userId: string;
    name: string;
    role: Role;
    email?: string;
}

export default function ProjectPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [error, setError] = useState('');
    const [mcount,setMcount]=useState(0);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [p, m] = await Promise.all([
                    api<ProjectDetail>(`/projects/${projectId}`),
                    api<Member[]>(`/projects/${projectId}/members`)
                ]);
                if (!cancelled) {
                    setProject(p);
                    setMembers(m);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load project');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectId])
    useEffect(()=>{
        if(!project){
            return;
        }
        const socket=createSocket();
        
        const subscribe=()=>socket.emit('project:subscribe',{projectId});
        socket.on('connect', subscribe);
        socket.on('members:changed', () => setMcount((prev) => prev + 1));
        socket.connect();
        return () => {
            socket.disconnect();
        }
    },[projectId,mcount])
    async function changeRole(userId: string, role: Role) {
        try {
            await api(`/projects/${projectId}/members/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ role }),
            });
            setMembers((ms) => ms.map((m) => (m.userId === userId ? { ...m, role } : m)))
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change role');
        }
    }
    async function CopyInvite() {
        const link = `${window.location.origin}/join/${project?.invitecode}`
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    if (error && !project) {
        return (
            <div className="p-8">
                <p className="text-red-600">{error}</p>
                <Link className="mt-3 inline-block text-indigo-600 hover:underline" to='/' >Back to Dashboard</Link>
            </div>
        )
    }
    if (!project) {
        return <p className="p-8 text-gray-500">Loading...</p>
    }
    const isleader = project.role === 'leader';
    return (
        <div className="min-h-screen bg-linear-to-br from-purple-600 to-white p-4 sm:p-8">
            <div className="mx-auto max-w-6xl" >
                <Link className="text-xl font-semibold  text-indigo-600 hover:underline" to='/'> {`<-Dashboard`}</Link>

                <div className="mt-3 flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-semibold">{project.name}</h1>
                <p className="max-w-2xl break-word text-gray-500">{project.category}
                    {project.description}
                </p>
                </div>
            </div>
            {
                isleader && project.invitecode && (
                    <div className=" mt-6 flex  justify-center" >
                        <div className="mt-6 w-full max-w-xl rounded-xl border bg-white/60 p-4 shadow-xl">
                            <p className="text-sm font-medium">Invite Link</p>
                            <p className="mt-1 break-all text-sm text-gray-600">{window.location.origin}/join/{project.invitecode}</p>
                            <button onClick={CopyInvite} className="mt-3 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">{copied ? 'Copied' : 'copy link'}</button>
                        </div>
                    </div>
                )
            }
            {error && (<p className="mt-2 text-xs text-gray-500">{error}</p>)}
            <div className=" mt-6 flex flex-col gap-6 bg-transparent lg:flex-row lg:items-start " >
                <div className="w-full lg:w-72 lg:shrink-0" >
                    <h2 className="mt-8 font-medium">Members</h2>
                    <ul className="mt-3 divide-y  rounded-xl border shadow-xl bg-gray/10">
                        {members.map((m) => (
                            <li key={m.userId} className="flex item-center justify-between p-3">
                                <div className=" flex flex-col items-center justify-center" >
                                    <p className="font-medium truncate">{m.name}</p>
                                    {m.email && (<p className="truncate text-sm text-gray-500">{m.email}</p>)}
                                </div>
                                {isleader && m.role !== 'leader' ? (
                                    <select value={m.role} className="shrink-0 rounded-lg border px-2 py-1 text-sm" onChange={(e) => changeRole(m.userId, e.target.value as Role)}>
                                        <option value="editor">editor</option>
                                        <option value="viewer">viewer</option>
                                    </select>
                                ) : (
                                    <span className="shrink-0 text-sm font-bold text-gray-900">{m.role}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div >
                <MeetingsSection projectId={project.id} isLeader={isleader} />
            </div>
        </div>
    )
}