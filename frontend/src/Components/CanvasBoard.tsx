import { Excalidraw,CaptureUpdateAction,reconcileElements } from "@excalidraw/excalidraw";
import '@excalidraw/excalidraw/index.css'
import type { BinaryFiles, Collaborator,ExcalidrawImperativeAPI,SocketId } from "@excalidraw/excalidraw/types";
import { useCallback,useEffect,useState, type ComponentProps,useRef } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../lib/socket";
import type { Role } from "../store/projectstore";
import { createImageSync,type imageLike,type ImageSync } from "../lib/canvasImages";
type SceneElement={id:string,version:number,versionNonce?:number}&imageLike;
type InitialData=ComponentProps<typeof Excalidraw>['initialData'];

type Person={socketId:string,userId:string,name:string,role:Role};
type JoinReply={ok:true,role:Role,elements:SceneElement[]}|{waiting:true} |{error:string};
export default function CanvasBoard({projectId,meetingId,onRoleChange,onEnded,onAdmitted}:{projectId:string;meetingId:string;onRoleChange?:(role:Role)=>void;onEnded?:()=>void;onAdmitted?:()=>void}){
    const[initial,setInitial]=useState<InitialData |null>(null);
    const [role,setRole]=useState<Role|null>(null);
    const [online,setOnline]=useState<Person[]>([]);
    const [status,setStatus]=useState<'connecting'|'waiting'|'live'|'offline'>('connecting');
    const [error,setError]=useState('');
    const socketRef=useRef<Socket|null>(null);
    const [lobby,setLobby]=useState<{userId:string,name:string}[]>([]);
    const roleRef=useRef<Role|null>(null);
    const apiRef=useRef<ExcalidrawImperativeAPI|null>(null);
    const joined=useRef(false);
    const known=useRef(new Map<string,number>());
    const pendingOut=useRef(new Map<string,SceneElement>());
    const flushTimer=useRef<number|undefined>(undefined);
    const early=useRef<SceneElement[]>([]);
    const collaborators=useRef(new Map<SocketId,Collaborator>());
    const lastPointer=useRef(0);
    const onRoleRef=useRef(onRoleChange);
    const imagesRef=useRef<ImageSync|null>(null);
    const onEndedRef=useRef(onEnded);
    const onAdmittedRef=useRef(onAdmitted);
    useEffect(()=>{onEndedRef.current=onEnded;})
    useEffect(()=>{
        onRoleRef.current=onRoleChange;
    })
    useEffect(()=>{
        const images=createImageSync(`/projects/${projectId}/meetings/${meetingId}/canvas-files`,setError);
        imagesRef.current=images;
        images.setApi(apiRef.current);
        const onAddImage=(e:Event)=>{
            const detail=(e as CustomEvent<{ blob: Blob; handled: boolean; done: (text: string) => void }>).detail;
            const r=roleRef.current;
            if(!apiRef.current || (r!='leader' && r!=='editor')){
                return;
            }
            detail.handled=true;
            imagesRef.current?.add(detail.blob).then(()=>detail.done('Add to the canvas')).catch((err)=>detail.done(err instanceof Error? err.message:'could not add the picture'))
        }
        window.addEventListener('thinkloom:add-image',onAddImage);
        return ()=>{
            window.removeEventListener('thinkloom:add-image',onAddImage);
            images.dispose();
            imagesRef.current=null;
        }
    },[projectId,meetingId])
    
    const flush=useCallback(()=>{
        flushTimer.current=undefined;
        const socket=socketRef.current;
        if(!socket || !joined.current || pendingOut.current.size===0){
            return ;
        }
        const all=[...pendingOut.current.values()];
        pendingOut.current.clear();
        for(let i=0 ;i<all.length;i+=500){
            socket.emit('scene:update',{elements:all.slice(i,i+500)});
        }
    },[]);
    const queueChanges=useCallback((elements:readonly SceneElement[])=>{
        for(const el of elements){
            if(known.current.get(el.id)!==el.version){
                pendingOut.current.set(el.id,el);
                known.current.set(el.id,el.version);
            }
        }
        if(pendingOut.current.size>0 && flushTimer.current===undefined){
            flushTimer.current=window.setTimeout(flush,60);

        }
    },[flush]);
    const applyRemote=useCallback((remote:SceneElement[])=>{
        const api=apiRef.current;
        if(!api){
            early.current.push(...remote);
            return;
        }
        for(const el of remote){
            known.current.set(el.id,el.version);
        }
        const merged=reconcileElements(
            api.getSceneElementsIncludingDeleted() as never,
            remote as never,
            api.getAppState() as never
        );
        api.updateScene({elements:merged,captureUpdate:CaptureUpdateAction.NEVER});
    },[])
    const handleApi=useCallback((api: ExcalidrawImperativeAPI|null)=>{
        apiRef.current=api;
        imagesRef.current?.setApi(api)
        if(api && early.current.length>0){
            const waiting=early.current;
            early.current=[];
            applyRemote(waiting);
        }
    },[applyRemote])
    useEffect(()=>{onAdmittedRef.current=onAdmitted});
    useEffect(()=>{
        const socket=createSocket();
        socketRef.current=socket;
        let closed=false;
        const join=()=>{
            socket.emit('meeting:join',{projectId,meetingId},(res:JoinReply)=>{
                if(closed){
                    return;
                }
                if('waiting' in res){
                    setStatus('waiting');
                    return;
                }
                if('error' in res){
                    setError(res.error);
                    setStatus('offline');
                    return;
                }
                joined.current=true;
                setError('');
                setStatus('live');
                setRole(res.role);
                roleRef.current=res.role;
                onRoleRef.current?.(res.role);
                if(apiRef.current){
                    applyRemote(res.elements);
                    queueChanges(apiRef.current.getSceneElementsIncludingDeleted() as unknown as SceneElement[]);
                    flush();
                }
                else{
                    known.current=new Map(res.elements.map((el)=>[el.id,el.version]));
                    setInitial({elements:res.elements,scrollToContent:true} as unknown as InitialData);

                }
            });
        }
        socket.on('connect',join);
        socket.on('disconnect',()=>{
            joined.current=false;
            if(!closed){
                setStatus('connecting');
            }
        });
        socket.on('connect_error',(err)=>{
            console.log('socket error',err.message)
            if(closed){
                return;
            }
            setStatus('offline');
            setError(err.message==='Not Authenticated'?'Please login again':'Could not reachh the live session');
        });
        socket.on('scene:update',({elements}:{elements:SceneElement[]})=>applyRemote(elements));
        socket.on('pointer:update',(p:{socketId:string;userName:string;pointer:{x:number;y:number;tool:'pointer'|'laser'};button:'up'|'down'})=>{
            const api=apiRef.current;
            if(!api){
                return;
            }
            const id=p.socketId as SocketId;
            const next=new Map(collaborators.current);
            next.set(id,{...next.get(id),pointer:p.pointer,button:p.button,username:p.userName} as Collaborator);
            collaborators.current=next;
            api.updateScene({collaborators:next});
        });

        socket.on('presence',(users:Person[])=>{
            setOnline(users);
            const ids=new Set(users.map((u)=>u.socketId));
            const next=new Map([...collaborators.current].filter(([id])=>ids.has(id)));
            collaborators.current=next;
            apiRef.current?.updateScene({collaborators:next});            
        });
        socket.on('meeting:role',({role:newRole}:{role:Role})=>{
            setRole(newRole);
            roleRef.current=newRole;
            if(newRole==='viewer'){
                pendingOut.current.clear();
            }
            onRoleRef.current?.(newRole);
        });
        socket.on('meeting:admitted',join);
        socket.on('meeting:denied',()=>{
            setStatus('offline');
            setError('Leader has not allowed you to enter')
        });
        socket.on('meeting:kicked',()=>{
            joined.current=false;
            setStatus('offline');
            setError('leader kicked you out of the meeting');
        });
        socket.on('meeting:ended',()=>{
            joined.current=false;
            onEndedRef.current?.();
        })
        socket.on('meeting:admitted',()=>{
            join();
            onAdmittedRef.current?.();
        })
        socket.on('lobby:update',setLobby);
        socket.on('meeting:error',({message}:{message:string})=>setError(message));
        socket.onAny((event, ...args) => console.log('SOCKET EVENT', event, args));
        socket.connect();
        return()=>{
            closed=true;
            flush();
            joined.current=false;
            window.clearTimeout(flushTimer.current);
            socket.disconnect();
            socketRef.current=null;
        }
    },[projectId,meetingId,applyRemote,queueChanges,flush]);
    function handleChange(elements:readonly SceneElement[],files:BinaryFiles){
        const r=roleRef.current;
        const canEditNow=r==='leader' || r==='editor';
        imagesRef.current?.sync(elements,files,canEditNow)
        if(!canEditNow){
            return;
        }
        queueChanges(elements);
    }
    function handlePointer(p:{pointer:{x:number;y:number;tool:'pointer'|'laser'};button:'down'|'up'}){
        const now=Date.now();
        if(now-lastPointer.current<50){
            return;
        }
        lastPointer.current=now;
        socketRef.current?.volatile.emit('pointer:update',{pointer:p.pointer,button:p.button});
    }
    const kick=(userId:string,name:string)=>{
        if(!window.confirm(`Remove ${name} from this meeting ?`)){
            return;
        }
        socketRef.current?.emit('meeting:kick',{userId},(res:{ok?:true, error?:string})=>{
            if(res?.error){
                setError(res.error);
            }
        })
    }

    const decide=(userId:string, allow:boolean)=>
        socketRef.current?.emit('lobby:decide',{userId,allow},(res:{ok?:true, error?:string})=>{
            console.log('lobby:decide reply',res);
            if(res?.error){
                setError(res.error);
            }
        })
    const canEdit=role==='leader' || role==='editor';
    return(
        <div>
            <div className="mb-2 flex flexwrap items-center justify-between gap-2 text-sm">
                <span className={status==='live'?'text-green-700':'text-amber-600'}>
                    {status==='live'?'● Live':status==='connecting'?'● Reconnecting...' : '● Offline'}
                    <span>{canEdit?'you can editthis canvs':'View Only :You cannot edit this canva'}</span>
                </span>
                {role === 'leader' && lobby.length > 0 && (
  <div className="mb-2 rounded-lg border p-2 text-sm">
    <p className="font-medium">Waiting to join</p>
    {lobby.map((u) => (
      <div key={u.userId} className="mt-1 flex items-center gap-2">
        <span>{u.name}</span>
        <button onClick={()=>decide(u.userId,true)}className="bg-indigo-100 hover:underline" >Admit</button>
        <button onClick={()=>decide(u.userId,false)}>Deny</button>
      </div>
    ))}
  </div>
)}
                <div className="ml-3 text-gray-500">
  Online now:
  {online.length === 0 ? ' -' : online.map((u) => (
    <span key={u.socketId} className="ml-2">
      {u.name} ({u.role})
      {role === 'leader' && u.role !== 'leader' && (
        <button
          className="ml-1 text-red-600 hover:underline"
          onClick={() => kick(u.userId, u.name)}>
          Kick
        </button>
      )}
    </span>
  ))}
</div>
            </div>
            {error && <p className="mb-2 text-sm text-red-600" >{error}</p> }
            <div className="h-[70vh] overflow-hidden rounded-xl border bg-white">
                <Excalidraw
                initialData={initial}
                excalidrawAPI={handleApi}
                viewModeEnabled={role==='viewer'}
                isCollaborating
                onChange={(elements,_appState,files)=>handleChange(elements,files)}
                onPointerUpdate={handlePointer}
                />
            </div>
        </div>
    )
}