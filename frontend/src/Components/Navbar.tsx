import { useAuthStore } from "../store/authstore";
type User = { id: string; name: string; email: string }
export default function Navbar({user}:{user:User|null}){
    const {logout}=useAuthStore();
    return (
        <nav className="sticky w-9/10 top-0 bg-gray-900 m-10 h-20  item-center justify-center flex gap-3 ">
            <div className="bg-gray-700 w-5 h-5 flex item-center justify-between rounded-full font-medium text-white">{(user?user.name:'guest')[0]}</div>
            <button onClick={logout} className=" absolute right-0 hover:underline">Log Out</button>
        </nav>
    )
}