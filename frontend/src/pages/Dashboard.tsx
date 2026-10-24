import { useEffect, useState, type ComponentProps } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authstore';
import { UseProjectStore } from '../store/projectstore';
import { api } from '../lib/api';
type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
const categories = ['research', 'projects', 'hackathon', 'other'];
export default function Dashboard() {
    const { projects, loading, fetchProjects, createProject } = UseProjectStore();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', description: '', category: '' });
    const [link, setLink] = useState('');
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [joining, setjoining] = useState(false);
    const user = useAuthStore((s) => s.user);
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects])
    function pass(link: string) {
        return link.split('/join/')[1].trim();
    }
    async function onCreate(e: FormSubmitEvent) {
        e.preventDefault();
        setError('');
        setCreating(true);
        try {
            await createProject(form);
            setForm({ name: '', description: '', category: 'projects' });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create project');
        }
        finally {
            setCreating(false);
        }
    }
    async function onJoin(e: FormSubmitEvent) {
        e.preventDefault();
        setError('');
        const code = pass(link);
        if (!code) {
            setError('provide a link first');
            return;
        }
        setjoining(true);
        try {
            const project = await api<{ id: string }>('/projects/join', {
                method: 'POST',
                body: JSON.stringify({ invitecode: code }),
            })
            navigate(`/projects/${project.id}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Could not find the project');
        }
        finally {
            setjoining(false);
        }
    }

    const { logout } = useAuthStore();
    const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
    return (
        <div className=' min-h-screen bg-gray-200 p-4 sm:p-8'>
            <div className='mx-auto max-w-5xl ' >
                <div className='flex items-center justify-between gap-3' >
                    <h1 className=' truncate font-bold text-xl' >ThinkLoom</h1>
                    <div className='flex shrink-0 items-center gap-2' >
                        <div className="bg-gray-300 flex w-9 h-9 item-center justify-center rounded-full font-medium uppercase text-white">{(user ? user.name : 'guest')[0]}</div>
                        <button onClick={logout} className="rounded-2xl bg-black px-3 py-2 text-sm text-amber-100 hover:bg-gray-500 hover:underline">Log Out</button>
                    </div>
                </div>
                <div className='mt-6 grid gap-4 md:grid-cols-2 md:gap-6' >
                <form onSubmit={onCreate} className='space-y-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-xl hover:border-indigo-400 sm:p-6'>
                <h2 className='font-medium'>New Project</h2>
                <input type="text" className={input} placeholder='project name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input type="text" className={input} placeholder='project description' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((c) => (
                        <option value={c} key={c}>
                            {c}
                        </option>
                    ))}
                </select>
                {error && <p className='text-sm text-red-600'>{error}</p>}
                <button disabled={creating} className='w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto'>{creating ? 'Creating..' : 'Create Project'}</button>
            </form>
            <form onSubmit={onJoin} className='mt-8 space-y-3 shadow-2xl rounded-2xl bg-white border border-amber-100 p-4 hover:border-indigo-400 sm:p-6'>
                <h2 className='font-medium'>Join Project</h2>
                <input type="text" className={input} placeholder='paste you project link here' value={link} onChange={(e) => setLink(e.target.value)} />

                {error && <p className='text-sm text-red-600'>{error}</p>}
                <button disabled={joining} className='rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60'>{joining ? 'Joining..' : 'Join Project'}</button>
            </form>
            </div>
            <h2 className='mt-8 font-medium'>Your Projects</h2>
            {loading ? (
                <p className='mt-3 text-gray-500'>Loading....</p>
            ) :
                projects.length === 0 ? (
                    <p className='mt-3 text-gray-500'>No projects yet</p>
                ) : (
                    <ul className='mt-3 space-y-2'>
                        {
                            projects.map((p) => (
                                <li key={p.id}>
                                    <Link className='flex item-center justify-between rounded-xl border bg-white p-4 hover:border-indigo-400' to={`/projects/${p.id}`}>
                                        <div>
                                            <p className='font-medium'>{p.name}</p>
                                            <p className='text-sm text-gray-500'>{p.category}
                                                {p.description}
                                            </p>
                                        </div>
                                        <span className='rounded-full bg-indigo-50 text-xs px-3 py-1 font-medium text-indigo-700'>{p.role}</span>
                                    </Link>
                                </li>
                            ))
                        }
                    </ul>
                )
            }
            </div>
        
        </div>
    )
}