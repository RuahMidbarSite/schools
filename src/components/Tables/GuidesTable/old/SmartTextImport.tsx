import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spinner, Table, Form } from 'react-bootstrap';
import { Guide } from "@prisma/client";
import Draggable from 'react-draggable'; 
import { handleAiError } from "@/util/localServerRequests";

interface Props {
  show: boolean;
  onClose: () => void;
  existingGuides: Guide[];
  onConfirm: (finalGuides: any[]) => void;
}

export const SmartTextImport = ({ show, onClose, existingGuides, onConfirm }: Props) => {
  const [loading, setLoading] = useState(false); 
  const [isConfirming, setIsConfirming] = useState(false); 
  const [draftGuides, setDraftGuides] = useState<any[]>([]);
  const nodeRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // for reading files as base64
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImagePaste = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setLoading(true);
    try {
      const base64Image = await readFileAsDataURL(file);
      
      const res = await fetch('/api/ai-extract-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image,
          isImage: true 
        }),
      });
      if (handleAiError(res, () => setLoading(false))) return;
      const data = await res.json();
      processExtractedGuides(data.guides);
    } catch (err) {
      console.error("Image extraction error:", err);
      alert("שגיאה בעיבוד התמונה");
    } finally {
      setLoading(false);
    }
  }, [existingGuides]);

  const handleTextPaste = useCallback(async (text: string) => {
    if (!text || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai-extract-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      });
      if (handleAiError(res, () => setLoading(false))) return;
      const data = await res.json();
      processExtractedGuides(data.guides);
    } catch (err) {
      console.error("Extraction error:", err);
    } finally {
      setLoading(false);
    }
  }, [existingGuides, loading]);

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoading(true);
    try {
      const base64String = await readFileAsDataURL(file);
      const cleanBase64 = base64String.split('base64,')[1];
      
      const res = await fetch('/api/ai-extract-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file: cleanBase64,
          isImage: false 
        }),
      });
      if (handleAiError(res, () => setLoading(false))) return;

      const data = await res.json();
      
      const enrichedGuides = data.guides.map((g: any) => ({
        ...g,
        cvFileData: cleanBase64, 
        cvFileName: file.name,
      }));

      processExtractedGuides(enrichedGuides);
    } catch (err) {
      console.error("PDF extraction error:", err);
      alert("שגיאה בעיבוד קובץ ה-PDF");
    } finally {
      setLoading(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const processExtractedGuides = (guides: any[]) => {
   
    const newItems = guides.map((g: any) => {
      const cleanAIPhone = g.CellPhone?.toString().replace(/\D/g, '').replace(/^0/, '');
      
      const isDuplicateInMainTable = existingGuides.some(ex => {
        const cleanExistingPhone = ex.CellPhone?.toString().replace(/\D/g, '').replace(/^0/, '');
        return cleanExistingPhone === cleanAIPhone;
      });

      const isDuplicateInCurrentDraft = draftGuides.some(draft => {
        const cleanDraftPhone = draft.CellPhone?.toString().replace(/\D/g, '').replace(/^0/, '');
        return cleanDraftPhone === cleanAIPhone; 
      });

      const isDuplicate = isDuplicateInMainTable || isDuplicateInCurrentDraft;

      return { 
        ...g, 
        isDuplicate,
        selected: !isDuplicate,
        Area:g.Area || "",
        tempId: Math.random() 
      };
    });

    setDraftGuides(prev => [...prev, ...newItems]);
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleImagePaste(file);
          return;
        }
      }
    }

    const text = e.clipboardData?.getData('text');
    if (text) {
      await handleTextPaste(text);
    }
  }, [handleImagePaste, handleTextPaste]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImagePaste(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (show) {
      window.addEventListener('paste', handlePaste);
    }
    return () => window.removeEventListener('paste', handlePaste);
  }, [show, handlePaste]);

  const updateDraftField = (index: number, field: string, value: string) => {
    const updated = [...draftGuides];
    updated[index][field] = value;
    setDraftGuides(updated);
  };

  if (!show) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".drag-handle">
      <div 
        ref={nodeRef}
        style={{
          position: 'fixed', 
          top: '10%', left: '10%', width: '1100px', 
          backgroundColor: 'white', border: '1px solid #ccc',
          borderRadius: '12px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          zIndex: 10000, direction: 'rtl', display: 'flex', flexDirection: 'column'
        }}
      >
        <div className="drag-handle p-2 bg-primary text-white d-flex justify-content-between align-items-center rounded-top" style={{ cursor: 'move' }}>
          <h6 className="m-0">🪄 הזנה חכמה מצטברת (Ctrl+V להדבקה | תמיכה בטקסט, תמונות ו-PDF)</h6>
          <Button variant="link" className="text-white p-0" onClick={onClose} style={{ textDecoration: 'none', fontSize: '20px' }}>&times;</Button>
        </div>

        <div className="p-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {/* Loading Indicator */}
          {loading && <div className="text-center mb-3"><Spinner animation="border" size="sm" /> מנתח נתונים...</div>}
          
          {draftGuides.length === 0 ? (
            <div className="text-center p-5 border-dashed rounded" style={{ border: '2px dashed #dee2e6' }}>
              <p className="text-muted mb-2">החלון מוכן. בחר אחת מהאפשרויות:</p>
              <div className="d-flex flex-column gap-2 align-items-center">
                <div>
                  <strong>📋 טקסט:</strong> העתק טקסט מווטסאפ ועשה <strong>Ctrl+V</strong> כאן
                </div>
                <div className="my-2">או</div>
                <div>
                  <strong>📸 תמונה / קורות חיים:</strong> 
                  <ul className="text-start d-inline-block mb-0">
                    <li>צלם מסך (Print Screen) והדבק כאן (Ctrl+V)</li>
                    <li>או לחץ על הכפתורים למטה להעלאת קובץ מהמחשב</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-3 d-flex gap-2 justify-content-center">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                    disabled={loading}
                  />
                  <label htmlFor="image-upload">
                    <Button as="span" variant="outline-primary" size="sm" disabled={loading} style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                      📤 העלה תמונה
                    </Button>
                  </label>
                </div>

                <div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    style={{ display: 'none' }}
                    id="pdf-upload"
                    disabled={loading}
                  />
                  <label htmlFor="pdf-upload">
                    <Button as="span" variant="outline-danger" size="sm" disabled={loading} style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                      📄 העלה קורות חיים (PDF)
                    </Button>
                  </label>
                </div>
              </div>

            </div>
          ) : (
            <Table striped bordered hover size="sm" style={{ fontSize: '13px' }}>
              <thead>
                <tr className="bg-light">
                  <th style={{ width: '40px' }}>
                    <Form.Check 
                      type="checkbox" 
                      checked={draftGuides.length > 0 && draftGuides.every(g => g.selected)} 
                      onChange={(e) => setDraftGuides(draftGuides.map(g => ({ ...g, selected: e.target.checked })))} 
                    />
                  </th>
                  <th>שם פרטי</th>
                  <th>שם משפחה</th>
                  <th>טלפון</th>
                  <th>עיר</th>
                  <th>אזור</th> 
                  <th>הערות</th> 
                  <th>מקצועות</th> 
                  <th className="text-center">קובץ מצורף</th>
                </tr>
              </thead>
              <tbody>
                {draftGuides.map((guide, idx) => (
                  <tr key={guide.tempId} className={guide.isDuplicate ? "table-danger" : ""}>
                    <td>
                      <Form.Check 
                        type="checkbox" 
                        checked={guide.selected} 
                        onChange={() => {
                          const newGuides = [...draftGuides];
                          newGuides[idx].selected = !newGuides[idx].selected;
                          setDraftGuides(newGuides);
                        }} 
                      />
                    </td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'FirstName', e.currentTarget.innerText)}>{guide.FirstName}</td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'LastName', e.currentTarget.innerText)}>{guide.LastName}</td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'CellPhone', e.currentTarget.innerText)}>{guide.CellPhone}</td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'City', e.currentTarget.innerText)}>{guide.City}</td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'Area', e.currentTarget.innerText)}>{guide.Area}</td>
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'Notes', e.currentTarget.innerText)} style={{ fontSize: '11px', color: '#666' }}>
                      {guide.Notes}
                    </td>
                    <td><strong>{guide.Profession}</strong></td>
                    <td className="text-center">
                      {guide.cvFileData ? <span title={guide.cvFileName}>📄 כֵּן</span> : <span className="text-muted">❌ לא</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="p-3 border-top d-flex justify-content-between bg-light rounded-bottom">
          <Button variant="outline-danger" size="sm" onClick={() => setDraftGuides([])} disabled={isConfirming}>נקה הכל</Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isConfirming}>סגור</Button>
            <Button 
              variant="success" 
              disabled={!draftGuides.some(g => g.selected) || isConfirming}
              onClick={async () => {
                setIsConfirming(true);
                try {
                  await onConfirm(draftGuides.filter(g => g.selected));
                  setDraftGuides([]); 
                } catch (err) {
                  console.error("Confirm error:", err);
                } finally {
                  setIsConfirming(false);
                }
              }}
            >
              {isConfirming ? <Spinner animation="border" size="sm" className="me-2" /> : null}
              אשר והוסף ({draftGuides.filter(g => g.selected).length}) מדריכים
            </Button>
          </div>
        </div>
      </div>
    </Draggable>
  );
};