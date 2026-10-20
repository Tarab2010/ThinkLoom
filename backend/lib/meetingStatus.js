export function meetingStatus(m,now=Date.now()){
    const startsAt=(m.startsAt??m.createdAt).getTime();
    const endsAt=m.endedAt?m.endedAt.getTime():startsAt+(m.duration ??60)*60000;
    return now<startsAt?'upcoming':now<endsAt?'live':'ended';
}