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
    const [joinError, setjoinError] = useState('');
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
        setjoinError('');
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
            setjoinError(err instanceof Error ? err.message : 'Could not find the project');
        }
        finally {
            setjoining(false);
        }
    }

    const { logout } = useAuthStore();
    const input = 'w-full rounded-lg bg-white border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
    return (
        <div className=' min-h-screen bg-gray-200 p-4 sm:p-8 bg-linear-to-br from-purple-500 to-white  '>
            <div className='mx-auto max-w-5xl ' >
                <div className='flex items-center justify-between gap-3' >
                    <div className='flex flex-col' >
                        <h1 className=' truncate font-bold text-2xl' >Think<span className='text-indigo-600' > Loom</span></h1>
                        <span className='text-sm' >Ideas work better together</span>
                    </div>
                    <div className='flex shrink-0 items-center gap-2' >
                        <div className=" flex w-auto h-auto p-1 text-center shrink-0 justify-center rounded-full font-medium uppercase bg-indigo-800 text-white">{(user ? user.name.split(' ')[0] : 'guest')}</div>
                        <button onClick={logout} className="rounded-2xl bg-black px-3 py-2 text-sm text-amber-100 hover:bg-gray-500 hover:underline">Log Out</button>
                    </div>
                </div>
                <div className='mt-6 grid gap-4 md:grid-cols-2 md:gap-6' >
                    <form onSubmit={onCreate} className='space-y-3 h-auto shadow-2xl rounded-2xl bg-transparent backdrop-blur-3xl border shadow-stone-100 border-amber-100 p-4 hover:border-black sm:p-6'>
                        <div className='flex flex-col' >
                            <h2 className='font-bold text-lg'>New Project</h2>
                            <span className='text-sm' >Start the Journey of your new Ideas</span>
                        </div>
                        <label htmlFor="">Name</label>
                        <input type="text" className={input} placeholder='project name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <label htmlFor="">Description</label>
                        <input type="text" className={input} placeholder='project description' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                            {categories.map((c) => (
                                <option value={c} key={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                        {error && <p className='text-sm text-red-600'>{error}</p>}
                        <button disabled={creating} className='w-full rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto'>{creating ? 'Creating..' : '+ Create Project'}</button>
                    </form>
                    <form onSubmit={onJoin} className=' space-y-3 h-auto shadow-2xl rounded-2xl bg-transparent backdrop-blur-3xl border shadow-stone-100 border-amber-100 p-4 hover:border-black sm:p-6'>
                        <div className='flex flex-col' >
                            <h2 className='font-bold text-xl'>Join Project</h2>
                            <span className='text-sm' >Join an ongoing planning</span>
                        </div>
                        <label htmlFor="">Invite Link</label>
                        <input type="text" className={input} placeholder='paste you project link here' value={link} onChange={(e) => setLink(e.target.value)} />
                        {joinError && <p className='text-sm text-red-600'>{joinError}</p>}
                        <button disabled={joining} className='rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-60'>{joining ? 'Joining..' : 'Join Project ->'}</button>
                    </form>
                </div>
                <h2 className='mt-8 text-xl font-medium'>Your Projects</h2>
                {loading ? (
                    <p className='mt-3 text-gray-500'>Loading....</p>
                ) :
                    projects.length === 0 ? (
                        <p className='mt-3 text-gray-500'>No projects yet</p>
                    ) : (
                        <ul className='mt-3 space-y-2'>
                            {
                                projects.map((p) => (
                                    <li key={p.id} className='min-w-0 ' >
                                        <Link className='flex min-w-0 item-center bg-[#D5C2F0] shadow-stone-100 shadow-2xl justify-between rounded-xl border backdrop-blur-3xl border-white  p-4 hover:border-black' to={`/projects/${p.id}`}>
                                            <div className='flex-8 flex-col  justify-between' >
                                                <div className='min-w-0 flex flex-col ' >
                                                    <h2 className='font-bold text-xl '>{p.name}</h2>
                                                    <p className='line-clamp-3 text-sm wrap-anywhere '>{p.description}</p>
                                                </div>
                                                <div className='flex gap-7' >
                                                    <p className='text-sm overflow-clip font-semibold text-rose-800 '>{p.category}</p>

                                                </div>
                                            </div>
                                            <div className='flex justify-between items-end flex-2 flex-col ' >
                                                <span className={` rounded-full h-auto w-1/2 max-w-full text-center shrink-0  text-xs px-3 py-1 font-medium ${p.role === 'leader' ? 'text-green-700 bg-green-200' : p.role === 'editor' ? 'text-blue-600 ' : 'text-orange-700 bg-orange-200'}`}>{p.role}</span>
                                                <button className='h-9 font-bold  rounded-lg p-1 text-indigo-600 hover:text-white hover:bg-indigo-600' >{`Open->`}</button>
                                            </div>
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