import { useState, type ComponentProps } from 'react';
import { Navigate, Link,useLocation } from "react-router-dom";
import { useAuthStore } from '../store/authstore';
import { Users,Lightbulb,MessagesSquare,NetworkIcon,LayersPlusIcon,Combine } from 'lucide-react';
type FormSubmitEvent=Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
    const issignup = mode === 'signup';
    const { user, login, signup } = useAuthStore();
    const from=(useLocation().state as{from?:string}|null)?.from ??'/';
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    if (user) {
        return <Navigate to={from} replace />
    }
    async function OnSubmit(e:FormSubmitEvent){
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try{
            if(issignup){
                await signup(form.name,form.email,form.password);
            }
            else{
                await login(form.email,form.password);
            }
        }
        catch(err){
            setError(err instanceof Error ? err.message:"Something went wrong")
        }
        finally{
            setSubmitting(false);
        }}
        const input='w-full rounded-lg border border-gray-300 px-3 bg-white py-2 outline-none focus:border-indigo-500';
    return (
        <div className="flex gap-0 flex-row min-h-screen items-center justify-center bg-gray-300 ">
            <div className=' h-screen flex-col w-1/2 md:flex justify-start items-start p-12 bg-linear-to-br from-purple-700 to-indigo-200  text-white gap-4' >
            <p className='font-bold text-8xl text-black' > Think<span className='text-indigo-600' >Loom</span></p>
            <span className='text-4xl text-gray-100 ' >Use many ideas and plans</span>
            <span className='text-4xl font-bold text-indigo-900 ' >To get your perfect result</span>
            <ul className='text-2xl gap-4 flex flex-col p-7' >
                <li className='text-xl font-medium flex flex-start gap-2' >
                <span > <Users/> </span>
                <div>
                    <p className='flex gap-4' >Multiple People.</p>
                    <div className='flex gap-2' ><NetworkIcon className='text-indigo-800' /> <p className='text-indigo-700' >Invite your whole team to project</p></div>
                    </div>
                </li>
                <li className='text-xl font-medium flex flex-start gap-2' >
                <span ><MessagesSquare/></span>
                <div>
                    <p className='flex gap-4' >Multiple Ideas.</p>
                    <div className='flex gap-2' > <LayersPlusIcon className='text-indigo-800' /> <p className='text-indigo-700' >Collect every idea at a single place</p></div>
                    </div>
                </li>
                <li className='text-xl font-medium flex flex-start gap-2' >
                <span><Lightbulb/></span>
                <div>
                    <p className='flex gap-4' >Single Solution.</p>
                    <div className='flex gap-2' > <Combine className='text-indigo-800' /> <p className='text-indigo-700' >Merge every idea to get a perfect result</p></div>
                    </div>
                </li>
            </ul>
            </div>
            <div className='w-1/2 h-screen flex flex-col items-center justify-center' >
            <form onSubmit={OnSubmit} action="" className="w-full flex flex-col max-h-full max-w-sm  space-y-4 rounded-2xl bg-gray-350 border items-center border-white p-8 shadow-2xl">
                <h1 className="text-2xl font-semibold">{issignup? "Create an Account":"Welcome back"}</h1>
                
                <div className='w-full' >
                    {issignup && (
                    <div className='w-full gap-5' >
                    <label htmlFor="">Name</label>
                    <input type="text" className={input} placeholder='Name' required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} />
                </div>
                )}
                <label htmlFor="">Email</label>
                <input type="email" className={input} placeholder='Email' required value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
                <label htmlFor="">Password</label>
                <input type="password" className={input} placeholder='password (8+ characters)' required value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} minLength={8} />
                </div>
                {error && (<p className='text-sm text-red-600'>{error}</p>)}
                <button className='w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60' disabled={submitting}>{submitting?"Please Wait...":issignup?"Sign Up":"Login"}</button>
                <p className='text-sm text-gray-600 text-center'>{issignup?"Alread have an account? ":"First time here?  "}
                    <Link className='text-indigo-600 hover:underline' state={{from}} to={issignup?'/login':'/signup'}>{issignup?"Login":"Sign Up"}</Link>
                </p>
            </form>
            </div>
        </div>
    )
}