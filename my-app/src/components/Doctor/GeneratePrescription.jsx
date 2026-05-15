import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Printer, Search, Plus, User, Loader2, Save, X, RefreshCw,
    Stethoscope, Tag, FlaskConical, Syringe, FileText, PlusCircle,
    Table2, Database, Trash2, ChevronDown, Bold, Italic, Underline,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight,Mail,
    MessageCircle, LogOut, Eye, CheckCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BAS = import.meta.env.VITE_API_URL;

/* ─── Global Styles ─────────────────────────────────────────────────────────── */
const globalStyles = `
  .rx-section {
    margin-bottom: 0;
    border-radius: 0;
    overflow: visible;
    border: 1px solid #d1d5db;
    border-bottom: none;
  }
  .rx-section:last-of-type { border-bottom: 1px solid #d1d5db; }
  .rx-section-header {
    background: #1976D2;
    color: #fff;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
  }
  .rx-section-body { background: #fff; padding: 14px 12px; }
  .rx-search-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
  .rx-search-input {
    flex: 1; border: 1px solid #c8cdd4; border-radius: 3px; padding: 7px 11px;
    font-size: 13px; color: #333; outline: none; background: #fff;
    transition: border-color 0.15s; height: 32px; box-sizing: border-box;
  }
  .rx-search-input:focus { border-color: #1976D2; box-shadow: 0 0 0 2px rgba(25,118,210,0.12); }
  .rx-add-btn {
    background: #00bfa5; color: #fff; border: none; border-radius: 3px;
    padding: 0 16px; height: 32px; font-size: 12px; font-weight: 700; cursor: pointer;
    white-space: nowrap; display: flex; align-items: center; gap: 5px;
    transition: background 0.15s; letter-spacing: 0.2px;
  }
  .rx-add-btn:hover { background: #00a896; }
  .rx-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .rx-table th {
    background: #f5f7fa; border: 1px solid #d1d5db; padding: 8px 10px;
    text-align: left; font-weight: 700; color: #374151; font-size: 12px;
  }
  .rx-table td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: middle; color: #374151; }
  .rx-table tr:hover td { background: #f8fafc; }
  .rx-table-input {
    width: 100%; border: 1px solid #d1d5db; border-radius: 2px; padding: 5px 8px;
    font-size: 12px; color: #374151; outline: none; background: #fff;
    box-sizing: border-box; transition: border-color 0.15s; height: 28px;
  }
  .rx-table-input:focus { border-color: #1976D2; box-shadow: 0 0 0 2px rgba(25,118,210,0.1); }
  .rx-del-btn {
    background: #ef4444; color: #fff; border: none; border-radius: 3px;
    width: 26px; height: 26px; font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
  }
  .rx-del-btn:hover { background: #dc2626; }
  .rx-suggestion-list {
    position: absolute; top: 100%; left: 0; z-index: 200; min-width: 240px;
    width: max-content; max-width: 380px; background: #fff; border: 1px solid #c8cdd4;
    border-radius: 4px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); overflow: hidden;
    max-height: 220px; overflow-y: auto; margin-top: 2px;
  }
  .rx-suggestion-item {
    padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9;
    font-size: 13px; font-weight: 600; color: #1e293b; transition: background 0.1s;
  }
  .rx-suggestion-item:last-child { border-bottom: none; }
  .rx-suggestion-item:hover { background: #eff6ff; }
  .rx-no-match {
    background: #fff8e1; border: 1px solid #fbbf24; border-radius: 4px;
    padding: 7px 12px; font-size: 12px; color: #92400e;
    display: flex; align-items: center; justify-content: space-between; margin-top: 4px; gap: 10px;
  }
  .rx-no-match-btn {
    background: #1976D2; color: #fff; border: none; border-radius: 3px;
    padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer;
    white-space: nowrap; display: flex; align-items: center; gap: 4px; transition: background 0.15s;
  }
  .rx-no-match-btn:hover { background: #1565c0; }

  /* ── CKEditor 4 faithful replica ── */
  .cke4-outer {
    border: 1px solid #b6b6b6;
    border-radius: 0;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    box-shadow: 0 1px 3px rgba(0,0,0,0.10);
  }
  /* toolbar rows */
  .cke4-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0px;
    padding: 2px 3px 1px 3px;
    background: linear-gradient(180deg, #f8f8f8 0%, #e4e4e4 100%);
    border-bottom: 1px solid #b6b6b6;
    min-height: 26px;
  }
  /* individual toolbar button */
  .cke4-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    cursor: pointer;
    padding: 0 2px;
    margin: 1px 0;
    transition: all 0.08s;
    color: #333;
    font-size: 11px;
    position: relative;
    white-space: nowrap;
  }
  .cke4-btn:hover {
    background: linear-gradient(180deg, #fff 0%, #e0e0e0 100%);
    border-color: #b0b0b0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.18);
  }
  .cke4-btn:active {
    background: linear-gradient(180deg, #d8d8d8 0%, #f0f0f0 100%);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.15);
  }
  .cke4-btn.active {
    background: linear-gradient(180deg, #dce9f7 0%, #c0d8f0 100%);
    border-color: #7baed4;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.10);
  }
  .cke4-btn svg { display: block; }
  /* separator */
  .cke4-sep {
    display: inline-block;
    width: 1px;
    height: 16px;
    background: #c0c0c0;
    margin: 0 3px;
    flex-shrink: 0;
    align-self: center;
  }
  /* select dropdowns */
  .cke4-select {
    height: 22px;
    border: 1px solid #b6b6b6;
    border-radius: 2px;
    background: linear-gradient(180deg, #fff 0%, #ebebeb 100%);
    font-size: 11px;
    color: #333;
    padding: 0 14px 0 4px;
    outline: none;
    cursor: pointer;
    margin: 1px 1px;
    -webkit-appearance: none;
    appearance: none;
    position: relative;
  }
  .cke4-select-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    margin: 1px 1px;
  }
  .cke4-select-wrap::after {
    content: '▾';
    position: absolute;
    right: 3px;
    font-size: 9px;
    color: #666;
    pointer-events: none;
    line-height: 1;
  }
  .cke4-select-wrap select {
    height: 22px;
    border: 1px solid #b6b6b6;
    border-radius: 2px;
    background: linear-gradient(180deg, #fff 0%, #ebebeb 100%);
    font-size: 11px;
    color: #333;
    padding: 0 18px 0 4px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }
  .cke4-select:focus, .cke4-select-wrap select:focus { border-color: #5b9bd5; }
  /* editable body */
  .cke4-body {
    min-height: 120px;
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    color: #333;
    line-height: 1.7;
    outline: none;
    background: #fff;
  }
  .cke4-body:empty:before {
    content: attr(data-placeholder);
    color: #aaa;
    font-style: italic;
    pointer-events: none;
  }
  .cke4-body ul { margin: 2px 0 2px 22px; padding: 0;  list-style-type: disc;}
  .cke4-body ol { margin: 2px 0 2px 22px; padding: 0; }
  .cke4-body p { margin: 0 0 4px 0; }
  .cke4-body li {  display: list-item; margin-bottom: 1px; }
  /* status bar at bottom */
  .cke4-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, #f8f8f8 0%, #e4e4e4 100%);
    border-top: 1px solid #b6b6b6;
    padding: 1px 6px;
    min-height: 18px;
  }
  .cke4-statusbar-path {
    font-size: 11px;
    color: #444;
    display: flex;
    align-items: center;
    gap: 0;
    font-family: Arial, Helvetica, sans-serif;
  }
  .cke4-statusbar-path-item {
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 2px;
    color: #1a5fa8;
    transition: background 0.1s;
  }
  .cke4-statusbar-path-item:hover { background: #dce8f7; }
  .cke4-resize-handle {
    width: 12px;
    height: 12px;
    cursor: se-resize;
    opacity: 0.5;
    flex-shrink: 0;
  }
  /* color button with swatch */
  .cke4-color-btn {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    cursor: pointer;
    padding: 1px 2px 1px 2px;
    margin: 1px 0;
    transition: all 0.08s;
    position: relative;
  }
  .cke4-color-btn:hover {
    background: linear-gradient(180deg, #fff 0%, #e0e0e0 100%);
    border-color: #b0b0b0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.18);
  }
  .cke4-color-swatch {
    width: 14px;
    height: 3px;
    border-radius: 1px;
    margin-top: 1px;
  }
  /* dropdown arrow attached to color btn */
  .cke4-color-group {
    display: inline-flex;
    align-items: center;
    margin: 1px 0;
  }
  .cke4-color-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 22px;
    border: 1px solid transparent;
    border-left: none;
    border-radius: 0 2px 2px 0;
    background: transparent;
    cursor: pointer;
    font-size: 7px;
    color: #444;
    padding: 0;
    margin: 1px 0;
    transition: all 0.08s;
  }
  .cke4-color-arrow:hover {
    background: linear-gradient(180deg, #fff 0%, #e0e0e0 100%);
    border-color: #b0b0b0;
  }

  /* Patient card */
  .rx-patient-card { background: #0f172a; color: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
  .rx-patient-card.revisit { background: #1565c0; }
  .rx-revisit-banner { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .rx-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 48px; margin-top: 16px; }
  .rx-btn-print { background: #334155; color: #fff; border: none; border-radius: 6px; padding: 14px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
  .rx-btn-print:hover { background: #1e293b; }
  .rx-btn-save { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 14px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
  .rx-btn-save:hover { background: #15803d; }
  .rx-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Modal */
  .rx-modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,23,42,0.7); backdrop-filter: blur(4px); }
  .rx-modal { background: #fff; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
  .rx-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; background: #fff; border-radius: 10px 10px 0 0; z-index: 10; }
  .rx-modal-body { padding: 18px 20px; }
  .rx-modal-footer { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid #f1f5f9; position: sticky; bottom: 0; background: #fff; border-radius: 0 0 10px 10px; }
  .rx-field-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 4px; }
  .rx-field-input { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 9px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none; color: #0f172a; transition: border-color 0.15s; box-sizing: border-box; }
  .rx-field-input:focus { border-color: #1976D2; }

  /* Dynamic table */
  .rx-dyn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
  @media (max-width: 640px) { .rx-dyn-grid { grid-template-columns: 1fr; } }

  /* Header */
  .rx-header { padding: 12px 8px; border-bottom: 1px solid #e8eaed; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; background: #fff; z-index: 30; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
  .rx-mobile-search { padding: 14px 8px; background: #f8f9fa; border-bottom: 1px solid #e2e8f0; display: flex; gap: 8px; }
  .rx-mobile-search-input { flex: 1; border: 1px solid #c8cdd4; border-radius: 3px; padding: 9px 14px; font-size: 13px; outline: none; }
  .rx-mobile-search-input:focus { border-color: #1976D2; }
  .rx-mobile-search-btn { background: #1976D2; color: #fff; border: none; border-radius: 3px; padding: 9px 18px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: background 0.15s; }
  .rx-mobile-search-btn:hover { background: #1565c0; }
  .rx-search-wrap { position: relative; flex: 1; }

  /* ── Preview Modal ── */
  /* ── Preview Modal ── */
.preview-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: stretch; justify-content: stretch;
  background: rgba(10,15,30,0.92); backdrop-filter: blur(8px);
}
.preview-modal {
  background: #f0f4f8;
  width: 100%; height: 100vh;
  display: grid;
  grid-template-columns: 1fr 380px;
  grid-template-rows: 60px 1fr;
  overflow: hidden;
}
.preview-modal-header {
  grid-column: 1 / -1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; background: #0f172a;
  border-bottom: 1px solid #1e293b;
  z-index: 10;
}
.preview-pdf-container {
  background: #e2e8f0;
  padding: 20px;
  display: flex; flex-direction: column; align-items: center;
  overflow-y: auto; gap: 12px;
  height: calc(100vh - 60px);
}
.preview-pdf-frame {
  width: 100%; border: none; border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  background: #fff;
  flex: 1;
  min-height: 0;
  height: 100%;
}
.preview-action-bar {
  background: #fff;
  border-left: 1px solid #e2e8f0;
  padding: 28px 24px;
  display: flex; flex-direction: column; gap: 14px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.preview-btn {
  border: none; border-radius: 10px; padding: 16px 20px;
  font-weight: 800; font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.8px; cursor: pointer;
  display: flex; align-items: center; justify-content: flex-start;
  gap: 12px; transition: all 0.18s; line-height: 1.2; width: 100%;
}
.preview-btn-wa { background: #25D366; color: #fff; }
.preview-btn-wa:hover { background: #1ebe5d; transform: translateX(3px); box-shadow: 0 4px 14px rgba(37,211,102,0.35); }
.preview-btn-wa:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
.preview-btn-print { background: #334155; color: #fff; }
.preview-btn-print:hover { background: #1e293b; transform: translateX(3px); box-shadow: 0 4px 14px rgba(51,65,85,0.3); }
.preview-btn-exit { background: #16a34a; color: #fff; }
.preview-btn-exit:hover { background: #15803d; transform: translateX(3px); box-shadow: 0 4px 14px rgba(22,163,74,0.3); }
.preview-btn-exit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
.wa-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 6px 12px;
  border-radius: 20px; width: 100%; justify-content: center;
}
.wa-status-badge.success { background: #dcfce7; color: #166534; }
.wa-status-badge.error { background: #fee2e2; color: #991b1b; }
.wa-status-badge.sending { background: #dbeafe; color: #1e40af; }
`;

