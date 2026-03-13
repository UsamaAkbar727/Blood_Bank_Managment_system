import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import Modal from '../components/Modal';

export default function Barcodes() {
  const [bag, setBag] = useState({ code: 'BAG-000', blood: '', component: 'Whole Blood', expiry: '', volume: '' });
  const [open, setOpen] = useState(false);
  const barcodeRef = useRef(null);

  const renderBarcode = () => {
    if (!barcodeRef.current) return;
    const code = bag.code?.trim() || 'BAG-000';
    JsBarcode(barcodeRef.current, code, { format: 'code128', height: 70, width: 2, fontSize: 14, margin: 6 });
  };

  useEffect(() => {
    renderBarcode();
  }, [bag.code]);

  const printLabel = () => {
    const win = window.open('', '_blank', 'width=400,height=600');
    const meta = `${bag.component || 'Component'} - ${bag.blood || 'Blood'}${bag.expiry ? ' - Exp ' + bag.expiry : ''}`;
    const extra = bag.volume ? `Volume: ${bag.volume} ml` : '';
    win.document.write(`
      <html><head><title>Print Label</title></head><body>
        <div style="padding:16px;font-family:Inter,Arial,sans-serif;border:1px dashed #cbd5e1;width:320px">
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">Blood Bag</div>
          <div style="color:#475569;font-size:12px;margin-bottom:6px">${meta}</div>
          <svg id="print-barcode"></svg>
          <div style="font-size:12px;margin-top:6px">${extra}</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script>JsBarcode('#print-barcode','${bag.code || 'BAG-000'}',{format:'code128',height:70,width:2,fontSize:14,margin:6});window.onload=function(){window.print();window.close();};</script>
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
                renderBarcode();
                printLabel();
              }}
            >
              Print
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              onClick={() => setOpen(true)}
            >
              New Label
            </button>
          </div>
        </div>
        <div className="mt-2 border border-dashed border-slate-200 rounded-xl p-3 bg-white">
          <div className="font-semibold text-slate-800 mb-1">Preview</div>
          <div className="text-xs text-slate-500 mb-1">
            {bag.component || 'Component'} - {bag.blood || 'Blood'}
            {bag.expiry ? ` - Exp ${bag.expiry}` : ''}
          </div>
          <svg ref={barcodeRef} />
          <div className="text-xs text-slate-600">{bag.volume ? `Volume: ${bag.volume} ml` : ''}</div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate / Print Label">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            renderBarcode();
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
                renderBarcode();
                printLabel();
              }}
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
