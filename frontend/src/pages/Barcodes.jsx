import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import Modal from '../components/Modal';

const blankBag = { code: 'BAG-000', blood: '', component: 'Whole Blood', expiry: '', volume: '' };

export default function Barcodes() {
  const [bag, setBag] = useState(blankBag);
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const barcodeRef = useRef(null);

  const selectedLabel = labels.find((label) => label.id === selectedLabelId);

  useEffect(() => {
    if (!labels.length) {
      setSelectedLabelId(null);
      return;
    }
    const exists = labels.some((label) => label.id === selectedLabelId);
    if (!exists) {
      setSelectedLabelId(labels[labels.length - 1].id);
    }
  }, [labels, selectedLabelId]);

  useEffect(() => {
    if (!barcodeRef.current || !selectedLabel) return;
    const code = selectedLabel.barcode_value?.trim() || selectedLabel.code?.trim() || 'BAG-000';
    JsBarcode(barcodeRef.current, code, { format: 'code128', height: 70, width: 2, fontSize: 14, margin: 6 });
  }, [selectedLabelId, selectedLabel]);

  const printLabel = (label) => {
    if (!label) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    const meta = `${label.component || 'Component'} - ${label.blood || 'Blood'}${label.expiry ? ' - Exp ' + label.expiry : ''}`;
    const extra = label.volume ? `Volume: ${label.volume} ml` : '';
    const code = label.barcode_value || label.code || 'BAG-000';
    win.document.write(`
      <html><head><title>Print Label</title></head><body>
        <div style="padding:16px;font-family:Inter,Arial,sans-serif;border:1px dashed #cbd5e1;width:320px">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">Blood Bag</div>
          <div style="color:#475569;font-size:12px;margin-bottom:6px">${meta}</div>
          <svg id="print-barcode"></svg>
          <div style="font-size:12px;margin-top:6px">${extra}</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script>JsBarcode('#print-barcode','${code}',{format:'code128',height:70,width:2,fontSize:14,margin:6});window.onload=function(){window.print();window.close();};</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Label Builder</h3>
          <div className="flex items-center gap-2">
            <button
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                printLabel(selectedLabel);
              }}
              disabled={!selectedLabel}
            >
              Print
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setBag(blankBag);
                setEditIndex(null);
                setOpen(true);
              }}
            >
              New Label
            </button>
          </div>
        </div>
        {selectedLabel ? (
          <div className="mt-2 border border-dashed border-slate-200 rounded-xl p-3 bg-white">
            <div className="font-semibold text-slate-800 mb-1">Preview</div>
            <div className="text-xs text-slate-500 mb-1">
              {selectedLabel.component || 'Component'} - {selectedLabel.blood || 'Blood'}
              {selectedLabel.expiry ? ` - Exp ${selectedLabel.expiry}` : ''}
            </div>
            <svg ref={barcodeRef} />
            <div className="text-xs text-slate-600">
              {selectedLabel.volume ? `Volume: ${selectedLabel.volume} ml` : ''}
            </div>
          </div>
        ) : (
          <div className="mt-2 border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50 text-sm text-slate-500">
            No label selected yet. Save a label to preview it here.
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900">Saved Labels</h3>
          <span className="text-xs text-slate-500">Each label is kept separately</span>
        </div>
        <div className="space-y-2">
          {labels.length === 0 && <p className="text-sm text-slate-500">No saved labels yet.</p>}
          {labels.map((lbl, idx) => (
            <div
              key={lbl.id}
              className={`flex items-center justify-between border rounded-lg px-3 py-2 transition-colors ${
                lbl.id === selectedLabelId ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
              }`}
              onClick={() => setSelectedLabelId(lbl.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedLabelId(lbl.id);
                }
              }}
            >
              <div>
                <div className="font-medium text-slate-800">{lbl.code}</div>
                <div className="text-xs text-slate-500">{lbl.component} / {lbl.blood} / {lbl.expiry} / {lbl.volume} ml</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-blue-600 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedLabelId(lbl.id);
                    setBag(lbl);
                    setEditIndex(idx);
                    setOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    setLabels((current) => current.filter((_, i) => i !== idx));
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setBag(blankBag);
          setEditIndex(null);
        }}
        title="Generate / Print Label"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setLabels((current) => {
              if (editIndex !== null && editIndex >= 0 && editIndex < current.length) {
                const updated = [...current];
                const existing = current[editIndex];
                const updatedLabel = {
                  ...existing,
                  ...bag,
                  barcode_value: bag.code?.trim() || existing.barcode_value || existing.code,
                };
                updated[editIndex] = updatedLabel;
                setSelectedLabelId(updatedLabel.id);
                return updated;
              }
              const newLabel = {
                ...bag,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                barcode_value: bag.code?.trim() || 'BAG-000',
              };
              setSelectedLabelId(newLabel.id);
              return [...current, newLabel];
            });
            setBag(blankBag);
            setEditIndex(null);
            setOpen(false);
          }}
        >
          <div>
            <label className="text-sm text-slate-600">Collection Code / Bag Number</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={bag.code}
              onChange={(e) => setBag({ ...bag, code: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Blood Group</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={bag.blood}
                onChange={(e) => setBag({ ...bag, blood: e.target.value })}
              >
                <option value="">-</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Component</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={bag.component}
                onChange={(e) => setBag({ ...bag, component: e.target.value })}
              >
                {['Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Plasma', 'Cryo'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Expiry</label>
              <input
                type="date"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={bag.expiry}
                onChange={(e) => {
                  setBag({ ...bag, expiry: e.target.value });
                  e.target.blur();
                }}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Volume (ml)</label>
              <input
                type="number"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={bag.volume}
                onChange={(e) => setBag({ ...bag, volume: e.target.value })}
                placeholder="450"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                printLabel(selectedLabel);
              }}
              disabled={!selectedLabel}
            >
              Print
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
              Save Preview
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
