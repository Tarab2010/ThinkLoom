import {io,type Socket} from 'socket.io-client';
export function createSocket():Socket{
    return io(import.meta.env.VITE_SOCKET_URL ?? undefined,{
        withCredentials:true,
        autoConnect:false
    })
}