import { type meetingstatus } from "../lib/meetingTime";
export default function Meetblocks({title, topic , duration, startsAt, startedFrom, status }:{title:string;topic:string;duration:number;startsAt:string;startedFrom:string|null; status:meetingstatus}){

    return(
        <div className="flex h-52 w-full overflow-hidden min-w-0  flex-col items-center border-2 backdrop-blur-3xl justify-between rounded-xl border-black shadow-2xl bg-gray-200" >
            <div className="flex relative items-center  justify-center w-full " >
            <h3 className="font-bold mt-3 text-xl"  >{title}</h3>
            <span className={`absolute right-0 top-0 mr-1 mt-1  ${status==='live'? 'bg-green-300 text-green-800':status==='upcoming'?'bg-blue-300 text-blue-700':'bg-red-400 text-red-700'} rounded-2xl p-1 `} >{status}</span>
            </div>
            <p className="text-xl m-1 p-2" >{topic}</p>
            <div className="flex gap-10 " >
                <div className="flex font-bold items-center flex-col" >
                    Start's From
                    <p className="" >{new Date(startsAt).toLocaleString('en-GB',{hour12:true})}</p>
                </div>
                <div className="flex flex-col items-center font-bold" >
                    Duration
                    <p className="font-xl" >{duration}min</p></div>
            </div>
            <button className="bg-purple-500 text-white hover:underline border-white border-2 m-2 hover:text-purple-800 hover:border-purple-800 hover:bg-gray-400 rounded-2xl w-1/4 " >Join</button>
        </div>
    )
}