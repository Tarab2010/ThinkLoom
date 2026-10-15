import { useState, type ComponentProps } from 'react';
import { Navigate, Link, useNavigate,useLocation } from "react-router-dom";
import { useAuthStore } from '../store/authstore';
type FormSubmitEvent=Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];
export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
    const issignup = mode === 'signup';
    const { user, login, signup } = useAuthStore();
    const navigate = useNavigate();
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
            navigate('/');
        }
        catch(err){
            setError(err instanceof Error ? err.message:"Something went wrong")
        }
        finally{
            setSubmitting(false);
        }}
        const input='w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500';
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <form onSubmit={OnSubmit} action="" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow">
                <h1 className="text-2xl font-semibold">{issignup? "Create an Account":"Welcome back"}</h1>
                {issignup && (
                    <input type="text" className={input} placeholder='Name' required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} />
                )}
                <input type="email" className={input} placeholder='Email' required value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
                <input type="password" className={input} placeholder='password (8+ characters)' required value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} minLength={8} />
                {error && (<p className='text-sm text-red-600'>{error}</p>)}
                <button className='w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60' disabled={submitting}>{submitting?"Please Wait...":issignup?"Sign Up":"Login"}</button>
                <p className='text-sm text-gray-600 text-center'>{issignup?"Alread have an account":"Logn in"}
                    <Link className='text-indigo-600 hover:underline' to={issignup?'/login':'/signup'}>{issignup?"Login":"Sign Up"}</Link>
                </p>
            </form>
        </div>
    )
}