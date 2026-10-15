import {create} from 'zustand';
import {api} from '../lib/api';

export type Role ='leader'|'editor'|'viewer';
export interface ProjectSummary{
    id:string,
    name:string,
    description:string,
    category:string,
    role:Role,
}
interface ProjectState{
    projects:ProjectSummary[];
    loading:boolean;
    fetchProjects:()=>Promise<void>;
    createProject:(data:{name:string, description:string,category:string})=> Promise<ProjectSummary>;
}
export const UseProjectStore=create<ProjectState>((set)=>({
    projects:[],
    loading:true,
    fetchProjects: async()=> {
        try{
            set({projects: await api<ProjectSummary[]>('/projects')})
        }
        finally{
            set({loading:false});
        }
    },
    createProject:async(data)=>{
        const project=await api<ProjectSummary>('/projects',{
            method:'POST',
            body:JSON.stringify(data),
        });
        set((s)=>({projects:[project,...s.projects]}));
        return project;
    }
}));