/* ─── CKEditor 4 faithful Rich Text Editor ───────────────────────────────────── */
const RichTextEditor = forwardRef(({ value, onChange, placeholder }, ref) => {
    const editorRef = useRef(null);
    const isComposingRef = useRef(false);
    const lastHtmlRef = useRef('');
    const [pathItems, setPathItems] = useState(['body']);

    useImperativeHandle(ref, () => ({

        insertText: (text) => {
            const el = editorRef.current;
            if (!el) return;
            el.focus();

            const currentHtml = el.innerHTML.trim();

            if (!currentHtml || currentHtml === '<br>') {
                // Empty editor: create fresh list
                el.innerHTML = `<ul><li> ${text}</li></ul>`;
            } else {
                // Check if there's already a <ul> at the end
                const existingUl = el.querySelector('ul:last-child');
                if (existingUl) {
                    // Append a new <li> to the existing <ul>
                    const li = document.createElement('li');
                    li.textContent = text;
                    existingUl.appendChild(li);
                } else {
                    // No <ul> exists yet — wrap existing content and add new item
                    el.innerHTML += `<ul><li>${text}</li></ul>`;
                }
            }

            // Move cursor to end
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            const newHtml = el.innerHTML;
            lastHtmlRef.current = newHtml;
            if (onChange) onChange(newHtml);
            updatePathFromSelection();
        }
    }), [onChange]);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const incoming = value || '';
        if (incoming !== lastHtmlRef.current && incoming !== el.innerHTML) {
            el.innerHTML = incoming;
            lastHtmlRef.current = incoming;
        }
    }, [value]);

    const updatePathFromSelection = () => {
        const el = editorRef.current;
        if (!el) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { setPathItems(['body']); return; }
        let node = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const path = [];
        let cur = node;
        while (cur && cur !== el && cur !== document.body) {
            const tag = cur.nodeName?.toLowerCase();
            if (tag && tag !== '#document-fragment') path.unshift(tag);
            cur = cur.parentNode;
        }
        path.unshift('body');
        setPathItems(path.length ? path : ['body']);
    };

    const execCmd = (cmd, val = null) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, val);
        const newHtml = editorRef.current?.innerHTML || '';
        lastHtmlRef.current = newHtml;
        if (onChange) onChange(newHtml);
        setTimeout(updatePathFromSelection, 0);
    };

    const handleInput = () => {
        if (isComposingRef.current) return;
        const newHtml = editorRef.current?.innerHTML || '';
        lastHtmlRef.current = newHtml;
        if (onChange) onChange(newHtml);
    };

    const handleKeyUp = () => updatePathFromSelection();
    const handleMouseUp = () => updatePathFromSelection();

    /* ── Toolbar button component ── */
    const Btn = ({ title, onClick, children, active = false, style = {} }) => (
        <button
            type="button"
            title={title}
            onMouseDown={e => { e.preventDefault(); onClick && onClick(); }}
            className={`cke4-btn${active ? ' active' : ''}`}
            style={style}
        >
            {children}
        </button>
    );

    const Sep = () => <span className="cke4-sep" />;

    /* ── SVG icon helpers (matching CKEditor 4 icons as closely as possible) ── */
    const icons = {
        source: <svg width="16" height="14" viewBox="0 0 20 16" fill="currentColor"><path d="M6.5 0L0 8l6.5 8 1.5-1.8L2.2 8 8 1.8 6.5 0zm7 0L12 1.8 17.8 8 12 14.2l1.5 1.8L20 8l-6.5-8z" /></svg>,
        save: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13 0H2L0 2v12l2 2h12l2-2V3l-3-3zm-1 1l2 2h-2V1zm1 13H3l-1-1V2.4L3 1h1v4h8V1h.5L14 2.5V13l-1 1zM6 1h3v3H6V1zM8 9a2 2 0 100 4 2 2 0 000-4z" /></svg>,
        newpage: <svg width="13" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9 0H2L1 1v14l1 1h12l1-1V5l-5-5H9zm0 1.5L13.5 6H9V1.5zM2 15V1h6v6h6v8H2z" /></svg>,
        preview: <svg width="14" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 0C4 0 1 6 1 6s3 6 7 6 7-6 7-6-3-6-7-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" /></svg>,
        print: <svg width="14" height="12" viewBox="0 0 16 14" fill="currentColor"><path d="M4 0v3H1L0 4v7l1 1h2v2h10v-2h2l1-1V4l-1-1h-3V0H4zm1 1h6v2H5V1zM1 5h14v6h-2V9H3v2H1V5zm2 0h2v1H3V5zm10 5H3v3h10v-3z" /></svg>,
        templates: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 0h16v6H0V0zm0 7h7v9H0V7zm8 0h8v4H8V7zm0 5h8v4H8v-4z" /></svg>,
        cut: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 9.5L0 14l1.5 1.5 5.5-5C8 11.3 9 12 10 12c1.7 0 3-1.3 3-3 0-.5-.1-1-.4-1.4L15 5.2 14 4l-2.4 2.4C11 6.1 10.5 6 10 6 8.3 6 7 7.3 7 9c0 .2 0 .3.1.5L5.5 9.5zM10 10c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zM3 0L0 3l3 3 3-3L3 0z" /></svg>,
        copy: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4v8h8V4H4zM3 3h10v10H3V3zM1 1h9v1H1v9H0V1z" /></svg>,
        paste: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 0C4 0 3 1 3 2H1L0 3v12l1 1h10l1-1V3l-1-1h-2c0-1-1-2-2-2H5zm0 1h2c.6 0 1 .4 1 1v1H4V2c0-.6.4-1 1-1zM1 4h2v1h6V4h2v11H1V4z" /></svg>,
        pastetext: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 0C4 0 3 1 3 2H1L0 3v12l1 1h10l1-1V3l-1-1h-2c0-1-1-2-2-2H5zm0 1h2c.6 0 1 .4 1 1v1H4V2c0-.6.4-1 1-1zM1 4h2v1h6V4h2v11H1V4zm2 4h6v1H3V8zm0 2h6v1H3v-1zm0 2h4v1H3v-1z" /></svg>,
        pasteword: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 0C4 0 3 1 3 2H1L0 3v12l1 1h10l1-1V3l-1-1h-2c0-1-1-2-2-2H5zm0 1h2c.6 0 1 .4 1 1v1H4V2c0-.6.4-1 1-1zM1 4h2v1h6V4h2v11H1V4zm1.5 3l1 5h1l.5-3 .5 3h1l1-5h-1l-.5 3-.5-3h-1l-.5 3-.5-3h-1z" /></svg>,
        find: <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 9l4 4-1.5 1.5-4-4A5 5 0 112 7a5 5 0 018.5 2zM7 11A4 4 0 107 3a4 4 0 000 8z" /></svg>,
        selectall: <svg width="14" height="12" viewBox="0 0 16 14" fill="currentColor"><path d="M0 0h16v2H0V0zm0 4h12v2H0V4zm0 4h16v2H0V8zm0 4h12v2H0v-2z" /></svg>,
        spellcheck: <svg width="15" height="13" viewBox="0 0 18 14" fill="currentColor"><path d="M1 11l5-10h2l5 10h-2L10 9H4l-1 2H1zm4-4h4L7 4 5 7zm9 2l1-1 2 2 4-4 1 1-5 5-3-3z" /></svg>,
        scayt: <svg width="15" height="13" viewBox="0 0 18 14" fill="currentColor"><path d="M1 11l5-10h2l5 10h-2L10 9H4l-1 2H1zm4-4h4L7 4 5 7zm7 2v2h6v-2h-6z" /></svg>,
        textfield: <svg width="16" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="0" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M4 4v4M4 6h4M10 4h4" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        checkbox: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>,
        radio: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="7" cy="7" r="3" /></svg>,
        select: <svg width="16" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0.75" y="0.75" width="17" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M13 5l2 2-2 2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M2 4h9M2 8h9" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        textarea: <svg width="16" height="13" viewBox="0 0 18 14" fill="currentColor"><rect x="0.75" y="0.75" width="16.5" height="12.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 4h12M3 7h12M3 10h7" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        button: <svg width="16" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0.75" y="0.75" width="16.5" height="9.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M6 5.5h6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>,
        imagebutton: <svg width="14" height="13" viewBox="0 0 16 14" fill="currentColor"><rect x="0.75" y="0.75" width="14.5" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="5" cy="5" r="1.5" /><path d="M1 11l4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>,
        hiddenfield: <svg width="14" height="13" viewBox="0 0 16 14" fill="currentColor"><rect x="0.75" y="3.75" width="14.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M4 7h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 2" /></svg>,
        maximize: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M0 0v5h1V1h4V0H0zm9 0v1h4v4h1V0H9zm5 9h-1v4H9v1h5V9zM1 9H0v5h5v-1H1V9z" /></svg>,
        showblocks: <svg width="14" height="13" viewBox="0 0 16 14" fill="currentColor"><rect x="0.5" y="0.5" width="15" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" /><rect x="0.5" y="8.5" width="15" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>,
        bold: <svg width="10" height="13" viewBox="0 0 12 14" fill="currentColor"><path d="M2 0h5.5C9.4 0 11 1.6 11 3.5c0 1-.4 1.9-1.1 2.5C11 6.5 12 7.7 12 9.2 12 11.3 10.3 13 8.2 13H2V0zm2 2v3.5h3.5C8.3 5.5 9 4.8 9 3.8S8.3 2 7.5 2H4zm0 5.5V11h4.2c1 0 1.8-.8 1.8-1.8S9.2 7.5 8.2 7.5H4z" /></svg>,
        italic: <svg width="8" height="13" viewBox="0 0 10 14" fill="currentColor"><path d="M4 0h6v2H8L5 12h2v2H1v-2h2L6 2H4V0z" /></svg>,
        underline: <svg width="10" height="13" viewBox="0 0 12 14" fill="currentColor"><path d="M2 0v7a4 4 0 008 0V0h-2v7a2 2 0 01-4 0V0H2zM0 13h12v1H0v-1z" /></svg>,
        strike: <svg width="13" height="12" viewBox="0 0 14 13" fill="currentColor"><path d="M6 0h2v4H6V0zM3 3h8v2H3V3zM0 7h14v1H0V7zm3 3h8v1H3v-1zm3 1h2v3H6v-3z" /></svg>,
        subscript: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M1 0l4 5 4-5H1zm4 5v5H5V5H1zm6 5h4v1l-3 3h3v1h-4v-1l3-3h-3v-1z" /></svg>,
        superscript: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M1 3l4 5 4-5H1zm4 5v5H5V8H1zm6-8h4v1l-3 3h3v1h-4V4l3-3h-3V0z" /></svg>,
        removeformat: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M0 12h6v2H0v-2zM8.5 0L11 2.5 4.5 9H2V6.5L8.5 0zm3 0l2.5 2.5-1.5 1.5L10 1.5 11.5 0zM7 11l2-2 3 3-2 2-3-3z" /></svg>,
        copyformat: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1h7v1L4 8l.5.5L9 4l1 1L3 13l-2-2L3 1zM9 0l2 2-1 1-2-2 1-1z" opacity="0.7" /><path d="M8 6l4 4v2h-2L6 8l2-2z" /></svg>,
        clearformat: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M0 12h6v2H0v-2zM8.5 0L11 2.5 4.5 9H2V6.5L8.5 0zM1 0l13 13-1 1L0 1l1-1z" opacity="0.8" /></svg>,
        numberedlist: <svg width="15" height="12" viewBox="0 0 18 13" fill="currentColor"><path d="M0 0h2v4H0V0zm0 5h3v1H1v1h2v1H0V5zm1 8H0v-1h1v-1H0V9h3v5H1v-1zM5 1h13v2H5V1zm0 5h13v2H5V6zm0 5h13v2H5v-2z" /></svg>,
        bulletlist: <svg width="15" height="12" viewBox="0 0 18 13" fill="currentColor"><circle cx="1.5" cy="2" r="1.5" /><circle cx="1.5" cy="7" r="1.5" /><circle cx="1.5" cy="12" r="1.5" /><path d="M5 1h13v2H5V1zm0 5h13v2H5V6zm0 5h13v2H5v-2z" /></svg>,
        outdent: <svg width="15" height="12" viewBox="0 0 18 13" fill="currentColor"><path d="M0 0h18v2H0V0zm4 3l-4 4 4 4V3zm2 4h12V9H6V7zm-6 4h18v2H0v-2z" /></svg>,
        indent: <svg width="15" height="12" viewBox="0 0 18 13" fill="currentColor"><path d="M0 0h18v2H0V0zm14 3v8l4-4-4-4zm-8 4h12V9H6V7zm-6 4h18v2H0v-2z" /></svg>,
        blockquote: <svg width="13" height="12" viewBox="0 0 14 12" fill="currentColor"><path d="M0 0h5v5H3a3 3 0 003 3v2A5 5 0 010 5V0zm8 0h5v5h-2a3 3 0 003 3v2a5 5 0 01-5-5V0z" opacity="0.85" /></svg>,
        div: <svg width="13" height="12" viewBox="0 0 14 12" fill="currentColor"><rect x="0.75" y="0.75" width="12.5" height="10.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 4h8M3 8h5" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        alignleft: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><path d="M0 0h16v2H0V0zm0 4h12v2H0V4zm0 4h16v2H0V8zm0 4h12v2H0v-2z" /></svg>,
        aligncenter: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><path d="M0 0h16v2H0V0zm2 4h12v2H2V4zm-2 4h16v2H0V8zm2 4h12v2H2v-2z" /></svg>,
        alignright: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><path d="M0 0h16v2H0V0zm4 4h12v2H4V4zm-4 4h16v2H0V8zm4 4h12v2H4v-2z" /></svg>,
        justify: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><path d="M0 0h16v2H0V0zm0 4h16v2H0V4zm0 4h16v2H0V8zm0 4h12v2H0v-2z" /></svg>,
        ltr: <svg width="14" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M1 0h10v2H1V0zm0 3h8v2H1V3zm0 3h10v2H1V6zm0 3h8v2H1V9zm11-9h2v12h-2V0zm2 0l3 3-3 3V0z" /></svg>,
        rtl: <svg width="14" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M15 0H5v2h10V0zm0 3H7v2h8V3zm0 3H5v2h10V6zm0 3H7v2h8V9zM4 0H2v12h2V0zm-2 0L-1 3l3 3V0z" /></svg>,
        language: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 1c-2 2-3 4-3 6s1 4 3 6M7 1c2 2 3 4 3 6s-1 4-3 6M1 7h12" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        link: <svg width="14" height="12" viewBox="0 0 18 12" fill="currentColor"><path d="M7 2H4a4 4 0 000 8h3V8H4a2 2 0 010-4h3V2zm4 0v2h3a2 2 0 010 4h-3v2h3a4 4 0 000-8h-3zm-5 3v2h6V5H6z" /></svg>,
        unlink: <svg width="14" height="12" viewBox="0 0 18 12" fill="currentColor"><path d="M4 2H3A4 4 0 003 10h1V8H3a2 2 0 010-4h1V2zm7 0v2h1a2 2 0 010 4h-1v2h1a4 4 0 000-8h-1zm-5 3v2h4V5H6zM1 0l16 12-1 1L0 1l1-1z" opacity="0.7" /></svg>,
        anchor: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="3" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 5v8M4 10c0 2 6 2 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M2 8h10" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>,
        image: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><rect x="0.75" y="0.75" width="14.5" height="11.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="4.5" cy="4.5" r="1.5" /><path d="M1 11l4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>,
        flash: <svg width="11" height="14" viewBox="0 0 12 16" fill="currentColor"><path d="M7 0L2 9h5l-2 7 7-10H7L9 0H7z" /></svg>,
        table: <svg width="14" height="12" viewBox="0 0 16 13" fill="currentColor"><rect x="0.75" y="0.75" width="14.5" height="11.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M1 4h14M1 8h14M6 1v11M11 1v11" stroke="currentColor" strokeWidth="1" fill="none" /></svg>,
        hline: <svg width="14" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M0 6h16v2H0V6z" /></svg>,
        smiley: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="5" cy="5.5" r="1" /><circle cx="9" cy="5.5" r="1" /><path d="M4.5 9a3 3 0 005 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>,
        specialchar: <svg width="14" height="13" viewBox="0 0 16 14" fill="currentColor"><path d="M3 0h10v2l-4 4h4v2H3V6l4-4H3V0zM3 8h3v6H3V8zm5 0h3l2 6h-2l-.5-1.5h-2L8.5 14H7l1-6zm1.5 1.5l-.7 2h1.4l-.7-2z" /></svg>,
        pagebreak: <svg width="14" height="13" viewBox="0 0 16 14" fill="currentColor"><path d="M0 0h16v5H0V0zm0 9h16v5H0V9zm5 2l2-2 2 2" stroke="currentColor" strokeWidth="1" fill="none" /><path d="M6 5l1 2 1-2" fill="currentColor" /></svg>,
        iframe: <svg width="15" height="12" viewBox="0 0 17 13" fill="currentColor"><rect x="0.75" y="0.75" width="15.5" height="11.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M1 4h15" stroke="currentColor" strokeWidth="1" fill="none" /><circle cx="3" cy="2.5" r="0.8" /><circle cx="5.5" cy="2.5" r="0.8" /><circle cx="8" cy="2.5" r="0.8" /></svg>,
        fontcolor: <svg width="12" height="13" viewBox="0 0 13 14" fill="currentColor"><path d="M1 11l4.5-11h2L12 11h-2l-1-3H4l-1 3H1zm4-5h3.5L7 3 5 6z" /></svg>,
        bgcolor: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M2 10l5-10 5 10H2zm4-2h2L7 5 6 8zm5 1c0 1.5 1 2.5 0 4-1.5-1-0-4 0-4z" /></svg>,
        help: <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5.5 5.5a1.5 1.5 0 013 0c0 1-1.5 1.5-1.5 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="7" cy="11" r="0.8" /></svg>,
        undo: <svg width="13" height="12" viewBox="0 0 14 12" fill="currentColor"><path d="M3.7 4H8c2.8 0 5 2.2 5 5s-2.2 5-5 5H4v-2h4c1.7 0 3-1.3 3-3s-1.3-3-3-3H3.7L6 8 4.6 9.4 0 5l4.6-4.6L6 1.8 3.7 4z" /></svg>,
        redo: <svg width="13" height="12" viewBox="0 0 14 12" fill="currentColor"><path d="M10.3 4H6C3.2 4 1 6.2 1 9s2.2 5 5 5h4v-2H6c-1.7 0-3-1.3-3-3s1.3-3 3-3h4.3L8 8l1.4 1.4L14 5l-4.6-4.6L8 1.8l2.3 2.2z" /></svg>,
    };

    /* ── Select wrapper ── */
    const SelectBtn = ({ value, options, onChange, style = {} }) => (
        <div className="cke4-select-wrap" style={style}>
            <select
                value={value}
                onChange={e => { onChange(e.target.value); e.target.value = value; }}
                onMouseDown={e => e.stopPropagation()}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );

    /* ── Color button with dropdown arrow ── */
    const ColorBtn = ({ title, icon, color, onMain, style = {} }) => (
        <div className="cke4-color-group" style={style}>
            <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onMain(); }} className="cke4-color-btn">
                {icon}
                <div className="cke4-color-swatch" style={{ background: color }} />
            </button>
            <button type="button" title={`${title} options`} onMouseDown={e => { e.preventDefault(); }} className="cke4-color-arrow">▾</button>
        </div>
    );

    return (
        <div className="cke4-outer">
            {/* ── Row 1: File / Edit / Spell / Form / View ── */}
            <div className="cke4-toolbar">
                <Btn title="Source" onClick={() => { }}>{icons.source}</Btn>
                <Sep />
                <Btn title="Save" onClick={() => { }}>{icons.save}</Btn>
                <Btn title="New Page" onClick={() => { }}>{icons.newpage}</Btn>
                <Btn title="Preview" onClick={() => { }}>{icons.preview}</Btn>
                <Btn title="Print" onClick={() => { }}>{icons.print}</Btn>
                <Btn title="Templates" onClick={() => { }}>{icons.templates}</Btn>
                <Sep />
                <Btn title="Cut" onClick={() => execCmd('cut')}>{icons.cut}</Btn>
                <Btn title="Copy" onClick={() => execCmd('copy')}>{icons.copy}</Btn>
                <Btn title="Paste" onClick={() => execCmd('paste')}>{icons.paste}</Btn>
                <Btn title="Paste as plain text" onClick={() => { }}>{icons.pastetext}</Btn>
                <Btn title="Paste from Word" onClick={() => { }}>{icons.pasteword}</Btn>
                <Sep />
                <Btn title="Find and Replace" onClick={() => { }}>{icons.find}</Btn>
                <Btn title="Select All" onClick={() => execCmd('selectAll')}>{icons.selectall}</Btn>
                <Sep />
                <Btn title="Check Spelling" onClick={() => { }}>{icons.spellcheck}</Btn>
                <Btn title="Enable SCAYT" onClick={() => { }}>{icons.scayt}</Btn>
                <Sep />
                <Btn title="Form" onClick={() => { }}><svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 4h8M3 7h5M3 10h6" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg></Btn>
                <Btn title="Text Field" onClick={() => { }}>{icons.textfield}</Btn>
                <Btn title="Checkbox" onClick={() => { }}>{icons.checkbox}</Btn>
                <Btn title="Radio Button" onClick={() => { }}>{icons.radio}</Btn>
                <Btn title="Select Box" onClick={() => { }}>{icons.select}</Btn>
                <Btn title="Textarea" onClick={() => { }}>{icons.textarea}</Btn>
                <Btn title="Button" onClick={() => { }}>{icons.button}</Btn>
                <Btn title="Image Button" onClick={() => { }}>{icons.imagebutton}</Btn>
                <Btn title="Hidden Field" onClick={() => { }}>{icons.hiddenfield}</Btn>
                <Sep />
                <Btn title="Maximize" onClick={() => { }}>{icons.maximize}</Btn>
                <Btn title="Show Blocks" onClick={() => { }}>{icons.showblocks}</Btn>
            </div>

            {/* ── Row 2: Format / Lists / Align / Link / Insert ── */}
            <div className="cke4-toolbar">
                <Btn title="Bold" onClick={() => execCmd('bold')}>{icons.bold}</Btn>
                <Btn title="Italic" onClick={() => execCmd('italic')}>{icons.italic}</Btn>
                <Btn title="Underline" onClick={() => execCmd('underline')}>{icons.underline}</Btn>
                <Btn title="Strikethrough" onClick={() => execCmd('strikeThrough')}>{icons.strike}</Btn>
                <Btn title="Subscript" onClick={() => execCmd('subscript')}>{icons.subscript}</Btn>
                <Btn title="Superscript" onClick={() => execCmd('superscript')}>{icons.superscript}</Btn>
                <Sep />
                <Btn title="Remove Format" onClick={() => execCmd('removeFormat')}>{icons.removeformat}</Btn>
                <Btn title="Copy Formatting" onClick={() => { }}>{icons.copyformat}</Btn>
                <Btn title="Clear Formatting" onClick={() => { }}>{icons.clearformat}</Btn>
                <Sep />
                <Btn title="Insert/Remove Numbered List" onClick={() => execCmd('insertOrderedList')}>{icons.numberedlist}</Btn>
                <Btn title="Insert/Remove Bulleted List" onClick={() => execCmd('insertUnorderedList')} active={true}>{icons.bulletlist}</Btn>
                <Btn title="Decrease Indent" onClick={() => execCmd('outdent')}>{icons.outdent}</Btn>
                <Btn title="Increase Indent" onClick={() => execCmd('indent')}>{icons.indent}</Btn>
                <Sep />
                <Btn title="Block Quote" onClick={() => execCmd('formatBlock', 'blockquote')}>{icons.blockquote}</Btn>
                <Btn title="Insert Div" onClick={() => { }}>{icons.div}</Btn>
                <Sep />
                {/* Align Left is active by default as shown in screenshot */}
                <Btn title="Align Left" onClick={() => execCmd('justifyLeft')} active={true}>{icons.alignleft}</Btn>
                <Btn title="Center" onClick={() => execCmd('justifyCenter')}>{icons.aligncenter}</Btn>
                <Btn title="Align Right" onClick={() => execCmd('justifyRight')}>{icons.alignright}</Btn>
                <Btn title="Justify" onClick={() => execCmd('justifyFull')}>{icons.justify}</Btn>
                <Sep />
                <Btn title="Text direction from left to right" onClick={() => { }} active={true}>{icons.ltr}</Btn>
                <Btn title="Text direction from right to left" onClick={() => { }}>{icons.rtl}</Btn>
                <Sep />
                <Btn title="Set Language" onClick={() => { }}>{icons.language}</Btn>
                <Sep />
                <Btn title="Link" onClick={() => { const url = prompt('Enter URL:'); if (url) execCmd('createLink', url); }}>{icons.link}</Btn>
                <Btn title="Unlink" onClick={() => execCmd('unlink')}>{icons.unlink}</Btn>
                <Sep />
                <Btn title="Anchor" onClick={() => { }}>{icons.anchor}</Btn>
                <Sep />
                <Btn title="Image" onClick={() => { }}>{icons.image}</Btn>
                <Btn title="Flash" onClick={() => { }}>{icons.flash}</Btn>
                <Btn title="Table" onClick={() => { }}>{icons.table}</Btn>
                <Btn title="Insert Horizontal Line" onClick={() => execCmd('insertHorizontalRule')}>{icons.hline}</Btn>
                <Btn title="Insert Smiley" onClick={() => { }}>{icons.smiley}</Btn>
                <Btn title="Insert Special Character" onClick={() => { }}>{icons.specialchar}</Btn>
                <Btn title="Page Break for Printing" onClick={() => { }}>{icons.pagebreak}</Btn>
                <Btn title="IFrame" onClick={() => { }}>{icons.iframe}</Btn>
            </div>

            {/* ── Row 3: Styles / Font / Color / Help ── */}
            <div className="cke4-toolbar">
                <SelectBtn
                    value=""
                    options={[
                        { value: '', label: 'Styles' },
                        { value: 'h1', label: 'Heading 1' },
                        { value: 'h2', label: 'Heading 2' },
                        { value: 'h3', label: 'Heading 3' },
                        { value: 'p', label: 'Normal' },
                    ]}
                    onChange={v => { if (v) execCmd('formatBlock', v); }}
                    style={{ marginRight: 2 }}
                />
                <SelectBtn
                    value=""
                    options={[
                        { value: '', label: 'Format' },
                        { value: 'h1', label: 'Heading 1' },
                        { value: 'h2', label: 'Heading 2' },
                        { value: 'h3', label: 'Heading 3' },
                        { value: 'h4', label: 'Heading 4' },
                        { value: 'p', label: 'Normal' },
                        { value: 'pre', label: 'Formatted' },
                        { value: 'blockquote', label: 'Block Quote' },
                    ]}
                    onChange={v => { if (v) execCmd('formatBlock', v); }}
                    style={{ marginRight: 2 }}
                />
                <SelectBtn
                    value=""
                    options={[
                        { value: '', label: 'Font' },
                        { value: 'Arial', label: 'Arial' },
                        { value: 'Times New Roman', label: 'Times New Roman' },
                        { value: 'Courier New', label: 'Courier New' },
                        { value: 'Georgia', label: 'Georgia' },
                        { value: 'Verdana', label: 'Verdana' },
                        { value: 'Tahoma', label: 'Tahoma' },
                        { value: 'Trebuchet MS', label: 'Trebuchet MS' },
                    ]}
                    onChange={v => { if (v) execCmd('fontName', v); }}
                    style={{ marginRight: 2 }}
                />
                <SelectBtn
                    value=""
                    options={[
                        { value: '', label: 'Size' },
                        { value: '1', label: '8pt' },
                        { value: '2', label: '10pt' },
                        { value: '3', label: '12pt' },
                        { value: '4', label: '14pt' },
                        { value: '5', label: '18pt' },
                        { value: '6', label: '24pt' },
                        { value: '7', label: '36pt' },
                    ]}
                    onChange={v => { if (v) execCmd('fontSize', v); }}
                    style={{ marginRight: 2 }}
                />
                <Sep />
                {/* Font Color */}
                <ColorBtn
                    title="Text Color"
                    icon={icons.fontcolor}
                    color="#000000"
                    onMain={() => { const c = prompt('Hex color (e.g. #ff0000):'); if (c) execCmd('foreColor', c); }}
                />
                {/* Background Color */}
                <ColorBtn
                    title="Background Color"
                    icon={icons.bgcolor}
                    color="#ffff00"
                    onMain={() => { const c = prompt('Hex color (e.g. #ffff00):'); if (c) execCmd('hiliteColor', c); }}
                />
                <Sep />
                <Btn title="Maximize" onClick={() => { }}>{icons.maximize}</Btn>
                <Btn title="Show Blocks" onClick={() => { }}>{icons.showblocks}</Btn>
                <Sep />
                <Btn title="Help" onClick={() => { }}>{icons.help}</Btn>
            </div>

            {/* ── Editable body ── */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyUp={handleKeyUp}
                onMouseUp={handleMouseUp}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
                data-placeholder={placeholder || 'Type symptoms here...'}
                className="cke4-body"
            />

            {/* ── Status bar (body > ul > li path) ── */}
            <div className="cke4-statusbar">
                <div className="cke4-statusbar-path">
                    {pathItems.map((item, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span style={{ color: '#888', padding: '0 1px', userSelect: 'none' }}> </span>}
                            <span className="cke4-statusbar-path-item">{item}</span>
                        </React.Fragment>
                    ))}
                </div>
                <svg className="cke4-resize-handle" viewBox="0 0 12 12" fill="#888">
                    <path d="M10 2L2 10M12 6L6 12M12 2L2 12" strokeWidth="1.5" stroke="#888" fill="none" />
                </svg>
            </div>
        </div>
    );
});
RichTextEditor.displayName = 'RichTextEditor';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [236, 72, 153];
};

