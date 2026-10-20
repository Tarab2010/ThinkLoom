import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads');
const KEY=/^[0-9a-f-]{36}\.(png|jpg|gif|webp|pdf|docx)$/;
export async function saveFile(buffer,ext){
    await fs.mkdir(dir,{recursive:true});
    const key=`${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(dir,key),buffer,{flag:'wx'});
    return key;
}
export function pathFor(key){
    if(!KEY.test(key)){
        throw new Error('Bad file key');
    }
    return path.join(dir,key);
}
export async function removeFile(key){
    try{
        await fs.unlink(pathFor(key))
    }
    catch{}
}