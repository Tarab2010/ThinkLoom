import {v2 as cloudinary} from 'cloudinary'
import { randomUUID } from 'crypto';
import 'dotenv/config'
const KEY=/^[0-9a-f-]{36}\.(png|jpg|gif|webp|pdf|docx)$/;
cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API,
    api_secret:process.env.CLOUD_SECRET,
})
export async function savef(buffer,ext){
    const key=`${randomUUID()}.${ext}`
    const publicId=`thinkloom/${key}`;
    await new Promise((resolve,reject)=>{
        cloudinary.uploader.upload_stream({resource_type:'raw',public_id:publicId,overwrite:false,type:'private'},
            (err,res)=>(err?reject(err):resolve(res))
        ).end(buffer);
    });
    return key;
}
export async function readf(key){
    if(!KEY.test(key)){
        throw new Error('bad file type');
    }
    const url=cloudinary.utils.private_download_url(`thinkloom/${key}`,'',{
        resource_type:'raw',
        type:'private',
        expires_at:Math.floor(Date.now()/1000)+60
    })
    const res=await fetch(url);
    if(!res.ok){
        throw new Error(`Cloudinary ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer())
}
export async function removef(key){
    try{
        await cloudinary.uploader.destroy(`thinkloom/${key}`,{resource_type:'raw',type:'private'})
    }catch{}
}
