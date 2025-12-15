"use client"
import { setColorCandidate } from '@/db/instructorsrequest';
import { ICellRendererParams } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorCandidate, Colors, Guide } from '@prisma/client';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { updateStorage } from '../Storage/PlacementDataStorage';

interface CellWithProgramNumber extends ICellRendererParams<Guide> {
  currentProgram: { label: '', value: -1 },
  Colors: Colors[],
  AllColorCandidates: ColorCandidate[]
}

const ColorPicker = ({ currentProgram, Colors, AllColorCandidates, ...props }: CellWithProgramNumber) => {
  // סטייט לצבע התצוגה הנוכחי
  const [Color, setColor] = useState({ displayColorPicker: false, background: '#F5F5F5', meaning: "לא נבחר תכנית" })
  
  // יצירת רשימת צבעים ממוינת (עם העתקה כדי למנוע מוטציה של הפרופס)
  const ColorOptions: Colors[] = useMemo(
    () => {
      return Colors ? [...Colors].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid) : []
    },
    [Colors]
  );

  // הערה: הסרנו את התלות ב-Index עבור ה-onClick כדי למנוע באגים של סנכרון

  const onClick = useCallback((event) => {
    // מונע אירועים מתנגשים בטבלה
    event.stopPropagation(); 

    // 1. מציאת האינדקס של הצבע *הנוכחי* מתוך הרשימה
    const currentHex = Color.background;
    const currentIndex = ColorOptions.findIndex(c => c.ColorHexCode === currentHex);

    let nextIndex = 0;

    // 2. לוגיקת המעבר
    if (currentIndex === -1) {
        // אם הצבע הנוכחי לא נמצא ברשימה (כלומר הוא אפור/ברירת מחדל), נתחיל מהראשון
        nextIndex = 0;
    } else {
        // אחרת, מתקדמים לאינדקס הבא בצורה מעגלית
        nextIndex = (currentIndex + 1) % ColorOptions.length;
    }

    // 3. שליפת הצבע החדש
    const nextColor = ColorOptions[nextIndex];
    
    // הגנה למקרה שאין צבעים
    if (!nextColor) return;

    // 4. עדכון מיידי של התצוגה (אופטימי)
    setColor({ displayColorPicker: false, background: nextColor.ColorHexCode, meaning: nextColor.ColorMeaning });

    // 5. עדכון השרת והסטורג'
    setColorCandidate(props.data.Guideid, currentProgram.value, nextColor.ColorHexCode).then((res) => {
      let color_candidates = []
      let old_entry = false
      for (let candidate of AllColorCandidates) {
        if (candidate.Guideid === props.data.Guideid && candidate.Programid === currentProgram.value) {
          // יצירת עותק כדי למנוע בעיות הפניה
          let entry = { ...candidate }
          entry.ColorHexCode = nextColor.ColorHexCode
          color_candidates.push(entry)
          old_entry = true
        } else {
          color_candidates.push(candidate)
        }
      }
      
      const updated_candidates = old_entry ? color_candidates : [...color_candidates, res].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid)
      updateStorage({ ColorCandidates: updated_candidates })
    })

  }, [Color.background, ColorOptions, currentProgram, props.data.Guideid, AllColorCandidates]) // תלות ב-Color.background קריטית כאן

  // useEffect לסנכרון ראשוני ושינויים מבחוץ
  useEffect(() => {
    const initColor = async () => {
      if (props.data.Guideid) {
        const ColorCandidate = AllColorCandidates.find((res) => res.Guideid === props.data.Guideid && res.Programid === currentProgram.value)
        
        // ברירת מחדל (אפור)
        let initialColorHex = '#F5F5F5';
        let initialMeaning = "לא נבחר תכנית";

        if (ColorCandidate) {
            const color = Colors.find((res) => res.ColorHexCode === ColorCandidate.ColorHexCode)
            if (color) {
                initialColorHex = ColorCandidate.ColorHexCode;
                initialMeaning = color.ColorMeaning;
            }
        }
        
        // עדכון הסטייט של הצבע
        setColor(prev => ({ ...prev, background: initialColorHex, meaning: initialMeaning }));
        
        if (props.setValue) {
            props.setValue(initialMeaning);
        }
      }
    }
    initColor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProgram, AllColorCandidates, Colors])

  // פונקציית הרינדור - כוללת תיקון לשגיאת ה-OverlayTrigger
  const getPicker = useCallback(() => {
    return (
      <OverlayTrigger
        // שימוש ב-Key מכריח רענון של הטולטיפ כשהצבע משתנה
        key={Color.background} 
        placement="left"
        overlay={<Tooltip id={`tooltip-${props.data.Guideid}`} className="absolute">{Color.meaning}</Tooltip>}
      >
        <button
          style={{ background: Color.background }}
          className="border-r-[50%] rounded-full w-[40px] h-[40px] relative z-0 focus:outline-none"
          onClick={onClick}
        />
      </OverlayTrigger>
    )
  }, [Color, onClick, props.data.Guideid])

  return getPicker();
}

export default ColorPicker;