import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { User,Clock,Calendar } from 'lucide-react'
import { formatduration, formatWhen, type meetingstatus } from "../lib/meetingTime";
import type { Role } from "../store/projectstore";
import CanvasBoard from "../Components/CanvasBoard";
import IdeasPanel, { type PreviewData } from "../Components/IdeasPanel";
import IdealFileViewer from "../Components/IdeaFileViewer";
import CallPannel from "../Components/CallPannel";
import ArchivedCanvas from "../Components/ArchivedCanvas";
interface MeetingDetail {
    id: string,
    title: string,
    topic: string,
    duration: number,
    projectId: string,
    startsAt: string,
    status: meetingstatus,
    startedFrom: string | null,
    myRole: Role,
    endsAt: string,
}

interface Member {
    userId: string,
    name: string,
    role: Role,
    email?: string
}
export default function MeetingPage() {
    const { projectId, meetingId } = useParams();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [ending, setEnding] = useState(false);
    const [other, setOthers] = useState<{ id: string, title: string }[]>([]);
    const [fromId, setFromId] = useState('');
    const [importing, setImporting] = useState(false);
    const [info, setInfo] = useState('');
    const [ideasKey, setIdeasKey] = useState(0);
    const [sidebar, setSidebar] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const navigate = useNavigate();
    const base = `/projects/${projectId}/meetings/${meetingId}`;
    useEffect(() => {
        if (preview) {
            setSidebar(false);
        }
    }, [preview])
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [mt, mb] = await Promise.all([
                    api<MeetingDetail>(base),
                    api<Member[]>(`${base}/members`)
                ]);
                if (!cancelled) {
                    setMeeting(mt);
                    setMembers(mb);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Could not load the meeting')
                }
            }
        })();
        return () => {
            cancelled = true;
        }
    }, [base]);
    useEffect(() => {
        if (!meeting || meeting.status !== 'live') {
            return;
        }
        const ms = new Date(meeting.endsAt).getTime() - Date.now();
        const t = window.setTimeout(() => navigate(`/projects/${projectId}`), Math.max(ms, 0))
        return () => window.clearTimeout(t);
    }, [meeting?.status, meeting?.endsAt, projectId, navigate])
    const isLeader = meeting?.myRole === 'leader';
    useEffect(() => {
        if (!isLeader) {
            return;
        }
        api<{ id: string, title: string }[]>(`/projects/${projectId}/meetings`)
            .then((list) => setOthers(list.filter((m) => m.id !== meetingId)))
            .catch((err) => { console.error('problem ho gayi re', err) });
    }, [projectId, meetingId, isLeader]);
    async function endMeeting() {
        if (!window.confirm('End this meeting for everyone')) {
            return;
        }
        setEnding(true);
        setError('');
        try {
            await api(`${base}/end`, { method: 'POST' });
            navigate(`/projects/${projectId}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not end this meeting')
        }
        finally {
            setEnding(false);
        }
    }
    function capitalize(word:string):string{
        return word.charAt(0).toUpperCase()+word.slice(1);
    }
    async function changeRole(userId: string, role: Role) {
        setError('');
        try {
            await api(`${base}/members/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ role }),
            })
            setMembers((ms) => ms.map((m) => m.userId === userId ? { ...m, role } : m))
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change role');
        }
    }
    if (error && !meeting) {
        return (
            <div className="p-8" >
                <p className="text-red-600">{error}</p>
                <Link className="mt-3 inline-block text-indigi-600 hover:underline" to={`/projects/${projectId}`} >Back to Project</Link>
            </div>
        )
    }
    if (!meeting) {
        return (
            <p className="p-8 text-gray-500">Loading...</p>
        )
    }

    async function endPreview() {
        setPreviewId(null);
        try {
            await api(`${base}/ideas/present`, { method: 'POST', body: JSON.stringify({ ideaId: null }) })
        }
        catch { }
    }
    async function importCanvas() {
        if (!fromId) {
            return;
        }
        setImporting(true);
        setInfo('');
        setFromId('');
        setError('');
        try {
            const r = await api<{ added: number }>(`${base}/import-canvas`, { method: 'POST', body: JSON.stringify({ fromMeetingId: fromId }), });
            setInfo(`${r.added} items copied to this canvas`)
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not copy the canvas');
        }
        finally {
            setImporting(false);
        }
    }
    const fromTitle = other.find((m) => m.id === fromId)?.title;
    return (
        <div className="flex h-dvh flex-col bg-gray-600 ">
            <header className="flex flex-wrap items-center gap-2 border-b border-transparent bg-[#20242D] px-3 py-2 md:gap-3 md:px-4">
                <Link to={`/projects/${projectId}`} className="text-sm bg-gray-600 border border-white hover:border-black p-2 rounded-xl text-white hover:underline ">← Project</Link>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4" >
                        <h1 className="truncate font-semibold text-gray-200">{meeting.title}</h1>
                        <div className="flex flex-col" >
                            <div className="flex" >
                                <User className="h-4 w-4 text-white " />
                                <span className="text-xs text-gray-200">  You: {capitalize(meeting.myRole)}</span>
                            </div>
                            <div className="flex gap-1" >
                                <Calendar className="text-white truncate text-xs h-4 w-4" />
                            <p className="truncate text-xs text-white">{formatWhen(meeting.startsAt, meeting.duration)}  </p>
                            <Clock className="text-sm text-white h-4 w-4" />
                            <p className="text-white truncate text-xs" >{formatduration(meeting.duration)}</p>
                        </div>
                        </div>
                        <div id="status-slot" className="flex items-center" ></div>
                    </div>
                    <div>
                        <p className="hidden truncate text-sm text-white md:block" >{meeting.topic}</p>
                    </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {info && <span className="text-xs text-green-700">{info}</span>}
                    {isLeader && meeting.status === 'live' && other.length > 0 && (
                        <div className="relative hidden  items-center gap-2 md:flex ">
                            <button onClick={() => setPickerOpen((o) => !o)} className="w-40 lg:w-56 truncate rounded-lg border border-white text-white px-3 py-1.5 text-left text-sm">
                                {fromTitle ? `From: ${fromTitle}` : 'Choose earlier meeting canvas'}
                            </button>
                            {pickerOpen && (
                                <ul className="absolute left-0 max-h-64 overflow-y-auto top-9 z-30 w-56 rounded-lg border bg-white shadow">
                                    {other.map((m) => (
                                        <li key={m.id}>
                                            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100" onClick={() => { setFromId(m.id); setPickerOpen(false); }}>{m.title}</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <button onClick={importCanvas} disabled={!fromId || importing} className="rounded-lg disabled:bg-[#292D36] bg-indigo-800 px-3 py-1.5 text-sm text-white disabled:opacity-60">
                                {importing ? 'Copying...' : 'Copy to canvas'}
                            </button>

                        </div>
                    )}
                    {preview && meeting.status === 'live' && (
                        <>
                            <span className="max-w-48 truncate text-sm text-white">Previewing: {preview.title}</span>
                        </>
                    )}
                    {isLeader && meeting.status === 'live' && (
                        <button onClick={endMeeting} disabled={ending} className="rounded-lg bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                            {ending ? 'Ending...' : 'End meeting'}
                        </button>
                    )}
                    {meeting.status === 'live' && projectId && meetingId && (
                        <CallPannel key={`${meetingId}-${ideasKey}`} projectId={projectId} meetingId={meetingId} isLeader={isLeader} startcall={true} />
                    )}
                    <div className="relative" id="people-slot" ></div>
                </div>
            </header>

            {error && <p className="bg-red-50 px-4 py-1 text-sm text-red-600">{error}</p>}
            {meeting.status === 'ended' && <p className="bg-amber-50 px-4 py-1 text-sm text-amber-800">This meeting has ended. Saved canvas (view only).</p>}

            <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                {preview && meeting.status === 'live' && (
                    <div className="w-full lg:w-1/2 overflow-auto border-r p-0 transition duration-300 ease-in-out z-20 bg-gray-800 ">
                        <IdealFileViewer endpreview={endPreview} key={preview.url} url={preview.url} attachment={preview.attachment} canCrop={isLeader} source={preview.source} />
                    </div>
                )}

                <div className=" relative min-w-0 flex-1 min-h-[60vh] p-1 md:p-3">
                    <div className="h-full" >
                        {meeting.status === 'live' && !preview && (
                            <button onClick={() => setSidebar((prev) => !prev)} title={sidebar ? 'hide ideas' : 'show ideas'} className="absolute max-sm:fixed max-sm:z-40  right-0 top-1/2 z-20 -translate-1/2 rounded-l-lg border border-r-0 bg-[#20242D] px-1.5 py-4  text-white text-2xl font-bold hover:bg-gray-200 hover:text-black " >
                                {sidebar ? '>' : '<'}
                            </button>
                        )}
                        {projectId && meetingId && (
                            meeting.status === 'ended'
                                ? <ArchivedCanvas key={meetingId} projectId={projectId} meetingId={meetingId} />
                                : <CanvasBoard
                                    key={meetingId}
                                    projectId={projectId}
                                    meetingId={meetingId}
                                    members={members}
                                    onChangeRole={changeRole}
                                    onRoleChange={(r) => setMeeting((m) => (m ? { ...m, myRole: r } : m))}
                                    onEnded={() => navigate(`/projects/${projectId}`)}
                                    onAdmitted={() => setIdeasKey((k) => k + 1)}
                                    Onremoved={(msg) => navigate(`/projects/${projectId}`,{state:{notice:msg??'You were removed from the meetinng'}})}
                                />
                        )}
                    </div>
                </div>
                {projectId && meetingId && meeting.status === 'live' && (
                    <aside className={`shrink-0 overflow-hidden border-l bg-white transition-[width] duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 ${sidebar && !preview ? 'w-80 max-w-[85vw]' : 'w-0 border-l-0'}`}>
                        <div className="h-full w-80 max-w-[85vw] bg-[#20242D] overflow-y-auto p-3" >
                            <IdeasPanel key={`${meetingId}-${ideasKey}`} projectId={projectId} meetingId={meetingId}
                                isLeader={isLeader} previewId={previewId} setPreviewId={setPreviewId} onPreview={setPreview} />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    )
}