const calculateValidityUpto = (patientCreatedAt, appointmentValidity) => {
    if (!patientCreatedAt || !appointmentValidity) return '—';
    const createdDate = new Date(patientCreatedAt);
    const validityDays = Number(appointmentValidity);
    if (isNaN(createdDate.getTime()) || isNaN(validityDays)) return '—';
    const validUpto = new Date(createdDate);
    validUpto.setDate(validUpto.getDate() + validityDays);
    return validUpto.toLocaleDateString('en-GB');
};

const A4_H = 841.89; const A4_W = 595.28; const MARGIN_L = 17; const MARGIN_R = 590;
const USABLE_W = MARGIN_R - MARGIN_L; const HEADER_BOTTOM_PT = 270;
const FOOTER_TOP_PT = A4_H - 80; const PAGE2_START_Y = 110;

const EMPTY_MED = { name: '', brandName: '', strength: '', unit_per_Dose: '', timing: '', duration: '', action: '', instructions: '', category: '', saltComposition: '' };
const EMPTY_INV = { testName: '', category: '', action: '' };
const EMPTY_VAC = { vaccineName: '', note: '', action: '' };
const EMPTY_REPORT = { reportName: '', impression: '', action: '', date: new Date().toISOString().split('T')[0] };

const buildEmptyRow = (columns = []) => {
    const row = { _rowId: `row-${Date.now()}-${Math.random()}` };
    columns.forEach(col => { row[col.name] = ''; });
    return row;
};

const parseHtmlToSegments = (html) => {
    if (!html || !html.trim()) return [];
    const segments = [];
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const DEFAULT_COLOR = '#1e293b';
    const walkNode = (node, ctx) => {
        const tag = node.nodeName ? node.nodeName.toLowerCase() : '';
        let newCtx = { ...ctx };
        if (tag === 'b' || tag === 'strong') newCtx.bold = true;
        if (tag === 'i' || tag === 'em') newCtx.italic = true;
        if (tag === 'u') newCtx.underline = true;
        if (tag === 'span' || tag === 'font') { const c = (node.style && node.style.color) ? node.style.color : null; if (c) newCtx.color = c; }
        if (tag === 'ul') { let liIdx = 0; for (const child of node.childNodes) { if (child.nodeName.toLowerCase() === 'li') { walkNode(child, { ...newCtx, bullet: true, ordered: false, listIndex: liIdx }); liIdx++; } else walkNode(child, newCtx); } return; }
        if (tag === 'ol') { let liIdx = 1; for (const child of node.childNodes) { if (child.nodeName.toLowerCase() === 'li') { walkNode(child, { ...newCtx, bullet: true, ordered: true, listIndex: liIdx }); liIdx++; } else walkNode(child, newCtx); } return; }
        if (tag === 'li') { segments.push({ ...newCtx, text: '', isListItem: true }); for (const child of node.childNodes) walkNode(child, newCtx); segments.push({ ...newCtx, text: '\n', isNewline: true }); return; }
        if (tag === 'br') { segments.push({ ...newCtx, text: '\n', isNewline: true }); return; }
        if (tag === 'p' || tag === 'div') { for (const child of node.childNodes) walkNode(child, newCtx); segments.push({ ...newCtx, text: '\n', isNewline: true }); return; }
        if (node.nodeType === Node.TEXT_NODE) { const text = node.textContent || ''; if (text) segments.push({ ...newCtx, text }); return; }
        for (const child of node.childNodes) walkNode(child, newCtx);
    };
    const initCtx = { bold: false, italic: false, underline: false, color: DEFAULT_COLOR, bullet: false, ordered: false, listIndex: 0, isListItem: false, isNewline: false };
    for (const child of tmp.childNodes) walkNode(child, initCtx);
    return segments;
};

const renderHtmlSegmentsToPdf = (doc, segments, startX, startY, maxWidth, checkPageBreakFn, lineHeight = 14) => {
    if (!segments || segments.length === 0) return startY;
    let curY = startY; let lineBuffer = []; let currentListItem = null;
    const flushLine = (isListItem, listCtx) => {
        if (lineBuffer.length === 0 && !isListItem) return;
        curY = checkPageBreakFn(curY, lineHeight + 4);
        let x = startX;
        if (isListItem && listCtx) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(30, 41, 59); const prefix = listCtx.ordered ? `${listCtx.listIndex}. ` : '• '; doc.text(prefix, x, curY); x += doc.getTextWidth(prefix) + 2; }
        for (const seg of lineBuffer) {
            let style = 'normal';
            if (seg.bold && seg.italic) style = 'bolditalic'; else if (seg.bold) style = 'bold'; else if (seg.italic) style = 'italic';
            doc.setFont('helvetica', style); doc.setFontSize(9.5);
            let r = 30, g = 41, b = 59;
            const col = seg.color || '#1e293b';
            if (col.startsWith('#')) { const rgb = hexToRgb(col); r = rgb[0]; g = rgb[1]; b = rgb[2]; } else if (col.startsWith('rgb')) { const m = col.match(/(\d+),\s*(\d+),\s*(\d+)/); if (m) { r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]); } }
            doc.setTextColor(r, g, b);
            const remainingWidth = maxWidth - (x - startX);
            if (remainingWidth <= 0) { curY += lineHeight; curY = checkPageBreakFn(curY, lineHeight); x = startX + (isListItem ? 12 : 0); }
            const words = seg.text.split(' '); let lineStr = '';
            for (const word of words) {
                const test = lineStr ? lineStr + ' ' + word : word;
                const testW = doc.getTextWidth(test); const avail = maxWidth - (x - startX);
                if (testW > avail && lineStr) { doc.text(lineStr, x, curY); if (seg.underline) { const tw = doc.getTextWidth(lineStr); doc.setDrawColor(r, g, b); doc.setLineWidth(0.4); doc.line(x, curY + 1, x + tw, curY + 1); } x = startX + (isListItem ? 12 : 0); curY += lineHeight; curY = checkPageBreakFn(curY, lineHeight); lineStr = word; } else { lineStr = test; }
            }
            if (lineStr) { doc.text(lineStr, x, curY); if (seg.underline) { const tw = doc.getTextWidth(lineStr); doc.setDrawColor(r, g, b); doc.setLineWidth(0.4); doc.line(x, curY + 1, x + tw, curY + 1); } x += doc.getTextWidth(lineStr); }
        }
        lineBuffer = []; curY += lineHeight;
    };
    for (let idx = 0; idx < segments.length; idx++) {
        const seg = segments[idx];
        if (seg.isListItem) { if (lineBuffer.length > 0) flushLine(false, null); currentListItem = { bullet: seg.bullet, ordered: seg.ordered, listIndex: seg.listIndex }; continue; }
        if (seg.isNewline) { if (currentListItem) { flushLine(true, currentListItem); currentListItem = null; } else { if (lineBuffer.length > 0) flushLine(false, null); else curY += lineHeight * 0.5; } continue; }
        if (seg.text && seg.text !== '\n') lineBuffer.push(seg);
    }
    if (lineBuffer.length > 0) flushLine(currentListItem ? true : false, currentListItem);
    return curY;
};

