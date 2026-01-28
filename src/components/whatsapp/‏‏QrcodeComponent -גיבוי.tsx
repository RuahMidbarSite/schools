"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Modal, Button, Spinner, Badge } from 'react-bootstrap';
import QRCode from 'qrcode.react';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'waiting_qr' | 'qr_ready' | 'error';

const QrCodeComponent = forwardRef((props, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('בודק חיבור...');
  const [showResetButton, setShowResetButton] = useState(false);

  const WHATSAPP_SERVER = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';

  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER}/status`);
      const data = await response.json();
      return data.connected === true;
    } catch (error) {
      return false;
    }
  };

  const initialize = async () => {
    try {
      setStatus('checking');
      setStatusMessage('מתחבר לשרת...');

      // 🆕 מנגנון לעדכון הודעות מהשרת בזמן אמת (Polling)
      // זה יגרום להודעות כמו "מפעיל דפדפן" להופיע בזמן שהספינר מסתובב
      const messageInterval = setInterval(async () => {
        try {
          const res = await fetch(`${WHATSAPP_SERVER}/status`);
          const statusData = await res.json();
          if (statusData.message) {
            setStatusMessage(statusData.message); 
          }
        } catch (e) { /* שגיאה שקטה */ }
      }, 2000);

      const response = await fetch(`${WHATSAPP_SERVER}/Initialize`);
      const data = await response.json();

      // עצירת עדכון ההודעות ברגע שה-Initialize הסתיים
      clearInterval(messageInterval);

      if (data.result === 'ready') {
        setStatus('connected');
        setStatusMessage('✅ מחובר בהצלחה!');
        setTimeout(() => setShowModal(false), 2000);
        return true;
      } else if (data.result === 'qr' && data.data) {
        setStatus('qr_ready');
        setQrCode(data.data);
        setStatusMessage('📱 סרוק את הקוד כעת');
        setShowResetButton(true);
        
        const checkInterval = setInterval(async () => {
          const connected = await checkConnection();
          if (connected) {
            setStatus('connected');
            setStatusMessage('✅ התחברת בהצלחה!');
            clearInterval(checkInterval);
            setTimeout(() => setShowModal(false), 2000);
          }
        }, 3000);

        setTimeout(() => clearInterval(checkInterval), 120000);
      }
      return false;
    } catch (error) {
      setStatus('error');
      setStatusMessage('⚠️ שגיאה בתקשורת עם השרת');
      return false;
    }
  };

  useEffect(() => {
    const checkAtStart = async () => {
      const connected = await checkConnection();
      setStatus(connected ? 'connected' : 'disconnected');
    };
    checkAtStart();

    const interval = setInterval(async () => {
      if (!showModal) {
        const isConnected = await checkConnection();
        setStatus(isConnected ? 'connected' : 'disconnected');
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [showModal]);

  useImperativeHandle(ref, () => ({
    checkConnection: checkConnection,
    openModal: () => {
      setShowModal(true);
      initialize();
    },
    checkAndOpenIfNeeded: async () => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        setShowModal(true);
        return await initialize();
      }
      setStatus('connected');
      return true;
    }
  }));

  const resetConnection = async () => {
    if (confirm('לאפס חיבור?')) {
      try {
        await fetch(`${WHATSAPP_SERVER}/ResetSession`, { method: 'POST' });
        setQrCode(null);
        initialize();
      } catch (error) {}
    }
  };

  return (
    <>
      <Modal show={showModal} onHide={() => setShowModal(false)} centered dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>חיבור ל-WhatsApp</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
            {status === 'checking' && (
              <div className="mt-3">
                <Spinner animation="border" variant="primary" />
                <h6 className="mt-3 text-primary">{statusMessage}</h6>
                <p className="text-muted small">אנא המתן, זה עשוי לקחת עד 30 שניות...</p>
              </div>
            )}
            {status === 'qr_ready' && qrCode && (
              <div>
                <QRCode value={qrCode} size={250} />
                <p className="mt-3 fw-bold">{statusMessage}</p>
              </div>
            )}
            {status === 'connected' && <h4 className="text-success">✅ מחובר!</h4>}
            {status === 'error' && <p className="text-danger">⚠️ שגיאת חיבור</p>}
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button variant="link" size="sm" className="text-danger" onClick={resetConnection}>איפוס סשן</Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>סגור</Button>
        </Modal.Footer>
      </Modal>

      {/* הכפתור הקטן לסרגל הניווט */}
      <div 
        onClick={() => { setShowModal(true); initialize(); }}
        className="d-flex align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <Badge 
          bg={status === 'connected' ? 'success' : (status === 'checking' ? 'warning' : 'danger')}
          className="d-flex align-items-center gap-2 py-2 px-3"
          style={{ borderRadius: '18px', fontWeight: '500', transition: 'all 0.3s' }}
        >
          {status === 'checking' && <Spinner animation="border" size="sm" variant="light" />}
          <span>{status === 'connected' ? 'WhatsApp מחובר' : (status === 'checking' ? 'בודק...' : 'WhatsApp מנותק')}</span>
        </Badge>
      </div>
    </>
  );
});

QrCodeComponent.displayName = 'QrCodeComponent';
export default QrCodeComponent;