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

const WHATSAPP_SERVER = 'https://beamingly-footworn-johnsie.ngrok-free.dev';

  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${WHATSAPP_SERVER}/status`);
      const data = await response.json();
      return data.connected === true;
    } catch (error) {
      return false;
    }
  };

  // 🆕 פונקציה לקבלת QR עם timeout
  const tryGetQR = async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 שניות timeout

      const response = await fetch(`${WHATSAPP_SERVER}/GetQR`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('GetQR failed:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.result === 'qr' && data.data) {
        return data.data;
      } else if (data.result === 'ready') {
        // כבר מחובר
        setStatus('connected');
        setStatusMessage('✅ מחובר בהצלחה!');
        return 'connected';
      } else if (data.result === 'generating' || data.result === 'connecting') {
        // QR בתהליך - נסה שוב בעוד 3 שניות
        setStatusMessage('מייצר קוד QR... רגע...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return await tryGetQR(); // רקורסיה
      }
      
      return null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('GetQR timeout - will retry');
      } else {
        console.error('GetQR error:', error);
      }
      return null;
    }
  };

  const initialize = async () => {
    try {
      setStatus('checking');
      setStatusMessage('מתחבר לשרת...');

      // 🆕 בדיקה ראשונה - האם כבר מחובר?
      const alreadyConnected = await checkConnection();
      if (alreadyConnected) {
        setStatus('connected');
        setStatusMessage('✅ כבר מחובר!');
        setTimeout(() => setShowModal(false), 2000);
        return true;
      }

      // 🆕 נסה קודם עם Initialize (עם timeout קצר)
      setStatusMessage('מנסה להתחבר...');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 שניות

        const response = await fetch(`${WHATSAPP_SERVER}/Initialize`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.result === 'ready') {
            setStatus('connected');
            setStatusMessage('✅ מחובר בהצלחה!');
            setTimeout(() => setShowModal(false), 2000);
            return true;
          } else if (data.result === 'qr' && data.data) {
            // קיבלנו QR
            setStatus('qr_ready');
            setQrCode(data.data);
            setStatusMessage('📱 סרוק את הקוד כעת');
            setShowResetButton(true);
            startPolling();
            return false;
          } else if (data.result === 'connecting') {
            // מנסה להתחבר עם session קיים
            setStatusMessage('מנסה להתחבר עם session שמור...');
            startPolling();
            
            // נסה לקבל QR אם זה לוקח יותר מדי זמן
            setTimeout(async () => {
              const stillConnecting = await checkConnection();
              if (!stillConnecting && !qrCode) {
                await handleGetQR();
              }
            }, 5000);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Initialize timeout - trying GetQR instead');
          setStatusMessage('Initialize לקח יותר מדי זמן, מנסה דרך אחרת...');
        } else {
          throw error;
        }
      }

      // 🆕 אם Initialize נכשל או timeout - נסה GetQR
      await handleGetQR();

      return false;
    } catch (error) {
      console.error('Initialize error:', error);
      setStatus('error');
      setStatusMessage('⚠️ שגיאה בתקשורת עם השרת');
      return false;
    }
  };

  // 🆕 פונקציה נפרדת לטיפול ב-QR
  const handleGetQR = async () => {
    setStatusMessage('מייצר קוד QR...');
    
    const qr = await tryGetQR();
    
    if (qr === 'connected') {
      // התחבר בינתיים
      setTimeout(() => setShowModal(false), 2000);
      return;
    }
    
    if (qr) {
      setStatus('qr_ready');
      setQrCode(qr);
      setStatusMessage('📱 סרוק את הקוד כעת');
      setShowResetButton(true);
      startPolling();
    } else {
      setStatus('error');
      setStatusMessage('⚠️ לא הצלחתי לקבל קוד QR. נסה "איפוס סשן"');
    }
  };

  // 🆕 פונקציה לpolling מתמשך
  const startPolling = () => {
    const checkInterval = setInterval(async () => {
      const connected = await checkConnection();
      if (connected) {
        setStatus('connected');
        setStatusMessage('✅ התחברת בהצלחה!');
        setQrCode(null);
        clearInterval(checkInterval);
        setTimeout(() => setShowModal(false), 2000);
      }
    }, 3000); // כל 3 שניות

    // עצור אחרי 2 דקות
    setTimeout(() => {
      clearInterval(checkInterval);
      if (status !== 'connected') {
        setStatusMessage('⏱️ פג תוקף ה-QR. נסה שוב.');
      }
    }, 120000);
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
        setStatus('checking');
        setStatusMessage('מאפס...');
        
        await fetch(`${WHATSAPP_SERVER}/ResetSession`, { method: 'POST' });
        
        setQrCode(null);
        setStatusMessage('מתחיל מחדש...');
        
        // המתן רגע לשרת לסיים איפוס
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await initialize();
      } catch (error) {
        setStatus('error');
        setStatusMessage('⚠️ שגיאה באיפוס');
      }
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
                <p className="text-muted small">
                  פתח WhatsApp → הגדרות → מכשירים מקושרים → קשר מכשיר
                </p>
              </div>
            )}
            {status === 'connected' && <h4 className="text-success">✅ מחובר!</h4>}
            {status === 'error' && (
              <div>
                <p className="text-danger">{statusMessage}</p>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={resetConnection}
                  className="mt-2"
                >
                  🔄 נסה שוב
                </Button>
              </div>
            )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button 
            variant="link" 
            size="sm" 
            className="text-danger" 
            onClick={resetConnection}
            disabled={status === 'checking'}
          >
            איפוס סשן
          </Button>
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