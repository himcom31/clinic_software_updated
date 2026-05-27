import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type, Hash, ChevronDown, CheckSquare, Calendar, AlignLeft,
  FileUp, ToggleLeft, Plus, GripVertical, Trash2, Copy,
  Settings2, Eye, Save, Layout, Sparkles, Stethoscope,
  Smile, Baby, User, Layers, Info, X, Heading,
  ChevronRight, AlertCircle, Wand2, Loader2, Monitor, MousePointer2,
  Tag, CheckCircle2, Table2, Database, Pill, FlaskConical, Syringe,
  FileText, Activity, Lock,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const API_BAS = import.meta.env.VITE_API_URL;

// ─── PREDEFINED BLOCK CONFIGS ─────────────────────────────────────────────────
// These represent the hardcoded sections in GeneratePrescription that can now
// be reordered from within FormBuilder.

export const PREDEFINED_BLOCKS = {
  symptoms_block: {
    label: 'Symptoms',
    icon: <Activity size={18} />,
    color: 'blue',
    description: 'Rich-text symptom entry with DB search',
    locked: false,
  },
  medicines_block: {
    label: 'Medicines',
    icon: <Pill size={18} />,
    color: 'emerald',
    description: 'Medicine table with brand/generic search',
    locked: false,
  },
  investigations_block: {
    label: 'Investigations',
    icon: <FlaskConical size={18} />,
    color: 'violet',
    description: 'Lab tests & investigation orders',
    locked: false,
  },
  vaccinations_block: {
    label: 'Vaccinations',
    icon: <Syringe size={18} />,
    color: 'amber',
    description: 'Vaccine records with dose notes',
    locked: false,
  },
  reports_block: {
    label: 'Reports',
    icon: <FileText size={18} />,
    color: 'rose',
    description: 'Attached reports with impressions',
    locked: false,
  },
};

const BLOCK_COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-600',   icon: 'text-blue-500'   },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600', icon: 'text-emerald-500' },
  violet:  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-600', icon: 'text-violet-500' },
  amber:   { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-600',  icon: 'text-amber-500'  },
  rose:    { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   badge: 'bg-rose-100 text-rose-600',   icon: 'text-rose-500'   },
};

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { type: 'heading',  label: 'Section Heading', icon: <Heading size={18} />,     category: 'Layout'    },
  { type: 'richtext', label: 'Pro Editor',       icon: <Sparkles size={18} />,    category: 'Inputs'    },
  { type: 'text',     label: 'Short Text',       icon: <Type size={18} />,        category: 'Inputs'    },
  { type: 'number',   label: 'Number/Vital',     icon: <Hash size={18} />,        category: 'Inputs'    },
  { type: 'dropdown', label: 'Dropdown',          icon: <ChevronDown size={18} />, category: 'Selection' },
  { type: 'yesno',    label: 'Yes/No Toggle',    icon: <ToggleLeft size={18} />,  category: 'Selection' },
  { type: 'checkbox', label: 'Checkbox Group',   icon: <CheckSquare size={18} />, category: 'Selection' },
  { type: 'date',     label: 'Date Picker',      icon: <Calendar size={18} />,    category: 'Inputs'    },
  { type: 'textarea', label: 'Clinical Note',    icon: <AlignLeft size={18} />,   category: 'Inputs'    },
  { type: 'file',     label: 'File Upload',      icon: <FileUp size={18} />,      category: 'Layout'    },
  { type: 'symptom',  label: 'Symptom Entry',    icon: <Stethoscope size={18} />, category: 'Clinical'  },
  { type: 'table',    label: 'Custom Table',     icon: <Table2 size={18} />,      category: 'Clinical'  },
];

const COLUMN_TYPES = ['text', 'number', 'date', 'dropdown', 'yesno'];

