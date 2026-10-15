import {Navigate, Outlet,useLocation} from 'react-router-dom';
import { useAuthStore } from '../store/authstore';
export default function ProtectedRoute(){
    const {user,loading}=useAuthStore();
    const location=useLocation();
    if(loading){
        return (<p className='p-8 text-gray-500'>Loading...</p> )
    }
    return user? <Outlet/>:<Navigate to='/login' replace state={{from:location.pathname}}/>
}