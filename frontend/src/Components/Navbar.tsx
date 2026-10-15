import { useAuthStore } from "../store/authstore";
export default function Navbar(){
    const {user,logout}=useAuthStore();
    return (
        <nav className="sticky top-0 bg-gray-200 m-10 h-20 flex item-center justify-center flex gap-3 ">
            <div className="bg-gray-700 w-5 h-5 flex item-center justify-between rounded-full font-medium text-white">{(user.name)[0]}</div>
            <button onClick={logout} className=" hover:underline">Log Out</button>
        </nav>
    )
}