import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatduration, formatWhen, statusStyle, type meetingstatus } from "../lib/meetingTime";
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
        <div className="flex h-screen flex-col bg-gray-600">
            <header className="flex flex-wrap items-center gap-3 bg-gray-700 px-4 py-2 border-b border-transparent rounded  ">
                <Link to={`/projects/${projectId}`} className="text-sm text-gray-400 hover:underline hover:text-white">← Project</Link>
                <div className="min-w-0">
                    <h1 className="truncate font-semibold text-gray-200">{meeting.title}</h1>
                    <p className="truncate text-xs text-gray-300">{meeting.topic} · {formatWhen(meeting.startsAt, meeting.duration)} · {formatduration(meeting.duration)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[meeting.status]}`}>{meeting.status}</span>
                <span className="text-xs text-gray-200">You: {meeting.myRole}</span>

                <div className="ml-auto flex items-center gap-2">
                    {info && <span className="text-xs text-green-700">{info}</span>}
                    {isLeader && meeting.status === 'live' && other.length > 0 && (
                        <div className="relative flex items-center gap-2">
                            <button onClick={() => setPickerOpen((o) => !o)} className="w-56 truncate rounded-lg border bg-white px-3 py-1.5 text-left text-sm">
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
                            <button onClick={importCanvas} disabled={!fromId || importing} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">
                                {importing ? 'Copying...' : 'Copy to canvas'}
                            </button>
                        </div>
                    )}
                    {preview && meeting.status === 'live' && (
                        <>
                            <span className="max-w-48 truncate text-sm text-gray-700">Previewing: {preview.title}</span>
                        </>
                    )}
                    {isLeader && meeting.status === 'live' && (
                        <button onClick={endMeeting} disabled={ending} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                            {ending ? 'Ending...' : 'End meeting'}
                        </button>
                    )}
                    {meeting.status === 'live' && projectId && meetingId && (
                        <CallPannel  key={`${meetingId}-${ideasKey}`} projectId={projectId} meetingId={meetingId} isLeader={isLeader} startcall={true} />
                    )}
                </div>
            </header>

            {error && <p className="bg-red-50 px-4 py-1 text-sm text-red-600">{error}</p>}
            {meeting.status === 'ended' && <p className="bg-amber-50 px-4 py-1 text-sm text-amber-800">This meeting has ended. Saved canvas (view only).</p>}

            <div className="flex min-h-0 flex-1">
                {preview && meeting.status === 'live' && (
                    <div className="w-1/2 overflow-auto border-r transition duration-300 ease-in-out bg-gray-800 p-3">
                        {isLeader && <button onClick={endPreview} className="rounded-lg border border-indigo-600 px-3 py-1.5 text-sm text-indigo-700  hover:border-white hover:bg-indigo-600 hover:text-white">End preview</button>}
                        <IdealFileViewer key={preview.url} url={preview.url} attachment={preview.attachment} canCrop={isLeader} source={preview.source} />
                    </div>
                )}

                <div className="min-w-0 flex-1 overflow-auto p-3">
                    <div>
                        {meeting.status === 'live' && !preview && (
                            <button onClick={() => setSidebar((prev) => !prev)} title={sidebar ? 'hide ideas' : 'show ideas'} className="absolute right-0 top-1/2 z-20 -translate-0.5 rounded-l-lg border border-r-0 bg-gray-800 px-1.5 py-4  text-gray-100 hover:bg-gray-200 hover:text-black " >
                                {sidebar ? '->' : '<-'}
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
                                    Onremoved={() => navigate(`/projects/${projectId}`)}
                                />
                        )}
                    </div>
                </div>
                {projectId && meetingId && meeting.status === 'live' && (
                    <aside className={`shrink-0 overflow-hidden border-l bg-white transition-[width] duration-300 ease-in-out ${sidebar && !preview ? 'w-80' : 'w-0 border-l-0'
                        }`}>
                        <div className="h-full w-80 bg-gray-800 overflow-y-auto p-3" >
                            <IdeasPanel key={`${meetingId}-${ideasKey}`} projectId={projectId} meetingId={meetingId}
                                isLeader={isLeader} previewId={previewId} setPreviewId={setPreviewId} onPreview={setPreview} />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    )
}