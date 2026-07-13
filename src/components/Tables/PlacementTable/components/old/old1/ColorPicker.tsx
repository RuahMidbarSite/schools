"use client"
import { setColorCandidate } from '@/db/instructorsrequest';
import { ICellRendererParams } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorCandidate, Colors, Guide } from '@prisma/client';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface CellWithProgramNumber extends ICellRendererParams<Guide> {
  currentProgram: { label: '', value: -1 },
  Colors: Colors[],
  AllColorCandidates: ColorCandidate[],
  onColorChange?: (guideId: number, programId: number, newColorHex: string) => void;
  canClear?: boolean; // דגל שמאפשר את איפוס הצבע
}

// צבע לבן נקי כברירת מחדל לניקוי
const CLEAR_HEX = '#FFFFFF';
const CLEAR_MEANING = 'ללא תיוג';

const ColorPicker = ({ currentProgram, Colors, AllColorCandidates, onColorChange, canClear = false, ...props }: CellWithProgramNumber) => {
  // התחלה עם צבע ברירת מחדל אם אין מידע
  const [Color, setColor] = useState({ background: CLEAR_HEX, meaning: "לא נבחר תכנית" })
  
  const ColorOptions: Partial<Colors>[] = useMemo(
    () => {
      // 1. מיון הצבעים הרגילים
      const sortedColors = Colors ? [...Colors].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid) : [];
      
      // 2. אם מותר לנקות (צד ימין), נוסיף את הלבן לראש הרשימה
      if (canClear) {
          const clearOption = { 
              Colorid: -9999, 
              ColorHexCode: CLEAR_HEX, 
              ColorMeaning: CLEAR_MEANING 
          };
          
          // מוודאים שלא מוסיפים כפילות אם הלבן כבר קיים בבסיס הנתונים
          const exists = sortedColors.some(c => c.ColorHexCode && c.ColorHexCode.toLowerCase() === CLEAR_HEX.toLowerCase());
          
          if (!exists) {
              return [clearOption, ...sortedColors];
          }
      }
      
      return sortedColors;
    },
    [Colors, canClear]
  );

  const onClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // מונע בחירת שורה בטבלה

    if (!ColorOptions || ColorOptions.length === 0) return;

    // נרמול הצבע הנוכחי להשוואה (אותיות קטנות)
    const currentBg = String(Color.background).toLowerCase();
    
    // חיפוש המיקום הנוכחי
    const currentIndex = ColorOptions.findIndex(c => c.ColorHexCode && String(c.ColorHexCode).toLowerCase() === currentBg);
    
    // חישוב האינדקס הבא (מעגלי). אם לא נמצא, מתחילים מ-0 (שהוא הלבן אם canClear=true)
    let nextIndex = 0;
    if (currentIndex !== -1) {
        nextIndex = (currentIndex + 1) % ColorOptions.length;
    }
    
    const nextColor = ColorOptions[nextIndex];

    if (!nextColor || !nextColor.ColorHexCode) return;

    const newHex = nextColor.ColorHexCode;
    const newMeaning = nextColor.ColorMeaning || "";

    // 1. עדכון ויזואלי מידי
    setColor({
        background: newHex,
        meaning: newMeaning
    });

    // 2. עדכון מסד הנתונים
    setColorCandidate(props.data.Guideid, currentProgram.value, newHex);
    
    // 3. עדכון הטבלה הראשית (חשוב!)
    if (onColorChange) {
        onColorChange(props.data.Guideid, currentProgram.value, newHex);
    }

    if (props.setValue) {
       props.setValue(newMeaning);
    }

  }, [Color.background, ColorOptions, currentProgram.value, props.data.Guideid, onColorChange, props.setValue]);

  useEffect(() => {
    const initColor = () => {
      if (currentProgram && currentProgram.value !== -1) {
        const ColorCandidate = AllColorCandidates?.find((res) => 
            res.Guideid === props.data.Guideid && res.Programid === currentProgram.value
        )
        
        let initialColorHex = CLEAR_HEX; // ברירת מחדל לבן
        let initialMeaning = "לא נבחר תכנית";

        if (ColorCandidate && ColorCandidate.ColorHexCode) {
            const candidateHex = ColorCandidate.ColorHexCode;
            
            const colorObj = Colors?.find((res) => 
                res.ColorHexCode && 
                String(res.ColorHexCode).toLowerCase() === String(candidateHex).toLowerCase()
            );
            
            initialColorHex = candidateHex;
            if (colorObj) {
                initialMeaning = colorObj.ColorMeaning;
            }
        }
        
        setColor({ background: initialColorHex, meaning: initialMeaning });
        
        if (props.setValue) {
            props.setValue(initialMeaning);
        }
      }
    }
    initColor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProgram, AllColorCandidates, Colors, props.data.Guideid]) 

  const getPicker = useCallback(() => {
    return (
      <OverlayTrigger
        key={Color.background} 
        placement="left"
        overlay={<Tooltip id={`tooltip-${props.data.Guideid}`} className="absolute">{Color.meaning}</Tooltip>}
      >
        <button
          style={{ background: Color.background }}
          // הוספתי border-gray-400 ו-shadow כדי שיראו את העיגול גם כשהוא לבן
          className="border-2 border-gray-300 rounded-full w-[30px] h-[30px] cursor-pointer hover:border-gray-500 transition-all shadow-sm mx-auto block"
          onClick={onClick} 
        />
      </OverlayTrigger>
    );
  }, [Color, onClick, props.data.Guideid])

  return (
    <div className="flex justify-center items-center h-full w-full">
      {getPicker()}
    </div>
  )
}

export default ColorPicker