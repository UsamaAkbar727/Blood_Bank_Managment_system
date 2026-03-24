import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import Modal from '../components/Modal';

const blankBag = { code: 'BAG-000', blood: '', component: 'Whole Blood', expiry: '', volume: '' };

const PreviewContent = ({ data, barcodeRef }) => {
  if (!data) return null;
  return (
    <div className="mt-2 border border-dashed border-slate-200 rounded-xl p-4 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900 tracking-tight">LABEL PREVIEW</span>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
          Active Unit
        </span>
      </div>
      <div className="space-y-1 mb-4">
        <div className="text-sm font-semibold text-slate-800 uppercase tracking-tight">
          {data.component || 'Component Name'}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{data.blood || '--'}</span>
          <span className="text-xs text-slate-500 font-medium">Blood Group</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
          <span>{data.expiry ? `Expiry: ${data.expiry}` : 'No Expiry Set'}</span>
          <span className="font-mono text-slate-400">{data.volume ? `${data.volume} ml` : ''}</span>
        </div>
      </div>
      <div className="flex justify-center bg-slate-50 p-4 rounded-lg border border-slate-100">
        <svg ref={barcodeRef} style={{ maxWidth: '100%' }} />
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="mt-2 border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center">
    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    </div>
    <h4 className="text-sm font-medium text-slate-900 mb-1">No Label Selected</h4>
    <p className="text-xs text-slate-500 max-w-[200px]">Select a label from the list below or create a new one to preview it here.</p>
  </div>
);

export default function Barcodes() {
  const [bag, setBag] = useState(blankBag);
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('bbms_labels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editIndex, setEditIndex] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(() => {
    return localStorage.getItem('bbms_selected_label_id') || null;
  });
  const barcodeRef = useRef(null);

  const selectedLabel = labels.find((label) => label.id === selectedLabelId);

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('bbms_labels', JSON.stringify(labels));
  }, [labels]);

  useEffect(() => {
    if (selectedLabelId) {
      localStorage.setItem('bbms_selected_label_id', selectedLabelId);
    } else {
      localStorage.removeItem('bbms_selected_label_id');
    }
  }, [selectedLabelId]);

  // Auto-load logic: If no selection but labels exist, pick the last one
  useEffect(() => {
    if (labels.length > 0 && !selectedLabelId) {
      setSelectedLabelId(labels[labels.length - 1].id);
    }
  }, [labels, selectedLabelId]);

  // Barcode Generation Effect
  useEffect(() => {
    if (!barcodeRef.current || !selectedLabel) return;
    const code = selectedLabel.barcode_value || selectedLabel.code || 'BAG-000';
    try {
      JsBarcode(barcodeRef.current, code, {
        format: 'code128',
        height: 60,
        width: 2,
        fontSize: 14,
        margin: 10,
        background: '#f8fafc',
        displayValue: true
      });
    } catch (e) {
      console.error('Barcode Gen failed:', e);
    }
  }, [selectedLabelId, selectedLabel, open]);

  const printLabel = (label) => {
    if (!label) return;
    const win = window.open('', '_blank', 'width=450,height=600');
    if (!win) return;
    const meta = `${label.component || 'Component'} - ${label.blood || 'Blood Group'}${label.expiry ? ' - Exp ' + label.expiry : ''}`;
    const extra = label.volume ? `Volume: ${label.volume} ml` : '';
    const code = label.barcode_value || label.code || 'BAG-000';
    
    win.document.write(`
      <html>
        <head>
          <title>Print Label - ${label.code}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .label-card { padding: 20px; border: 1.5px solid #000; width: 340px; box-sizing: border-box; }
            .header { font-weight: 800; font-size: 18px; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .meta { font-size: 13px; margin-bottom: 10px; font-weight: 600; }
            .barcode-container { margin: 15px 0; display: flex; justify-content: center; }
            .footer { font-size: 13px; font-weight: 500; text-align: right; }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">BLOOD BAG UNIT</div>
            <div class="meta">${meta}</div>
            <div class="barcode-container"><svg id="print-barcode"></svg></div>
            <div class="footer">${extra}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode('#print-barcode','${code}',{format:'code128',height:70,width:2,fontSize:14,margin:5});
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 space-y-4">
        <div className="card overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Label Designer
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="btn-soft h-9 px-3 text-xs font-semibold"
                onClick={() => printLabel(selectedLabel)}
                disabled={!selectedLabel}
              >
                Print
              </button>
              <button
                className="btn-primary h-9 px-3 text-xs font-semibold"
                onClick={() => {
                  setBag(blankBag);
                  setEditIndex(null);
                  setOpen(true);
                }}
              >
                New Unit
              </button>
            </div>
          </div>
          <div className="p-4 bg-white">
            {selectedLabel ? (
              <PreviewContent data={selectedLabel} barcodeRef={barcodeRef} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 card p-5 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Recent Labels</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quickly select or edit generated unit labels</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 uppercase tracking-widest">
            {labels.length} Units
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px]">
          {labels.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-400">Your label history is empty.</p>
            </div>
          ) : (
            [...labels].reverse().map((lbl, idx) => {
              const originalIdx = labels.length - 1 - idx;
              const isActive = lbl.id === selectedLabelId;
              return (
                <div
                  key={lbl.id}
                  className={`group relative flex items-center justify-between border rounded-xl px-4 py-3 transition-all cursor-pointer ${
                    isActive 
                      ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/40 shadow-sm' 
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedLabelId(lbl.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {lbl.blood || '?'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Bag: {lbl.code}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                        <span>{lbl.component}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{lbl.volume}ml</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{lbl.expiry}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
                      title="Edit Label"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLabelId(lbl.id);
                        setBag(lbl);
                        setEditIndex(originalIdx);
                        setOpen(true);
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                      title="Delete Entry"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) setSelectedLabelId(null);
                        setLabels((current) => current.filter((_, i) => i !== originalIdx));
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setBag(blankBag);
          setEditIndex(null);
        }}
        title={editIndex !== null ? "Edit Bag Metadata" : "Generate New Bag Label"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const barcodeVal = bag.code?.trim() || 'BAG-000';
            
            setLabels((current) => {
              if (editIndex !== null && editIndex >= 0 && editIndex < current.length) {
                const updated = [...current];
                const updatedLabel = {
                  ...updated[editIndex],
                  ...bag,
                  barcode_value: barcodeVal
                };
                updated[editIndex] = updatedLabel;
                setSelectedLabelId(updatedLabel.id);
                return updated;
              }
              const newLabel = {
                ...bag,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                barcode_value: barcodeVal,
              };
              setSelectedLabelId(newLabel.id);
              return [...current, newLabel];
            });
            
            setBag(blankBag);
            setEditIndex(null);
            setOpen(false);
          }}
        >
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 mb-2">
             <div className="bg-blue-500 rounded-full h-8 w-8 flex items-center justify-center text-white shrink-0">
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p className="text-[11px] text-blue-700 font-medium">
               The Bag Code will be encoded as a Code128 barcode. Ensure the number matches the physical bag tag.
             </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Collection Code / Bag #</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm"
              value={bag.code}
              placeholder="e.g. BAG-2401-001"
              onChange={(e) => setBag({ ...bag, code: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Blood Group</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                value={bag.blood}
                onChange={(e) => setBag({ ...bag, blood: e.target.value })}
                required
              >
                <option value="">Select Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Component</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                value={bag.component}
                onChange={(e) => setBag({ ...bag, component: e.target.value })}
              >
                {['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Plasma', 'Cryo'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expiry Date</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                value={bag.expiry}
                onChange={(e) => {
                  setBag({ ...bag, expiry: e.target.value });
                }}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Volume (ml)</label>
              <input
                type="number"
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                value={bag.volume}
                onChange={(e) => setBag({ ...bag, volume: e.target.value })}
                placeholder="450"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 active:translate-y-0.5 transition-all" type="submit">
              {editIndex !== null ? 'Update & Preview' : 'Generate Label'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
