import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    Layout, Save, Move, Loader2,
    ZoomIn, ZoomOut, Eye, EyeOff, Printer,
    Upload, Trash2, ImageIcon, Copy, Layers,
    ArrowUp, ArrowDown
} from 'lucide-react';
import 'react-resizable/css/styles.css';
const API_BAS = import.meta.env.VITE_API_URL;


const TEMPLATES = [

    { id: 1, name: "White", color: "#ffffff" },
    { id: 2, name: "Dental Blue", color: "#0ea5e9" },
    { id: 3, name: "Ocean Teal", color: "#0d9488" },
    { id: 4, name: "Luxury Gold", color: "#b45309" },
];

const A4_W = 794;
const A4_H = 1123;

// ── Zone boundaries (px from top of A4 page) ────────────────────────────────
// HEADER zone  : y = 0  →  HEADER_BOTTOM
// FOOTER zone  : FOOTER_TOP  →  A4_H
const HEADER_BOTTOM = 350;   // adjust to your preferred header height
const FOOTER_TOP    = 1050;   // adjust to your preferred footer start

// Zone IDs
const ZONE_HEADER = 'header';
const ZONE_FOOTER = 'footer';
const ZONE_BODY   = 'body';   // unrestricted middle zone (optional use)

let _idCounter = 1;
const genId = () => `img_${Date.now()}_${_idCounter++}`;

// ─────────────────────────────────────────────────────────────────────────────
// Clamp drag position to keep element fully inside its zone
// ─────────────────────────────────────────────────────────────────────────────
const clampToZone = (zone, x, y, w, h) => {
    let minY, maxY;
    if (zone === ZONE_HEADER) {
        minY = 0;
        maxY = HEADER_BOTTOM - h;
    } else if (zone === ZONE_FOOTER) {
        minY = FOOTER_TOP;
        maxY = A4_H - h;
    } else {
        minY = HEADER_BOTTOM;
        maxY = FOOTER_TOP - h;
    }
    const clampedX = Math.max(0, Math.min(A4_W - w, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));
    return { x: clampedX, y: clampedY };
};

