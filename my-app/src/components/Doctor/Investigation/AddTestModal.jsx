import React, { useState } from 'react';
import { X, Save, Star } from 'lucide-react';
import axios from 'axios';

const API_BAS = import.meta.env.VITE_API_URL;

const AddTestModal = ({ slug, onClose, onRefresh, editData }) => {
  const [formData, setFormData] = useState(editData || {
    testName: '', shortName: '', category: 'Pathology',
    sampleType: '', normalRange: '', unit: '', price: '',
    action: '', isFavorite: false,
  });

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BAS}/api/investigations/${slug}/save`, {
        ...formData,
        id: editData?._id,
      });
      onRefresh();
      onClose();
    } catch (err) {
      alert("Save failed!");
    }
  };

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-800 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              {editData ? 'Edit Test' : 'Add New Test'}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Fill in the investigation details below</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Favourite toggle */}
            <button
              type="button"
              onClick={() => set('isFavorite', !formData.isFavorite)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-semibold transition-colors ${
                formData.isFavorite
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <Star size={11} className={formData.isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
              {formData.isFavorite ? 'Favourite' : 'Mark Favourite'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-4">

            <Field label="Test Name *">
              <input
                required
                className={inputCls}
                placeholder="e.g. Thyroid Profile"
                value={formData.testName}
                onChange={e => set('testName', e.target.value)}
              />
            </Field>

            <Field label="Test Code / Alias">
              <input
                className={inputCls}
                placeholder="e.g. TFT"
                value={formData.shortName}
                onChange={e => set('shortName', e.target.value)}
              />
            </Field>

            <Field label="Department / Category">
              <select
                className={inputCls}
                value={formData.category}
                onChange={e => set('category', e.target.value)}
              >
                <option>Pathology</option>
                <option>Radiology</option>
                <option>Cardiology</option>
                <option>Neurology</option>
                <option>Other</option>
              </select>
            </Field>

            <Field label="Sample Type">
              <input
                className={inputCls}
                placeholder="e.g. Serum / EDTA Blood"
                value={formData.sampleType}
                onChange={e => set('sampleType', e.target.value)}
              />
            </Field>

            <Field label="Normal Range">
              <input
                className={inputCls}
                placeholder="e.g. 0.45 – 4.50"
                value={formData.normalRange}
                onChange={e => set('normalRange', e.target.value)}
              />
            </Field>

            <Field label="Unit">
              <input
                className={inputCls}
                placeholder="e.g. µIU/mL"
                value={formData.unit}
                onChange={e => set('unit', e.target.value)}
              />
            </Field>

            <Field label="Action / Preparation">
              <input
                className={inputCls}
                placeholder="e.g. Fasting required"
                value={formData.action}
                onChange={e => set('action', e.target.value)}
              />
            </Field>

            <Field label="Price (₹)">
              <input
                type="number"
                className={inputCls}
                placeholder="0.00"
                value={formData.price}
                onChange={e => set('price', e.target.value)}
              />
            </Field>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              <Save size={13} />
              {editData ? 'Update Test' : 'Save Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTestModal;