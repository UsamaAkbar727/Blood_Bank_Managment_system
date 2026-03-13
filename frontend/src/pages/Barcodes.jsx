import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';
import Modal from '../components/Modal';
import { request } from '../lib/api';

export default function Barcodes() {
  const [bag, setBag] = useState({ code: 'BAG-000', blood: '', component: 'Whole Blood', expiry: '', volume: '' });
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [lastScan, setLastScan] = useState('');
  const [scanInfo, setScanInfo] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const barcodeRef = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScanRef = useRef({ code: '', ts: 0 });

  const renderBarcode = () => {
    if (!barcodeRef.current) return;
    const code = bag.code?.trim() || 'BAG-000';
    JsBarcode(barcodeRef.current, code, { format: 'code128', height: 70, width: 2, fontSize: 14, margin: 6 });
  };

  useEffect(() => {
    renderBarcode();
  }, [bag.code]);

  useEffect(() => {
    async function listDevices() {
      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        setCameras(devices);
        if (devices[0]) setSelectedCamera(devices[0].deviceId);
      } catch (err) {
        setLastScan('Camera permission needed');
      }
    }
    listDevices();
    return () => {
      if (controlsRef.current) controlsRef.current.stop();
      if (readerRef.current) readerRef.current.reset();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const startCamera = async () => {
    if (!selectedCamera || !videoRef.current) return;
    setScanError('');
    setLastScan('');
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (readerRef.current) readerRef.current.reset();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let active = true;
    setCameraActive(true);

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err, controls) => {
        if (controls) controlsRef.current = controls;
        if (!active || !result) return;
        const code = result.getText();
        const now = Date.now();
        if (lastScanRef.current.code === code && now - lastScanRef.current.ts < 1500) return;
        lastScanRef.current = { code, ts: now };
        setLastScan(code);
        setScanError('');
        lookupBarcode(code);
      })
      .catch(() => {
        if (active) setLastScan('Camera error');
      });

    return () => {
      active = false;
    };
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (readerRef.current) readerRef.current.reset();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  const lookupBarcode = async (code) => {
    try {
      const payload = await request(`/api/barcodes/lookup.php?code=${encodeURIComponent(code)}`);
      const item = payload.data;
      setScanInfo(item);
      setScanHistory((prev) => [{ code, item, ts: new Date().toISOString() }, ...prev].slice(0, 5));
      setBag({
        code: item.collection_code || code,
        blood: item.blood_group || '',
        component: item.component || 'Whole Blood',
        expiry: item.expiry_date || '',
        volume: item.volume_ml ? String(item.volume_ml) : '',
      });
      renderBarcode();
    } catch (err) {
      setScanInfo(null);
      setScanError('Barcode not found in inventory');
    }
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Scan Barcode (Camera)</h3>
          <div className="flex items-center gap-2">
            <button
              className="border border-slate-200 px-3 py-2 rounded-lg text-xs"
              onClick={() => (cameraActive ? stopCamera() : startCamera())}
            >
              {cameraActive ? 'Stop Camera' : 'Start Camera'}
            </button>
          </div>
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2"
          value={selectedCamera || ''}
          onChange={(e) => {
            setSelectedCamera(e.target.value);
            setLastScan('');
            setScanError('');
          }}
        >
          {cameras.map((c, idx) => (
            <option key={c.deviceId} value={c.deviceId}>
              {c.label || `Camera ${idx + 1}`}
            </option>
          ))}
        </select>
        <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl bg-black aspect-video" />
        <div>
          <div className="text-xs text-slate-500">Last scan:</div>
          <div className="font-semibold text-slate-900">{lastScan || '-'}</div>
          {scanError && <div className="text-xs text-red-600 mt-1">{scanError}</div>}
        </div>
        {scanInfo && (
          <div className="mt-2 border border-slate-200 rounded-lg p-3 text-sm">
            <div className="text-xs text-slate-500">Matched Unit</div>
            <div className="font-semibold text-slate-900">{scanInfo.collection_code}</div>
            <div className="text-slate-600">
              {scanInfo.component} • {scanInfo.blood_group} • Exp {scanInfo.expiry_date}
            </div>
          </div>
        )}
        {scanHistory.length > 0 && (
          <div className="text-xs text-slate-500">
            Recent scans:
            <div className="mt-1 space-y-1">
              {scanHistory.map((h, idx) => (
                <div key={`${h.code}-${idx}`} className="flex items-center justify-between">
                  <span className="text-slate-700">{h.code}</span>
                  <span className="text-slate-500">{new Date(h.ts).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
