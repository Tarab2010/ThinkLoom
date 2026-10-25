import express, { Router } from 'express';
import CanvasFile from '../models/CanvasFile.js';
import requireAuth from '../middleware/auth.js';
import { requiremeetingrole } from '../middleware/meetingrole.js';
import { detectType } from '../lib/fileTypes.js';
import { savef, readf, removef } from '../lib/storage.js';
import { meetingStatus } from '../lib/meetingStatus.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);
const FILE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_MB = 5;
const MAX_FILES_PER_MEETING = 200;

router.put('/:fileId', requiremeetingrole('leader', 'editor'), express.raw({ type: '*/*', limit: `${MAX_MB}mb` }), async (req, res) => {
    const { fileId } = req.params;
    if (meetingStatus(req.meeting) !== 'live') {
        return res.status(403).json({ error: 'meeting is not live' });
    }
    if (!FILE_ID.test(fileId)) {
        return res.status(400).json({ error: 'Bad file' });
    }
    const already = await CanvasFile.findOne({ meeting: req.meeting._id, fileId });
    if (already) {
        return res.json({ ok: true });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'No picture recieved' });
    }
    const type = detectType(req.body);
    if (!type || type.kind !== 'image') {
        return res.status(400).json({ error: 'Only PNG PDF WebP AND docx file can be used' })
    }
    const count = await CanvasFile.countDocuments({ meeting: req.meeting._id });
    if (count >= MAX_FILES_PER_MEETING) {
        return res.status(400).json({ error: 'This canvas has too many pictures already' });
    }
    const key = await savef(req.body, type.ext);
    try {
        await CanvasFile.create({
            meeting: req.meeting._id,
            fileId,
            key,
            mime: type.mime,
            size: req.body.length,
            user: req.userId
        });

    }
    catch (err) {
        await removef(key);
        if (err.code === 11000) {
            return res.json({ ok: true });
        }
        throw err;
    }
    res.status(201).json({ ok: true });
})
router.get('/:fileId', requiremeetingrole(), async (req, res) => {
    const file = FILE_ID.test(req.params.fileId) ? await CanvasFile.findOne({ meeting: req.meeting._id, fileId: req.params.fileId }) : null;
    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }
    try {
        const buf = await readf(file.key);
        res.set({
            'Content-Type': file.mime,
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'inline',
            'Cache-Control': 'private, max-age=86400',
        });
        res.send(buf);
    }
    catch { res.status(404).json({ error: 'file not found' }) };
    /* res.sendFile(
        pathFor(file.key),{
            dotfiles:'deny',
            headers:{
                'Content-Type':file.mime,
                'X-Content-Type-Options':'nosniff',
                'Content-Disposition':'inline',
                'Cache-Control': 'private, max-age=86400',
            },
        },
        (err)=>{
            if(err && !res.headersSent){
                res.status(404).json({error:'file not found'});
            }
        }
    ) */
});
export default router;