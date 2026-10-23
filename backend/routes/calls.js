import express from 'express';
import requireauth from '../middleware/auth.js';
import { AccessToken, RoomServiceClient, TrackType } from 'livekit-server-sdk';
import { requiremeetingrole } from '../middleware/meetingrole.js';
import MeetingAdmission from '../models/MeetingAdmission.js';
import User from '../models/User.js';
import { meetingStatus } from '../lib/meetingStatus.js';
const router = express.Router({ mergeParams: true });
router.use(requireauth)
const roomof=(meeting)=>`meeting-${meeting._id}`;
function admin() {
    return new RoomServiceClient(
    process.env.LIVE_URL.replace(/^ws/, 'http'),
    process.env.LIVE_API,
    process.env.LIVE_SECRET,
)
}
router.post('/moderate', requiremeetingrole('leader'), async (req, res) => {
    const { identity, action } = req.body;
    const meet = roomof(req.meeting);
    if (typeof identity !== 'string' || identity===String(req.userId)) {
        return res.status(400).json({ error: 'on whome to do this action' })
    }
    const svc=admin();
    try {
        if (action === 'mic-off' || action == 'camera-off') {
            const person = await svc.getParticipant(meet, identity);
            const wanted = action === 'mic-off' ? TrackType.AUDIO : TrackType.VIDEO;
            for (const t of person.tracks) {
                if (t.type === wanted) {
                    await svc.mutePublishedTrack(meet, identity, t.sid, true)
                }
            }
        } 
        else if (action === 'remove') {
            await svc.removeParticipant(meet, identity);
        }
        else if (action === 'block' || action === 'unblock') {
            await svc.updateParticipant(meet, identity, undefined, {
                canPublish: action === 'unblock',
                canSubscribe: true,
            })
        }
        else { return res.status(400).json({ error: 'unknown action' }) }
        res.json({ok:true});
    }
    catch(err){
        res.status(404).json({error:'that person is not here'})
    }
})
router.get('/', requiremeetingrole(), async (req, res) => {
    try{
        const m=req.meeting;
        if(meetingStatus(m)!=='live'){
            return res.status(403).json({error:'meeting is not live'})
        }
        if(req.meetingrole!=='leader'){
            const ok = await MeetingAdmission.exists({ meeting: m._id, user: req.userId, state: 'admitted' });
            if (!ok){ 
                return res.status(403).json({ error: 'Leader has not admitted you yet' });
            }
            try{
                const people=await admin().listParticipants(roomof(m));
                const leaderId=String(m.createdBy);
                if(!people.some((p)=>p.identity===leaderId)){
                    return res.status(403).json({error:'leader has not started the call yet'})
                }
            }
            catch{
                return res.status(403).json({error:'leader has not started the call yet'})
            }
        }
        const user = await User.findById(req.userId).select('name');
        const endsAt = m.endedAt? m.endedAt.getTime():(m.startsAt??m.createdAt).getTime()+(m.duration??60)*60000;
        const pass = new AccessToken(process.env.LIVE_API, process.env.LIVE_SECRET, {
        identity: String(req.userId),
        name: user?.name??'Member',
        ttl: Math.max(60, Math.floor((endsAt - Date.now()) / 1000)),

        });
        pass.addGrant({
            roomJoin: true,
            room: `meeting-${req.meeting._id}`,
            canPublish: true,
            canSubscribe: true,
        })
    
        res.json({ token: await pass.toJwt(), url: process.env.LIVE_URL });
    }
    catch(err){
        console.error('call token failed', err);
        res.status(500).json({ error: 'Could not create call token' });
    }
})
export default router;