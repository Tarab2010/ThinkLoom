import {Navigate, Outlet} from 'react-router-dom';
import { useAuthStore } from '../store/authstore';
export default function ProtectedRoute(){
    const {user,loading}=useAuthStore();
    if(loading){
        return (<p>Loading...</p> )
    }
    return user? <Outlet/>:<Navigate to='/login' replace/>
}