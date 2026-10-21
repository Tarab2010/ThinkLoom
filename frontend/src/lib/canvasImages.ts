import { CaptureUpdateAction,convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { apiUrl } from './api';
export interface imageLike{
    type:string,
    fileId?:string | null,
    isDeleted?:boolean,
}
type FileId=BinaryFileData['id'];
type DataURL=BinaryFileData['dataURL'];
type Mime=BinaryFileData['mimeType'];
const bloToDataUrl=(blob:Blob)=>
    new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result as string);
        reader.onerror=()=>reject(reader.error);
        reader.readAsDataURL(blob);
    }
)
const newFileId=()=>typeof crypto!=='undefined' && 'randomUUID' in crypto? crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function createImageSync(base:string,onError?:(message:string)=>void){
    let api:ExcalidrawImperativeAPI| null=null;
    let dead=false;
    const uploaded=new Set<string>();
    const requested=new Set<string>();
    const timers=new Set<number>();
    async function upload(file:BinaryFileData, attempt=0):Promise<void>{
        try{
            const blob=await(await fetch(file.dataURL)).blob();
            const res=await fetch(apiUrl(`${base}/${file.id}`),{
                method:'PUT',
                credentials:'include',
                headers:{ 'Content-Type': 'application/octet-stream' },
                body:blob
            });
            if(res.ok){
                return;
            }
            const data=await res.json().catch(()=>({}));
            if(res.status<500){
                onError?.(data?.error??'Could not save a picture on canvas');
                return;
            }
            throw new Error('server error');
        }
        catch{
            if(attempt<2 && !dead){
                const t=window.setTimeout(()=>{
                    timers.delete(t);
                    void upload(file,attempt+1);
                },1500*(attempt+1));
                timers.add(t);
            }
            else if(!dead){
                onError?.('could not save a picture on canvas');
            }
        }
    }
    async function download(id:string, attempt=0):Promise<void>{
        try{
            const res=await fetch(apiUrl(`${base}/${id}`),{credentials:'include'});
            if(res.status===404 && attempt>=3){
                return
            }
            if(!res.ok){
                throw new Error(String(res.status));
            }
            const blob=await res.blob();
            const dataURL=await bloToDataUrl(blob);
            if(dead || !api){
                return;
            }
            uploaded.add(id);
            api.addFiles([{id: id as FileId,dataURL:dataURL as DataURL,mimeType: (blob.type || 'image/png') as Mime, created: Date.now() }])
        }
        catch{
            if(attempt<5  && !dead){
                const t=window.setTimeout(()=>{
                    timers.delete(t);
                    void download(id,attempt+1);
                },1500*(attempt+1));
                timers.add(t);
            }
        }
    }
    return{
        setApi(next:ExcalidrawImperativeAPI|null){
             api=next;
        },
        sync (elements:readonly imageLike[],files:BinaryFiles,canupload:boolean){
            if(dead || !api){
                return;
            }
            for(const el of elements){
                if(el.type==='image' && !el.isDeleted && el.fileId){
                    const id=String(el.fileId);
                    const file=files[id];
                    if(file){
                        if(canupload && !uploaded.has(id)){
                            uploaded.add(id);
                            void upload(file);
                        }
                    }
                    else if(!requested.has(id)){
                        requested.add(id);
                        void download(id);
                    }
                }
            }
        },
        async add(blob:Blob){
            if(!api){
                throw new Error('The canvas is not ready yet');
            }
            const dataURL=await bloToDataUrl(blob);
            const bitmap= await createImageBitmap(blob);
            const {width,height}=bitmap;
            bitmap.close();
            const fileId=newFileId() as FileId;
            api.addFiles([{id:fileId,dataURL:dataURL as DataURL,mimeType:'image/png',created:Date.now()}]);
            const state=api.getAppState();
            const zoom=state.zoom.value;
            const w=Math.min(width,(state.width/zoom)*0.5);
            const h=(height*w)/width;
            const x=-state.scrollX+state.width/(2*zoom)-w/2;
            const y=-state.scrollY+state.height/(2*zoom)-h/2;
            const [element]=convertToExcalidrawElements([{type:'image',fileId,x,y,width:w,height:h,status:'saved'}]);
            api.updateScene({
                elements:[...api.getSceneElementsIncludingDeleted(),element],
                appState:{selectedElementIds:{[element.id]:true}},
                captureUpdate:CaptureUpdateAction.IMMEDIATELY,
            });
        },
        dispose(){
            dead=true;
            timers.forEach((t)=>window.clearTimeout(t));
            timers.clear();
            api=null;
        },
    }
}
export type ImageSync= ReturnType<typeof createImageSync>