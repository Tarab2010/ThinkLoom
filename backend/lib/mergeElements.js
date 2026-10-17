export function isNewer(incoming,existing){
    if(!existing){
        return true;
    }
    if(incoming.version!==existing.version){
        return incoming.version>existing.version;
    }
    return incoming.version<existing.version;
}
export function mergeElements(current,incoming){
    const byId=new Map(current.map((el)=>[el.id,el]));
    for(const el of incoming){
        if(isNewer(el,byId.get(el.id))){
            byId.set(el.id,el);
        }
    }
    return [...byId.values()];
}