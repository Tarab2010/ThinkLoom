import { createSocket } from "../lib/socket";
import { api, apiUrl } from "../lib/api";
import { CloudUpload,PaperclipIcon } from "lucide-react";
import { useState, useEffect,useRef, useCallback, type ComponentProps, type ChangeEvent } from "react";
import { type Attachment, setsize } from "./IdeaFileViewer";
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
  const fileInput = useRef<HTMLInputElement>(null);
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
      setShowForm(false);
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
  const input = 'w-full rounded-lg border border-gray-300 text-white px-3 py-2 outline-none focus:border-gray-100';
  return (
    <section >
      <div className="flex items-center justify-between" >
        <h2 className="font-semibold text-gray-200">Ideas</h2>
        <div className="flex gap-2 " >
        <button className="rounded-lg border px-2 py-1 text-xs text-white hover:bg-gray-200 hover:text-gray-800  " onClick={() => setByVotes((v) => !v)}>{byVotes ? 'By Time' : 'By Votes'}</button>
        <button className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700" onClick={()=>setShowForm(true)} >+ Add ideas</button>
      </div>
      </div>
      {showForm && (
         <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <form className="w-full max-w-md space-y-3 rounded-xl border border-amber-50 bg-black p-5 shadow-xl" onSubmit={onSubmit}>
          <h3 className="font-semibold text-amber-50">Submit an idea</h3>
          <button
  type="button"
  onClick={() => fileInput.current?.click()}
  className="inline-flex items-center gap-2 rounded-xl hover:bg-gray-200 bg-white p-2 text-sm"
>
  <PaperclipIcon className="h-4 w-4" />
  {file ? 'Change file' : 'Choose file'}
</button>
{file && <p className="truncate text-xs text-amber-50">{file.name}</p>}
<input ref={fileInput} key={fileKey} type="file" className="hidden" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.docx" onChange={onPickFile}/>
          <p className="text-xs text-gray-100">{`Image, pdf or docx up to ${MAX_FILE_MB}MB`}</p>
          <input type="text" className={input} value={form.title} placeholder="Idea's Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={`${input} min-h-20`} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border bg-white text-black px-3 hover:bg-black hover:text-white py-1.5 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rounded-lg bg-white text-black px-4 py-1.5 text-sm border border-white font-medium hover:text-white hover:bg-black disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black  disabled:opacity-60" disabled={submitting || !file}>
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
                  {idea.description && <p className="mt-1 line-clamp-2 whitespace-pre-wrap warp-break-word text-xs text-gray-600">{idea.description}</p>}
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