import { Excalidraw } from "@excalidraw/excalidraw";
import '@excalidraw/excalidraw/index.css'
import type { BinaryFiles,ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { api } from "../lib/api";
import { useState,useEffect,useRef, useCallback } from "react";
import { createImageSync, type ImageSync, type imageLike } from "../lib/canvasImages";

export default function ArchivedCanvas({projectId,meetingId}:{projectId:string,meetingId:string}){
    const [initial,setInitial]=useState<any>(null);
    const [error,setError]=useState('');
    const imageRef=useRef<ImageSync|null>(null);
    useEffect(()=>{
        let cancelled=false;
        const images=createImageSync(`/projects/${projectId}/meetings/${meetingId}/canvas-files`,setError);
        imageRef.current=images;
        api<{elements:unknown[]}>(`/projects/${projectId}/meetings/${meetingId}/canvas`)
        .then((r)=>{if(!cancelled){
            setInitial({elements:r.elements,scrollToContent:true});
        }})
        .catch((e)=>{
            if(!cancelled){
                setError(e instanceof Error?e.message:'Could not find the canvas' )
            }
        })
        return ()=>{cancelled=true;images.dispose();imageRef.current=null;}
    },[projectId,meetingId]);
    const handleApi=useCallback((a:ExcalidrawImperativeAPI|null)=>{
        imageRef.current?.setApi(a);
    },[]);
    return(
        <div >
            <p className="mb-2 text-sm text-gray-600">saved canavs </p>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p> }
            {initial && (
                <div  className="h-[70vh] min-h-[50vh] overflow-hidden rounded-xl border bg-white">
                    <Excalidraw
                    initialData={initial}
                    excalidrawAPI={handleApi}
                    viewModeEnabled
                    theme="dark"
                    onChange={(els, _s,files:BinaryFiles)=>{
                        imageRef.current?.sync(els as readonly imageLike[],files,false)
                    }}/>
                </div>
            )}
        </div>
    )
}