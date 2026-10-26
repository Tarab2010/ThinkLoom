import { Excalidraw, CaptureUpdateAction, reconcileElements } from "@excalidraw/excalidraw";
import '@excalidraw/excalidraw/index.css'
import type { AppState, BinaryFiles, Collaborator, ExcalidrawImperativeAPI, SocketId } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useState, type ComponentProps, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../lib/socket";
import { createPortal } from 'react-dom'
import { Users } from "lucide-react";
import type { Role } from "../store/projectstore";
import { createImageSync, type imageLike, type ImageSync, type IdeaSource } from "../lib/canvasImages";
type SceneElement = { id: string, version: number, versionNonce?: number } & imageLike;
type InitialData = ComponentProps<typeof Excalidraw>['initialData'];

type Person = { socketId: string, userId: string, name: string, role: Role };
type JoinReply = { ok: true, role: Role, elements: SceneElement[] } | { waiting: true } |  { error: string; ended?: boolean; blocked?: boolean };
export default function CanvasBoard({ projectId, meetingId, onRoleChange, onEnded, onAdmitted, members = [], onChangeRole, Onremoved }:
    { projectId: string; meetingId: string; onRoleChange?: (role: Role) => void; onEnded?: () => void; onAdmitted?: () => void; members?: { userId: string; name: string; role: Role }[]; onChangeRole?: (userId: string, role: Role) => void; Onremoved?: (msg?:string) => void }) {
    const [initial, setInitial] = useState<InitialData | null>(null);
    const [fromIdea, setFromIdea] = useState('')
    const OnremovedRef = useRef(Onremoved);
    const [role, setRole] = useState<Role | null>(null);
    const [online, setOnline] = useState<Person[]>([]);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'live' | 'offline'>('connecting');
    const [error, setError] = useState('');
    const [peopleOpen, setPeopleOpen] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const [lobby, setLobby] = useState<{ userId: string, name: string,wasKicked:boolean }[]>([]);
    const roleRef = useRef<Role | null>(null);
    const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const joined = useRef(false);
    const known = useRef(new Map<string, number>());
    const pendingOut = useRef(new Map<string, SceneElement>());
    const flushTimer = useRef<number | undefined>(undefined);
    const early = useRef<SceneElement[]>([]);
    const collaborators = useRef(new Map<SocketId, Collaborator>());
    const lastPointer = useRef(0);
    const onRoleRef = useRef(onRoleChange);
    const imagesRef = useRef<ImageSync | null>(null);
    const onEndedRef = useRef(onEnded);
    const onAdmittedRef = useRef(onAdmitted);
    const [statusslot, setStatusslot] = useState<HTMLElement | null>(null);
    const [peopleslot, setPeopleslot] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setStatusslot(document.getElementById('status-slot'));
        setPeopleslot(document.getElementById('people-slot'));
    }, [])
    useEffect(() => { onEndedRef.current = onEnded; })
    useEffect(() => { OnremovedRef.current = Onremoved; })
    useEffect(() => { onRoleRef.current = onRoleChange; })
    useEffect(() => {
        const images = createImageSync(`/projects/${projectId}/meetings/${meetingId}/canvas-files`, setError);
        imagesRef.current = images;
        images.setApi(apiRef.current);
        const onAddImage = (e: Event) => {
            const detail = (e as CustomEvent<{ blob: Blob; source?: IdeaSource, handled: boolean; done: (text: string) => void }>).detail;
            const r = roleRef.current;
            if (!apiRef.current || (r !== 'leader' && r !== 'editor')) {
                return;
            }
            detail.handled = true;
            imagesRef.current?.add(detail.blob, detail.source).then(() => detail.done('Add to the canvas')).catch((err) => detail.done(err instanceof Error ? err.message : 'could not add the picture'))
        }
        window.addEventListener('thinkloom:add-image', onAddImage);
        return () => {
            window.removeEventListener('thinkloom:add-image', onAddImage);
            images.dispose();
            imagesRef.current = null;
        }
    }, [projectId, meetingId])

    const flush = useCallback(() => {
        flushTimer.current = undefined;
        const socket = socketRef.current;
        if (!socket || !joined.current || pendingOut.current.size === 0) {
            return;
        }
        const all = [...pendingOut.current.values()];
        pendingOut.current.clear();
        for (let i = 0; i < all.length; i += 500) {
            socket.emit('scene:update', { elements: all.slice(i, i + 500) });
        }
    }, []);
    const queueChanges = useCallback((elements: readonly SceneElement[]) => {
        for (const el of elements) {
            if (known.current.get(el.id) !== el.version) {
                pendingOut.current.set(el.id, el);
                known.current.set(el.id, el.version);
            }
        }
        if (pendingOut.current.size > 0 && flushTimer.current === undefined) {
            flushTimer.current = window.setTimeout(flush, 60);

        }
    }, [flush]);
    const applyRemote = useCallback((remote: SceneElement[]) => {
        const api = apiRef.current;
        if (!api) {
            early.current.push(...remote);
            return;
        }
        for (const el of remote) {
            known.current.set(el.id, el.version);
        }
        const merged = reconcileElements(
            api.getSceneElementsIncludingDeleted() as never,
            remote as never,
            api.getAppState() as never
        );
        api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
    }, [])
    const handleApi = useCallback((api: ExcalidrawImperativeAPI | null) => {
        apiRef.current = api;
        imagesRef.current?.setApi(api)
        if (api && early.current.length > 0) {
            const waiting = early.current;
            early.current = [];
            applyRemote(waiting);
        }
    }, [applyRemote])
    useEffect(() => { onAdmittedRef.current = onAdmitted });
    useEffect(() => {
        const socket = createSocket();
        socketRef.current = socket;
        let closed = false;
        const join = () => {
            socket.emit('meeting:join', { projectId, meetingId }, (res: JoinReply) => {
                if (closed) {
                    return;
                }
                if('blocked' in res && res.blocked){
                    OnremovedRef.current?.();
                }
                if ('waiting' in res) {
                    setStatus('waiting');
                    return;
                }
                if ('error' in res) {
                    setError(res.error);
                    setStatus('offline');
                    if('blocked'in res && res.blocked){
                        OnremovedRef.current?.('you are blocked from this meeting')
                    }
                    if ('ended' in res && res.ended) {
                        onEndedRef.current?.();
                    }
                    return;
                }
                joined.current = true;
                setError('');
                setStatus('live');
                setRole(res.role);
                roleRef.current = res.role;
                onRoleRef.current?.(res.role);
                if (apiRef.current) {
                    applyRemote(res.elements);
                    queueChanges(apiRef.current.getSceneElementsIncludingDeleted() as unknown as SceneElement[]);
                    flush();
                }
                else {
                    known.current = new Map(res.elements.map((el) => [el.id, el.version]));
                    setInitial({ elements: res.elements, scrollToContent: true } as unknown as InitialData);

                }
            });
        }
        socket.on('connect', join);
        socket.on('disconnect', () => {
            joined.current = false;
            if (!closed) {
                setStatus('connecting');
            }
        });
        socket.on('connect_error', (err) => {

            if (closed) {
                return;
            }
            setStatus('offline');
            setError(err.message === 'Not Authenticated' ? 'Please login again' : 'Could not reachh the live session');
        });
        socket.on('scene:update', ({ elements }: { elements: SceneElement[] }) => {
            applyRemote(elements)
        });
        socket.on('pointer:update', (p: { socketId: string; userName: string; pointer: { x: number; y: number; tool: 'pointer' | 'laser' }; button: 'up' | 'down' }) => {
            const api = apiRef.current;
            if (!api) {
                return;
            }
            const id = p.socketId as SocketId;
            const next = new Map(collaborators.current);
            next.set(id, { ...next.get(id), pointer: p.pointer, button: p.button, username: p.userName } as Collaborator);
            collaborators.current = next;
            api.updateScene({ collaborators: next });
        });

        socket.on('presence', (users: Person[]) => {
            setOnline(users);
            const ids = new Set(users.map((u) => u.socketId));
            const next = new Map([...collaborators.current].filter(([id]) => ids.has(id)));
            collaborators.current = next;
            apiRef.current?.updateScene({ collaborators: next });
        });
        socket.on('meeting:role', ({ role: newRole }: { role: Role }) => {
            setRole(newRole);
            roleRef.current = newRole;
            if (newRole === 'viewer') {
                pendingOut.current.clear();
            }
            onRoleRef.current?.(newRole);
        });
        socket.on('meeting:denied', ({blocked}:{blocked?:boolean}) => {
            setStatus('offline');
            setError(blocked?'You can no longer join this meeting':'Leader has not allowed you to enter')
            if(blocked){
                OnremovedRef.current?.('You are blocked from this meeting');
            }
        });
        socket.on('meeting:kicked', () => {
            joined.current = false;
            setStatus('offline');
            setError('leader kicked you out of the meeting');
            OnremovedRef.current?.()
        });
        socket.on('meeting:ended', () => {
            joined.current = false;
            onEndedRef.current?.();
        })
        socket.on('meeting:admitted', () => {
            join();
            onAdmittedRef.current?.();
        })
        socket.on('lobby:update', setLobby);
        socket.on('meeting:error', ({ message }: { message: string }) => setError(message));

        socket.connect();
        return () => {
            closed = true;
            flush();
            joined.current = false;
            window.clearTimeout(flushTimer.current);
            socket.disconnect();
            socketRef.current = null;
        }
    }, [projectId, meetingId, applyRemote, queueChanges, flush]);
    function changecanvas(elements: readonly SceneElement[], files: BinaryFiles, appState: AppState) {
        const selId = Object.keys(appState.selectedElementIds ?? {})[0];
        const sel = selId ? elements.find((el) => el.id === selId) : undefined;
        const cd = sel?.customData as { title?: string; author: string } | undefined;
        setFromIdea(cd?.title ? `From idea:${cd.title} by ${cd.author ?? 'unknown'} ` : '')
        const r = roleRef.current;
        const canEditNow = r === 'leader' || r === 'editor';
        imagesRef.current?.sync(elements, files, canEditNow)
        if (!canEditNow) {
            return;
        }
        queueChanges(elements);
    }
    function canvasupdate(p: { pointer: { x: number; y: number; tool: 'pointer' | 'laser' }; button: 'down' | 'up' }) {
        const now = Date.now();
        if (now - lastPointer.current < 50) {
            return;
        }
        lastPointer.current = now;
        socketRef.current?.volatile.emit('pointer:update', { pointer: p.pointer, button: p.button });
    }
    const kick = (userId: string, name: string) => {
        if (!window.confirm(`Remove ${name} from this meeting ?`)) {
            return;
        }
        socketRef.current?.emit('meeting:kick', { userId }, (res: { ok?: true, error?: string }) => {
            if (res?.error) {
                setError(res.error);
            }
        })
    }

    const decide = (userId: string, allow: boolean) =>
        socketRef.current?.emit('lobby:decide', { userId, allow }, (res: { ok?: true, error?: string }) => {
            
            if (res?.error) {
                setError(res.error);
            }
        })
    const canEdit = role === 'leader' || role === 'editor';
    return (
        <div className="h-full flex flex-col min-h-0" >
            <div className="relative ">
                {statusslot && createPortal(<>
                    <span className={status === 'live' ? 'text-green-400' : 'text-amber-600'}>
                        {status === 'live' ? '● Live' : status === 'connecting' ? '● Reconnecting...' : status === 'waiting' ? '● Waiting for the leader to let you in...' : '● Offline'}
                        <span className="ml-2 text-gray-200">{canEdit ? 'You can edit' : 'View only'}</span>
                    </span>
                </>, statusslot
                )}
                {peopleslot && createPortal(<>
                    <button className="rounded-lg border bg-transparent px-3 py-1 hover:bg-[#111214]" onClick={() => setPeopleOpen((o) => !o)}>
                        <Users className="rounded-xl text-white" />
                    </button>
                    {peopleOpen && (
                        <div className="absolute right-0 top-9 z-30 w-72 max-w-[90vw] rounded-xl border bg-white p-2 shadow-lg">
                            {members.map((m) => {
                                const isOn = online.some((o) => o.userId === m.userId);
                                return (isOn && (
                                    <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5">
                                        <span className={`h-2 w-2 rounded-full ${isOn ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                                        {role === 'leader' && m.role !== 'leader' ? (
                                            <select className="rounded border text-xs" value={m.role} onChange={(e) => onChangeRole?.(m.userId, e.target.value as Role)}>
                                                <option value="editor">editor</option>
                                                <option value="viewer">viewer</option>
                                            </select>
                                        ) : <span className="text-xs text-gray-500">{m.role}</span>}
                                        {role === 'leader' && isOn && m.role !== 'leader' && (
                                            <button className="text-xs text-red-600 hover:underline" onClick={() => kick(m.userId, m.name)}>Kick</button>
                                        )}
                                    </div>
                                ));
                            })}
                        </div>
                    )}
                </>, peopleslot)}

            </div>

            {role === 'leader' && lobby.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)] space-y-2">
                    {lobby.map((u) => (
                        <div key={u.userId} className="rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg">
                            
                            <p className="text-sm font-medium">{u.name} wants to join
                                {u.wasKicked && <p className="text-red-500" >({u.name} was removed earlier)</p> }
                            </p>
                            
                            <div className="mt-2 flex gap-2">
                                <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white" onClick={() => decide(u.userId, true)}>Admit</button>
                                <button className="rounded-lg border bg-white px-3 py-1 text-sm" onClick={() => decide(u.userId, false)}>Deny</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            {fromIdea && <p className="mb-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700">{fromIdea}</p>}
            <div className=" min-h-[60vh] flex-1 overflow-hidden rounded-xl border bg-white">
                <Excalidraw
                    initialData={initial}
                    theme="dark"
                    excalidrawAPI={handleApi}
                    viewModeEnabled={role === 'viewer'}
                    isCollaborating
                    onChange={(elements, appState, files) => changecanvas(elements, files, appState)}
                    onPointerUpdate={canvasupdate}
                />
            </div>
        </div>
    )
}