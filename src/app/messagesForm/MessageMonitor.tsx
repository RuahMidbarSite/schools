import React from 'react';

interface MonitorProps {
  history: { delay: number; type: string }[];
  isSending: boolean;
}

export const MessageMonitor = ({ history, isSending }: MonitorProps) => {
  // אנחנו מציגים את כל ההיסטוריה שנרשמה. 
  // הלוגיקה ב-page.tsx תדאג לרשום רק מההמתנה השנייה ואילך.
  if (history.length === 0 && !isSending) return null;

  return (
    <div className="mt-3 p-4 bg-white border rounded shadow-sm" style={{ direction: 'rtl' }}>
      <h5 style={{ fontSize: '20px', marginBottom: '30px', color: '#333', fontWeight: 'bold', textAlign: 'center' }}>
          ניטור זמני המתנה (בשניות)
      </h5>
      
      <div className="d-flex align-items-end justify-content-start" style={{ 
          height: '220px', 
          gap: '15px', 
          overflowX: 'auto', 
          paddingBottom: '5px', 
          borderBottom: '2px solid #eee',
          paddingLeft: '30px',
          paddingRight: '30px'
      }}>
        {history.map((item, i) => (
          <div key={i} className="d-flex flex-column align-items-center" style={{ minWidth: '50px' }}>
            {/* זמן המתנה אמיתי שנמדד */}
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                {item.delay}s
            </span>
            
            <div 
              style={{
                width: '32px', 
                height: `${Math.min(item.delay * 2.5, 150)}px`, 
                backgroundColor: item.type === 'coffee' ? '#6f42c1' : (item.type === 'milestone' ? '#fd7e14' : '#198754'),
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.4s ease-out',
                marginBottom: '0px' 
              }} 
            />
            
            {/* מספר ההודעה - מתחיל מ-2 */}
            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#555' }}>{i + 2}</span>
            </div>
          </div>
        ))}
        
        {isSending && (
          <div className="d-flex align-items-center justify-content-center" style={{ minWidth: '80px', height: '50px', marginBottom: '40px' }}>
            <div className="spinner-grow text-primary" role="status"></div>
          </div>
        )}
      </div>

      {/* מקרא מפורט */}
      <div className="d-flex justify-content-center gap-5 mt-4" style={{ fontSize: '15px', fontWeight: '600' }}>
        <div className="d-flex align-items-center gap-2">
            <span style={{width:'18px', height:'18px', backgroundColor:'#198754', borderRadius:'4px'}}></span> 
            המתנה רגילה (עד 15 שנ')
        </div>
        <div className="d-flex align-items-center gap-2">
            <span style={{width:'18px', height:'18px', backgroundColor:'#fd7e14', borderRadius:'4px'}}></span> 
            פאוזה יזומה (15-25 שנ')
        </div>
        <div className="d-flex align-items-center gap-2">
            <span style={{width:'18px', height:'18px', backgroundColor:'#6f42c1', borderRadius:'4px'}}></span> 
            הפסקת קפה ☕ (מעל 25 שנ')
        </div>
      </div>
    </div>
  );
};