// ─────────────────────────────────────────────────────────────────────────────
// DraggableImage — defined OUTSIDE LetterheadBuilder so React never remounts it.
// ─────────────────────────────────────────────────────────────────────────────
const DraggableImage = ({
    el, isPreview, isSelected,
    onSelect, onDragStop, onResizeStop, onDuplicate, onRemove
}) => {
    const nodeRef = useRef(null);

    // Bounds for react-draggable (keeps element within zone while dragging)
    const getBounds = () => {
        if (el.zone === ZONE_HEADER) return { left: 0, top: 0, right: A4_W - el.w, bottom: HEADER_BOTTOM - el.h };
        if (el.zone === ZONE_FOOTER) return { left: 0, top: FOOTER_TOP, right: A4_W - el.w, bottom: A4_H - el.h };
        return { left: 0, top: HEADER_BOTTOM, right: A4_W - el.w, bottom: FOOTER_TOP - el.h };
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: el.x, y: el.y }}
            handle=".img-drag-handle"
            disabled={isPreview}
            bounds={getBounds()}
            onStart={(e) => { e.stopPropagation(); onSelect(el.id); }}
            onStop={(_, d) => onDragStop(el.id, d.x, d.y)}
        >
            <div
                ref={nodeRef}
                style={{ position: 'absolute', width: el.w, height: el.h, zIndex: el.zIndex }}
                onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}
            >
                {/* Selection ring */}
                {isSelected && !isPreview && (
                    <div style={{
                        position: 'absolute', inset: -2,
                        border: '2px solid #3b82f6', borderRadius: 4,
                        pointerEvents: 'none', zIndex: 9999,
                    }} />
                )}

                {/* Zone badge */}
                {!isPreview && (
                    <div style={{
                        position: 'absolute', top: -26, left: 0,
                        background: el.zone === ZONE_HEADER ? '#7c3aed' : el.zone === ZONE_FOOTER ? '#0369a1' : '#374151',
                        color: '#fff',
                        padding: '1px 6px', borderRadius: 999,
                        fontSize: 8, fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap', userSelect: 'none',
                        opacity: isSelected ? 1 : 0.5,
                        zIndex: 9999,
                    }}>
                        {el.zone === ZONE_HEADER ? '↑ Header' : el.zone === ZONE_FOOTER ? '↓ Footer' : '⬛ Body'}
                    </div>
                )}

                {/* Drag handle */}
                {!isPreview && (
                    <div
                        className="img-drag-handle"
                        style={{
                            position: 'absolute', top: -26, left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#2563eb', color: '#fff',
                            padding: '2px 8px', borderRadius: 999,
                            cursor: 'grab', zIndex: 9999,
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 9, fontWeight: 900,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            whiteSpace: 'nowrap', userSelect: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            opacity: isSelected ? 1 : 0.6,
                        }}
                    >
                        <Move size={10} /> {el.label}
                    </div>
                )}

                {/* Quick actions */}
                {!isPreview && isSelected && (
                    <div style={{
                        position: 'absolute', top: -26, right: 0,
                        display: 'flex', gap: 3, zIndex: 9999,
                    }}>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onDuplicate(el.id); }}
                            style={{
                                background: '#334155', border: 'none', color: '#fff',
                                width: 22, height: 22, borderRadius: 4,
                                cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        ><Copy size={10} /></button>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onRemove(el.id); }}
                            style={{
                                background: '#dc2626', border: 'none', color: '#fff',
                                width: 22, height: 22, borderRadius: 4,
                                cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        ><Trash2 size={10} /></button>
                    </div>
                )}

                <ResizableBox
                    width={el.w}
                    height={el.h}
                    handle={
                        !isPreview ? (
                            <span style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: 16, height: 16,
                                background: '#2563eb', borderRadius: '4px 0 0 0',
                                cursor: 'se-resize', zIndex: 9999,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <svg width="8" height="8" viewBox="0 0 8 8">
                                    <path d="M1 7L7 1M4 7L7 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </span>
                        ) : <span />
                    }
                    onResizeStop={(_, d) => onResizeStop(el.id, d.size.width, d.size.height)}
                    minConstraints={[40, 40]}
                    maxConstraints={[A4_W, A4_H]}
                >
                    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                        <img
                            src={el.src}
                            alt={el.label}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'contain',
                                opacity: el.opacity,
                                userSelect: 'none', pointerEvents: 'none', display: 'block',
                            }}
                            draggable={false}
                        />
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const LetterheadBuilder = () => {
    const { slug } = useParams();
    const printRef = useRef(null);
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(1);
    const [zoom, setZoom] = useState(0.65);
    const [selectedId, setSelectedId] = useState(null);
    const [elements, setElements] = useState([]);
    const [nextZ, setNextZ] = useState(10);
    // Zone picker for new uploads
    const [uploadZone, setUploadZone] = useState(ZONE_HEADER);

    const current = TEMPLATES.find(t => t.id === selectedTemplate);

    // Fetch saved design
    useEffect(() => {
        const fetchDesign = async () => {
            try {
                const res = await axios.get(`${API_BAS}/api/letterhead/${slug}/fetch`);
                if (res.data.data) {
                    const d = res.data.data;
                    if (d.templateId) setSelectedTemplate(d.templateId);
                    if (d.elements?.length) setElements(d.elements);
                }
            } catch (_) { }
        };
        fetchDesign();
    }, [slug]);

    // Upload handler — place image in chosen zone with safe starting position
    const handleImageUpload = (e) => {
        Array.from(e.target.files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNextZ(z => {
                    const z1 = z + 1;
                    const w = 200, h = 100;
                    let startY;
                    if (uploadZone === ZONE_HEADER) startY = 10 + Math.floor(Math.random() * 20);
                    else if (uploadZone === ZONE_FOOTER) startY = FOOTER_TOP + 10 + Math.floor(Math.random() * 20);
                    else startY = HEADER_BOTTOM + 20 + Math.floor(Math.random() * 40);

                    const clamped = clampToZone(uploadZone, 40 + Math.floor(Math.random() * 80), startY, w, h);

                    setElements(prev => [...prev, {
                        id: genId(),
                        src: reader.result,
                        label: file.name.replace(/\.[^.]+$/, '').slice(0, 20),
                        x: clamped.x,
                        y: clamped.y,
                        w,
                        h,
                        opacity: 1,
                        zIndex: z1,
                        zone: uploadZone,
                    }]);
                    return z1;
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    // Element operations
    const removeElement = (id) => {
        setElements(prev => prev.filter(el => el.id !== id));
        setSelectedId(s => s === id ? null : s);
    };

    const duplicateElement = (id) => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        setNextZ(z => {
            const z1 = z + 1;
            const clamped = clampToZone(el.zone, el.x + 20, el.y + 20, el.w, el.h);
            setElements(prev => [...prev, { ...el, id: genId(), x: clamped.x, y: clamped.y, zIndex: z1 }]);
            return z1;
        });
    };

    const changeZone = (id, newZone) => {
        setElements(prev => prev.map(el => {
            if (el.id !== id) return el;
            let newY;
            if (newZone === ZONE_HEADER) newY = 10;
            else if (newZone === ZONE_FOOTER) newY = FOOTER_TOP + 10;
            else newY = HEADER_BOTTOM + 20;
            const clamped = clampToZone(newZone, el.x, newY, el.w, el.h);
            return { ...el, zone: newZone, x: clamped.x, y: clamped.y };
        }));
    };

    const bringToFront = (id) => {
        setNextZ(z => {
            const z1 = z + 1;
            setElements(prev => prev.map(el => el.id === id ? { ...el, zIndex: z1 } : el));
            return z1;
        });
    };

    const sendToBack = (id) => {
        setElements(prev => {
            const minZ = Math.max(1, Math.min(...prev.map(e => e.zIndex)) - 1);
            return prev.map(el => el.id === id ? { ...el, zIndex: minZ } : el);
        });
    };

    const updateOpacity = (id, val) =>
        setElements(prev => prev.map(el => el.id === id ? { ...el, opacity: parseFloat(val) } : el));

    const updateLabel = (id, val) =>
        setElements(prev => prev.map(el => el.id === id ? { ...el, label: val } : el));

    const handleDragStop = (id, x, y) => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        const clamped = clampToZone(el.zone, x, y, el.w, el.h);
        setElements(prev => prev.map(e => e.id === id ? { ...e, x: clamped.x, y: clamped.y } : e));
    };

    const handleResizeStop = (id, w, h) => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        const clamped = clampToZone(el.zone, el.x, el.y, w, h);
        setElements(prev => prev.map(e => e.id === id ? { ...e, w, h, x: clamped.x, y: clamped.y } : e));
    };

    const handleSelect = (id) => {
        setSelectedId(id);
        bringToFront(id);
    };

    // Print
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Letterhead',
        onBeforeGetContent: () => { setIsPreview(true); return Promise.resolve(); },
        onAfterPrint: () => setIsPreview(false),
    });

    // Save
    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BAS}/api/letterhead/${slug}/save`, {
                templateId: selectedTemplate,
                color: current.color,
                elements,
            });
            alert('Design Saved!');
        } catch {
            alert('Save failed! Images may be too large — try compressing them before uploading.');
        } finally {
            setLoading(false);
        }
    };

    const selectedEl = elements.find(e => e.id === selectedId);

    return (
        <div
            className="h-screen w-full bg-slate-950 flex flex-col md:flex-row overflow-hidden"
            onClick={() => setSelectedId(null)}
        >
            {/* ══════════════════════════ SIDEBAR ══════════════════════════ */}
            <aside className="w-full md:w-[285px] bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden shrink-0">

                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg"><Layout className="text-white" size={18} /></div>
                    <div>
                        <h1 className="text-white font-black uppercase text-sm tracking-tighter">Letterhead Builder</h1>
                        <p className="text-slate-500 text-[10px]">Upload → drag → position</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>

                    {/* Zone picker */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Upload To Zone</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { id: ZONE_HEADER, label: '↑ Header', color: '#7c3aed' },
                                { id: ZONE_BODY,   label: '⬛ Body',   color: '#374151' },
                                { id: ZONE_FOOTER, label: '↓ Footer', color: '#0369a1' },
                            ].map(z => (
                                <button
                                    key={z.id}
                                    onClick={(e) => { e.stopPropagation(); setUploadZone(z.id); }}
                                    style={{ borderColor: uploadZone === z.id ? z.color : undefined }}
                                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${uploadZone === z.id ? 'text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                >
                                    {z.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Upload zone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Add Images</label>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-20 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-slate-800/60 transition-all cursor-pointer"
                        >
                            <Upload size={20} className="text-slate-500 mb-1" />
                            <span className="text-[10px] uppercase font-black text-slate-500">Click to upload</span>
                            <span className="text-[9px] text-slate-600 mt-0.5">PNG · JPG · SVG · multiple OK</span>
                        </button>
                        <input ref={fileInputRef} type="file" onChange={handleImageUpload} className="hidden" accept="image/*" multiple />
                    </div>

                    {/* Layers list */}
                    {elements.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Layers ({elements.length})
                            </label>
                            <div className="space-y-1 max-h-44 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {[...elements].reverse().map(el => (
                                    <div
                                        key={el.id}
                                        onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${selectedId === el.id
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                                            : 'bg-slate-800 border-transparent text-slate-400 hover:border-slate-600'}`}
                                    >
                                        <img src={el.src} alt="" className="w-6 h-6 object-contain rounded bg-slate-700 p-0.5 shrink-0" />
                                        <span
                                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                                            style={{
                                                background: el.zone === ZONE_HEADER ? '#4c1d95' : el.zone === ZONE_FOOTER ? '#0c4a6e' : '#1f2937',
                                                color: el.zone === ZONE_HEADER ? '#c4b5fd' : el.zone === ZONE_FOOTER ? '#7dd3fc' : '#9ca3af',
                                            }}
                                        >
                                            {el.zone === ZONE_HEADER ? 'H' : el.zone === ZONE_FOOTER ? 'F' : 'B'}
                                        </span>
                                        <span className="text-[10px] font-bold truncate flex-1">{el.label}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                                            className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                                        ><Trash2 size={11} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected element panel */}
                    {selectedEl && (
                        <div className="space-y-3 bg-slate-800 rounded-xl p-3 border border-slate-700">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                                ✦ {selectedEl.label}
                            </p>

                            {/* Zone reassignment */}
                            <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Move to Zone</span>
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { id: ZONE_HEADER, label: '↑ Header', bg: '#4c1d95', active: '#7c3aed' },
                                        { id: ZONE_BODY,   label: '⬛ Body',   bg: '#1f2937', active: '#374151' },
                                        { id: ZONE_FOOTER, label: '↓ Footer', bg: '#0c4a6e', active: '#0369a1' },
                                    ].map(z => (
                                        <button
                                            key={z.id}
                                            onClick={(e) => { e.stopPropagation(); changeZone(selectedEl.id, z.id); }}
                                            style={{ background: selectedEl.zone === z.id ? z.active : z.bg }}
                                            className="text-[8px] uppercase font-black py-1.5 rounded-lg text-white transition-all"
                                        >
                                            {z.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Rename</span>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-white text-xs outline-none focus:border-blue-500"
                                    value={selectedEl.label}
                                    onChange={e => updateLabel(selectedEl.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>

                            <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">
                                    Opacity — {Math.round(selectedEl.opacity * 100)}%
                                </span>
                                <input
                                    type="range" min="0.05" max="1" step="0.05"
                                    value={selectedEl.opacity}
                                    onChange={e => updateOpacity(selectedEl.id, e.target.value)}
                                    className="w-full accent-blue-500"
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
                                {[['W', Math.round(selectedEl.w)], ['H', Math.round(selectedEl.h)]].map(([label, val]) => (
                                    <div key={label} className="bg-slate-900 rounded p-2 text-center">
                                        <div className="font-black text-white text-xs">{val}px</div>
                                        <div>{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Front', icon: <Layers size={10} />, fn: () => bringToFront(selectedEl.id) },
                                    { label: 'Back',  icon: <Layers size={10} />, fn: () => sendToBack(selectedEl.id) },
                                    { label: 'Clone', icon: <Copy size={10} />,   fn: () => duplicateElement(selectedEl.id) },
                                    { label: 'Delete',icon: <Trash2 size={10} />, fn: () => removeElement(selectedEl.id), danger: true },
                                ].map(btn => (
                                    <button
                                        key={btn.label}
                                        onClick={(e) => { e.stopPropagation(); btn.fn(); }}
                                        className={`text-[9px] uppercase font-black py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${btn.danger
                                            ? 'bg-red-900 hover:bg-red-800 text-red-300'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                    >
                                        {btn.icon} {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Theme color */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Theme</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedTemplate(t.id); }}
                                    className={`p-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all flex items-center gap-2 ${selectedTemplate === t.id
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Zoom */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                            Zoom — {Math.round(zoom * 100)}%
                        </label>
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.3, +(z - 0.05).toFixed(2))); }}
                                className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-2 rounded-lg flex items-center justify-center">
                                <ZoomOut size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setZoom(0.65); }}
                                className="px-3 bg-slate-800 text-slate-400 hover:text-white text-[9px] font-black uppercase rounded-lg">
                                Fit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2))); }}
                                className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-2 rounded-lg flex items-center justify-center">
                                <ZoomIn size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPreview(p => !p); }}
                        className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isPreview ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        {isPreview ? <><EyeOff size={13} /> Edit Mode</> : <><Eye size={13} /> Preview</>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-xl">
                        <Printer size={14} /> Print / PDF
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleSave(); }} disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-xl disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={13} /> : <Save size={14} />} Save
                    </button>
                </div>
            </aside>

            {/* ══════════════════════════ CANVAS ══════════════════════════ */}
            <main
                className="flex-1 overflow-auto flex items-start justify-center p-10"
                style={{
                    background: 'radial-gradient(#1e293b 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    backgroundColor: '#020617',
                }}
                onClick={() => setSelectedId(null)}
            >
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s' }}>

                    {/* A4 page */}
                    <div
                        ref={printRef}
                        className="print-container"
                        style={{
                            width: A4_W,
                            height: A4_H,
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 50px 120px rgba(0,0,0,0.7)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >


                        {/*
                          ── HEADER boundary line ──────────────────────────────────────────
                          Visible only in the editor (no-print class).
                          Dashed line at HEADER_BOTTOM with a small label.
                        */}
                        {!isPreview && (
                            <div
                                className="zone-guide no-print"
                                style={{
                                    position: 'absolute',
                                    top: HEADER_BOTTOM,
                                    left: 0,
                                    width: '100%',
                                    height: 0,
                                    borderTop: '1.5px dashed #7c3aed',
                                    zIndex: 8,
                                    pointerEvents: 'none',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: -10,
                                    right: 8,
                                    fontSize: 8,
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: '#7c3aed',
                                    background: '#fff',
                                    padding: '0 4px',
                                    userSelect: 'none',
                                }}>
                                    ─ Header Zone End
                                </span>
                            </div>
                        )}

                        {/*
                          ── FOOTER boundary line ──────────────────────────────────────────
                          Visible only in the editor (no-print class).
                        */}
                        {!isPreview && (
                            <div
                                className="zone-guide no-print"
                                style={{
                                    position: 'absolute',
                                    top: FOOTER_TOP,
                                    left: 0,
                                    width: '100%',
                                    height: 0,
                                    borderTop: '1.5px dashed #0369a1',
                                    zIndex: 8,
                                    pointerEvents: 'none',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: -10,
                                    right: 8,
                                    fontSize: 8,
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: '#0369a1',
                                    background: '#fff',
                                    padding: '0 4px',
                                    userSelect: 'none',
                                }}>
                                    ─ Footer Zone Start
                                </span>
                            </div>
                        )}

                        {/* Empty state */}
                        {elements.length === 0 && !isPreview && (
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex',
                                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                zIndex: 2, pointerEvents: 'none',
                            }}>
                                <ImageIcon size={44} color="#cbd5e1" />
                                <p style={{ color: '#94a3b8', fontWeight: 700, marginTop: 12, fontSize: 14 }}>
                                    Upload images, then drag them into position
                                </p>
                                <p style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                    Logo · Doctor stamp · Signature · Header banner
                                </p>
                            </div>
                        )}

                        {/* All image elements */}
                        {elements.map(el => (
                            <DraggableImage
                                key={el.id}
                                el={el}
                                isPreview={isPreview}
                                isSelected={selectedId === el.id}
                                onSelect={handleSelect}
                                onDragStop={handleDragStop}
                                onResizeStop={handleResizeStop}
                                onDuplicate={duplicateElement}
                                onRemove={removeElement}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <style>{`
                @media print {
                    @page { size: A4; margin: 0 !important; }
                    html, body {
                        margin: 0 !important; padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-container {
                        position: fixed !important; left: 0 !important; top: 0 !important;
                        width: 210mm !important; height: 297mm !important;
                        margin: 0 !important; padding: 0 !important;
                        transform: none !important; box-shadow: none !important;
                    }
                    /* Hide guide lines and zone tints completely when printing */
                    .no-print { display: none !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
};

export default LetterheadBuilder;