import { useEffect,useState } from "react";
import { api } from "../lib/api";
import { Link,useNavigate,useParams } from "react-router-dom";

export default function JoinPage(){
    const {code}=useParams();
    const navigate=useNavigate();
    const [error,setError]=useState('');
    useEffect(()=>{
        (async()=>{
            try{
                const {id}=await api<{id:string}>('/projects/join',{
                    method:'POST',
                    body:JSON.stringify({invitecode:code})
                });
                navigate(`/projects/${id}`,{replace:true})
            }
            catch(err){
                setError(err instanceof Error ? err.message:'Could not join project')
            }
        })();
    },[code,navigate]);
    if(error){
        return (
            <div className="p-8">
                <p className="text-red-600">{error}</p>
                <Link className="mt-3 inline-block text-indigo-600 hover:underline" to='/'>Back to Dashboard</Link>
            </div>
        )
    }
    return (
        <p className="p-8 text-gray-500">Joining Project...</p>
    )
}