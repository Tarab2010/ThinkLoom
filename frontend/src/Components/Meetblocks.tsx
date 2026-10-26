import { type meetingstatus } from "../lib/meetingTime";
import { Clock, Calendar } from "lucide-react";
export default function Meetblocks({ title, topic, duration, startsAt, status }: { title: string; topic: string; duration: number; startsAt: string; startedFrom: string | null; status: meetingstatus }) {

    return (
        <div className="flex h-52 w-full overflow-hidden min-w-0 p-2 pb-1 flex-col items-center border-2 backdrop-blur-3xl justify-between rounded-xl bg-[#e4acec] shadow-purple-500 shadow-2xl" >
            <div className="flex relative items-center  justify-center w-full " >
                <h3 className="font-bold mt-3 text-xl"  >{title}</h3>
                <span className={`absolute right-0 top-0 mr-1 mt-1  ${status === 'live' ? 'bg-green-300 text-green-800' : status === 'upcoming' ? 'bg-blue-300 text-blue-700' : 'bg-red-300 text-red-700'} rounded-2xl p-1 `} >{status}</span>
            </div>
            <p className=" m-1 line-clamp-2 w-full px-2 text-center font-semibold [overflow-wrap:anywhere]" >{topic}</p>
            <div className="flex gap-10 " >
                <div className="flex font-bold items-center flex-col" >
                    <div className="flex gap-2" ><Calendar /><p>Start's From</p></div>
                    <p className="" >{new Date(startsAt).toLocaleString('en-GB', { hour12: true })}</p>
                </div>
                <div className="flex flex-col items-center font-bold" >
                    <div className="flex gap-2" ><Clock /><p>    Duration</p></div>
                    <p className="font-xl" >{duration}min</p></div>
            </div>
            <button className="bg-purple-500 text-white hover:underline border-black border-2 m-2 hover:text-purple-800 hover:border-purple-800 hover:bg-white cursor-pointer rounded-2xl w-1/4 " >Join</button>
        </div>
    )
}