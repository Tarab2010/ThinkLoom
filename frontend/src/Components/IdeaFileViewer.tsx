
import { renderAsync } from 'docx-preview';
import { toCanvas } from 'html-to-image';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
export interface Attachment {
    name: string,
    mime: string,
    kind: 'image' | 'pdf' | 'docx',
    size: number,
}
export function setsize(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
const PAGES_LIMIT = 30;
const CANVAS_MAX_SIDE = 1600;
interface Selection {
    page: number,
    fx: number,
    fy: number,
    fw: number,
    fh: number,
}
async function imagePages(blob: Blob, add: (c: HTMLCanvasElement) => void) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    add(canvas);
}
async function pdfPages(blob: Blob, add: (c: HTMLCanvasElement) => void, stopped: () => boolean) {
    const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
    const pdf = await task.promise;
    try {
        const count = Math.min(pdf.numPages, PAGES_LIMIT);
        for (let n = 1; n <=count && !stopped(); n++) {
            const page = await pdf.getPage(n);
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            await page.render({ canvas, viewport }).promise;
            if (!stopped()) {
                add(canvas);
            }
        }
    }
    finally {
        task.destroy();
    }
}
async function docxPage(blob: Blob, add: (c: HTMLCanvasElement) => void, stopped: () => boolean) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed';
    document.body.appendChild(host);
    try {
        await renderAsync(blob, host, host, { inWrapper: false, breakPages: true });
        const sections = Array.from(host.querySelectorAll<HTMLElement>('section.docx')).slice(0, PAGES_LIMIT);
        for (const section of sections) {
            if (stopped()) {
                break;
            }
            const pixelRatio = Math.min(1.5, 15000 / Math.max(1, section.scrollHeight));
            const canvas = await toCanvas(section, { pixelRatio, backgroundColor: '#ffffff', skipFonts: true });
            if (!stopped()) {
                add(canvas);
            }
        }
    }
    finally { host.remove() }
}
function PageView({ canvas, box, canCrop, onBox }: { canvas: HTMLCanvasElement, box: Selection | null, canCrop: boolean, onBox: (fx: number, fy: number, fw: number, fh: number, done: boolean) => void; }) {
    const holder = useRef<HTMLDivElement>(null);
    const start = useRef<{ x: number, y: number } | null>(null);
    useEffect(() => {
        canvas.style.cssText = 'display:block;width:100%;height:auto;';
        holder.current?.replaceChildren(canvas);
    }, [canvas]);
    const at = (e: PointerEvent) => {
        const r = e.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
            y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
        }
    }
    const rect = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y)] as const;
    return (
        <div className={`relative overflow-hidden rounded border bg-white shadow-sm ${canCrop ? 'cursor-crosshair touch-none select-none' : ''}`}
            onPointerDown={(e) => {
                if (!canCrop) {
                    return;
                }
                e.currentTarget.setPointerCapture(e.pointerId);
                start.current = at(e);
                onBox(start.current.x, start.current.y, 0, 0, false);
            }}
            onPointerMove={(e) => {
                if (!start.current) {
                    return;
                }
                onBox(...rect(start.current, at(e)), true);
            }}
            onPointerUp={(e) => {
                if (!start.current) {
                    return;
                }
                onBox(...rect(start.current, at(e)), true);
                start.current = null;

            }}>
            <div ref={holder}>
                {box && (
                    <div
                        className="pointer-events-none absolute border-2 border-indigo-500 bg-indigo-500/15"
                        style={{
                            left: `${box.fx * 100}%`,
                            top: `${box.fy * 100}%`,
                            width: `${box.fw * 100}%`,
                            height: `${box.fh * 100}%`,
                        }}/>
                )}
            </div>
        </div>
    )
}
export default function IdealFileViewer({ url, attachment, canCrop = false,source }: { url: string, attachment: Attachment, canCrop?: boolean,source:{ideaId:string, title:string, author:string} }) {
    const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [sel, setSel] = useState<Selection | null>(null);
    const [msg, setMsg] = useState('');
    useEffect(() => {
        let stopped = false;
        const isStopped = () => stopped;
        const add = (c: HTMLCanvasElement) => setPages((prev) => [...prev, c]);
        (async () => {
            try {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) {
                    throw new Error('Could not load the file');
                }
                const blob = await res.blob();
                if (attachment.kind === 'image') {
                    await imagePages(blob, add);
                }
                else if (attachment.kind === 'pdf') {
                    await pdfPages(blob, add, isStopped);
                }
                else {
                    await docxPage(blob, add, isStopped);
                }
            }
            catch (err) {
                console.error('Preview failed:', err);
                if (!stopped) setState('error');
            }
        })();
        return () => {
            stopped = true;
        }
    }, [url, attachment.kind]);
    const hasSel = !!sel && sel.fw * (pages[sel.page]?.width ?? 0) >= 8 && sel.fh * (pages[sel.page]?.height ?? 0) >= 8;
    function cropBlob(maxSide?: number): Promise<Blob> {
        let source: HTMLCanvasElement;
        let sx = 0, sy = 0, sh: number, sw: number;
        if (hasSel && sel) {
            source = pages[sel.page];
            sx = Math.round(sel.fx * source.width);
            sy = Math.round(sel.fy * source.height);
            sw = Math.max(1, Math.min(Math.round(sel.fw * source.width), source.width - sx));
            sh = Math.max(1, Math.min(Math.round(sel.fh * source.height), source.height - sy));
        }
        else if (attachment.kind === 'image' && pages[0]) {
            source = pages[0];
            sw = source.width;
            sh = source.height;
        }
        else {
            return Promise.reject(new Error('Drag over the part you want first'));
        }
        const k = maxSide ? Math.min(1, maxSide / Math.max(sw, sh)) : 1;
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(sw * k));
        out.height = Math.max(1, Math.round(sh * k));
        out.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not crop'))), 'image/png'));
    }
    async function run(action: () => Promise<void>) {
        setMsg('');
        try {
            await action();
        }
        catch (err) {
            setMsg(err instanceof Error ? err.message : 'That did not work');
        }
    }
    const copy = () => run(async () => {
        if (!navigator.clipboard?.write) {
            throw new Error('copy is not available here');
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': await cropBlob() })]);
        setMsg('copies, click on the canva of press ctrl+v to paste it');
    })
    const download = () => run(async () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await cropBlob());
        a.download = `${attachment.name.replace(/\.[^.]*$/, '')}-crop.png`;;
        a.click();
        URL.revokeObjectURL(a.href);
    })
    const useOnCanvas = () => run(async () => {
        const blob = await cropBlob(CANVAS_MAX_SIDE);
        console.log('1 viewer',source);
        const detail = { blob, handled: false, done: (text: string) => setMsg(text),source};
        setMsg('Adding to the canvas...');
        window.dispatchEvent(new CustomEvent('thinkloom:add-image', { detail }));
        if (!detail.handled) {
            throw new Error('The canvas is not open, oryou cannot edit it');
        }
    })
    const btn='rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100'
    return (
        <div>
            <div className='mb-2 flex items-center justify-between gap-3 text-sm' >
                <span className='truncate text-gray-200' >
                    {attachment.name}. {setsize(attachment.size)}
                </span>
                <a href={`${url}?download=1`} className='shrink-0 text-indigo-300 hover:underline hover:text-white ' >Download Original</a>
            </div>
            {canCrop && (
                <div className='mb-2 flex items-center flex-wrap gap-2' >
                    <span className='text-xs text-gray-200' >
                        Drag over the part you want
                        {attachment.kind === 'image' ? 'oruse the whole image' : '.'}
                    </span>
                    <button onClick={useOnCanvas} className='rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700' >use on canvas</button>
                    <button onClick={copy} className={`${btn} border-white text-white hover:text-gray-950`} >Copy</button>
                    <button onClick={download} className={`${btn} border-white text-white hover:text-gray-950`} >Download crop</button>
                    {sel && <button className={btn} onClick={()=>setSel(null)} >Clear</button>}
                </div>
            )}
            {msg && <p className='mb-2 text-sm text-gray-700' >{msg}</p>}
            {state === 'loading' && pages.length === 0 && <p className='text-sm text-gray-500' >Loading Preview...</p>}
            {state === 'error' && (<p className='text-sm text-red-500' >Could not preview this file</p>)}
            <div className='max-h-[70vh] space-y-3 overflow-auto rounded-lg bg-gray-100 p-3' >
                {pages.map((canvas, i) => (
                    <div className='mx-auto max-w-3xl' key={i} >
                        <PageView
                            canvas={canvas}
                            canCrop={canCrop}
                            box={sel && sel.page === i ? sel : null}
                            onBox={(fx, fy, fw, fh) => setSel({ page: i, fx, fy, fw, fh })}
                        />
                        {pages.length > 1 && <p className='mt-1 text-center text-xs text-gray-500' >Page{i + 1}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}