export const deriveCollectionName = (slug, tableName) => {
  const cleanSlug  = (slug      || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const cleanTable = (tableName || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${cleanSlug}_${cleanTable}_table`;
};

const TEMPLATES = {
  general: {
    name: 'General Physician',
    icon: <Stethoscope size={16} />,
    fields: [
      { id: 'gp-1', type: 'heading',  label: 'Patient Assessment' },
      { id: 'gp-2', type: 'text',     label: 'Chief Complaints', required: true, placeholder: 'Describe symptoms...' },
      { id: 'gp-3', type: 'number',   label: 'Body Pressure (BP)', placeholder: '120/80' },
      { id: 'gp-4', type: 'yesno',    label: 'Any Allergies?' },
      { id: 'gp-5', type: 'textarea', label: 'Doctor Diagnosis' },
    ]
  },
  dentist: {
    name: 'Dentist Studio',
    icon: <Smile size={16} />,
    fields: [
      { id: 'dt-1', type: 'heading',  label: 'Dental Examination' },
      { id: 'dt-2', type: 'dropdown', label: 'Affected Quadrant', options: ['Upper Left', 'Upper Right', 'Lower Left', 'Lower Right'] },
      { id: 'dt-3', type: 'checkbox', label: 'Diagnosis Findings', options: ['Cavity', 'Sensitivity', 'Gum Bleeding', 'Plaque'] },
      { id: 'dt-4', type: 'file',     label: 'X-Ray Scan' },
    ]
  }
};

// ─── TIPTAP RICH TEXT EDITOR ──────────────────────────────────────────────────
const TiptapEditor = ({ value, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || `<p>${placeholder || 'Start typing notes...'}</p>`,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });
  if (!editor) return null;
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-100 flex-wrap">
        {[['Bold','bold','toggleBold'],['Italic','italic','toggleItalic'],['List','bulletList','toggleBulletList']].map(([label, act, cmd]) => (
          <button key={label} type="button"
            onClick={() => editor.chain().focus()[cmd]().run()}
            className={`px-2 py-1 rounded text-[10px] font-black uppercase ${editor.isActive(act) ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[120px] focus:outline-none text-sm text-slate-700 prose max-w-none" />
    </div>
  );
};

// ─── TABLE BUILDER MODAL ──────────────────────────────────────────────────────
const TableBuilderModal = ({ slug, field, onSave, onClose }) => {
  const [tableName, setTableName] = useState(field?.tableName || '');
  const [columns,   setColumns]   = useState(
    field?.columns?.length
      ? field.columns.map((c, i) => ({ ...c, id: c.id || `col-${i}-${Date.now()}` }))
      : [{ id: `col-${Date.now()}`, name: 'Date', type: 'date' }]
  );
  const [saving,   setSaving]   = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [error,    setError]    = useState('');

  const collectionName = deriveCollectionName(slug, tableName);

  const addColumn = () => {
    setColumns(prev => [...prev, { id: `col-${Date.now()}`, name: `Column ${prev.length + 1}`, type: 'text' }]);
  };

  const updateColumn = (id, key, value) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const deleteColumn = (id) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!tableName.trim())    { setError('Table name is required.'); return; }
    if (columns.length === 0) { setError('Add at least one column.'); return; }
    const badCol = columns.find(c => !c.name.trim());
    if (badCol)               { setError('All columns must have a name.'); return; }
    setError('');
    setSaving(true);
    try {
      await axios.post(`${API_BAS}/api/clinic/${slug}/create-table`, {
        tableName:      tableName.trim(),
        collectionName,
        columns:        columns.map(c => ({ name: c.name.trim(), type: c.type })),
      });
      setSavedMsg('Collection created!');
      setTimeout(() => setSavedMsg(''), 2500);
      onSave({ tableName: tableName.trim(), collectionName, columns });
    } catch (err) {
      console.error('Table create error:', err);
      setError(err?.response?.data?.message || 'Failed to create table collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[28px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-100">
              <Table2 size={16} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Configure Table</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Auto-creates DB collection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">
              Table Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12px] font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="e.g. Vitals, Lab Results, Follow-ups..."
              value={tableName}
              onChange={e => { setTableName(e.target.value); setError(''); }}
            />
          </div>

          {tableName.trim() && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Database size={12} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">MongoDB Collection</p>
                <p className="text-[11px] font-black text-blue-700 font-mono mt-0.5">{collectionName}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Columns ({columns.length})
              </label>
              <button onClick={addColumn} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">
                <Plus size={12} /> Add Column
              </button>
            </div>

            <div className="grid grid-cols-[1fr_100px_32px] gap-2 px-1 mb-1">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Column Name</span>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Type</span>
              <span />
            </div>

            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div key={col.id} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                  <input
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-bold outline-none focus:border-blue-400 transition-all"
                    placeholder={`Column ${idx + 1} name`}
                    value={col.name}
                    onChange={e => updateColumn(col.id, 'name', e.target.value)}
                  />
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-bold outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer"
                    value={col.type}
                    onChange={e => updateColumn(col.id, 'type', e.target.value)}
                  >
                    {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => deleteColumn(col.id)}
                    disabled={columns.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {columns.length > 0 && tableName.trim() && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">Preview</label>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      {columns.map(col => (
                        <th key={col.id} className="text-left px-3 py-2 font-bold text-slate-500 border-b border-slate-100 whitespace-nowrap">
                          {col.name || '—'}
                          <span className="ml-1 text-[8px] font-normal text-slate-300">[{col.type}]</span>
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 font-bold text-slate-300 border-b border-slate-100 text-[9px]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {columns.map(col => (
                        <td key={col.id} className="px-3 py-2 text-slate-300 italic border-b border-slate-50">—</td>
                      ))}
                      <td className="px-3 py-2 text-slate-300 border-b border-slate-50 text-[10px]">Edit / Del</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          {savedMsg ? (
            <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-600">
              <CheckCircle2 size={13} /> {savedMsg}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">
              Creates <span className="font-bold text-slate-500">MongoDB collection</span> automatically.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
              {saving ? 'Creating...' : 'Save & Create Collection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PREDEFINED BLOCK CARD PREVIEW ───────────────────────────────────────────
const PredefinedBlockPreview = ({ field, isSelected, onDelete }) => {
  const blockDef = PREDEFINED_BLOCKS[field.type];
  if (!blockDef) return null;
  const colors = BLOCK_COLOR_MAP[blockDef.color];

  const previewContent = {
    symptoms_block: (
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {['Fever', 'Headache', 'Cough'].map(s => (
            <span key={s} className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${colors.badge} ${colors.border}`}>
              <Tag size={7} />{s}
            </span>
          ))}
          <span className="text-[9px] text-slate-300 italic self-center">+ type freely...</span>
        </div>
        <div className={`h-8 rounded-lg border ${colors.border} ${colors.bg} flex items-center px-3`}>
          <span className="text-[9px] text-slate-400 italic">Rich text symptom editor...</span>
        </div>
      </div>
    ),
    medicines_block: (
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-[9px]">
          <thead><tr className="bg-slate-50"><th className="px-2 py-1.5 text-left font-bold text-slate-400">Medicine</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Dose</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Duration</th></tr></thead>
          <tbody><tr><td className="px-2 py-1 text-slate-300 italic">Paracetamol 500mg</td><td className="px-2 py-1 text-slate-300">1-0-1</td><td className="px-2 py-1 text-slate-300">5 days</td></tr></tbody>
        </table>
      </div>
    ),
    investigations_block: (
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-[9px]">
          <thead><tr className="bg-slate-50"><th className="px-2 py-1.5 text-left font-bold text-slate-400">Test Name</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Action</th></tr></thead>
          <tbody><tr><td className="px-2 py-1 text-slate-300 italic">CBC, LFT...</td><td className="px-2 py-1 text-slate-300">Fasting req.</td></tr></tbody>
        </table>
      </div>
    ),
    vaccinations_block: (
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-[9px]">
          <thead><tr className="bg-slate-50"><th className="px-2 py-1.5 text-left font-bold text-slate-400">Vaccine</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Note</th></tr></thead>
          <tbody><tr><td className="px-2 py-1 text-slate-300 italic">Hepatitis B</td><td className="px-2 py-1 text-slate-300">2nd dose</td></tr></tbody>
        </table>
      </div>
    ),
    reports_block: (
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-[9px]">
          <thead><tr className="bg-slate-50"><th className="px-2 py-1.5 text-left font-bold text-slate-400">Report</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Date</th><th className="px-2 py-1.5 text-left font-bold text-slate-400">Impression</th></tr></thead>
          <tbody><tr><td className="px-2 py-1 text-slate-300 italic">X-Ray Chest</td><td className="px-2 py-1 text-slate-300">Today</td><td className="px-2 py-1 text-slate-300">Normal</td></tr></tbody>
        </table>
      </div>
    ),
  };

  return (
    <div className={`w-full rounded-xl border-2 p-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colors.icon}>{blockDef.icon}</span>
          <span className={`text-[11px] font-black uppercase tracking-wider ${colors.text}`}>{blockDef.label}</span>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${colors.badge}`}>predefined</span>
        </div>
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 transition-colors"
            title="Remove from layout"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="pointer-events-none">
        {previewContent[field.type]}
      </div>
      <div className={`mt-2 text-[8px] font-bold ${colors.text} opacity-60 flex items-center gap-1`}>
        <GripVertical size={9} /> Drag to reorder position
      </div>
    </div>
  );
};

// ─── SORTABLE FIELD CARD ──────────────────────────────────────────────────────
const SortableField = ({ field, isSelected, onSelect, onDelete, onDuplicate, onEditTable }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto' };

  const isPredefined = !!PREDEFINED_BLOCKS[field.type];

  const renderFieldPreview = () => {
    if (isPredefined) {
      return <PredefinedBlockPreview field={field} isSelected={isSelected} onDelete={() => onDelete(field.id)} />;
    }

    switch (field.type) {
      case 'heading':
        return <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-1">{field.label || 'New Section'}</h3>;
      case 'text': case 'number': case 'date':
        return <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-[12px] text-slate-400">{field.placeholder || `Enter ${field.label}...`}</div>;
      case 'textarea':
        return <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-[12px] text-slate-400 min-h-[60px]">Notes preview...</div>;
      case 'dropdown':
        return <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-[12px] text-slate-400 flex justify-between items-center">Choose Option <ChevronDown size={14} /></div>;
      case 'yesno':
        return <div className="flex gap-2"><div className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px]">YES</div><div className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px]">NO</div></div>;
      case 'checkbox':
        return <div className="grid grid-cols-2 gap-2">{(field.options || ['Option A', 'Option B']).slice(0,2).map((opt, i) => (<div key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-100"><div className="w-3 h-3 border border-slate-300 rounded bg-white" /><span className="text-[10px] text-slate-500 truncate">{opt}</span></div>))}</div>;
      case 'richtext':
        return <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4"><div className="flex gap-2 mb-3 opacity-30"><div className="w-6 h-3 bg-slate-300 rounded" /><div className="w-6 h-3 bg-slate-300 rounded" /></div><div className="space-y-2"><div className="w-full h-1.5 bg-slate-100 rounded" /><div className="w-3/4 h-1.5 bg-slate-100 rounded" /></div><p className="text-[9px] text-slate-300 mt-2 italic">Text Editor Box</p></div>;
      case 'file':
        return <div className="w-full border border-dashed border-slate-200 rounded-lg py-4 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-1"><FileUp size={16} /><span className="text-[9px] font-bold uppercase tracking-widest">Medical Docs</span></div>;
      case 'symptom':
        return (
          <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2"><Stethoscope size={12} className="text-blue-500" /><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Symptom Entry</span></div>
            <div className="flex flex-wrap gap-1.5">{(field.defaultSymptoms || ['Fever', 'Headache', 'Cough']).map((s, i) => (<span key={i} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full"><Tag size={7} />{s}</span>))}<span className="text-[9px] text-blue-300 italic">+ more...</span></div>
          </div>
        );
      case 'table':
        return (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Table2 size={11} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{field.tableName || 'Untitled Table'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{field.columns?.length || 0} cols</span>
                {isSelected && (
                  <button onClick={(e) => { e.stopPropagation(); onEditTable(field.id); }} className="text-[8px] font-black text-slate-400 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-full uppercase transition-all">Edit</button>
                )}
              </div>
            </div>
            {field.columns?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr>{field.columns.map((col, i) => (<th key={i} className="text-left px-2.5 py-1.5 font-black text-slate-400 bg-slate-50 border-b border-slate-100 whitespace-nowrap uppercase tracking-wider">{col.name}</th>))}</tr>
                  </thead>
                  <tbody>
                    <tr>{field.columns.map((_, i) => (<td key={i} className="px-2.5 py-1.5 text-slate-200 italic">—</td>))}</tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-4 flex items-center justify-center text-[9px] text-slate-300 font-bold uppercase tracking-widest italic">No columns — click Edit to configure</div>
            )}
            {field.collectionName && (
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5">
                <Database size={8} className="text-slate-300" />
                <span className="text-[8px] font-mono text-slate-300">{field.collectionName}</span>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(field.id); }}
      className={`group relative p-4 bg-white border-2 rounded-xl transition-all cursor-pointer mb-3
        ${isSelected ? 'border-blue-500 shadow-lg ring-4 ring-blue-50/50' : 'border-slate-100 hover:border-slate-200'}
        ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white shadow-md border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all z-20"
      >
        <GripVertical size={14} className="text-slate-400" />
      </div>

      {/* For predefined blocks, the header/delete are handled inside PredefinedBlockPreview */}
      {!isPredefined && field.type !== 'heading' && (
        <div className="flex justify-between items-start mb-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              {field.label || 'Field Label'} {field.required && <span className="text-red-500">*</span>}
            </label>
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase text-blue-600 bg-blue-50">
              {FIELD_TYPES.find(f => f.type === field.type)?.label}
            </span>
          </div>
          {isSelected && (
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(field.id); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors"><Copy size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(field.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-400 transition-colors"><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none">{renderFieldPreview()}</div>
    </div>
  );
};

// ─── PREVIEW FORM FIELD ───────────────────────────────────────────────────────
const PreviewField = ({ field }) => {
  const [richtextValue, setRichtextValue] = useState('');
  const [symptomInput,  setSymptomInput]  = useState('');
  const [addedSymptoms, setAddedSymptoms] = useState([]);
  const [tableRows,     setTableRows]     = useState([]);

  if (PREDEFINED_BLOCKS[field.type]) {
    const blockDef = PREDEFINED_BLOCKS[field.type];
    const colors = BLOCK_COLOR_MAP[blockDef.color];
    return (
      <div className={`p-6 rounded-[24px] border-2 ${colors.border} ${colors.bg}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={colors.icon}>{blockDef.icon}</span>
          <span className={`text-sm font-black uppercase tracking-widest ${colors.text}`}>{blockDef.label}</span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${colors.badge}`}>
            rendered in prescription
          </span>
        </div>
        <p className="text-[11px] text-slate-400 italic">{blockDef.description} — full interface shown during prescription generation.</p>
      </div>
    );
  }

  if (field.type === 'heading') {
    return <h3 className="text-xl font-black text-slate-800 border-b-2 border-blue-600 pb-2 inline-block mb-2">{field.label}</h3>;
  }

  if (field.type === 'symptom') {
    return (
      <div className="space-y-3 bg-white p-6 rounded-[24px] border border-blue-100 shadow-sm">
        <label className="text-xs font-black text-blue-600 uppercase tracking-widest block px-1 flex items-center gap-2"><Stethoscope size={12} /> {field.label}</label>
        {addedSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{addedSymptoms.map((s, i) => (<span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full"><Tag size={8} />{s}<button onClick={() => setAddedSymptoms(p => p.filter((_, idx) => idx !== i))}><X size={10} className="text-blue-300 hover:text-red-500" /></button></span>))}</div>
        )}
        <div className="flex gap-2">
          <input type="text" placeholder="Type a symptom..." value={symptomInput} onChange={(e) => setSymptomInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && symptomInput.trim()) { setAddedSymptoms(p => [...p, symptomInput.trim()]); setSymptomInput(''); }}} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
          <button onClick={() => { if (symptomInput.trim()) { setAddedSymptoms(p => [...p, symptomInput.trim()]); setSymptomInput(''); }}} className="px-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700">Add</button>
        </div>
      </div>
    );
  }

  if (field.type === 'table') {
    const addRow = () => { const emptyRow = { _id: Date.now() }; (field.columns || []).forEach(col => { emptyRow[col.name] = ''; }); setTableRows(prev => [...prev, emptyRow]); };
    const updateCell = (rowId, colName, value) => { setTableRows(prev => prev.map(r => r._id === rowId ? { ...r, [colName]: value } : r)); };
    const deleteRow = (rowId) => { setTableRows(prev => prev.filter(r => r._id !== rowId)); };
    return (
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Table2 size={12} className="text-blue-500" /> {field.label || field.tableName}</label>
          <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] hover:bg-blue-700 transition-all"><Plus size={11} /> Add Row</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-slate-50">{(field.columns || []).map((col, i) => (<th key={i} className="text-left px-3 py-2 font-bold text-slate-500 border-b border-slate-100 whitespace-nowrap text-[10px] uppercase tracking-widest">{col.name}</th>))}<th className="px-3 py-2 border-b border-slate-100 w-8" /></tr></thead>
            <tbody>
              {tableRows.length === 0 ? (<tr><td colSpan={(field.columns?.length || 1) + 1} className="text-center py-6 text-[10px] text-slate-300 italic">No rows yet</td></tr>) :
                tableRows.map(row => (<tr key={row._id} className="border-b border-slate-50 last:border-0">{(field.columns || []).map((col, i) => (<td key={i} className="px-2 py-1.5"><input type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'} value={row[col.name] || ''} onChange={e => updateCell(row._id, col.name, e.target.value)} className="w-full bg-transparent outline-none text-xs text-slate-700 border border-slate-100 rounded-lg px-2 py-1 focus:border-blue-400" /></td>))}<td className="px-2 py-1.5"><button onClick={() => deleteRow(row._id)} className="p-1 hover:bg-red-50 rounded text-slate-200 hover:text-red-400 transition-all"><Trash2 size={11} /></button></td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block px-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.type === 'text'     && <input type="text"   placeholder={field.placeholder} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />}
      {field.type === 'number'   && <input type="number" placeholder={field.placeholder} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />}
      {field.type === 'textarea' && <textarea rows={3}   placeholder={field.placeholder} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />}
      {field.type === 'dropdown' && (
        <div className="relative">
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none appearance-none font-medium text-sm pr-10">
            <option value="">Select Option...</option>
            {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
      )}
      {field.type === 'richtext' && <div key={field.id}><TiptapEditor value={richtextValue} placeholder={field.placeholder} onChange={setRichtextValue} /></div>}
      {field.type === 'yesno'    && <div className="flex gap-4"><button className="flex-1 py-4 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">YES</button><button className="flex-1 py-4 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">NO</button></div>}
      {field.type === 'checkbox' && <div className="grid grid-cols-1 gap-3">{field.options?.map((opt, i) => (<label key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all group"><input type="checkbox" className="w-5 h-5 accent-blue-600 rounded-lg" /><span className="text-sm font-bold text-slate-600 group-hover:text-blue-700">{opt}</span></label>))}</div>}
      {field.type === 'date'     && <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />}
      {field.type === 'file'     && <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-2"><FileUp size={24} /><span className="text-xs font-bold uppercase tracking-widest">Upload File</span></div>}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FormBuilder() {
  const { slug } = useParams();
  const [fields,        setFields]        = useState([]);
  const [selectedId,    setSelectedId]    = useState(null);
  const [formName,      setFormName]      = useState('Consultation Form');
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [symptomInput,     setSymptomInput]     = useState('');
  const [symptomList,      setSymptomList]      = useState([]);
  const [symptomSaving,    setSymptomSaving]    = useState(false);
  const [symptomSavedMsg,  setSymptomSavedMsg]  = useState('');
  const [showSymptomPanel, setShowSymptomPanel] = useState(false);

  const [tableModalFieldId, setTableModalFieldId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Which predefined blocks are already placed on the canvas
  const placedPredefinedTypes = fields.filter(f => !!PREDEFINED_BLOCKS[f.type]).map(f => f.type);

  // ── Fetch saved form ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    const fetchForm = async () => {
      setFetching(true);
      try {
        const { data } = await axios.get(`${API_BAS}/api/clinic/${slug}/get-form`);
        if (data?.data?.sections) {
          const flatFields = [];
          data.data.sections.forEach((section, sIdx) => {
            // Restore heading
            flatFields.push({
              id:    `heading-${sIdx}-${section.sectionTitle}`,
              type:  'heading',
              label: section.sectionTitle,
            });
            section.fields.forEach(f => flatFields.push({ ...f }));
          });

          // Restore predefined blocks from saved blockOrder
          const savedBlockOrder = data.data.blockOrder || [];
          const allFieldsWithBlocks = [];

          if (savedBlockOrder.length > 0) {
            // Interleave: build from saved blockOrder which may reference sections by title
            // For simplicity, append predefined blocks as saved (they store position index)
            // We'll use a merged approach: flatFields first, then insert predefined blocks at saved positions
            const predefinedFromSave = savedBlockOrder.map((b, i) => ({
              id: `predefined-${b.type}-${i}`,
              type: b.type,
              label: PREDEFINED_BLOCKS[b.type]?.label || b.type,
              _predefined: true,
              _savedPosition: b.position,
            }));

            // Merge: insert predefined blocks at their saved positions
            const merged = [...flatFields];
            predefinedFromSave.forEach(pb => {
              const pos = Math.min(pb._savedPosition ?? merged.length, merged.length);
              merged.splice(pos, 0, pb);
            });
            allFieldsWithBlocks.push(...merged);
          } else {
            // No saved block order — append all predefined blocks that aren't already inline
            allFieldsWithBlocks.push(...flatFields);
            // Add defaults at the end
            Object.keys(PREDEFINED_BLOCKS).forEach((type, i) => {
              allFieldsWithBlocks.push({
                id: `predefined-${type}-default`,
                type,
                label: PREDEFINED_BLOCKS[type].label,
                _predefined: true,
              });
            });
          }

          setFields(allFieldsWithBlocks);
          setFormName(data.data.formName);
        } else {
          // No saved form — populate with default predefined blocks at the bottom
          const defaultPredefined = Object.keys(PREDEFINED_BLOCKS).map((type, i) => ({
            id: `predefined-${type}-default`,
            type,
            label: PREDEFINED_BLOCKS[type].label,
            _predefined: true,
          }));
          setFields([...TEMPLATES.general.fields, ...defaultPredefined]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        const defaultPredefined = Object.keys(PREDEFINED_BLOCKS).map((type, i) => ({
          id: `predefined-${type}-default`,
          type,
          label: PREDEFINED_BLOCKS[type].label,
          _predefined: true,
        }));
        setFields([...TEMPLATES.general.fields, ...defaultPredefined]);
      } finally {
        setFetching(false);
      }
    };
    fetchForm();
  }, [slug]);

  useEffect(() => {
    if (!slug || !showSymptomPanel) return;
    axios.get(`${API_BAS}/api/symptoms/${slug}/list`)
      .then(res => setSymptomList(res.data.data || []))
      .catch(err => console.error('Symptom fetch error:', err));
  }, [slug, showSymptomPanel]);

  const saveSymptomToDB = async () => {
    const trimmed = symptomInput.trim();
    if (!trimmed) return;
    if (symptomList.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setSymptomSavedMsg('Already exists!');
      setTimeout(() => setSymptomSavedMsg(''), 2000);
      return;
    }
    setSymptomSaving(true);
    try {
      const res = await axios.post(`${API_BAS}/api/symptoms/${slug}/save`, { name: trimmed, category: 'General' });
      if (res.data.success) {
        setSymptomList(prev => [...prev, res.data.data]);
        setSymptomInput('');
        setSymptomSavedMsg(`"${trimmed}" saved!`);
        setTimeout(() => setSymptomSavedMsg(''), 2500);
      }
    } catch (err) { alert('Failed to save symptom.'); }
    finally { setSymptomSaving(false); }
  };

  const deleteSymptomFromDB = async (id) => {
    try {
      await axios.delete(`${API_BAS}/api/symptoms/${slug}/delete/${id}`);
      setSymptomList(prev => prev.filter(s => s._id !== id));
    } catch (err) { console.error('Symptom delete error:', err); }
  };

  // ── Save form layout — now includes predefined block positions ─────────────
  
const saveBuilderData = async () => {
    const sections = [];
    let currentSection = { sectionTitle: 'General', fields: [] };

    // Extract predefined block order AND section positions from the flat fields array
    const blockOrder = [];
    let sectionIndexCounter = 0;

    fields.forEach((field, idx) => {
        if (PREDEFINED_BLOCKS[field.type]) {
            // Predefined block — record its canvas position
            blockOrder.push({ type: field.type, position: idx, kind: 'predefined' });
            return;
        }

        if (field.type === 'heading') {
            // If previous section had fields, push it and record its position
            if (currentSection.fields.length > 0 || sections.length > 0) {
                sections.push(currentSection);
                // Record this section's canvas position
                blockOrder.push({
                    type: 'section',
                    sectionIndex: sectionIndexCounter,
                    position: idx,
                    kind: 'section'
                });
                sectionIndexCounter++;
            }
            currentSection = { sectionTitle: field.label || 'New Section', fields: [] };
        } else {
            currentSection.fields.push({
                id:              field.id,
                type:            field.type,
                label:           field.label,
                placeholder:     field.placeholder     || '',
                required:        field.required        || false,
                options:         field.options         || [],
                value:           field.value           || '',
                defaultSymptoms: field.defaultSymptoms || [],
                tableName:       field.tableName       || '',
                collectionName:  field.collectionName  || '',
                columns:         (field.columns || []).map(c => ({ name: c.name, type: c.type })),
                order:           currentSection.fields.length,
            });
        }
    });

    // Push the last section
    if (currentSection.fields.length > 0 || currentSection.sectionTitle !== 'General') {
        sections.push(currentSection);
        // Find the last heading position for this section
        const lastHeadingIdx = fields.map((f, i) => f.type === 'heading' ? i : -1)
            .filter(i => i !== -1)
            .pop() ?? fields.length - 1;
        blockOrder.push({
            type: 'section',
            sectionIndex: sectionIndexCounter,
            position: lastHeadingIdx,
            kind: 'section'
        });
    }

    const cleanedSections = sections.filter(s => s.sectionTitle !== 'General' || s.fields.length > 0);

    setLoading(true);
    try {
        await axios.post(`${API_BAS}/api/clinic/${slug}/save-form`, {
            slug,
            formName,
            sections: cleanedSections,
            blockOrder,
        });
        alert('Template saved!');
    } catch (err) {
        alert('Error saving form template.');
    } finally {
        setLoading(false);
    }
};

  // ── Field CRUD ──────────────────────────────────────────────────────────────
  const addField = (type) => {
    // If it's a predefined block and already placed, don't add duplicate
    if (PREDEFINED_BLOCKS[type] && placedPredefinedTypes.includes(type)) {
      alert(`"${PREDEFINED_BLOCKS[type].label}" is already on the canvas. You can drag it to reorder.`);
      return;
    }

    const template = FIELD_TYPES.find(f => f.type === type);
    const newField = {
      id:              `field-${Date.now()}`,
      type,
      label:           PREDEFINED_BLOCKS[type]?.label
                       || (type === 'heading' ? 'New Section'
                       : type === 'symptom'  ? 'Symptoms'
                       : type === 'table'    ? 'Custom Table'
                       : `New ${template?.label}`),
      placeholder:     '',
      required:        false,
      options:         ['Option 1', 'Option 2'],
      value:           '',
      defaultSymptoms: [],
      tableName:       '',
      collectionName:  '',
      columns:         [],
      _predefined:     !!PREDEFINED_BLOCKS[type],
    };
    setFields(prev => [...prev, newField]);
    setSelectedId(newField.id);
    if (type === 'symptom') setShowSymptomPanel(true);
    if (type === 'table') setTableModalFieldId(newField.id);
  };

  const updateField = (id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    setSelectedId(null);
  };

  const duplicateField = (id) => {
    setFields(prev => {
      const index = prev.findIndex(f => f.id === id);
      if (index === -1) return prev;
      const original = prev[index];
      // Don't duplicate predefined blocks
      if (PREDEFINED_BLOCKS[original.type]) return prev;
      const copy = { ...original, id: `field-${Date.now()}`, label: `${original.label} (Copy)` };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setFields(prev => {
        const oldIdx = prev.findIndex(f => f.id === active.id);
        const newIdx = prev.findIndex(f => f.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleTableSave = (fieldId, tableConfig) => {
    updateField(fieldId, {
      tableName:      tableConfig.tableName,
      collectionName: tableConfig.collectionName,
      columns:        tableConfig.columns,
      label:          tableConfig.tableName || 'Custom Table',
    });
    setTableModalFieldId(null);
  };

  const selectedField   = fields.find(f => f.id === selectedId);
  const tableModalField = fields.find(f => f.id === tableModalFieldId);

  if (fetching) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[4px] animate-pulse">Syncing Form Data...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#f8fafc] flex overflow-hidden font-sans select-none text-slate-700">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Wand2 size={18} /></div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm tracking-tight">Form Studio</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Medical Builder</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ scrollbarWidth: 'none' }}>

          {/* ── Predefined Clinical Blocks ── */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Predefined Blocks</h3>
              <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">drag to reorder</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(PREDEFINED_BLOCKS).map(([type, blockDef]) => {
                const colors = BLOCK_COLOR_MAP[blockDef.color];
                const isPlaced = placedPredefinedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    disabled={isPlaced}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group shadow-sm
                      ${isPlaced
                        ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                        : `${colors.bg} border-${blockDef.color}-200 hover:bg-blue-600 hover:text-white hover:border-blue-600`
                      }`}
                  >
                    <div className={`transition-colors ${isPlaced ? 'text-slate-300' : `${colors.icon} group-hover:text-white`}`}>
                      {blockDef.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold block truncate">{blockDef.label}</span>
                      <span className={`text-[8px] font-bold truncate block ${isPlaced ? 'text-slate-300' : `${colors.text} group-hover:text-blue-200 opacity-70`}`}>
                        {isPlaced ? '✓ On canvas — drag to reorder' : blockDef.description}
                      </span>
                    </div>
                    {isPlaced && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Custom Fields ── */}
          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Custom Fields</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {FIELD_TYPES.map(f => (
                <button
                  key={f.type}
                  onClick={() => addField(f.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group shadow-sm
                    ${f.type === 'symptom' || f.type === 'table'
                      ? 'bg-blue-50 hover:bg-blue-600 hover:text-white border-blue-100 text-blue-600'
                      : 'bg-slate-50 hover:bg-blue-600 hover:text-white border-slate-100'}`}
                >
                  <div className={`transition-colors ${f.type === 'symptom' || f.type === 'table' ? 'text-blue-500 group-hover:text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {f.icon}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold block">{f.label}</span>
                    {(f.type === 'symptom' || f.type === 'table') && (
                      <span className="text-[8px] font-black text-blue-400 group-hover:text-blue-200 uppercase tracking-widest">
                        {f.type === 'table' ? 'Auto collection · Customisable' : 'DB-synced'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── Symptom DB panel ── */}
          <section>
            <button
              onClick={() => setShowSymptomPanel(p => !p)}
              className="w-full flex items-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              <Stethoscope size={14} />
              Manage Symptom DB
              <span className={`ml-auto transition-transform ${showSymptomPanel ? 'rotate-180' : ''}`}><ChevronDown size={12} /></span>
            </button>

            {showSymptomPanel && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Add symptoms to database</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white border border-blue-200 p-2 rounded-lg text-xs font-semibold outline-none focus:border-blue-500 text-slate-900"
                    placeholder="e.g. Fever, Headache..."
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveSymptomToDB()}
                  />
                  <button onClick={saveSymptomToDB} disabled={symptomSaving || !symptomInput.trim()} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                    {symptomSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  </button>
                </div>
                {symptomSavedMsg && <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600"><CheckCircle2 size={12} /> {symptomSavedMsg}</div>}
                {symptomList.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {symptomList.map((s) => (
                      <div key={s._id} className="flex items-center justify-between bg-white border border-blue-100 rounded-lg px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5"><Tag size={9} className="text-blue-400" /><span className="text-[10px] font-bold text-slate-700">{s.name}</span></div>
                        <button onClick={() => deleteSymptomFromDB(s._id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {symptomList.length === 0 && <p className="text-[9px] text-blue-300 text-center italic py-2">No symptoms added yet</p>}
              </div>
            )}
          </section>

          {/* ── Presets ── */}
          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Presets</h3>
            <div className="space-y-1.5">
              {Object.entries(TEMPLATES).map(([key, temp]) => (
                <button key={key} onClick={() => {
                  if (window.confirm('Overwrite current design? Predefined blocks will be re-added at the bottom.')) {
                    const defaultPredefined = Object.keys(PREDEFINED_BLOCKS).map((type, i) => ({
                      id: `predefined-${type}-${Date.now()}-${i}`,
                      type,
                      label: PREDEFINED_BLOCKS[type].label,
                      _predefined: true,
                    }));
                    setFields([...temp.fields, ...defaultPredefined]);
                  }
                }}
                  className="w-full flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <div className="text-slate-300">{temp.icon}</div>
                  <span className="text-[10px] font-bold">{temp.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* ── CANVAS ── */}
      <main className="flex-1 overflow-hidden flex flex-col bg-slate-100/30">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2">
            <Layout size={16} className="text-blue-600" />
            <input
              className="font-bold text-slate-800 text-sm focus:outline-none bg-transparent border-b border-transparent hover:border-slate-200 p-1"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter Form Name..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPreviewMode(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 border border-slate-200 transition-all">
              <Eye size={14} /> Preview
            </button>
            <button onClick={saveBuilderData} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {loading ? 'Saving...' : 'Sync Template'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center" style={{ scrollbarWidth: 'none' }} onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-2xl bg-white min-h-[90vh] rounded-[32px] shadow-2xl border border-slate-200 p-12 h-fit">

            {/* Legend */}
            <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Predefined blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custom fields</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <GripVertical size={11} className="text-slate-300" />
                <span className="text-[9px] font-bold text-slate-300">Drag any item to reorder</span>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {fields.map((field) => (
                    <SortableField
                      key={field.id}
                      field={field}
                      isSelected={selectedId === field.id}
                      onSelect={setSelectedId}
                      onDelete={deleteField}
                      onDuplicate={duplicateField}
                      onEditTable={(id) => setTableModalFieldId(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {fields.length === 0 && (
              <div className="h-80 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[30px] text-slate-300">
                <MousePointer2 size={32} className="mb-2 opacity-10" />
                <p className="font-bold text-[10px] uppercase tracking-[4px]">Empty Workspace</p>
                <p className="text-[9px] mt-2">Start adding elements from toolbox</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT PROPERTIES PANEL ── */}
      <aside className="w-[300px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-white shadow-md shadow-amber-100"><Settings2 size={16} /></div>
          <h2 className="font-bold text-slate-800 text-sm tracking-tight">Configuration</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none' }}>
          {selectedField ? (
            <div className="space-y-6">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                  {PREDEFINED_BLOCKS[selectedField.type] ? 'Predefined Block' : `${selectedField.type} Settings`}
                </span>
                {PREDEFINED_BLOCKS[selectedField.type]
                  ? <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">Drag to reorder</span>
                  : selectedField.type === 'symptom' ? <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">DB-synced</span>
                  : selectedField.type === 'table'   ? <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Auto Collection</span>
                  : <Info size={14} className="text-blue-400" />
                }
              </div>

              {/* Predefined block info panel */}
              {PREDEFINED_BLOCKS[selectedField.type] && (() => {
                const blockDef = PREDEFINED_BLOCKS[selectedField.type];
                const colors = BLOCK_COLOR_MAP[blockDef.color];
                return (
                  <div className={`p-4 ${colors.bg} rounded-xl border ${colors.border} space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className={colors.icon}>{blockDef.icon}</span>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${colors.text}`}>{blockDef.label}</span>
                    </div>
                    <p className={`text-[10px] ${colors.text} opacity-80 leading-relaxed`}>
                      {blockDef.description}
                    </p>
                    <div className={`text-[10px] font-bold ${colors.text} opacity-70 space-y-1`}>
                      <p>✓ Fully functional in prescription generator</p>
                      <p>✓ DB search &amp; auto-complete built-in</p>
                      <p>✓ Drag the card left to reorder its position</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteField(selectedField.id); }}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-red-100 text-red-400 rounded-xl text-[10px] font-bold hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={11} /> Remove from layout
                    </button>
                  </div>
                );
              })()}

              {/* Non-predefined field settings */}
              {!PREDEFINED_BLOCKS[selectedField.type] && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Question Label</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12px] font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                      value={selectedField.label}
                      onChange={(e) => updateField(selectedId, { label: e.target.value })}
                    />
                  </div>

                  {selectedField.type === 'table' && (
                    <div className="space-y-3">
                      {selectedField.collectionName ? (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Database size={11} /> Collection Info</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]"><span className="text-blue-400 font-bold">Table Name</span><span className="text-blue-700 font-black">{selectedField.tableName}</span></div>
                            <div className="flex items-center justify-between text-[10px]"><span className="text-blue-400 font-bold">Columns</span><span className="text-blue-700 font-black">{selectedField.columns?.length || 0}</span></div>
                            <div className="mt-2 p-2 bg-white rounded-lg border border-blue-100"><p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest mb-1">Collection</p><p className="text-[9px] font-mono font-black text-blue-700 break-all">{selectedField.collectionName}</p></div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 mb-2"><AlertCircle size={11} /> Not configured yet</p>
                          <p className="text-[10px] text-amber-500">Open the table builder to set up columns and create the database collection.</p>
                        </div>
                      )}
                      <button onClick={() => setTableModalFieldId(selectedField.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                        <Table2 size={13} />{selectedField.collectionName ? 'Edit Table & Columns' : 'Configure Table →'}
                      </button>
                      {selectedField.columns?.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">Columns</label>
                          {selectedField.columns.map((col, i) => (<div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[11px] font-bold text-slate-600">{col.name}</span><span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{col.type}</span></div>))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedField.type === 'symptom' && (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Stethoscope size={11} /> Symptom Field Info</p>
                      <p className="text-[10px] text-blue-500 font-medium leading-relaxed">Doctors can search symptoms stored in your database during prescription creation.</p>
                      <button onClick={() => setShowSymptomPanel(true)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Open Symptom Manager →</button>
                    </div>
                  )}

                  {['text','number','textarea'].includes(selectedField.type) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Placeholder</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12px] font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" value={selectedField.placeholder || ''} onChange={(e) => updateField(selectedId, { placeholder: e.target.value })} />
                    </div>
                  )}

                  {selectedField.type === 'richtext' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Default Content</label>
                      <div key={selectedId}><TiptapEditor value={selectedField.value || ''} placeholder={selectedField.placeholder} onChange={(html) => updateField(selectedId, { value: html })} /></div>
                    </div>
                  )}

                  {!['heading','symptom','table'].includes(selectedField.type) && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600">Is Required?</span>
                      <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={!!selectedField.required} onChange={(e) => updateField(selectedId, { required: e.target.checked })} />
                    </div>
                  )}

                  {['dropdown','checkbox'].includes(selectedField.type) && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">Value Options</label>
                      <div className="space-y-2">
                        {selectedField.options?.map((opt, idx) => (
                          <div key={idx} className="flex gap-1.5">
                            <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-bold outline-none" value={opt} onChange={(e) => { const newOpts = [...selectedField.options]; newOpts[idx] = e.target.value; updateField(selectedId, { options: newOpts }); }} />
                            <button onClick={() => updateField(selectedId, { options: selectedField.options.filter((_, i) => i !== idx) })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><X size={14} /></button>
                          </div>
                        ))}
                        <button onClick={() => updateField(selectedId, { options: [...(selectedField.options || []), 'New Option'] })} className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100 border-dashed">+ Add Option</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20 px-6">
              <MousePointer2 size={40} className="mb-4 text-slate-200" />
              <p className="text-[10px] font-black uppercase tracking-[3px]">Selection Needed</p>
              <p className="text-[10px] mt-2">Click an element on the canvas to edit its properties</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── TABLE BUILDER MODAL ── */}
      {tableModalFieldId && tableModalField && (
        <TableBuilderModal
          slug={slug}
          field={tableModalField}
          onSave={(config) => handleTableSave(tableModalFieldId, config)}
          onClose={() => setTableModalFieldId(null)}
        />
      )}

      {/* ── PREVIEW MODAL ── */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPreviewMode(false)} />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Form Preview</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Interaction Test</p>
              </div>
              <button onClick={() => setIsPreviewMode(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 bg-slate-50/20" style={{ scrollbarWidth: 'none' }}>
              {fields.map((field) => <PreviewField key={field.id} field={field} />)}
            </div>
            <div className="p-8 border-t border-slate-100 bg-white">
              <button className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-black text-xs uppercase tracking-[3px] shadow-2xl shadow-blue-100">Submit Test</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ProseMirror { outline: none !important; min-height: 120px; }
        .ProseMirror p { margin-bottom: 0.5rem; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; }
      `}</style>
    </div>
  );
}