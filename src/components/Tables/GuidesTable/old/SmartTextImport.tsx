import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spinner, Table, Form } from 'react-bootstrap';
import { Guide } from "@prisma/client";
import Draggable from 'react-draggable'; 

interface Props {
  show: boolean;
  onClose: () => void;
  existingGuides: Guide[];
  onConfirm: (finalGuides: any[]) => void;
}

export const SmartTextImport = ({ show, onClose, existingGuides, onConfirm }: Props) => {
  const [loading, setLoading] = useState(false);
  const [draftGuides, setDraftGuides] = useState<any[]>([]);
  const nodeRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // פונקציה לטיפול בהדבקת תמונות
  const handleImagePaste = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setLoading(true);
    try {
      // המרת התמונה ל-base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        const res = await fetch('/api/ai-extract-guides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64Image,
            isImage: true 
          }),
        });
        
        const data = await res.json();
        processExtractedGuides(data.guides);
      };
    } catch (err) {
      console.error("Image extraction error:", err);
      alert("שגיאה בעיבוד התמונה");
    } finally {
      setLoading(false);
    }
  }, [existingGuides]);

  // פונקציה לטיפול בהדבקת טקסט (הפונקציה המקורית)
  const handleTextPaste = useCallback(async (text: string) => {
    if (!text || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai-extract-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      });
      const data = await res.json();
      processExtractedGuides(data.guides);
    } catch (err) {
      console.error("Extraction error:", err);
    } finally {
      setLoading(false);
    }
  }, [existingGuides, loading]);

  // פונקציה משותפת לעיבוד המדריכים שחולצו
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
        tempId: Math.random() 
      };
    });

    setDraftGuides(prev => [...prev, ...newItems]);
  };

  // מאזין להדבקה (תמיכה גם בטקסט וגם בתמונות)
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // בדיקה אם יש תמונה בלוח
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

    // אם אין תמונה, נטפל בטקסט
    const text = e.clipboardData?.getData('text');
    if (text) {
      await handleTextPaste(text);
    }
  }, [handleImagePaste, handleTextPaste]);

  // טיפול בבחירת קובץ דרך כפתור העלאה
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImagePaste(file);
    
    // איפוס ה-input כדי לאפשר העלאה של אותו קובץ שוב
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
          top: '15%', left: '15%', width: '950px', 
          backgroundColor: 'white', border: '1px solid #ccc',
          borderRadius: '12px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          zIndex: 10000, direction: 'rtl', display: 'flex', flexDirection: 'column'
        }}
      >
        <div className="drag-handle p-2 bg-primary text-white d-flex justify-content-between align-items-center rounded-top" style={{ cursor: 'move' }}>
          <h6 className="m-0">🪄 הזנה חכמה מצטברת (Ctrl+V להדבקה | תמיכה בטקסט ותמונות)</h6>
          <Button variant="link" className="text-white p-0" onClick={onClose} style={{ textDecoration: 'none', fontSize: '20px' }}>&times;</Button>
        </div>

        <div className="p-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
                  <strong>📸 תמונה:</strong> 
                  <ul className="text-start d-inline-block mb-0">
                    <li>צלם מסך (Print Screen) והדבק כאן (Ctrl+V)</li>
                    <li>או לחץ על הכפתור למטה להעלאת קובץ תמונה</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button as="span" variant="outline-primary" size="sm">
                    📤 העלה תמונה מהמחשב
                  </Button>
                </label>
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
                  <th>הערות</th> 
                  <th>מקצועות</th> 
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
                    <td contentEditable onBlur={(e) => updateDraftField(idx, 'Notes', e.currentTarget.innerText)} style={{ fontSize: '11px', color: '#666' }}>
                      {guide.Notes}
                    </td>
                    <td><strong>{guide.Profession}</strong></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="p-3 border-top d-flex justify-content-between bg-light rounded-bottom">
          <Button variant="outline-danger" size="sm" onClick={() => setDraftGuides([])}>נקה הכל</Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onClose}>סגור</Button>
            <Button 
              variant="success" 
              disabled={!draftGuides.some(g => g.selected)}
              onClick={() => onConfirm(draftGuides.filter(g => g.selected))}
            >
              אשר והוסף ({draftGuides.filter(g => g.selected).length}) מדריכים
            </Button>
          </div>
        </div>
      </div>
    </Draggable>
  );
};