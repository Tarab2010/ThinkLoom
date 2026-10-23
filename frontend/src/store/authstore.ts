import {create} from 'zustand';
import {api} from '../lib/api';
export interface User{
    id:string,
    name:string,
    email:string
}
interface AuthState{
    user:User|null;
    loading:boolean;
    fetchMe:()=>Promise<void>;
    login:(email:string, password:string)=>Promise<void>;
    signup:(name:string, email:string, password:string)=>Promise<void>;
    logout:()=>Promise<void>;
}
export const useAuthStore=create<AuthState>((set)=>({
    user:null,
    loading:true,
    fetchMe:async()=> {
        try{
            set({user: await api<User>('/auth/me')});
        }
        catch{
            set({user:null});
        }
        finally{
            set({loading:false});
        }
    },
    login:async(email,password)=>{
        const user=await api<User>('/auth/login',{
            method:'POST',
            body:JSON.stringify({email,password})
        });
        set({user})
    },
    signup:async(name,email,password)=>{
        const user=await api<User>('/auth/signup',{
            method:'POST',
            body:JSON.stringify({name,email,password})
        });
        set({user})
    },
    logout: async()=>{
        await api('/auth/logout',{method:'POST'})
        set({user:null});
    }
}))
