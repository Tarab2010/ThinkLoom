import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from 'react-router-dom';
import type { Role } from "../store/projectstore";
import MeetingsSection from "../Components/MeetingsSection";
import { api } from '../lib/api';
import { UserPlus, User } from "lucide-react";
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
    const [copied, setCopied] = useState(false);
    const notice = (useLocation().state as { notice?: string } | null)?.notice;
    function capitalize(word: string): string {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
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
    const loadmembers = useCallback(async () => {
        try {
            setMembers(await api<Member[]>(`/projects/${projectId}/members`))
        }
        catch { }
    }, [projectId])
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const p = await api<ProjectDetail>(`/projects/${projectId}`);
                if (!cancelled) {
                    setProject(p);
                }
                if (!cancelled) {
                    await loadmembers();
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'failed to load project');
                }
            }
        })();
        return () => { cancelled = true; }
    }, [projectId, loadmembers])
    useEffect(() => {
        if (!projectId) {
            return;
        }
        const socket = createSocket();

        const subscribe = () => socket.emit('project:subscribe', { projectId });
        socket.on('connect', subscribe);
        socket.on('members:changed', loadmembers);
        socket.connect();
        return () => {
            socket.disconnect();
        }
    }, [projectId, loadmembers])
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
        <div className="min-h-screen flex p-4 sm:p-8"> 
            <div className="mx-auto  max-w-6xl" >
                <Link className="text-xl  text-white  bg-black rounded-4xl p-3 border border-gray-700  font-semibold  hover:text-black hover:bg-white hover:border-black " to='/'> {`Dashboard`}</Link>
                <div className="mt-3 flex flex-col items-center gap-2 text-center">
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <div className="flex gap-2 items-center" >
                        <p className="max-w-2xl text-lg font-bold ">{project.category}</p>
                        <p className=" line-clamp-3  wrap-anywhere " >{project.description}</p></div>
                </div>

                {notice && (
                    <p className="mx-auto mt-4 max-w-lg rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-center text-sm text-red-700" >{notice}</p>
                )}
                {
                    isleader && project.invitecode && (
                        <div className=" mt-6 flex  justify-center  " >
                            <div className="mt-6 w-full max-w-xl rounded-xl border bg-transparent  p-4 shadow-xl">
                                <div className="flex  gap-3" ><UserPlus /><p className="text-xl font-medium"> Invite Link</p></div>
                                <p className="mt-1 break-all text-sm text-black">{window.location.origin}/join/{project.invitecode}</p>
                                <button onClick={CopyInvite} className="mt-3 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">{copied ? 'Copied' : 'Copy Link'}</button>
                            </div>
                        </div>
                    )
                }
                {error && (<p className="mt-2 text-xs text-gray-500">{error}</p>)}
                <div className=" mt-6 flex flex-col gap-6 bg-transparent lg:flex-row lg:items-start " >
                    <div className="w-full lg:w-72 flex flex-col items-center lg:shrink-0" >
                        <div className="flex gap-2" >

                            <h2 className="mt-8 font-medium">Members</h2>
                        </div>
                        <ul className="mt-3 divide-y min-w-full rounded-xl border backdrop-blur-3xl  shadow-xl bg-gray/10">
                            {members.map((m) => (
                                <li key={m.userId} className="flex items-start justify-between p-3">
                                    <User />
                                    <div className=" flex flex-col items-center justify-center" >

                                        <p className="font-medium truncate">{m.name}</p>
                                        {m.email && (<p className="truncate text-sm text-black">{m.email}</p>)}
                                    </div>
                                    {isleader && m.role !== 'leader' ? (
                                        <select value={capitalize(m.role)} className="shrink-0 rounded-lg border px-2 py-1 text-sm" onChange={(e) => changeRole(m.userId, e.target.value as Role)}>
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    ) : (
                                        <span className="shrink-0 text-sm font-bold text-gray-900">{capitalize(m.role)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div >
                    <MeetingsSection projectId={project.id} isLeader={isleader} />
                </div>
            </div>
        </div>
    )
}