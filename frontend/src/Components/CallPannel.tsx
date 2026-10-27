import { useEffect, useRef, useState, } from "react";
import {LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer,ControlBar, useTracks, useParticipants,} from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoOff,MicOff,User2,GripHorizontalIcon } from "lucide-react";
import "@livekit/components-styles";
import { api } from "../lib/api";

function Screen(){
    const tracks =useTracks([{source:Track.Source.Camera,withPlaceholder:true}]);
    return(
        <GridLayout tracks={tracks} style={{height:"100%"}} >
            <ParticipantTile/>
        </GridLayout>
    )
}
function Controls({base}:{base:string}){

    const people=useParticipants();
    const [err,setErr]=useState('');
    async function act(identity:string, action:string){
        setErr('');
        try{
            await api(`${base}/calls/moderate`,{
                method:'POST',
                body:JSON.stringify({identity,action})
            })
        }
        catch(err){
            setErr(err instanceof Error ? err.message : "Action failed");
        }
    }
    const others=people.filter((p)=>!p.isLocal);
    return(
        <div className="relative " >
            {err && <p>{err}</p> }
            {others.length===0 && <p>no one else in the call</p> }
            {others.map((p)=>(
                <div  className="flex flex-col items-center border border-amber-50 gap-2" key={p.identity} >
                    <div className="flex gap-2 " >
                       <User2/> <span>{p.name || p.identity}</span></div>
                    <div className="flex items-center justify-center gap-2" >
                    <button onClick={() => act(p.identity, "mic-off")} ><MicOff className="hover:text-gray-400" /></button>
                    <button onClick={() => act(p.identity, "camera-off")} ><VideoOff className="hover:text-gray-400" /></button>
                    <button  className="text-red-500 hover:text-red-700 " onClick={() => act(p.identity, "remove")} >Remove</button>
                    </div>
                </div>
            ))}
        </div>
    )
}
export default function CallPannel({projectId, meetingId, isLeader, startcall }:{projectId:string;meetingId:string;isLeader:boolean;startcall?:boolean}){
    const base = `/projects/${projectId}/meetings/${meetingId}`;
    const [error,setError]=useState('');
    const [manage,setManage]=useState(false);
    const [connection, setConnection] = useState<{ token: string; url: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [position,setPosition]=useState({x:100,y:100});
    const dragging=useRef(false);
    const offset=useRef({x:0,y:0});
    function handlePointerDown(e:React.PointerEvent<HTMLDivElement>){
        if((e.target as HTMLElement).closest('button a input select textarea .lk-pagination-control')){
            return;
        }
        dragging.current=true;
        offset.current={
            x:e.clientX-position.x,
            y:e.clientY-position.y
        }
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function handlePointerMove(e:React.PointerEvent<HTMLDivElement>){
        if(!dragging.current){
            return;
        }
        setPosition({
            x:e.clientX-offset.current.x,
            y:e.clientY-offset.current.y
        })
    }
    function handlepointerup(){
        dragging.current=false;
    }
    useEffect(()=>{
        if(startcall){
            void join()
        }
    },[])
    async function join(){
        setBusy(true);
        setError('');
        try{
            setConnection(await api<{token:string; url:string}>(`${base}/calls`));
        }
        catch(err){
            setError(err instanceof Error ?err.message :'unable to connect');
        }
        finally{
            setBusy(false);
        }
      }
    if(!connection){
        return(
        <div className="flex items-center gap-2" >
            <button disabled={busy} onClick={join} className="rounded-lg bg-indigo-800 px-3 py-1.5 text-sm hover:bg-indigo-600 hover:text-white  text-white disabled:opacity-60" >
                {busy?'Connecting...':'Join Call'}
            </button>
            {error && <p className="text-xs text-red-600" >{error}</p> }
        </div>)
    }
    return(
        <div  data-lk-theme='default' className="fixed z-40 w-80 [&_.lk-start-audio-button]:hidden! overflow-hidden rounded-xl border bg-gray-900 shadow-xl" style={{left:position.x, top:position.y}} >
            <div className="cursor-grab touch-none select-none  bg-gray-800 py-1 items-center justify-center flex text-center text-x text-white active:cursor-grabbing " onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlepointerup} onPointerCancel={handlepointerup} data-lk-theme='default' ><GripHorizontalIcon/></div>
            <LiveKitRoom token={connection.token} serverUrl={connection.url} connect audio={false} video={false} onDisconnected={()=>setConnection(null)} >
                
                <div className="h-48 relative"  ><Screen /></div>
                <RoomAudioRenderer  />
                <ControlBar  variation="minimal"onPointerDown={(e)=>e.stopPropagation()}  controls={{chat:false, screenShare:false}} />
                { isLeader && (<>
                <button onPointerDown={(e)=>e.stopPropagation()} onClick={()=>setManage((m)=>!m)} className="w-full bg-gray-800 py-1 text-xs text-white" >{manage ? 'Hide controls' : 'Manage participants'}</button>
                {manage && <Controls base={base}/>}
                </>)}
            </LiveKitRoom>
        </div>
    )
}