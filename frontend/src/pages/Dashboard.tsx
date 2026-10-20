
import Navbar from '../Components/Navbar'
import { useEffect,useState,type ComponentProps } from 'react'
import{Link} from 'react-router-dom';
import { useAuthStore } from '../store/authstore';
import { UseProjectStore } from '../store/projectstore';
type FormSubmitEvent=Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
const categories=['research','projects','hackathon','other'];
export default function Dashboard(){
    const {projects,loading,fetchProjects,createProject}=UseProjectStore();
    const [form,setForm]=useState({name:'',description:'',category:''});
    const [error,setError]=useState('');
    const [creating,setCreating]=useState(false);
    
    useEffect(()=>{
        fetchProjects();
    },[fetchProjects])
    async function onCreate(e:FormSubmitEvent){
        e.preventDefault();
        setError('');
        setCreating(true);
        try{
            await createProject(form);
            setForm({name:'',description:'',category:'projects'});
        }
        catch(err){
            setError(err instanceof Error?err.message:'Could not create project');
        }
        finally{
            setCreating(false);
        }
    }
    const input='w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
    return (
        <div className='relative mx-auto max-w-3xl p-8'>
            <Navbar/>
            <h1>ThinkLoom</h1>
            <form onSubmit={onCreate} className='mt-8 space-y-3 rounded-2xl bg-white p-6 shadow'>
                <h2 className='font-medium'>New Project</h2>
                <input type="text" className={input} placeholder='project name' value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} />
                <input type="text" className={input} placeholder='project description' value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
                <select className={input} value={form.category} onChange={(e)=>setForm({...form, category:e.target.value})}>
                    {categories.map((c)=>(
                        <option value={c} key={c}>
                            {c}
                        </option>
                    ))}
                </select>
                {error && <p className='text-sm text-red-600'>{error}</p> }
                <button disabled={creating} className='rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60'>{creating?'Creating..':'Create Project'}</button>
            </form>
            <h2 className='mt-10 font-medium'>Your Projects</h2>
            {loading?(
                    <p className='mt-3 text-gray-500'>Loading....</p>
                ):
                projects.length===0?(
                    <p className='mt-3 text-gray-500'>No projects yet</p>
                ):(
                    <ul className='mt-3 space-y-2'>
                        {
                            projects.map((p)=>(
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
    )
}