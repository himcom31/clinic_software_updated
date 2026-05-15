import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { Upload, FileSpreadsheet, AlertCircle, X, RefreshCcw } from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const MedicineImport = ({ slug, onRefresh, onClose }) => {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
//const { slug } = useParams(); // Props se lene ki jagah direct URL se utha liya
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (Optional: e.g. Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("File bahut badi hai bhai! 2MB se kam ki upload karein.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON mein convert karte waqt headers check karein
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length === 0) {
          setError("Excel file khali hai!");
        } else {
          console.log("Parsed Data Sample:", json[0]); // Debugging ke liye
          setFileData(json);
          setError('');
        }
      } catch (err) {
        setError("File read karne mein error. Sahi format use karein.");
      }
    };
    reader.readAsArrayBuffer(file); // Binary ki jagah ArrayBuffer use karein
  };

  const handleUpload = async () => {
    if (!fileData) return;
    setLoading(true);
    setError('');
    //console.log("Sending Data to Backend:", fileData); // Check if data is here
    try {
      // Backend ko data bhej rahe hain
      const res = await axios.post(`${API_BAS}/api/medicines/${slug}/import`, fileData);
      
      if (res.data.success) {
        alert(`${fileData.length} Medicines successfully import `);
        onRefresh();
        onClose();
      }
    } catch (err) {
      // Yahan error message ko detail mein dikhayenge
      
      console.error("Full Backend Error:", err.response);
      const msg = err.response?.data?.error || err.response?.data?.message || "Server connection error!";
      setError(`Import Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bulk Import</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Excel to Inventory</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
        </div>

        {/* Upload Dropzone */}
        <div className={`border-2 border-dashed rounded-[32px] p-10 text-center transition-all relative ${fileData ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50 hover:border-[#18afb1]'}`}>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mb-4 transition-all ${fileData ? 'bg-emerald-500 text-white' : 'bg-white text-[#18afb1]'}`}>
              <FileSpreadsheet size={32} />
            </div>
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
              {fileData ? `${fileData.length} Records Ready` : "Drop Excel File"}
            </p>
            {!fileData && <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Click to browse your computer</p>}
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-500 rounded-2xl text-[10px] font-bold flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> 
            <span>{error}</span>
          </div>
        )}

        <button 
          onClick={handleUpload}
          disabled={!fileData || loading}
          className="w-full bg-slate-900 text-white py-6 rounded-[22px] font-black text-[10px] uppercase tracking-[4px] shadow-2xl mt-8 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <><RefreshCcw size={16} className="animate-spin" /> Uploading...</>
          ) : (
            "Start Import"
          )}
        </button>
      </div>
    </div>
  );
};

export default MedicineImport;