const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<li>/gi, '• ').replace(/<\/li>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
};

/* ─── AddToDBModal ───────────────────────────────────────────────────────────── */
const AddToDBModal = ({ isOpen, onClose, onSave, title, fields, saving }) => {
    const [formData, setFormData] = useState({});
    useEffect(() => {
        if (isOpen) { const init = {}; fields.forEach(f => { init[f.key] = f.defaultValue || ''; }); setFormData(init); }
    }, [isOpen, fields]);
    if (!isOpen) return null;
    return (
        <div className="rx-modal-overlay">
            <div className="rx-modal">
                <div className="rx-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1976D2', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#0f172a' }}>{title}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                        <X size={16} />
                    </button>
                </div>
                <div className="rx-modal-body">
                    <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
                        ⚠️ No match found in database. Fill details below to add a new record.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {fields.map((field) => (
                            <div key={field.key}>
                                <label className="rx-field-label">{field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                {field.type === 'textarea' ? (
                                    <textarea rows={2} className="rx-field-input" style={{ resize: 'none' }}
                                        placeholder={field.placeholder || ''} value={formData[field.key] || ''}
                                        onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} />
                                ) : (
                                    <input type={field.type || 'text'} className="rx-field-input"
                                        placeholder={field.placeholder || ''} value={formData[field.key] || ''}
                                        onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rx-modal-footer">
                    <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, padding: '10px', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.8px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(formData)} disabled={saving}
                        style={{ flex: 1, background: '#1976D2', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                        {saving ? 'Saving...' : 'Save to DB'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── TableCellInput ─────────────────────────────────────────────────────────── */
const TableCellInput = ({ col, colIndex, row, slug, collectionName, onUpdate, onSelectSuggestion }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef(null);
    const pointerDownRef = useRef(false);
    const val = row[col.name] || '';
    const isSearchable = colIndex === 0 && !!collectionName;

    const handleChange = (e) => {
        const newVal = e.target.value;
        onUpdate(col.name, newVal);
        if (!isSearchable) return;
        clearTimeout(debounceRef.current);
        if (newVal.length < 1) { setSuggestions([]); setOpen(false); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get(`${API_BAS}/api/prescriptions/${collectionName}/search`, { params: { q: newVal, slug, limit: 8 } });
                const results = res.data.data || [];
                setSuggestions(results); setOpen(results.length > 0);
            } catch (_) { setSuggestions([]); setOpen(false); }
            finally { setSearching(false); }
        }, 250);
    };

    const handleSelect = (suggestion) => { pointerDownRef.current = false; setOpen(false); setSuggestions([]); onSelectSuggestion(suggestion); };

    switch (col.type) {
        case 'date': return <input type="date" value={val} onChange={e => onUpdate(col.name, e.target.value)} className="rx-table-input" />;
        case 'number': return <input type="number" value={val} placeholder="0" onChange={e => onUpdate(col.name, e.target.value)} className="rx-table-input" style={{ width: 90 }} />;
        case 'yesno': return (
            <div style={{ display: 'flex', gap: 4 }}>
                {['Yes', 'No'].map(v => (
                    <button key={v} type="button" onClick={() => onUpdate(col.name, v)}
                        style={{ padding: '4px 10px', borderRadius: 3, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: val === v ? '#1976D2' : '#f1f5f9', color: val === v ? '#fff' : '#64748b', transition: 'all 0.15s' }}>{v}</button>
                ))}
            </div>
        );
        default: return (
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input type="text" value={val} onChange={handleChange}
                        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                        onBlur={() => { if (!pointerDownRef.current) setOpen(false); }}
                        placeholder={isSearchable ? `Search ${col.name}...` : ''}
                        className="rx-table-input" style={{ paddingRight: isSearchable ? 26 : undefined }} />
                    {isSearchable && searching && <Loader2 size={11} style={{ position: 'absolute', right: 7, color: '#1976D2', animation: 'spin 1s linear infinite', pointerEvents: 'none' }} />}
                    {isSearchable && !searching && suggestions.length > 0 && <ChevronDown size={11} style={{ position: 'absolute', right: 7, color: '#94a3b8', pointerEvents: 'none' }} />}
                </div>
                {open && suggestions.length > 0 && (
                    <div className="rx-suggestion-list">
                        {suggestions.map((s, idx) => {
                            const displayCols = Object.entries(s).filter(([k]) => !['_id', '__v', 'patientId', 'appointmentId', 'slug', 'createdAt', 'updatedAt'].includes(k));
                            const primary = displayCols[0]; const secondary = displayCols.slice(1, 3);
                            return (
                                <div key={s._id || idx} onPointerDown={(e) => { e.preventDefault(); pointerDownRef.current = true; handleSelect(s); }} className="rx-suggestion-item">
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{primary ? String(primary[1]) : '—'}</div>
                                    {secondary.length > 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{secondary.map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
};

/* ─── DynamicTableField ──────────────────────────────────────────────────────── */
const DynamicTableField = ({ field, rows, slug, onChange }) => {
    const columns = field.columns || [];
    const collectionName = field.collectionName || null;
    const addRow = () => onChange([...rows, buildEmptyRow(columns)]);
    const updateCell = (rowId, colName, value) => onChange(rows.map(r => r._rowId === rowId ? { ...r, [colName]: value } : r));
    const fillRowFromSuggestion = (rowId, suggestion) => onChange(rows.map(r => { if (r._rowId !== rowId) return r; const updated = { ...r }; columns.forEach(col => { if (suggestion[col.name] !== undefined) updated[col.name] = String(suggestion[col.name] ?? ''); }); return updated; }));
    const deleteRow = (rowId) => onChange(rows.filter(r => r._rowId !== rowId));

    return (
        <div className="rx-section">
            <div className="rx-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Table2 size={14} />
                    <span>{field.label || field.tableName || 'Custom Table'}</span>
                    {collectionName && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 6px' }}>searchable</span>}
                </div>
                <button type="button" onClick={addRow}
                    style={{ background: '#00bfa5', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={11} /> Add Row
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="rx-table">
                    <thead>
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i}>{col.name} {i === 0 && collectionName && <span style={{ color: '#1976D2', fontSize: 10 }}>🔍</span>}</th>
                            ))}
                            <th style={{ width: 44 }}>Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '22px', color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No rows yet — click <strong style={{ color: '#1976D2' }}>Add Row</strong> to begin</td></tr>
                        ) : rows.map((row) => (
                            <tr key={row._rowId}>
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx}>
                                        <TableCellInput col={col} colIndex={cIdx} row={row} slug={slug} collectionName={collectionName}
                                            onUpdate={(colName, value) => updateCell(row._rowId, colName, value)}
                                            onSelectSuggestion={(suggestion) => fillRowFromSuggestion(row._rowId, suggestion)} />
                                    </td>
                                ))}
                                <td style={{ textAlign: 'center' }}>
                                    <button type="button" onClick={() => deleteRow(row._rowId)} className="rx-del-btn"><X size={11} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > 0 && (
                <div style={{ padding: '6px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                    {rows.length} row{rows.length !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

/* ─── PrintablePrescription ──────────────────────────────────────────────────── */
const PrintablePrescription = forwardRef(({ design, patient, symptomsHtml, clinicProfile }, ref) => {
    const color = design?.color || '#1e4e79';
    return (
        <div ref={ref} style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#fff', position: 'relative', fontFamily: 'Arial, sans-serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', padding: '0' }}>
            <div style={{ width: '100%', height: 10, backgroundColor: color }} />
            <div style={{ position: 'absolute', top: '40%', left: 20, opacity: 0.04, fontSize: 180, fontFamily: 'serif', fontStyle: 'italic', pointerEvents: 'none', userSelect: 'none', color }}>Rx</div>
            {symptomsHtml && (
                <div style={{ margin: '20px 30px 0', paddingBottom: 10 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, color, borderBottom: `1.5px solid ${color}`, paddingBottom: 3, marginBottom: 8 }}>Symptoms</div>
                    <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: symptomsHtml }} />
                </div>
            )}
            <div style={{ width: '100%', height: 10, backgroundColor: color, position: 'absolute', bottom: 0, left: 0 }} />
        </div>
    );
});
PrintablePrescription.displayName = 'PrintablePrescription';

/* ─── PreviewModal ───────────────────────────────────────────────────────────── */
const PreviewModal = ({ isOpen, onClose, pdfDoc, patient, onPrint, onSaveExit, navigate, slug }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [waSending, setWaSending] = useState(false);
    const [waSaveExiting, setWaSaveExiting] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [waError, setWaError] = useState('');

    const [emailSending, setEmailSending] = useState(false);
    const [emailStatus, setEmailStatus] = useState(null);
    const [emailError, setEmailError] = useState('');
    const emailSendingRef = useRef(false);


    useEffect(() => {
        if (isOpen && pdfDoc) {
            const blob = pdfDoc.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPdfBlobUrl(null);
            setWaStatus(null);
            setWaError('');
        }
    }, [isOpen, pdfDoc]);

    if (!isOpen) return null;
    const handleWhatsApp = async () => {
        if (!patient?.mobile) {
            setWaStatus('error');
            setWaError('Patient mobile number not found.');
            return;
        }

        setWaSending(true);
        setWaStatus('sending');
        setWaError('');

        try {
            // Convert PDF to base64
            const pdfBase64 = pdfDoc.output('datauristring');

            // ✅ Call YOUR backend — no CORS issues
            const res = await axios.post(
                `${API_BAS}/api/whatsapp/send-prescription/${slug}`,
                {
                    pdfBase64,
                    patientName: patient.name,
                    patientMobile: patient.mobile
                }
            );

            if (res.data.success) {
                setWaStatus('success');
            } else {
                setWaStatus('error');
                setWaError(res.data.message || 'Send failed');
            }

        } catch (err) {
            setWaStatus('error');
            setWaError(
                err.response?.data?.message ||
                err.message ||
                'WhatsApp send failed'
            );
        } finally {
            setWaSending(false);
        }
    };
// Add this ref at the top of your component

const handleEmail = async () => {
    // ── Guard: block if already sending ──
    if (emailSendingRef.current) {
        console.warn('Email already in progress, ignoring duplicate call.');
        return;
    }

    if (!patient?.email) {
        setEmailStatus('error');
        setEmailError('Patient email address not found.');
        return;
    }

    // ── Lock ──
    emailSendingRef.current = true;
    setEmailSending(true);
    setEmailStatus('sending');
    setEmailError('');

    try {
        const pdfOutput = pdfDoc.output('datauristring');
        const commaIndex = pdfOutput.indexOf(',');
        const pdfBase64 = pdfOutput.substring(commaIndex + 1);

        if (!pdfBase64.startsWith('JVBERi')) {
            setEmailStatus('error');
            setEmailError('PDF generation failed. Please try again.');
            return;
        }

        const res = await axios.post(
            `${API_BAS}/api/notifications/send-email/${slug}`,
            { pdfBase64, patientName: patient.name, patientEmail: patient.email, patientMobile: patient.mobile },
            { timeout: 60000, maxContentLength: Infinity, maxBodyLength: Infinity }
        );

        if (res.data.success) {
            setEmailStatus('success');
        } else {
            setEmailStatus('error');
            setEmailError(res.data.message || 'Email send failed');
        }

    } catch (err) {
        setEmailStatus('error');
        setEmailError(err.response?.data?.message || err.message || 'Email send failed.');
    } finally {
        // ── Unlock ──
        emailSendingRef.current = false;
        setEmailSending(false);
    }
};



    const handlePrint = () => {
        if (pdfBlobUrl) {
            const win = window.open(pdfBlobUrl, '_blank');
            if (win) { win.addEventListener('load', () => { win.focus(); win.print(); }); }
        }
    };

    const handleSaveExit = async () => {
        setWaSaveExiting(true);
        try { await onSaveExit(); } finally { setWaSaveExiting(false); }
    };

return (
    <div className="preview-modal-overlay">
        <div className="preview-modal">
            {/* Header — full width */}
            <div className="preview-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: '#1976D2', borderRadius: 6, padding: '6px 8px', color: '#fff', display: 'flex' }}>
                        <Eye size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
                            Prescription Preview
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                            {patient?.name} · {patient?.mobile}
                        </div>
                    </div>
                </div>
                <button onClick={onClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <X size={20} />
                </button>
            </div>

            {/* Left: PDF iframe — ~50% of screen */}
            <div className="preview-pdf-container">
                {pdfBlobUrl ? (
                    <iframe
                        src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="preview-pdf-frame"
                        title="Prescription Preview"
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: 10 }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Generating PDF...</span>
                    </div>
                )}
            </div>

            {/* Right: Actions panel — fixed 380px */}
            <div className="preview-action-bar">
                <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                        Ready to share
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        Choose how to deliver this prescription:
                    </div>
                </div>

                <button className="preview-btn preview-btn-wa" onClick={handleWhatsApp} disabled={waSending || !pdfBlobUrl}>
                    {waSending
                        ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    }
                    <span>Send via WhatsApp</span>
                </button>

                {waStatus === 'sending' && <div className="wa-status-badge sending"><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />Sending on WhatsApp...</div>}
                {waStatus === 'success' && <div className="wa-status-badge success"><CheckCircle size={12} />Sent on WhatsApp!</div>}
                {waStatus === 'error' && <div className="wa-status-badge error"><X size={12} />{waError || 'WhatsApp send failed.'}</div>}

                <button
                    onClick={handleEmail}
                    disabled={emailSending || !pdfBlobUrl}
                    title={!patient?.email ? 'No email address on file' : ''}
                    style={{
                        background: patient?.email ? '#7c3aed' : '#94a3b8',
                        color: '#fff', border: 'none', borderRadius: 10,
                        padding: '16px 20px', fontWeight: 800, fontSize: 12,
                        textTransform: 'uppercase', letterSpacing: '0.8px',
                        cursor: emailSending || !pdfBlobUrl ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center',
                        gap: 12, transition: 'all 0.18s', opacity: emailSending ? 0.7 : 1, width: '100%'
                    }}
                >
                    {emailSending ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={20} />}
                    <span>Send via Email</span>
                </button>

                {emailStatus === 'sending' && <div className="wa-status-badge sending"><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />Sending Email...</div>}
                {emailStatus === 'success' && <div className="wa-status-badge success"><CheckCircle size={12} />Email Sent!</div>}
                {emailStatus === 'error' && <div className="wa-status-badge error"><X size={12} />{emailError}</div>}

                <button className="preview-btn preview-btn-print" onClick={handlePrint} disabled={!pdfBlobUrl}>
                    <Printer size={20} /><span>Print Prescription</span>
                </button>

                <div style={{ flex: 1 }} />

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                    <button className="preview-btn preview-btn-exit" onClick={handleSaveExit} disabled={waSaveExiting}>
                        {waSaveExiting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <LogOut size={20} />}
                        <span>{waSaveExiting ? 'Saving...' : 'Save & Exit'}</span>
                    </button>
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                        Saves to database and returns to dashboard
                    </div>
                </div>
            </div>
        </div>
    </div>
);

};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const GeneratePrescription = () => {
    const { slug, appointmentId } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    const debounceRef = useRef(null);
    const suggestionPointerDownRef = useRef(false);
    const symptomDebounceRef = useRef(null);
    const symptomPointerDownRef = useRef(false);
    const invDebounceRef = useRef(null);
    const invPointerDownRef = useRef(false);
    const vacDebounceRef = useRef(null);
    const vacPointerDownRef = useRef(false);
    const reportDebounceRef = useRef(null);
    const reportPointerDownRef = useRef(false);
    const symptomEditorRef = useRef(null);

    const [searching, setSearching] = useState(false);
    const [mobileInput, setMobileInput] = useState('');
    const [masterData, setMasterData] = useState({ design: null, patient: null, formStructure: null });
    const [dynamicValues, setDynamicValues] = useState({});
    const [medicines, setMedicines] = useState([{ ...EMPTY_MED }]);
    const [saving, setSaving] = useState(false);
    const [medSuggestions, setMedSuggestions] = useState([]);
    const [activeMedIndex, setActiveMedIndex] = useState(null);
    const [medNoResults, setMedNoResults] = useState({});
    const [medSearchInput, setMedSearchInput] = useState('');

    const [symptomsHtml, setSymptomsHtml] = useState('');
    const [symptomInput, setSymptomInput] = useState('');
    const [symptomSuggestions, setSymptomSuggestions] = useState([]);
    const [symptomSearching, setSymptomSearching] = useState(false);
    const [symptomNoResults, setSymptomNoResults] = useState(false);

    const [investigations, setInvestigations] = useState([{ ...EMPTY_INV }]);
    const [invSuggestions, setInvSuggestions] = useState([]);
    const [activeInvIndex, setActiveInvIndex] = useState(null);
    const [invSearching, setInvSearching] = useState(false);
    const [invNoResults, setInvNoResults] = useState({});
    const [invSearchInput, setInvSearchInput] = useState('');

    const [vaccinations, setVaccinations] = useState([{ ...EMPTY_VAC }]);
    const [vacSuggestions, setVacSuggestions] = useState([]);
    const [activeVacIndex, setActiveVacIndex] = useState(null);
    const [vacSearching, setVacSearching] = useState(false);
    const [vacNoResults, setVacNoResults] = useState({});
    const [vacSearchInput, setVacSearchInput] = useState('');

    const [reports, setReports] = useState([{ ...EMPTY_REPORT }]);
    const [reportSuggestions, setReportSuggestions] = useState([]);
    const [activeReportIndex, setActiveReportIndex] = useState(null);
    const [reportSearching, setReportSearching] = useState(false);
    const [reportSearchInput, setReportSearchInput] = useState('');

    const [isRevisit, setIsRevisit] = useState(false);
    const [isRevisitAutoFilled, setIsRevisitAutoFilled] = useState(false);
    const [tableRows, setTableRows] = useState({});
    const [dbModal, setDbModal] = useState({ open: false, type: null, rowIndex: null, prefill: '' });
    const [dbModalSaving, setDbModalSaving] = useState(false);
    const [clinicProfile, setClinicProfile] = useState(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewPdfDoc, setPreviewPdfDoc] = useState(null);


    useEffect(() => {
        return () => {
            clearTimeout(debounceRef.current);
            clearTimeout(symptomDebounceRef.current);
            clearTimeout(invDebounceRef.current);
            clearTimeout(vacDebounceRef.current);
            clearTimeout(reportDebounceRef.current);
        };
    }, []);

    useEffect(() => { if (appointmentId) autoLoadAppointmentContext(); }, [appointmentId]);
    // ✅ REPLACE WITH THIS — only one working API call
    useEffect(() => {
        const fetchClinicProfile = async () => {
            try {
                const res = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
                setClinicProfile(res.data.data);
            } catch (err) {
                console.error("Clinic profile fetch error:", err.message);
            }
        };
        fetchClinicProfile();
    }, [slug]);

    const initTableRows = useCallback(async (formStructure, previousTableData = {}, patientId = null) => {
        if (!formStructure?.sections) return;
        const init = {};
        for (const section of formStructure.sections) {
            for (const field of (section.fields || [])) {
                if (field.type !== 'table') continue;
                if (previousTableData[field.id]?.length) { init[field.id] = previousTableData[field.id].map((row, i) => ({ _rowId: `row-revisit-${field.id}-${i}`, ...row })); continue; }
                if (field.collectionName && patientId) {
                    try {
                        const res = await axios.get(`${API_BAS}/api/prescriptions/${field.collectionName}/by-patient/${patientId}`);
                        const dbRows = res.data.data || [];
                        if (dbRows.length > 0) { init[field.id] = dbRows.map((row, i) => { const { _id, __v, patientId: _pid, appointmentId: _aid, slug: _s, createdAt, updatedAt, ...colData } = row; return { _rowId: `row-db-${field.id}-${i}`, ...colData }; }); continue; }
                    } catch (_) { }
                }
                init[field.id] = [];
            }
        }
        setTableRows(init);
    }, []);

    const applyRevisitData = (lastPrescription, formStructure, patient) => {
        const prevValues = {};
        if (Array.isArray(lastPrescription.consultationResponses)) lastPrescription.consultationResponses.forEach(item => { if (item.fieldId) prevValues[String(item.fieldId)] = item.value; });
        else if (lastPrescription.consultationResponses && typeof lastPrescription.consultationResponses === 'object') Object.entries(lastPrescription.consultationResponses).forEach(([k, v]) => { prevValues[String(k)] = v; });
        setDynamicValues(prevValues);
        if (lastPrescription.medicines?.length) setMedicines(lastPrescription.medicines);
        let html = '';
        if (lastPrescription.symptomsHtml) html = lastPrescription.symptomsHtml;
        else if (lastPrescription.symptoms?.length) html = `<ul>${lastPrescription.symptoms.map(s => `<li>${s.name || s}</li>`).join('')}</ul>`;
        setSymptomsHtml(html);
        if (lastPrescription.investigations?.length) setInvestigations(lastPrescription.investigations);
        if (lastPrescription.vaccinations?.length) setVaccinations(lastPrescription.vaccinations);
        if (lastPrescription.reports?.length) setReports(lastPrescription.reports);
        return prevValues;
    };

    const autoLoadAppointmentContext = async () => {
        setSearching(true);
        try {
            const res = await axios.get(`${API_BAS}/api/appointments/context/${appointmentId}`);
            if (res.data.success) {
                const { patient, lastPrescription, design, formStructure, isRevisit: revisitFlag } = res.data;
                setMasterData({ design: design || null, patient: patient || null, formStructure: formStructure || null });
                setIsRevisit(!!revisitFlag);
                if (revisitFlag && lastPrescription) { applyRevisitData(lastPrescription, formStructure, patient); const prevTableData = lastPrescription.tableData || {}; await initTableRows(formStructure, prevTableData, patient?._id); setIsRevisitAutoFilled(true); }
                else await initTableRows(formStructure, {}, patient?._id);
            }
        } catch (err) { alert("Automation error: " + (err.response?.data?.message || "Backend issue")); }
        finally { setSearching(false); }
    };

    const handleFileChange = (e, fieldId) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert("Only images allowed!"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setDynamicValues(prev => ({ ...prev, [String(fieldId)]: ev.target.result }));
        reader.readAsDataURL(file);
    };

    const handleSearch = async () => {
        if (!mobileInput) return alert("Enter mobile number!");
        setSearching(true);
        try {
            const res = await axios.get(`${API_BAS}/api/prescriptions/initial-data?slug=${slug}&phone=${mobileInput}`);
            if (res.data.success) {
                const { data } = res.data;
                setMasterData(data); setDynamicValues({}); setMedicines([{ ...EMPTY_MED }]); setInvestigations([{ ...EMPTY_INV }]); setVaccinations([{ ...EMPTY_VAC }]); setReports([{ ...EMPTY_REPORT }]); setSymptomsHtml(''); setSymptomInput(''); setIsRevisit(false); setIsRevisitAutoFilled(false);
                if (data.isRevisit && data.lastPrescription) { applyRevisitData(data.lastPrescription, data.formStructure, data.patient); const prevTableData = data.lastPrescription.tableData || {}; await initTableRows(data.formStructure, prevTableData, data.patient?._id); setIsRevisit(true); setIsRevisitAutoFilled(true); }
                else await initTableRows(data?.formStructure, {}, data.patient?._id);
            }
        } catch (err) { alert(err.response?.data?.message || "Error fetching data"); }
        finally { setSearching(false); }
    };

    /* ── Medicine ── */
    const searchMedicines = (query, index) => {
        setActiveMedIndex(index); setMedNoResults(prev => ({ ...prev, [index]: false }));
        if (!query || query.length < 2) { setMedSuggestions([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try { const res = await axios.get(`${API_BAS}/api/medicines/${slug}/list?search=${query}`); const results = res.data.data || []; setMedSuggestions(results); setMedNoResults(prev => ({ ...prev, [index]: results.length === 0 })); }
            catch (_) { setMedSuggestions([]); }
        }, 300);
    };

    const handleMedTopSearch = (query) => {
        setMedSearchInput(query);
        if (!query || query.length < 2) { setMedSuggestions([]); setActiveMedIndex('top'); return; }
        clearTimeout(debounceRef.current);
        setActiveMedIndex('top');
        debounceRef.current = setTimeout(async () => {
            try { const res = await axios.get(`${API_BAS}/api/medicines/${slug}/list?search=${query}`); const results = res.data.data || []; setMedSuggestions(results); setMedNoResults(prev => ({ ...prev, top: results.length === 0 })); }
            catch (_) { setMedSuggestions([]); }
        }, 300);
    };

    const selectMedicineFromTop = (med) => {
        suggestionPointerDownRef.current = false;
        setMedicines(prev => {
            const emptyIdx = prev.findIndex(m => !m.name && !m.brandName);
            const newMed = { name: med.name || '', brandName: med.brandName || '', strength: med.strength || '', unit_per_Dose: med.unit_per_Dose || '', timing: med.timing || '', duration: med.duration || '', route: med.route || '', action: med.action || '', instructions: med.instructions || '', category: med.category || '', saltComposition: med.saltComposition || '' };
            if (emptyIdx >= 0) return prev.map((m, i) => i === emptyIdx ? newMed : m);
            return [...prev, newMed];
        });
        setMedSearchInput(''); setMedSuggestions([]); setActiveMedIndex(null); setMedNoResults({});
    };

    const addMedicineManually = () => setMedicines(prev => [...prev, { ...EMPTY_MED }]);
    const removeMedicine = (i) => setMedicines(prev => prev.filter((_, idx) => idx !== i));
    const updateMedicine = (i, field, val) => setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

    /* ── Investigation ── */
    const handleInvTopSearch = (query) => {
        setInvSearchInput(query);
        setActiveInvIndex('top'); setInvNoResults(prev => ({ ...prev, top: false }));
        if (!query || query.length < 1) { setInvSuggestions([]); return; }
        clearTimeout(invDebounceRef.current);
        invDebounceRef.current = setTimeout(async () => {
            setInvSearching(true);
            try { const res = await axios.get(`${API_BAS}/api/investigations/${slug}/search?q=${encodeURIComponent(query)}`); const results = res.data.data || []; setInvSuggestions(results); setInvNoResults(prev => ({ ...prev, top: results.length === 0 })); }
            catch (_) { setInvSuggestions([]); } finally { setInvSearching(false); }
        }, 250);
    };

    const selectInvestigationFromTop = (inv) => {
        invPointerDownRef.current = false;
        setInvestigations(prev => {
            const emptyIdx = prev.findIndex(i => !i.testName);
            const newInv = { testName: inv.testName || '', category: inv.category || '', action: inv.action || '' };
            if (emptyIdx >= 0) return prev.map((item, i) => i === emptyIdx ? newInv : item);
            return [...prev, newInv];
        });
        setInvSearchInput(''); setInvSuggestions([]); setActiveInvIndex(null); setInvNoResults({});
    };

    const addInvestigation = () => setInvestigations(prev => [...prev, { ...EMPTY_INV }]);
    const removeInvestigation = (i) => setInvestigations(prev => prev.filter((_, idx) => idx !== i));
    const updateInvestigation = (i, field, val) => setInvestigations(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    /* ── Vaccination ── */
    const handleVacTopSearch = (query) => {
        setVacSearchInput(query);
        setActiveVacIndex('top'); setVacNoResults(prev => ({ ...prev, top: false }));
        if (!query || query.length < 1) { setVacSuggestions([]); return; }
        clearTimeout(vacDebounceRef.current);
        vacDebounceRef.current = setTimeout(async () => {
            setVacSearching(true);
            try { const res = await axios.get(`${API_BAS}/api/vaccination/${slug}/list?search=${query}`); const results = res.data.data || []; setVacSuggestions(results); setVacNoResults(prev => ({ ...prev, top: results.length === 0 })); }
            catch (_) { setVacSuggestions([]); } finally { setVacSearching(false); }
        }, 250);
    };

    const selectVaccinationFromTop = (vac) => {
        vacPointerDownRef.current = false;
        setVaccinations(prev => {
            const emptyIdx = prev.findIndex(v => !v.vaccineName);
            const newVac = { vaccineName: vac.vaccineName || '', note: vac.note || '', action: vac.action || '' };
            if (emptyIdx >= 0) return prev.map((item, i) => i === emptyIdx ? newVac : item);
            return [...prev, newVac];
        });
        setVacSearchInput(''); setVacSuggestions([]); setActiveVacIndex(null); setVacNoResults({});
    };

    const addVaccination = () => setVaccinations(prev => [...prev, { ...EMPTY_VAC }]);
    const removeVaccination = (i) => setVaccinations(prev => prev.filter((_, idx) => idx !== i));
    const updateVaccination = (i, field, val) => setVaccinations(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    /* ── Report ── */
    const handleReportTopSearch = (query) => {
        setReportSearchInput(query);
        setActiveReportIndex('top');
        if (!query || query.length < 1) { setReportSuggestions([]); return; }
        clearTimeout(reportDebounceRef.current);
        reportDebounceRef.current = setTimeout(async () => {
            setReportSearching(true);
            try { const res = await axios.get(`${API_BAS}/api/p_reports/${slug}/list?search=${encodeURIComponent(query)}`); setReportSuggestions(res.data.data || []); }
            catch (_) { setReportSuggestions([]); } finally { setReportSearching(false); }
        }, 250);
    };

    const selectReportFromTop = (report) => {
        reportPointerDownRef.current = false;
        setReports(prev => {
            const emptyIdx = prev.findIndex(r => !r.reportName);
            const newR = { reportName: report.reportName || '', impression: report.impression || '', action: report.action || '', date: report.date ? new Date(report.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] };
            if (emptyIdx >= 0) return prev.map((item, i) => i === emptyIdx ? newR : item);
            return [...prev, newR];
        });
        setReportSearchInput(''); setReportSuggestions([]); setActiveReportIndex(null);
    };

    const addReport = () => setReports(prev => [...prev, { ...EMPTY_REPORT }]);
    const removeReport = (i) => setReports(prev => prev.filter((_, idx) => idx !== i));
    const updateReport = (i, field, val) => setReports(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

    /* ── Symptom ── */
    const searchSymptoms = (query) => {
        setSymptomNoResults(false);
        if (!query || query.length < 1) { setSymptomSuggestions([]); return; }
        clearTimeout(symptomDebounceRef.current);
        symptomDebounceRef.current = setTimeout(async () => {
            setSymptomSearching(true);
            try { const res = await axios.get(`${API_BAS}/api/symptoms/${slug}/search?q=${encodeURIComponent(query)}`); const results = res.data.data || []; setSymptomSuggestions(results); setSymptomNoResults(results.length === 0 && query.length >= 1); }
            catch (_) { setSymptomSuggestions([]); } finally { setSymptomSearching(false); }
        }, 250);
    };

    const selectSymptom = (symptom) => {
        symptomPointerDownRef.current = false;
        if (symptomEditorRef.current?.insertText) symptomEditorRef.current.insertText(symptom.name);
        setSymptomInput(''); setSymptomSuggestions([]); setSymptomNoResults(false);
    };

    const addCustomSymptom = () => {
        const trimmed = symptomInput.trim();
        if (!trimmed) return;
        if (symptomEditorRef.current?.insertText) symptomEditorRef.current.insertText(trimmed);
        setSymptomInput(''); setSymptomSuggestions([]); setSymptomNoResults(false);
    };

    /* ── DB Modal ── */
    const openAddModal = (type, rowIndex, prefill) => setDbModal({ open: true, type, rowIndex, prefill });
    const closeAddModal = () => setDbModal({ open: false, type: null, rowIndex: null, prefill: '' });

    const handleSaveNewToDB = async (formData) => {
        setDbModalSaving(true);
        try {
            const { type, rowIndex, prefill } = dbModal;
            if (type === 'medicine') { const payload = { name: formData.name || prefill, brandName: formData.brandName || '', strength: formData.strength || '', unit_per_Dose: formData.unit_per_Dose || '', timing: formData.timing || '', duration: formData.duration || '', action: formData.action || '', instructions: formData.instructions || '', category: formData.category || '', route: formData.route || '', saltComposition: formData.saltComposition || '' }; await axios.post(`${API_BAS}/api/medicines/${slug}/add`, payload); Object.entries(payload).forEach(([k, v]) => updateMedicine(rowIndex, k, v)); setMedNoResults(prev => ({ ...prev, [rowIndex]: false })); }
            if (type === 'investigation') { const payload = { testName: formData.testName || prefill, category: formData.category || '', action: formData.action || '' }; await axios.post(`${API_BAS}/api/investigations/${slug}/save`, payload); Object.entries(payload).forEach(([k, v]) => updateInvestigation(rowIndex, k, v)); setInvNoResults(prev => ({ ...prev, [rowIndex]: false })); }
            if (type === 'vaccination') { const payload = { vaccineName: formData.vaccineName || prefill, note: formData.note || '', action: formData.action || '' }; await axios.post(`${API_BAS}/api/vaccination/${slug}/add`, payload); Object.entries(payload).forEach(([k, v]) => updateVaccination(rowIndex, k, v)); setVacNoResults(prev => ({ ...prev, [rowIndex]: false })); }
            if (type === 'symptom') { const payload = { name: formData.name || prefill }; await axios.post(`${API_BAS}/api/symptoms/${slug}/add`, payload); if (symptomEditorRef.current?.insertText) symptomEditorRef.current.insertText(payload.name); setSymptomInput(''); setSymptomNoResults(false); }
            closeAddModal(); alert("✅ Saved to database successfully!");
        } catch (err) { alert("Error saving: " + (err.response?.data?.message || err.message)); }
        finally { setDbModalSaving(false); }
    };

    const getModalConfig = () => {
        const { type, prefill } = dbModal;
        if (type === 'medicine') return { title: 'Add New Medicine', fields: [{ key: 'brandName', label: 'Brand Name', placeholder: 'e.g. Crocin', required: true, defaultValue: prefill }, { key: 'name', label: 'Generic Name', placeholder: 'e.g. Paracetamol', required: true }, { key: 'saltComposition', label: 'Salt Composition', placeholder: 'e.g. Paracetamol 500mg' }, { key: 'category', label: 'Category', placeholder: 'e.g. Analgesic' }, { key: 'strength', label: 'Frequency / Strength', placeholder: 'e.g. 500 mg' }, { key: 'unit_per_Dose', label: 'Unit Per Dose', placeholder: 'e.g. 1 tablet' }, { key: 'timing', label: 'Timing', placeholder: 'e.g. Morning & Evening' }, { key: 'duration', label: 'Duration', placeholder: 'e.g. 5 days' }, { key: 'route', label: 'Route', placeholder: 'e.g. Oral' }, { key: 'action', label: 'Action', placeholder: 'e.g. Take after food' }, { key: 'instructions', label: 'Instructions', placeholder: 'e.g. Swallow whole', type: 'textarea' }] };
        if (type === 'investigation') return { title: 'Add New Investigation', fields: [{ key: 'testName', label: 'Test Name', placeholder: 'e.g. CBC', required: true, defaultValue: prefill }, { key: 'category', label: 'Category', placeholder: 'e.g. Haematology' }, { key: 'action', label: 'Action / Notes', placeholder: 'e.g. Fasting required', type: 'textarea' }] };
        if (type === 'vaccination') return { title: 'Add New Vaccination', fields: [{ key: 'vaccineName', label: 'Vaccine Name', placeholder: 'e.g. Hepatitis B', required: true, defaultValue: prefill }, { key: 'note', label: 'Note', placeholder: 'e.g. 2nd dose at 6 weeks' }, { key: 'action', label: 'Action', placeholder: 'e.g. IM injection 0.5ml', type: 'textarea' }] };
        if (type === 'symptom') return { title: 'Add New Symptom', fields: [{ key: 'name', label: 'Symptom Name', placeholder: 'e.g. Headache', required: true, defaultValue: prefill }, { key: 'category', label: 'Category (optional)', placeholder: 'e.g. Neurological' }] };
        return { title: '', fields: [] };
    };

    const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Clinical_Summary_${masterData.patient?.name || 'Doc'}` });

    /* ── Build PDF ── */
    const buildPdfDoc = async (design, patient, formStructure) => {
        const doc = new jsPDF('p', 'pt', 'a4');
        const [cr, cg, cb] = hexToRgb(design.color || "#ec4899");
        const S = A4_W / 794;
        const px = (v) => Math.round(v * S);
        const addContinuationPage = () => {
            doc.addPage();
            // Only draw top bar on continuation pages
            doc.setFillColor(cr, cg, cb);
            doc.rect(0, 0, A4_W, 14, 'F');
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("RX CONTINUED...", MARGIN_L, PAGE2_START_Y - 20);
            return PAGE2_START_Y;
        };
        const checkPageBreak = (currentY, neededHeight = 20) => { if (currentY + neededHeight > FOOTER_TOP_PT) return addContinuationPage(); return currentY; };
        doc.setFontSize(220); doc.setTextColor(245, 245, 245); doc.text("Rx", 60, 520);
        doc.setFillColor(cr, cg, cb); doc.rect(0, 0, A4_W, px(25), 'F'); doc.rect(0, A4_H - 14, A4_W, 14, 'F');
        if (design.elements?.length) { design.elements.forEach(el => { if (el.src?.startsWith('data:image')) { try { doc.addImage(el.src, el.src.includes('png') ? 'PNG' : 'JPEG', px(el.x), px(el.y), px(el.w), px(el.h)); } catch (_) { } } }); }
        else {
            if (design.logo) { try { doc.addImage(design.logo, 'PNG', px(design.layout?.logo?.x || 40), px(design.layout?.logo?.y || 40), px(design.layout?.logo?.w || 120), px(design.layout?.logo?.h || 120)); } catch (_) { } }
            if (design.drName) { const rx = px((design.layout?.drInfo?.x || 400) + (design.layout?.drInfo?.w || 300)); const ry = px(design.layout?.drInfo?.y || 40); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(cr, cg, cb); doc.text(design.drName.toUpperCase(), rx, ry + 18, { align: 'right' }); doc.setFontSize(11); doc.setTextColor(100, 116, 139); doc.text(design.degree || '', rx, ry + 33, { align: 'right' }); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text(`REG: ${design.regNo || ''}`, rx, ry + 46, { align: 'right' }); }
            if (design.clinicName) { const cx = px(design.layout?.clinicInfo?.x || 40); const cy = px(design.layout?.clinicInfo?.y || 190); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(15, 23, 42); doc.text(design.clinicName.toUpperCase(), cx, cy + 16); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text(design.address || '', cx, cy + 30, { maxWidth: px(design.layout?.clinicInfo?.w || 450) }); }
        }
        let curY = HEADER_BOTTOM_PT;
        doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.7); doc.line(MARGIN_L, curY, doc.internal.pageSize.width - MARGIN_L, curY);
        autoTable(doc, {
            startY: curY, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'plain',
            styles: { fontSize: 9, cellPadding: 4, font: "helvetica", fillColor: [240, 247, 255], textColor: [0, 0, 0], valign: 'middle', lineWidth: 0 },
            body: [
                [{ content: 'Name:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.name || '—' }, { content: 'Age:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: String(patient.age || '—') }, { content: 'Mobile:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.mobile || '—' }],
                [{ content: 'Gender:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.gender || '—' }, { content: 'Date:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: new Date().toLocaleDateString('en-GB') }, { content: 'Valid Upto:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: calculateValidityUpto(patient.createdAt, clinicProfile?.appointmentValidity) }],
                [{ content: 'Weight:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.weight ? `${patient.weight} kg` : '—' }, { content: 'Height:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.height ? `${patient.height} cm` : '—' }, { content: 'BMI:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.bmi || '—' }],
                [{ content: 'Address:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: patient.address || '—', colSpan: 3 }, { content: 'Patient Id:', styles: { fontStyle: 'bold', textColor: [30, 78, 121] } }, { content: `${patient.clinicSlug?.toUpperCase() || 'CLI'}${String(patient._id || '').slice(-6).toUpperCase()}` }]
            ],
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 90 }, 2: { cellWidth: 40 }, 3: { cellWidth: 90 }, 4: { cellWidth: 50 }, 5: { cellWidth: 'auto' } }
        });
        doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.7); doc.line(MARGIN_L, doc.lastAutoTable.finalY, doc.internal.pageSize.width - MARGIN_L, doc.lastAutoTable.finalY);
        curY = doc.lastAutoTable.finalY + 30;
        if (symptomsHtml && symptomsHtml.trim() && symptomsHtml.trim() !== '<br>') {
            curY = checkPageBreak(curY, 40); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text("Symptoms", MARGIN_L, curY);
            curY += 4; doc.setDrawColor(30, 78, 121); doc.setLineWidth(1); doc.line(MARGIN_L, curY, MARGIN_R, curY); curY += 14;
            const segments = parseHtmlToSegments(symptomsHtml);
            curY = renderHtmlSegmentsToPdf(doc, segments, MARGIN_L + 5, curY, USABLE_W - 10, checkPageBreak, 14); curY += 20;
        }
        if (formStructure?.sections?.length) {
            const MID = MARGIN_L + USABLE_W / 2; const COL1_LABEL_W = 110; const COL1_VAL_X = MARGIN_L + COL1_LABEL_W + 4; const COL2_X = MID + 8; const COL2_LABEL_W = 100; const COL2_VAL_X = COL2_X + COL2_LABEL_W + 4;
            formStructure.sections.forEach(section => {
                const nonTableFields = (section.fields || []).filter(f => f.type !== 'table'); const tableFields = (section.fields || []).filter(f => f.type === 'table');
                if (nonTableFields.length > 0) {
                    curY = checkPageBreak(curY, 40); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text(section.sectionTitle, MARGIN_L, curY);
                    curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY); let fieldY = curY + 15;
                    for (let i = 0; i < nonTableFields.length; i += 2) {
                        fieldY = checkPageBreak(fieldY, 25); const rowStartY = fieldY; let maxRowHeight = 18;
                        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 78, 121); doc.text(`${nonTableFields[i].label}:`, MARGIN_L, fieldY);
                        const val1 = String(dynamicValues[String(nonTableFields[i].id)] || '—');
                        if (val1.startsWith('data:image')) { try { doc.addImage(val1, val1.includes('image/png') ? 'PNG' : 'JPEG', MARGIN_L, fieldY + 5, 50, 40); maxRowHeight = Math.max(maxRowHeight, 50); } catch (_) { doc.text("[Image Error]", COL1_VAL_X, fieldY); } }
                        else { doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0); doc.text(val1, COL1_VAL_X, fieldY, { maxWidth: MID - COL1_VAL_X - 5 }); }
                        if (nonTableFields[i + 1]) {
                            doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text(`${nonTableFields[i + 1].label}:`, COL2_X, rowStartY);
                            const val2 = String(dynamicValues[String(nonTableFields[i + 1].id)] || '—');
                            if (val2.startsWith('data:image')) { try { doc.addImage(val2, val2.includes('image/png') ? 'PNG' : 'JPEG', COL2_X, rowStartY + 5, 50, 40); maxRowHeight = Math.max(maxRowHeight, 50); } catch (_) { doc.text("[Image Error]", COL2_VAL_X, rowStartY); } }
                            else { doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0); doc.text(val2, COL2_VAL_X, rowStartY, { maxWidth: MARGIN_R - COL2_VAL_X }); }
                        }
                        fieldY += maxRowHeight;
                    }
                    curY = fieldY + 20;
                }
                tableFields.forEach(tField => {
                    const tRows = (tableRows[tField.id] || []).filter(r => Object.entries(r).some(([k, v]) => k !== '_rowId' && v !== ''));
                    if (tRows.length === 0) return;
                    curY = checkPageBreak(curY, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text(tField.label || tField.tableName || 'Custom Table', MARGIN_L, curY);
                    curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY);
                    const colNames = (tField.columns || []).map(c => c.name);
                    autoTable(doc, { startY: curY + 6, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'grid', styles: { fontSize: 8, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.5, valign: 'middle' }, headStyles: { fillColor: [240, 247, 255], textColor: [30, 78, 121], fontSize: 8, fontStyle: 'bold' }, head: [['#', ...colNames]], body: tRows.map((row, i) => [{ content: i + 1, styles: { halign: 'center' } }, ...colNames.map(name => row[name] || '—')]), columnStyles: { 0: { cellWidth: 25 } } });
                    curY = doc.lastAutoTable.finalY + 20;
                });
                curY += 10;
            });
        }
        const filledMeds = medicines.filter(m => m.name?.trim() || m.brandName?.trim());
        if (filledMeds.length) {
            curY = checkPageBreak(curY, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text("Medicines", MARGIN_L, curY);
            curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY);
            autoTable(doc, { startY: curY + 6, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'grid', styles: { fontSize: 8, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.5, valign: 'middle' }, headStyles: { fillColor: [240, 247, 255], textColor: [30, 78, 121], fontSize: 8, fontStyle: 'bold' }, head: [['S.No', 'Medicine', 'Dose', 'Freq', 'Route', 'Timing', 'Instruction', 'Duration']], body: filledMeds.map((m, i) => [{ content: i + 1, styles: { halign: 'center' } }, { content: m.brandName || m.name, styles: { fontStyle: 'bold' } }, m.strength || m.unit_per_Dose || '—', m.strength || '—', m.route || '—', m.timing || '—', m.instructions || '—', m.duration || '—']), columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 60 }, 3: { cellWidth: 40 }, 4: { cellWidth: 40 }, 5: { cellWidth: 50 }, 6: { cellWidth: 70 }, 7: { cellWidth: 50 } } });
            curY = doc.lastAutoTable.finalY + 30;
        }
        const filledInvs = investigations.filter(inv => inv.testName?.trim());
        if (filledInvs.length) {
            curY = checkPageBreak(curY, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text("Investigations", MARGIN_L, curY);
            curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY);
            autoTable(doc, { startY: curY + 6, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'grid', styles: { fontSize: 8, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.5, valign: 'middle' }, headStyles: { fillColor: [240, 247, 255], textColor: [30, 78, 121], fontSize: 8, fontStyle: 'bold' }, head: [['#', 'Test Name', 'Category', 'Action']], body: filledInvs.map((inv, i) => [{ content: i + 1, styles: { halign: 'center' } }, { content: inv.testName || '—', styles: { fontStyle: 'bold' } }, inv.category || '—', inv.action || '—']), columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 100 }, 3: { cellWidth: 120 } } });
            curY = doc.lastAutoTable.finalY + 30;
        }
        const filledVacs = vaccinations.filter(vac => vac.vaccineName?.trim());
        if (filledVacs.length) {
            curY = checkPageBreak(curY, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text("Vaccinations", MARGIN_L, curY);
            curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY);
            autoTable(doc, { startY: curY + 6, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'grid', styles: { fontSize: 8, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.5, valign: 'middle' }, headStyles: { fillColor: [240, 247, 255], textColor: [30, 78, 121], fontSize: 8, fontStyle: 'bold' }, head: [['#', 'Vaccination Name', 'Note', 'Action']], body: filledVacs.map((vac, i) => [{ content: i + 1, styles: { halign: 'center' } }, { content: vac.vaccineName || '—', styles: { fontStyle: 'bold' } }, vac.note || '—', vac.action || '—']), columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 140 }, 3: { cellWidth: 120 } } });
            curY = doc.lastAutoTable.finalY + 30;
        }
        const filledReports = reports.filter(r => r.reportName?.trim());
        if (filledReports.length) {
            curY = checkPageBreak(curY, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 78, 121); doc.text("Available Reports", MARGIN_L, curY);
            curY += 3; doc.setDrawColor(30, 78, 121); doc.setLineWidth(0.8); doc.line(MARGIN_L, curY, MARGIN_R, curY);
            autoTable(doc, { startY: curY + 6, margin: { left: MARGIN_L, right: MARGIN_L }, theme: 'grid', styles: { fontSize: 8, cellPadding: 6, lineColor: [203, 213, 225], lineWidth: 0.5, valign: 'middle' }, headStyles: { fillColor: [240, 247, 255], textColor: [30, 78, 121], fontSize: 8, fontStyle: 'bold' }, head: [['#', 'Report Name', 'Date', 'Impression', 'Action']], body: filledReports.map((r, i) => [{ content: i + 1, styles: { halign: 'center' } }, { content: r.reportName || '—', styles: { fontStyle: 'bold' } }, r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—', r.impression || '—', r.action || '—']), columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 60 }, 3: { cellWidth: 120 }, 4: { cellWidth: 100 } } });
            curY = doc.lastAutoTable.finalY + 30;
        }
        // ── Doctor Signature Block ──
        // ── Doctor Signature Block ──
        curY = checkPageBreak(curY, 80);
        curY += 24;

        const sigBlockX = MARGIN_R - 160;

        // 1. Signature image (stored as file path e.g. /uploads/signatures/xxx.png)
        if (clinicProfile?.signature) {
            try {
                const fullUrl = clinicProfile.signature.startsWith('data:')
                    ? clinicProfile.signature
                    : `${API_BAS}${clinicProfile.signature}`;

                const toBase64 = (url) => fetch(url)
                    .then(r => r.blob())
                    .then(blob => new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    }));

                const base64Sig = await toBase64(fullUrl);
                const fmt = base64Sig.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(base64Sig, fmt, sigBlockX, curY, 120, 40);
                curY += 44;
            } catch (_) { }
        }

        // 2. Signature line
        doc.setDrawColor(cr, cg, cb);
        doc.setLineWidth(0.8);
        doc.line(sigBlockX, curY, sigBlockX + 160, curY);
        curY += 5;

        // 3. Doctor name — doctors[] array first, fallback to legacy field
        const displayDrName =
            clinicProfile?.doctors?.[0]?.doctorName ||
            clinicProfile?.doctorName ||
            design?.drName ||
            '—';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(cr, cg, cb);
        doc.text(displayDrName, sigBlockX + 80, curY + 11, { align: 'center' });
        curY += 14;

        // 4. Degree
        const displayDegree =
            clinicProfile?.doctors?.[0]?.degree ||
            clinicProfile?.degree ||
            design?.degree ||
            '';

        if (displayDegree) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(displayDegree, sigBlockX + 80, curY + 4, { align: 'center' });
            curY += 12;
        }

        // 5. Reg number — schema field is "regNumber" not "regNo"
        const displayReg =
            clinicProfile?.regNumber ||
            design?.regNo ||
            '—';

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Reg. No: ${displayReg}`, sigBlockX + 80, curY + 4, { align: 'center' });
        curY += 20;
        // Draw footer on every page
        const totalPages = doc.internal.getNumberOfPages();

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            doc.setPage(pageNum);

            // Bottom color bar (already drawn on page 1, redo for all)
            doc.setFillColor(cr, cg, cb);
            doc.rect(0, A4_H - 14, A4_W, 14, 'F');

            // Footer contact line
            const footerY = A4_H - 55;
            doc.setDrawColor(cr, cg, cb);
            doc.setLineWidth(3);
            doc.line(MARGIN_L, footerY, MARGIN_L, footerY + 22);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.text(design.contact || '', MARGIN_L + 10, footerY + 10);

            // If design has a footer image element, draw it too
            if (design.elements?.length) {
                const footerImgs = design.elements.filter(el =>
                    el.src?.startsWith('data:image') && px(el.y) > A4_H - 120
                );
                footerImgs.forEach(el => {
                    try {
                        doc.addImage(
                            el.src,
                            el.src.includes('png') ? 'PNG' : 'JPEG',
                            px(el.x), px(el.y), px(el.w), px(el.h)
                        );
                    } catch (_) { }
                });
            }
        }
        return doc;
    };

    const persistPrescription = async (doc) => {
        const { design, patient, formStructure } = masterData;
        const pdfBase64 = doc.output('datauristring');
        const patientId = patient?._id;
        const filledMeds = medicines.filter(m => m.name?.trim() || m.brandName?.trim());
        const filledInvs = investigations.filter(inv => inv.testName?.trim());
        const filledVacs = vaccinations.filter(vac => vac.vaccineName?.trim());
        const filledReports = reports.filter(r => r.reportName?.trim());

        await Promise.all(filledReports.map(r =>
            axios.post(`${API_BAS}/api/p_reports/${slug}/add`, { patientId, appointmentId, reportName: r.reportName, date: r.date || new Date(), impression: r.impression, action: r.action })
                .catch(err => console.warn('Report save failed:', err.message))
        ));

        const tableDataForPrescription = {}; const tableSavePromises = [];
        if (formStructure?.sections) {
            formStructure.sections.forEach(section => {
                (section.fields || []).filter(f => f.type === 'table').forEach(tField => {
                    const tRows = (tableRows[tField.id] || []).filter(r => Object.entries(r).some(([k, v]) => k !== '_rowId' && v !== ''));
                    if (tRows.length === 0) return;
                    tableDataForPrescription[tField.id] = tRows;
                    if (tField.collectionName) { tRows.forEach(row => { const { _rowId, ...cleanRow } = row; tableSavePromises.push(axios.post(`${API_BAS}/api/prescriptions/${tField.collectionName}/rows`, { ...cleanRow, patientId, appointmentId, slug }).catch(err => console.warn(`Table row save failed:`, err.message))); }); }
                });
            });
        }
        await Promise.all(tableSavePromises);

        const consultationResponsesArray = Object.entries(dynamicValues).map(([fieldId, value]) => ({ fieldId: String(fieldId), label: '', value }));
        const symptomsPlain = stripHtml(symptomsHtml);
        const symptomsArray = symptomsPlain ? symptomsPlain.split('\n').filter(s => s.trim()).map(s => ({ name: s.replace(/^•\s*/, '').trim() })) : [];

        await axios.post(`${API_BAS}/api/prescriptions/save`, {
            slug, patientId, pdfBinary: pdfBase64,
            consultationResponses: consultationResponsesArray,
            medicines: filledMeds, symptomsHtml, symptoms: symptomsArray,
            investigations: filledInvs, vaccinations: filledVacs,
            reports: filledReports, tableData: tableDataForPrescription,
        });
    };

    const handleSave = async () => {
        const { design, patient, formStructure } = masterData;
        if (!patient || !design) return alert("Patient/Design data missing!");
        setSaving(true);
        try {
            const doc = await buildPdfDoc(design, patient, formStructure);
            setPreviewPdfDoc(doc);
            setPreviewOpen(true);
        } catch (err) {
            console.error(err);
            alert("Error generating PDF: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveToDB = async () => {
        const { design, patient, formStructure } = masterData;
        if (!patient || !design) return alert("Patient/Design data missing!");
        setSaving(true);
        try {
            const doc = await buildPdfDoc(design, patient, formStructure);
            const pdfBase64 = doc.output('datauristring');
            const patientId = patient?._id;
            const filledMeds = medicines.filter(m => m.name?.trim() || m.brandName?.trim());
            const filledInvs = investigations.filter(inv => inv.testName?.trim());
            const filledVacs = vaccinations.filter(vac => vac.vaccineName?.trim());
            const filledReports = reports.filter(r => r.reportName?.trim());
            await Promise.all(filledReports.map(r => axios.post(`${API_BAS}/api/p_reports/${slug}/add`, { patientId, appointmentId, reportName: r.reportName, date: r.date || new Date(), impression: r.impression, action: r.action }).catch(err => console.warn('Report save failed:', err.message))));
            const tableDataForPrescription = {}; const tableSavePromises = [];
            if (formStructure?.sections) {
                formStructure.sections.forEach(section => {
                    (section.fields || []).filter(f => f.type === 'table').forEach(tField => {
                        const tRows = (tableRows[tField.id] || []).filter(r => Object.entries(r).some(([k, v]) => k !== '_rowId' && v !== ''));
                        if (tRows.length === 0) return;
                        tableDataForPrescription[tField.id] = tRows;
                        if (tField.collectionName) { tRows.forEach(row => { const { _rowId, ...cleanRow } = row; tableSavePromises.push(axios.post(`${API_BAS}/api/prescriptions/${tField.collectionName}/rows`, { ...cleanRow, patientId, appointmentId, slug }).catch(err => console.warn(`Table row save failed:`, err.message))); }); }
                    });
                });
            }
            await Promise.all(tableSavePromises);
            const consultationResponsesArray = Object.entries(dynamicValues).map(([fieldId, value]) => ({ fieldId: String(fieldId), label: '', value }));
            const symptomsPlain = stripHtml(symptomsHtml);
            const symptomsArray = symptomsPlain ? symptomsPlain.split('\n').filter(s => s.trim()).map(s => ({ name: s.replace(/^•\s*/, '').trim() })) : [];
            await axios.post(`${API_BAS}/api/prescriptions/save`, { slug, patientId, pdfBinary: pdfBase64, consultationResponses: consultationResponsesArray, medicines: filledMeds, symptomsHtml, symptoms: symptomsArray, investigations: filledInvs, vaccinations: filledVacs, reports: filledReports, tableData: tableDataForPrescription });
        } catch (err) { console.error(err); alert("Error: " + err.message); }
        finally { setSaving(false); }
    };

    const handleSaveExit = async () => {
        const { design, patient, formStructure } = masterData;
        if (!patient || !design || !previewPdfDoc) return;
        try {
            await persistPrescription(previewPdfDoc);
            setPreviewOpen(false);
            navigate(`/${slug}/dashboard/appointment`);
        } catch (err) {
            console.error(err);
            alert("Error saving: " + err.message);
        }
    };

    const { design, patient, formStructure } = masterData;
    const modalConfig = getModalConfig();

    const renderDynamicField = (field) => {
        if (field.type === 'table') {
            return <DynamicTableField key={field.id} field={field} rows={tableRows[field.id] || []} slug={slug} onChange={(updatedRows) => setTableRows(prev => ({ ...prev, [field.id]: updatedRows }))} />;
        }
        if (field.type === 'file') {
            return (
                <div key={field.id}>
                    <label className="rx-field-label">{field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, field.id)} style={{ width: '100%', fontSize: 12, color: '#64748b' }} />
                    {dynamicValues[String(field.id)]?.startsWith('data:image') && <img src={dynamicValues[String(field.id)]} style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain', marginTop: 6 }} alt={field.label} />}
                </div>
            );
        }
        if (field.type === 'textarea') {
            return (
                <div key={field.id}>
                    <label className="rx-field-label">{field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <textarea className="rx-field-input" rows={2} style={{ resize: 'none' }}
                        value={dynamicValues[String(field.id)] || ''} onChange={(e) => setDynamicValues(p => ({ ...p, [String(field.id)]: e.target.value }))} />
                </div>
            );
        }
        return (
            <div key={field.id}>
                <label className="rx-field-label">{field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <input className="rx-field-input"
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={dynamicValues[String(field.id)] || ''} onChange={(e) => setDynamicValues(p => ({ ...p, [String(field.id)]: e.target.value }))} />
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
            <style>{globalStyles}</style>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @media print {
                    @page { size: A4; margin: 0 !important; }
                    body { margin: 0; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>

            <div style={{ background: '#fff', minHeight: '100vh' }}>
                {/* Header */}
                <div className="rx-header">
                    <div style={{ background: '#1976D2', borderRadius: 6, padding: '7px 9px', color: '#fff', display: 'flex', alignItems: 'center' }}>
                        <User size={16} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', letterSpacing: '-0.3px' }}>Clinical Console</span>
                    {isRevisit && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1565c0', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RefreshCw size={11} /> Revisit
                        </span>
                    )}
                </div>

                {/* Mobile search */}
                {!appointmentId && (
                    <div className="rx-mobile-search">
                        <input className="rx-mobile-search-input" placeholder="Enter patient mobile number..."
                            value={mobileInput} onChange={e => setMobileInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                        <button className="rx-mobile-search-btn" onClick={handleSearch} disabled={searching}>
                            {searching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                            Search
                        </button>
                    </div>
                )}

                <div style={{ padding: '16px 0' }}>
                    {patient && (
                        <>
                            {/* Patient card */}
                            <div className={`rx-patient-card ${isRevisit ? 'revisit' : ''}`}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Active Patient</span>
                                    {isRevisit && <span style={{ fontSize: 10, fontWeight: 800, background: '#1565c0', padding: '2px 8px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}><RefreshCw size={9} /> Revisit</span>}
                                </div>
                                <div className="text-[18px] font-extrabold tracking-[2px] mb-[2px]">{patient.name}</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>{patient.age}Y / {patient.gender} | {patient.mobile}</div>
                            </div>

                            {isRevisitAutoFilled && (
                                <div className="rx-revisit-banner">
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#1565c0', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}><RefreshCw size={11} /> Previous Visit Data Auto-filled</div>
                                        <div style={{ fontSize: 11, color: '#3b82f6' }}>All fields loaded from last visit. Edit freely before saving.</div>
                                    </div>
                                    <button onClick={async () => { setDynamicValues({}); setMedicines([{ ...EMPTY_MED }]); setInvestigations([{ ...EMPTY_INV }]); setVaccinations([{ ...EMPTY_VAC }]); setReports([{ ...EMPTY_REPORT }]); setSymptomsHtml(''); await initTableRows(formStructure); setIsRevisitAutoFilled(false); }}
                                        style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Clear ✕
                                    </button>
                                </div>
                            )}

                            {/* ══ SYMPTOMS ══ */}
                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                <div className="rx-section-header">Symptoms</div>
                                <div className="rx-section-body">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <div className="rx-search-row">
                                            <div className="rx-search-wrap">
                                                <input className="rx-search-input" placeholder="Search Symptom"
                                                    value={symptomInput}
                                                    onChange={(e) => { setSymptomInput(e.target.value); searchSymptoms(e.target.value); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (symptomSuggestions.length > 0) selectSymptom(symptomSuggestions[0]); else if (symptomInput.trim()) addCustomSymptom(); } }}
                                                    onBlur={() => { setTimeout(() => { if (!symptomPointerDownRef.current) setSymptomSuggestions([]); }, 150); }} />
                                                {symptomSearching && <Loader2 size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />}
                                                {symptomSuggestions.length > 0 && (
                                                    <div className="rx-suggestion-list" style={{ width: '100%' }}>
                                                        {symptomSuggestions.map((s, idx) => (
                                                            <div key={s._id || idx} onPointerDown={(e) => { e.preventDefault(); symptomPointerDownRef.current = true; selectSymptom(s); }} className="rx-suggestion-item">
                                                                {s.name} {s.category && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>{s.category}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="rx-add-btn" onClick={addCustomSymptom}>+ Add New Symptom</button>
                                        </div>
                                        {symptomNoResults && !symptomSearching && symptomInput.length >= 1 && (
                                            <div className="rx-no-match">
                                                <span>No match for "<strong>{symptomInput}</strong>"</span>
                                                <button className="rx-no-match-btn" onPointerDown={(e) => { e.preventDefault(); openAddModal('symptom', null, symptomInput); }}>
                                                    <PlusCircle size={10} /> Add to DB
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <RichTextEditor ref={symptomEditorRef} value={symptomsHtml} onChange={setSymptomsHtml} placeholder="Symptoms will appear here when selected above, or type freely..." />
                                </div>
                            </div>

                            {/* ══ DYNAMIC FORM SECTIONS ══ */}
                            {formStructure?.sections.map((section, sIdx) => {
                                const tableF = section.fields.filter(f => f.type === 'table');
                                const nonTableF = section.fields.filter(f => f.type !== 'table');
                                return (
                                    <div key={sIdx}>
                                        {nonTableF.length > 0 && (
                                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                                <div className="rx-section-header">{section.sectionTitle}</div>
                                                <div className="rx-section-body">
                                                    <div className="rx-dyn-grid">{nonTableF.map(field => renderDynamicField(field))}</div>
                                                </div>
                                            </div>
                                        )}
                                        {tableF.map(field => renderDynamicField(field))}
                                    </div>
                                );
                            })}

                            {/* ══ MEDICINES ══ */}
                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                <div className="rx-section-header">Medicine</div>
                                <div className="rx-section-body">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <div className="rx-search-row">
                                            <div className="rx-search-wrap">
                                                <input className="rx-search-input" placeholder="Search Medicine..."
                                                    value={medSearchInput}
                                                    onChange={(e) => handleMedTopSearch(e.target.value)}
                                                    onBlur={() => { setTimeout(() => { if (!suggestionPointerDownRef.current) { setMedSuggestions([]); setActiveMedIndex(null); } }, 150); }} />
                                                {activeMedIndex === 'top' && medSuggestions.length > 0 && (
                                                    <div className="rx-suggestion-list" style={{ width: 340 }}>
                                                        {medSuggestions.map(s => (
                                                            <div key={s._id} onPointerDown={(e) => { e.preventDefault(); suggestionPointerDownRef.current = true; selectMedicineFromTop(s); }} className="rx-suggestion-item">
                                                                <div style={{ fontWeight: 700 }}>{s.brandName || s.name}</div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.name} · {s.strength} · {s.category}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="rx-add-btn" onClick={addMedicineManually}>+ Add Medicine</button>
                                        </div>
                                        {activeMedIndex === 'top' && medNoResults['top'] && medSearchInput.length >= 2 && (
                                            <div className="rx-no-match">
                                                <span>No match for "<strong>{medSearchInput}</strong>"</span>
                                                <button className="rx-no-match-btn" onPointerDown={(e) => { e.preventDefault(); openAddModal('medicine', medicines.length, medSearchInput); }}>
                                                    <PlusCircle size={10} /> Add to DB
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="rx-table">
                                            <thead>
                                                <tr>
                                                    <th>Medicine Name</th><th>Unit per Dose</th><th>Frequency</th>
                                                    <th>Route</th><th>Timing</th><th>Instruction</th><th>Duration</th>
                                                    <th style={{ width: 44 }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {medicines.map((med, i) => (
                                                    <tr key={i}>
                                                        <td style={{ minWidth: 170, position: 'relative' }}>
                                                            <input className="rx-table-input" placeholder="Brand / Generic..."
                                                                value={med.brandName || med.name}
                                                                onChange={(e) => { updateMedicine(i, 'brandName', e.target.value); searchMedicines(e.target.value, i); }}
                                                                onBlur={() => { setTimeout(() => { if (!suggestionPointerDownRef.current) { setMedSuggestions([]); setActiveMedIndex(null); } }, 150); }} />
                                                            {activeMedIndex === i && medSuggestions.length > 0 && (
                                                                <div className="rx-suggestion-list">
                                                                    {medSuggestions.map(s => (
                                                                        <div key={s._id} onPointerDown={(e) => { e.preventDefault(); suggestionPointerDownRef.current = true; const selectMed = (med2, idx) => { setMedicines(prev => prev.map((m, mi) => mi === idx ? { ...m, name: med2.name || '', brandName: med2.brandName || '', strength: med2.strength || '', unit_per_Dose: med2.unit_per_Dose || '', timing: med2.timing || '', duration: med2.duration || '', route: med2.route || '', action: med2.action || '', instructions: med2.instructions || '', category: med2.category || '', saltComposition: med2.saltComposition || '' } : m)); setMedSuggestions([]); setActiveMedIndex(null); setMedNoResults(prev => ({ ...prev, [idx]: false })); }; selectMed(s, i); }} className="rx-suggestion-item">
                                                                            <div style={{ fontWeight: 700 }}>{s.brandName}</div>
                                                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.name} · {s.strength}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {activeMedIndex === i && medNoResults[i] && (med.brandName || med.name)?.length >= 2 && (
                                                                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50 }}>
                                                                    <div className="rx-no-match" style={{ width: 220 }}>
                                                                        <span style={{ fontSize: 11 }}>No match</span>
                                                                        <button className="rx-no-match-btn" onPointerDown={(e) => { e.preventDefault(); openAddModal('medicine', i, med.brandName || med.name); }}>
                                                                            <PlusCircle size={9} /> Add
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ minWidth: 90 }}><input className="rx-table-input" placeholder="1 Tab" value={med.unit_per_Dose || ''} onChange={(e) => updateMedicine(i, 'unit_per_Dose', e.target.value)} /></td>
                                                        <td style={{ minWidth: 80 }}><input className="rx-table-input" placeholder="1-0-1" value={med.strength || ''} onChange={(e) => updateMedicine(i, 'strength', e.target.value)} /></td>
                                                        <td style={{ minWidth: 70 }}><input className="rx-table-input" placeholder="P/O" value={med.route || ''} onChange={(e) => updateMedicine(i, 'route', e.target.value)} /></td>
                                                        <td style={{ minWidth: 90 }}><input className="rx-table-input" placeholder="Morning" value={med.timing || ''} onChange={(e) => updateMedicine(i, 'timing', e.target.value)} /></td>
                                                        <td style={{ minWidth: 110 }}><input className="rx-table-input" placeholder="After meal" value={med.instructions || ''} onChange={(e) => updateMedicine(i, 'instructions', e.target.value)} /></td>
                                                        <td style={{ minWidth: 80 }}><input className="rx-table-input" placeholder="10 days" value={med.duration || ''} onChange={(e) => updateMedicine(i, 'duration', e.target.value)} /></td>
                                                        <td style={{ textAlign: 'center' }}><button className="rx-del-btn" onClick={() => removeMedicine(i)}><X size={11} /></button></td>
                                                    </tr>
                                                ))}
                                                {medicines.length === 0 && (
                                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>No medicines added</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ══ INVESTIGATIONS ══ */}
                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                <div className="rx-section-header">Investigation</div>
                                <div className="rx-section-body">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <div className="rx-search-row">
                                            <div className="rx-search-wrap">
                                                <input className="rx-search-input" placeholder="Search Investigation"
                                                    value={invSearchInput}
                                                    onChange={(e) => handleInvTopSearch(e.target.value)}
                                                    onBlur={() => { setTimeout(() => { if (!invPointerDownRef.current) { setInvSuggestions([]); setActiveInvIndex(null); } }, 150); }} />
                                                {invSearching && <Loader2 size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />}
                                                {activeInvIndex === 'top' && invSuggestions.length > 0 && (
                                                    <div className="rx-suggestion-list" style={{ width: 340 }}>
                                                        {invSuggestions.map(s => (
                                                            <div key={s._id} onPointerDown={(e) => { e.preventDefault(); invPointerDownRef.current = true; selectInvestigationFromTop(s); }} className="rx-suggestion-item">
                                                                <span style={{ fontWeight: 700 }}>{s.testName}</span>
                                                                {s.category && <span style={{ color: '#94a3b8', marginLeft: 6 }}>{s.category}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="rx-add-btn" onClick={addInvestigation}>+ Add Investigation</button>
                                        </div>
                                        {activeInvIndex === 'top' && invNoResults['top'] && !invSearching && invSearchInput.length >= 1 && (
                                            <div className="rx-no-match">
                                                <span>No match for "<strong>{invSearchInput}</strong>"</span>
                                                <button className="rx-no-match-btn" onPointerDown={(e) => { e.preventDefault(); openAddModal('investigation', investigations.length, invSearchInput); }}>
                                                    <PlusCircle size={10} /> Add to DB
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <table className="rx-table">
                                        <thead><tr><th>Investigation</th><th>Action</th><th style={{ width: 44 }}></th></tr></thead>
                                        <tbody>
                                            {investigations.map((inv, i) => (
                                                <tr key={i}>
                                                    <td style={{ minWidth: 220 }}><input className="rx-table-input" placeholder="Test name..." value={inv.testName} onChange={(e) => updateInvestigation(i, 'testName', e.target.value)} /></td>
                                                    <td style={{ minWidth: 180 }}><input className="rx-table-input" placeholder="Notes / action" value={inv.action || ''} onChange={(e) => updateInvestigation(i, 'action', e.target.value)} /></td>
                                                    <td style={{ textAlign: 'center' }}><button className="rx-del-btn" onClick={() => removeInvestigation(i)}><X size={11} /></button></td>
                                                </tr>
                                            ))}
                                            {investigations.length === 0 && (
                                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>No investigations added</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ══ VACCINATIONS ══ */}
                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                <div className="rx-section-header">Vaccination</div>
                                <div className="rx-section-body">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <div className="rx-search-row">
                                            <div className="rx-search-wrap">
                                                <input className="rx-search-input" placeholder="Search Vaccination"
                                                    value={vacSearchInput}
                                                    onChange={(e) => handleVacTopSearch(e.target.value)}
                                                    onBlur={() => { setTimeout(() => { if (!vacPointerDownRef.current) { setVacSuggestions([]); setActiveVacIndex(null); } }, 150); }} />
                                                {vacSearching && <Loader2 size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />}
                                                {activeVacIndex === 'top' && vacSuggestions.length > 0 && (
                                                    <div className="rx-suggestion-list" style={{ width: 340 }}>
                                                        {vacSuggestions.map(s => (
                                                            <div key={s._id} onPointerDown={(e) => { e.preventDefault(); vacPointerDownRef.current = true; selectVaccinationFromTop(s); }} className="rx-suggestion-item">
                                                                <span style={{ fontWeight: 700 }}>{s.vaccineName}</span>
                                                                {s.note && <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.note}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="rx-add-btn" onClick={addVaccination}>+ Add New Vaccination</button>
                                        </div>
                                        {activeVacIndex === 'top' && vacNoResults['top'] && !vacSearching && vacSearchInput.length >= 1 && (
                                            <div className="rx-no-match">
                                                <span>No match for "<strong>{vacSearchInput}</strong>"</span>
                                                <button className="rx-no-match-btn" onPointerDown={(e) => { e.preventDefault(); openAddModal('vaccination', vaccinations.length, vacSearchInput); }}>
                                                    <PlusCircle size={10} /> Add to DB
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <table className="rx-table">
                                        <thead><tr><th>Vaccination Name</th><th>Note</th><th>Action</th><th style={{ width: 44 }}></th></tr></thead>
                                        <tbody>
                                            {vaccinations.map((vac, i) => (
                                                <tr key={i}>
                                                    <td style={{ minWidth: 200 }}><input className="rx-table-input" placeholder="Vaccine name..." value={vac.vaccineName} onChange={(e) => updateVaccination(i, 'vaccineName', e.target.value)} /></td>
                                                    <td style={{ minWidth: 140 }}><input className="rx-table-input" placeholder="e.g. 2nd dose" value={vac.note || ''} onChange={(e) => updateVaccination(i, 'note', e.target.value)} /></td>
                                                    <td style={{ minWidth: 140 }}><input className="rx-table-input" placeholder="IM injection" value={vac.action || ''} onChange={(e) => updateVaccination(i, 'action', e.target.value)} /></td>
                                                    <td style={{ textAlign: 'center' }}><button className="rx-del-btn" onClick={() => removeVaccination(i)}><X size={11} /></button></td>
                                                </tr>
                                            ))}
                                            {vaccinations.length === 0 && (
                                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>No vaccinations added</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ══ REPORTS ══ */}
                            <div className="rx-section" style={{ marginBottom: 16, borderRadius: 2 }}>
                                <div className="rx-section-header">Reports</div>
                                <div className="rx-section-body">
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <div className="rx-search-row">
                                            <div className="rx-search-wrap">
                                                <input className="rx-search-input" placeholder="Search Report"
                                                    value={reportSearchInput}
                                                    onChange={(e) => handleReportTopSearch(e.target.value)}
                                                    onBlur={() => { setTimeout(() => { if (!reportPointerDownRef.current) { setReportSuggestions([]); setActiveReportIndex(null); } }, 150); }} />
                                                {reportSearching && <Loader2 size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />}
                                                {activeReportIndex === 'top' && reportSuggestions.length > 0 && (
                                                    <div className="rx-suggestion-list" style={{ width: 340 }}>
                                                        {reportSuggestions.map((s, idx) => (
                                                            <div key={s._id || idx} onPointerDown={(e) => { e.preventDefault(); reportPointerDownRef.current = true; selectReportFromTop(s); }} className="rx-suggestion-item">
                                                                <span style={{ fontWeight: 700 }}>{s.reportName}</span>
                                                                {s.date && <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 11 }}>{new Date(s.date).toLocaleDateString()}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="rx-add-btn" onClick={addReport}>+ Add Report</button>
                                        </div>
                                    </div>
                                    <table className="rx-table">
                                        <thead><tr><th>Report Name</th><th>Date</th><th>Impression</th><th>Action</th><th style={{ width: 44 }}></th></tr></thead>
                                        <tbody>
                                            {reports.map((report, i) => (
                                                <tr key={i}>
                                                    <td style={{ minWidth: 170 }}><input className="rx-table-input" placeholder="Report name..." value={report.reportName} onChange={(e) => updateReport(i, 'reportName', e.target.value)} /></td>
                                                    <td style={{ minWidth: 130 }}><input type="date" className="rx-table-input" value={report.date} onChange={(e) => updateReport(i, 'date', e.target.value)} /></td>
                                                    <td style={{ minWidth: 150 }}><input className="rx-table-input" placeholder="Normal findings" value={report.impression || ''} onChange={(e) => updateReport(i, 'impression', e.target.value)} /></td>
                                                    <td style={{ minWidth: 140 }}><input className="rx-table-input" placeholder="Repeat in 3 months" value={report.action || ''} onChange={(e) => updateReport(i, 'action', e.target.value)} /></td>
                                                    <td style={{ textAlign: 'center' }}><button className="rx-del-btn" onClick={() => removeReport(i)}><X size={11} /></button></td>
                                                </tr>
                                            ))}
                                            {reports.length === 0 && (
                                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>No reports added</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Action Buttons ── */}
                            <div className="rx-action-grid">
                                <button className="rx-btn-print" onClick={async () => {
                                    const { design, patient, formStructure } = masterData;
                                    if (!patient || !design) return alert("Patient/Design data missing!");
                                    const doc = await buildPdfDoc(design, patient, formStructure);
                                    const pdfBlobUrl = URL.createObjectURL(doc.output('blob'));
                                    const win = window.open(pdfBlobUrl, '_blank');
                                    if (win) {
                                        win.addEventListener('load', () => {
                                            win.focus();
                                            win.print();
                                        });
                                    }
                                }}>
                                    <Printer size={15} /> Print Only
                                </button>
                                <button className="rx-btn-save" onClick={() => { handleSave(); handleSaveToDB(); }} disabled={saving}>
                                    {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={15} />}
                                    {saving ? 'Building...' : 'Save & Share'}
                                </button>
                            </div>
                        </>
                    )}

                    {!patient && !searching && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', opacity: 0.3 }}>
                            <h1 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Search a Patient to Begin</h1>
                        </div>
                    )}
                    {searching && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: '#64748b' }}>
                            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: 14, fontWeight: 600 }}>Loading patient data...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden print target */}
            <div style={{ display: 'none' }}>
                {design && patient && (
                    <PrintablePrescription ref={printRef} design={design} patient={patient} symptomsHtml={symptomsHtml} clinicProfile={clinicProfile} />
                )}
            </div>

            {/* ── Add to DB Modal ── */}
            <AddToDBModal isOpen={dbModal.open} onClose={closeAddModal} onSave={handleSaveNewToDB}
                title={modalConfig.title} fields={modalConfig.fields} saving={dbModalSaving} />

            {/* ── Preview Modal (Post-Save) ── */}
            <PreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                pdfDoc={previewPdfDoc}
                patient={patient}
                onPrint={handlePrint}
                onSaveExit={handleSaveExit}
                navigate={navigate}
                slug={slug}
            />
        </div>
    );
};

export default GeneratePrescription;