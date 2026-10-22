import { createSocket } from "../lib/socket";
import { api, apiUrl } from "../lib/api";
import { useState, useEffect, useCallback, type ComponentProps, type ChangeEvent } from "react";
import IdeaFileViewer, { type Attachment, setsize } from "./IdeaFileViewer";
type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
export interface PreviewData{
  url:string;
  attachment:Attachment;
  title:string;
  source:{ideaId:string; title:string; author:string};
}
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
export default function IdeasPanel({ projectId, meetingId, isLeader, previewId,setPreviewId,onPreview }:
   { projectId: string; meetingId: string; isLeader: boolean; previewId:string|null; setPreviewId:(id:string|null)=>void; onPreview:(p:PreviewData|null)=>void }) {
  const base = `/projects/${projectId}/meetings/${meetingId}/ideas`;
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [presentedId, setPresentedId] = useState<string | null>(null);
  const [showForm,setShowForm]=useState(false);
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
    try{
      const p= await api<{ideaId:string |null}>(`${base}/present`);
      setPresentedId(p.ideaId);
      if(!isLeader){
      setPreviewId(p.ideaId);}
    }
    catch{
      
    }
  }, [base,isLeader]);
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
    socket.on('idea:present',({ideaId}:{ideaId:string|null})=>{
      setPresentedId(ideaId);
      setPreviewId(ideaId);
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
  async function tooglePresent(idea:Idea){
    setError('');
    try{
      await api(`${base}/present`,{
        method:'POST',
        body:JSON.stringify({ideaId:presentedId===idea.id?null:idea.id})
      })
    }
    catch(err){
      setError(err instanceof Error ? err.message : 'Could not present the data');
    }
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
  useEffect(()=>{
    const i=ideas.find((x)=>x.id===previewId);
    onPreview(i &&i.attachment ?{
      url:apiUrl(`${base}/${i.id}/file`),attachment:i.attachment,title:i.title,
        source:{ideaId:i.id, title:i.title, author:i.authorName},
      }:null);
  },[ideas,previewId,base,onPreview]);
  const shown=byVotes?[...ideas].sort((a,b)=>b.votes-a.votes):ideas;
  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
  return (
    <section >
      <div className="flex items-center justify-between" >
        <h2 className="font-semibold text-gray-200">Ideas</h2>
        <div className="flex gap-2 " >
        <button className="rounded-lg border px-2 py-1 text-xs text-white hover:bg-gray-200 hover:text-gray-800  " onClick={() => setByVotes((v) => !v)}>{byVotes ? 'by time' : 'by votes'}</button>
        <button className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700" onClick={()=>setShowForm(true)} >+ Add ideas</button>
      </div>
      </div>
      {showForm && (
         <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <form className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl" onSubmit={onSubmit}>
          <h3 className="font-semibold">Submit an idea</h3>
          <input className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-100" type="file"
           key={fileKey} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx" onChange={onPickFile} />
          <p className="text-xs text-gray-500">{`Image, pdf or docx up to ${MAX_FILE_MB}MB`}</p>
          <input type="text" className={input} value={form.title} placeholder="Idea's title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={`${input} min-h-20`} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60" disabled={submitting || !file}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
      )}
      {!showForm && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {loading ? (
      <p className="mt-3 text-sm text-gray-500">Loading ideas...</p>
    ) : shown.length === 0 ? (
      <p className="mt-3 text-sm text-gray-500">No ideas yet</p>
    ) : (
      <ul className="mt-3 space-y-2">
        {shown.map((idea) => {
          const open = previewId === idea.id;
          return (
            <li key={idea.id} className={`rounded-xl border bg-white p-3 ${presentedId === idea.id ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{idea.title}</p>
                  {idea.description && <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs text-gray-600">{idea.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">by {idea.authorName}</p>
                </div>
                <button onClick={() => toggleVote(idea)} disabled={busyId === idea.id}
                  className={`shrink-0 rounded-lg border px-2 py-1 text-sm font-medium disabled:opacity-60 ${idea.myVote ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
                  ▲ {idea.votes}
                </button>
              </div>
              {idea.attachment && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-500">{KIND_LABEL[idea.attachment.kind]} · {setsize(idea.attachment.size)}</span>
                  {isLeader ? (
                    <>
                      <button className="text-indigo-600 hover:underline" onClick={() => setPreviewId(open ? null : idea.id)}>
                        {open ? 'Hide preview' : 'Preview'}
                      </button>
                      <button className="font-medium text-indigo-700 hover:underline" onClick={() => tooglePresent(idea)}>
                        {presentedId === idea.id ? 'Stop presenting' : 'Present to everyone'}
                      </button>
                    </>
                  ) : (
                    presentedId === idea.id && <span className="font-medium text-indigo-600">Being presented now</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    )}
 
    </section>
  )
}