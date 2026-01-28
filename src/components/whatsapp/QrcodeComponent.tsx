"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner, Badge } from 'react-bootstrap';
import QRCode from 'qrcode.react';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'waiting_qr' | 'qr_ready' | 'error';

const QrCodeComponent = forwardRef((props, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('בודק חיבור...');
  
  const isInitializing = useRef(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // 🔧 זיהוי אוטומטי של הסביבה
  const getWhatsAppServer = () => {
    // 1. בדוק משתנה סביבה
    if (process.env.NEXT_PUBLIC_WHATSAPP_SERVER) {
      return process.env.NEXT_PUBLIC_WHATSAPP_SERVER;
    }
    
    // 2. בדוק אם זה Vercel
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return 'https://beamingly-footworn-johnsie.ngrok-free.dev';
    }
    
    // 3. ברירת מחדל - localhost
    return 'http://localhost:3994';
  };

  const WHATSAPP_SERVER = getWhatsAppServer();

  const fetchHeaders = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER}/status`, { 
        headers: fetchHeaders,
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.statusMessage) setStatusMessage(data.statusMessage);
      return data.connected === true;
    } catch (error) {
      console.error("Check connection failed:", error);
      setStatusMessage('שגיאה בתקשורת עם השרת');
      return false;
    }
  };

  const initialize = async () => {
    if (isInitializing.current) {
      console.log("⏳ Already initializing - skipping duplicate call");
      return;
    }
    
    isInitializing.current = true;

    try {
      setStatus('checking');
      setStatusMessage('מתחבר לשרת...');

      const response = await fetch(`${WHATSAPP_SERVER}/Initialize`, { 
        headers: fetchHeaders,
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📥 Initialize response:", data);

      if (data.result === 'ready') {
        setStatus('connected');
        setStatusMessage('מחובר ל-WhatsApp');
        setQrCode(null);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setTimeout(() => setShowModal(false), 1500);
      } else if (data.result === 'qr' && data.data) {
        setQrCode(data.data);
        setStatus('qr_ready');
        setStatusMessage('סרוק את קוד ה-QR');
        startPolling();
      } else {
        setStatus('waiting_qr');
        setStatusMessage(data.message || 'מכין קוד QR...');
        startPolling();
      }
    } catch (error) {
      console.error("❌ Initialize error:", error);
      setStatus('error');
      setStatusMessage('שגיאה בתקשורת עם השרת. וודא שהשרת פועל.');
    } finally {
      isInitializing.current = false;
    }
  };

  const startPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    console.log("🔄 Starting polling...");
    
    pollingInterval.current = setInterval(async () => {
      const isConnected = await checkConnection();
      
      if (isConnected) {
        console.log("✅ Connected detected during polling!");
        setStatus('connected');
        setStatusMessage('מחובר בהצלחה!');
        setQrCode(null);
        
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        setTimeout(() => setShowModal(false), 2000);
        return;
      }

      try {
        const qrRes = await fetch(`${WHATSAPP_SERVER}/GetQR`, { 
          headers: fetchHeaders,
          cache: 'no-store'
        });
        
        if (!qrRes.ok) {
          console.log(`⚠️  GetQR returned ${qrRes.status}`);
          return;
        }
        
        const qrData = await qrRes.json();
        console.log("📥 GetQR response:", qrData);
        
        if (qrData.result === 'ready') {
          console.log("✅ Connected (from GetQR)!");
          setStatus('connected');
          setStatusMessage('מחובר בהצלחה!');
          setQrCode(null);
          
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          
          setTimeout(() => setShowModal(false), 2000);
          return;
        }
        
        if (qrData.result === 'qr' && qrData.data) {
          if (qrCode !== qrData.data) {
            console.log("🆕 New QR code received");
            setQrCode(qrData.data);
          }
          setStatus('qr_ready');
          setStatusMessage('סרוק את קוד ה-QR');
        } else if (qrData.result === 'waiting') {
          setStatus('waiting_qr');
          setStatusMessage(qrData.message || 'מכין קוד QR...');
        }
      } catch (e) {
        console.log("⚠️  Polling error:", e);
        setStatusMessage('מחכה לקוד QR מהשרת...');
      }
    }, 5000);
  };

  const resetConnection = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך לאפס את החיבור? זה ינתק את המכשיר הקיים.")) return;
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    try {
      setStatus('checking');
      setStatusMessage('מנקה נתונים...');
      setQrCode(null);
      
      const response = await fetch(`${WHATSAPP_SERVER}/ResetSession`, { 
        method: 'POST',
        headers: fetchHeaders,
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }
      
      console.log("✅ Session reset successful");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      isInitializing.current = false;
      initialize();
      
    } catch (error) {
      console.error("❌ Reset error:", error);
      setStatus('error');
      setStatusMessage('שגיאה באיפוס הסשן');
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initialCheck = async () => {
      const connected = await checkConnection();
      if (mounted) {
        setStatus(connected ? 'connected' : 'disconnected');
        setStatusMessage(connected ? 'מחובר ל-WhatsApp' : 'לא מחובר');
      }
    };
    
    initialCheck();

    return () => {
      mounted = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showModal && pollingInterval.current) {
      console.log("🛑 Modal closed - stopping polling");
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, [showModal]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setShowModal(true);
      if (status !== 'connected') {
        initialize();
      }
    },
    isConnected: status === 'connected',
    checkStatus: async () => {
      const connected = await checkConnection();
      setStatus(connected ? 'connected' : 'disconnected');
      return connected;
    }
  }));

  return (
    <>
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        centered 
        dir="rtl"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>חיבור ל-WhatsApp</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4" style={{ minHeight: '300px' }}>
          
          {(status === 'checking' || status === 'waiting_qr') && (
            <div className="py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="text-muted">{statusMessage}</p>
              <p className="small text-muted mt-2">זה עשוי לקחת עד 30 שניות...</p>
            </div>
          )}

          {status === 'qr_ready' && (
            <div>
              <div className="bg-white p-3 d-inline-block rounded shadow-sm mb-3" style={{ border: '1px solid #eee' }}>
                {qrCode ? (
                  <QRCode value={qrCode} size={256} level="H" includeMargin={true} />
                ) : (
                  <div className="py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="small text-muted mt-2">ממתין לקוד QR...</p>
                  </div>
                )}
              </div>
              <p className="fw-bold mb-1">סרוק את הקוד מהנייד</p>
              <p className="small text-muted">פתח וואטסאפ {'>'} מכשירים מקושרים {'>'} קישור מכשיר</p>
              <p className="small text-primary mt-3">
                ⏳ הקוד יישאר תקף למשך 60 שניות
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="text-success py-5">
              <div className="display-4 mb-2">✅</div>
              <h5>החיבור בוצע בהצלחה!</h5>
              <p className="small text-muted mt-2">כעת ניתן לשלוח הודעות</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-danger py-5">
              <div className="display-4 mb-2">❌</div>
              <p className="mb-3">{statusMessage}</p>
              <div className="d-flex gap-2 justify-content-center">
                <Button variant="primary" onClick={initialize}>נסה שוב</Button>
                <Button variant="outline-danger" onClick={resetConnection}>איפוס מלא</Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between bg-light">
          <Button 
            variant="link" 
            size="sm" 
            className="text-danger p-0" 
            onClick={resetConnection}
            disabled={status === 'checking'}
          >
            איפוס סשן מלא
          </Button>
          <div className="small text-muted">
            {WHATSAPP_SERVER.includes('localhost') ? '🏠 פיתוח' : '☁️ ייצור'}
          </div>
          <Button variant="secondary" onClick={() => setShowModal(false)}>סגור</Button>
        </Modal.Footer>
      </Modal>

      <div 
        onClick={() => { 
          setShowModal(true); 
          if (status !== 'connected') {
            initialize(); 
          }
        }}
        className="d-flex align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <Badge 
          bg={status === 'connected' ? 'success' : (status === 'checking' ? 'warning' : 'danger')}
          className="d-flex align-items-center gap-2 py-2 px-3"
          style={{ borderRadius: '18px', fontWeight: '500', transition: 'all 0.3s' }}
        >
          {status === 'checking' && <Spinner animation="border" size="sm" variant="light" />}
          <span>{status === 'connected' ? 'WhatsApp מחובר' : 'WhatsApp מנותק'}</span>
        </Badge>
      </div>
    </>
  );
});

QrCodeComponent.displayName = 'QrCodeComponent';
export default QrCodeComponent;