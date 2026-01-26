"use client";

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import QRCode from 'qrcode.react';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'waiting_qr' | 'qr_ready' | 'error';

const QrCodeComponent = forwardRef((props, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('בודק חיבור...');
  const [showResetButton, setShowResetButton] = useState(false);

  const WHATSAPP_SERVER = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3994';

  // פונקציה לבדיקת סטטוס - UPDATED
  const checkConnection = async (): Promise<boolean> => {
    try {
      console.log("🔍 Checking connection...");
      
      const response = await fetch(`${WHATSAPP_SERVER}/status`);
      const data = await response.json();
      
      console.log("📊 Status response:", data);
      
      // אם יש חיבור - מצוין!
      if (data.connected === true) {
        console.log("✅ Connected!");
        return true;
      }
      
      // אם אין חיבור אבל יש Session וניסינו להתחבר אוטומטית
      if (data.autoConnected === true && data.hasSession === true) {
        console.log("⏳ Auto-connect in progress, checking again in 3s...");
        
        // המתן 3 שניות ובדוק שוב
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const recheck = await fetch(`${WHATSAPP_SERVER}/status`);
        const recheckData = await recheck.json();
        
        console.log("🔄 Recheck result:", recheckData.connected);
        return recheckData.connected === true;
      }
      
      // אחרת - לא מחובר
      console.log("❌ Not connected");
      return false;
      
    } catch (error) {
      console.error('שגיאה בבדיקת חיבור:', error);
      return false;
    }
  };

  // פונקציה להתחברות
  const initialize = async () => {
    try {
      setStatus('checking');
      setStatusMessage('בודק אם כבר מחובר...');
      
      const response = await fetch(`${WHATSAPP_SERVER}/Initialize`);
      const data = await response.json();

      if (data.result === 'ready') {
        setStatus('connected');
        setStatusMessage('✅ מחובר ל-WhatsApp בהצלחה!');
        setShowResetButton(false);
        setTimeout(() => setShowModal(false), 2000);
      } else if (data.result === 'qr' && data.data) {
        setStatus('qr_ready');
        setStatusMessage('📱 סרוק את הקוד תוך 30 שניות');
        setQrCode(data.data);
        setShowResetButton(true);
        
        // המתנה לסריקה - בודק כל 3 שניות
        const checkInterval = setInterval(async () => {
          const connected = await checkConnection();
          if (connected) {
            clearInterval(checkInterval);
            setStatus('connected');
            setStatusMessage('✅ התחברת בהצלחה!');
            setShowResetButton(false);
            setTimeout(() => setShowModal(false), 2000);
          }
        }, 3000);

        // עצור בדיקה אחרי 2 דקות
        setTimeout(() => clearInterval(checkInterval), 120000);
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage('❌ שגיאה בהתחברות. נסה Reset');
      setShowResetButton(true);
      console.error('שגיאה:', error);
    }
  };

  // פונקציה ל-Reset
  const resetConnection = async () => {
    if (!confirm('פעולה זו תנתק את החיבור הנוכחי ותיצור QR חדש. להמשיך?')) {
      return;
    }

    try {
      setStatus('checking');
      setStatusMessage('מנתק חיבור קיים...');
      setQrCode(null);
      
      await fetch(`${WHATSAPP_SERVER}/ResetSession`, { method: 'POST' });
      
      setStatusMessage('ממתין 3 שניות...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // התחל מחדש
      await initialize();
    } catch (error) {
      setStatus('error');
      setStatusMessage('❌ שגיאה ב-Reset. רענן את הדף');
      console.error('שגיאה ב-Reset:', error);
    }
  };

  // חשיפת פונקציות ל-parent component
  useImperativeHandle(ref, () => ({
    checkConnection,
    openModal: () => {
      setShowModal(true);
      initialize();
    },
    checkAndOpenIfNeeded: async () => {
      console.log("🔍 checkAndOpenIfNeeded called");
      const connected = await checkConnection();
      
      if (!connected) {
        console.log("❌ Not connected - opening modal");
        setShowModal(true);
        initialize();
      } else {
        console.log("✅ Already connected - no action needed");
      }
      
      return connected;
    }
  }));

  // קומפוננטת סטטוס ויזואלית
  const StatusIndicator = () => {
    const statusConfig = {
      checking: { color: 'warning', icon: '⏳', text: 'בודק...' },
      connected: { color: 'success', icon: '✅', text: 'מחובר' },
      disconnected: { color: 'danger', icon: '🔴', text: 'לא מחובר' },
      waiting_qr: { color: 'info', icon: '⏱️', text: 'ממתין ל-QR' },
      qr_ready: { color: 'primary', icon: '📱', text: 'סרוק QR' },
      error: { color: 'danger', icon: '❌', text: 'שגיאה' }
    };

    const config = statusConfig[status];

    return (
      <Alert variant={config.color} className="text-center mb-3">
        <h4>{config.icon} {config.text}</h4>
        <p className="mb-0">{statusMessage}</p>
      </Alert>
    );
  };

  return (
    <>
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton={status === 'connected'}>
          <Modal.Title>חיבור ל-WhatsApp</Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="text-center">
          <StatusIndicator />

          {status === 'checking' && (
            <div className="my-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">בודק חיבור קיים...</p>
            </div>
          )}

          {status === 'qr_ready' && qrCode && (
            <div className="my-4">
              <div className="d-flex justify-content-center mb-3">
                <QRCode value={qrCode} size={256} level="M" />
              </div>
              <Alert variant="info">
                <strong>הוראות:</strong>
                <ol className="text-end mb-0 pe-3">
                  <li>פתח WhatsApp במכשיר הנייד</li>
                  <li>לחץ על תפריט (⋮) → מכשירים מקושרים</li>
                  <li>לחץ "קשר מכשיר"</li>
                  <li>סרוק את הקוד למעלה</li>
                </ol>
              </Alert>
              <p className="text-muted small">
                ⏱️ הקוד תקף ל-30 שניות. אם פג, לחץ Reset למטה.
              </p>
            </div>
          )}

          {status === 'connected' && (
            <div className="my-4">
              <div style={{ fontSize: '4rem' }}>✅</div>
              <h3 className="text-success">מחובר בהצלחה!</h3>
              <p>החלון ייסגר אוטומטית...</p>
            </div>
          )}

          {status === 'error' && (
            <Alert variant="danger">
              <h5>❌ לא הצלחנו להתחבר</h5>
              <p className="mb-0">לחץ על "Reset חיבור" למטה ונסה שוב</p>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer className="justify-content-between">
          <div>
            {showResetButton && (
              <Button 
                variant="warning" 
                onClick={resetConnection}
                disabled={status === 'checking'}
              >
                🔄 Reset חיבור
              </Button>
            )}
          </div>
          <div>
            {status === 'connected' && (
              <Button variant="success" onClick={() => setShowModal(false)}>
                סגור
              </Button>
            )}
            {status !== 'connected' && status !== 'checking' && (
              <Button 
                variant="primary" 
                onClick={initialize}
                disabled={status === 'checking'}
              >
                נסה שוב
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {/* אינדיקטור קבוע בפינת המסך */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowModal(true)}
      >
        <Alert 
          variant={status === 'connected' ? 'success' : 'danger'} 
          className="mb-0 py-2 px-3"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <strong>
            {status === 'connected' ? '✅ WhatsApp מחובר' : '🔴 WhatsApp לא מחובר'}
          </strong>
          {status !== 'connected' && (
            <div className="small">לחץ להתחבר</div>
          )}
        </Alert>
      </div>
    </>
  );
});

QrCodeComponent.displayName = 'QrCodeComponent';

export default QrCodeComponent;