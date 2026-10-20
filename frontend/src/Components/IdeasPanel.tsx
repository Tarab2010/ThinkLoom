import { createSocket } from "../lib/socket";
import { api, apiUrl } from "../lib/api";
import { useState, useEffect, useCallback, type ComponentProps, type ChangeEvent } from "react";
import IdeaFileViewer, { type Attachment, formatSize } from "./IdeaFileViewer";
type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
interface Idea {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  attachment: Attachment|null;
  votes: number;
  myVote: boolean;
}
const MAX_FILE_MB = 10;
const KIND_LABEL = { image: 'Image', pdf: 'Pdf', docx: 'Word' } as const
export default function IdeasPanel({ projectId, meetingId, isLeader }: { projectId: string; meetingId: string; isLeader: boolean }) {
  const base = `/projects/${projectId}/meetings/${meetingId}/ideas`;
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([])
  const [byVotes, setByVotes] = useState(false);

  const load = useCallback(async () => {
    try {
      setIdeas(await api<Idea[]>(base));
      setError('');
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load ideas');
    }
    finally {
      setLoading(false);
    }
  }, [base]);
  useEffect(() => {
    const socket = createSocket();
    socket.on('connect', () => {
      socket.emit('ideas:subscribe', { projectId, meetingId }, () => load());
    });
    socket.on('idea:new', (idea: Omit<Idea, 'myVote'>) => {
      setIdeas((prev) => prev.some((i) => i.id === idea.id) ? prev : [...prev, { ...idea, myVote: false }]);
    });
    socket.on('idea:votes', ({ ideaId, votes }: { ideaId: string; votes: number }) => {
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, votes } : i)));
    })
    load();
    socket.connect();
    return () => { socket.disconnect(); }
  }, [projectId, meetingId, load]);
  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_FILE_MB * 1024 * 1024) {
      setError('this file is too large');
      setFile(null);
      setFileKey((k) => k + 1);
      return;
    }
    setError('');
    setFile(picked);
  }
  async function onSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    if (!file) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', form.title);
      body.append('description', form.description);
      const created = await api<Idea>(base, { method: 'POST', body, headers: {} });
      setIdeas((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev,created]));
      setForm({ title: '', description: '' });
      setFile(null);
      setFileKey((k) => k + 1);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the data');
    }
    finally { setSubmitting(false) }
  }
  async function toggleVote(idea: Idea) {
    setError('');
    setBusyId(idea.id);
    try {

      const res = await api<{ votes: number, myVote: boolean }>(`${base}/${idea.id}/vote`, {
        method: idea.myVote ? 'DELETE' : 'PUT',
      });
      setIdeas((prev) => (prev.map((i) => (i.id === idea.id) ? { ...i, votes: res.votes, myVote: res.myVote } : i)));
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your vote');
    }
    finally { setBusyId(null) }
  }
  const shown=byVotes?[...ideas].sort((a,b)=>b.votes-a.votes):ideas;
  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between" >
        <h2 className="font-medium">Ideas</h2>
        <button className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-300  " onClick={() => setByVotes((v) => !v)}>{byVotes ? 'Show in submitted order' : 'sort by votes'}</button>
      </div>
      <p className="text-sm text-gray-500 mt-1" >Submit your idea as a file or image </p>
      <form className="mt-3 space-y-3 rounded-xl border bg-white p-4" onSubmit={onSubmit}>
        <div>
          <input className='block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-1.5 file:text-sm  hover:file:bg-gray-100' type="file" key={fileKey} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx" onChange={onPickFile} />
          <p className="text-xs mt-1 text-gray-100" >{`Image pdf or docx upto size of ${MAX_FILE_MB}mb`}</p>
        </div>
        <input type="text" className={input} value={form.title} placeholder="Idea's Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className={`${input} min-h-16`} name="" id="" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}></textarea>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font:medium text-white hover:bg-indigo-700 disabled:opacity-60" disabled={submitting || !file}>{submitting ? 'Submitting...' : 'Submit Idea'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-3 text-gray-500">Loading Ideas...</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500" >No ideas yet </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {
            shown.map((idea) => {
              const open = previewId === idea.id
              const fileUrl = apiUrl(`${base}/${idea.id}/file`);
              return (
                <li className="rounded-xl border bg-white p-4" key={idea.id}>
                  <div className="flex items-start justify-between gap-4" >
                    <div className="min-w-0" >
                      <p className="font-medium" >{idea.title}</p>
                      {idea.description && (
                        <p className="mt-1 whitespace-pre-wrap brak-words text-sm text-gray-700" >{idea.description}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500" >by {idea.authorName} .{new Date(idea.createdAt).toLocaleString()}</p>
                      {idea.attachment &&(
                        <p className="mt-2 text-xs text-gray-700">
                          {KIND_LABEL[idea.attachment.kind]} .{idea.attachment.name}(
                            {formatSize(idea.attachment.size)}) .{''}
                          <button className="text-indigo-600 hover:underline" onClick={()=>setPreviewId(open?null:idea.id)} >
                            {open?'Hide Preview':'Preview'}
                          </button>
                        </p>
                      )}
                    </div>
                    <button
                    onClick={()=>toggleVote(idea)}
                    disabled={busyId===idea.id}
                    className={`shrink-0 rounded-lg px-3 py-2 border text-sm font-medium disabled:opacity-60 ${idea.myVote?'border-indigo-600 bg-indigo-600 text-white':'hover:bg-gray'} `}
                    >
                      ▲ {idea.votes}
                    </button>
                  </div>
                  {open && idea.attachment &&(
                    <div className="mt-3" >
                      <IdeaFileViewer key={fileUrl} url={fileUrl} attachment={idea.attachment} canCrop={isLeader} />

                    </div>
                  )}
                </li>
              )
            }
            )
          }
        </ul>
      )
      }
    </section>
  )
}