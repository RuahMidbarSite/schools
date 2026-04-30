"use client"
import { setColorCandidate } from '@/db/instructorsrequest';
import { ICellRendererParams } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorCandidate, Colors, Guide } from '@prisma/client';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface CellWithProgramNumber extends ICellRendererParams<Guide> {
  currentProgram: { label: string, value: number },
  Colors: Colors[],
  AllColorCandidates: ColorCandidate[],
  onColorChange?: (guideId: number, programId: number, newColorHex: string) => void;
  canClear?: boolean; 
}

const CLEAR_HEX = '#FFFFFF';

const ColorPicker = ({ currentProgram, Colors, AllColorCandidates, onColorChange, canClear = false, ...props }: CellWithProgramNumber) => {
  
  // 1. הגדרת משמעות הצבע הלבן בהתאם לטבלה (ימין = לא נבחר לתוכנית, שמאל = מועמד)
  const WHITE_MEANING = canClear ? 'לא נבחר לתוכנית' : 'מועמד';

  const [Color, setColor] = useState({ background: CLEAR_HEX, meaning: WHITE_MEANING })
  
  const ColorOptions = useMemo(() => {
      const options = [];
      
      // מצב התחלתי (לבן) לשתי הטבלאות
      options.push({
          ColorHexCode: CLEAR_HEX,
          ColorMeaning: WHITE_MEANING
      });

      if (!canClear) {
          // --- סבב צבעים מותאם אישית לטבלה השמאלית ---

          // פונקציית עזר למציאת צבע מהמסד (לפי משמעות ישנה או גיבוי של צבע)
          const findHex = (meanings: string[], fallbacks: string[]) => {
              const found = Colors?.find(c => meanings.includes(c.ColorMeaning || "") || fallbacks.includes(c.ColorHexCode?.toLowerCase() || ""));
              return found?.ColorHexCode || fallbacks[0];
          };

          // לחיצה 1: צבע אפור -> "פניתי" (מחליף את "רלוונטי"/"לפנות")
          const grayColor = findHex(['רלוונטי', 'לפנות'], ['#d3d3d3', '#cccccc', '#a0aec0', '#e2e8f0']);
          options.push({ ColorHexCode: grayColor, ColorMeaning: 'פניתי' });
          
          // לחיצה 2: צבע ירוק -> "אולי" (מחליף את "בהמתנה")
          const greenColor = findHex(['בהמתנה'], ['#90ee90', '#4caf50', '#00ff00', '#4ade80']);
          options.push({ ColorHexCode: greenColor, ColorMeaning: 'אולי' });

         // לחיצה 3: הצבע הקיים (לרוב צהוב/כתום) -> "לפנות"
          const existingPniti = findHex(['פניתי'], ['#ffe0a7', '#fde047', '#fef08a', '#ffb6c1']);
          if (existingPniti !== grayColor) {
              options.push({ ColorHexCode: existingPniti, ColorMeaning: 'לפנות' });
          } else {
              options.push({ ColorHexCode: '#ffe0a7', ColorMeaning: 'לפנות' }); // למקרה שזהה לאפור
          }

          // לחיצה 4: צבע כחול -> "מועמד מוביל"
          const blueColor = findHex(['מועמד מוביל'], ['#add8e6', '#2196f3', '#0000ff', '#3b82f6', '#bfdbfe']);
          options.push({ ColorHexCode: blueColor, ColorMeaning: 'מועמד מוביל' });

      } else {
          // --- סבב צבעים רגיל לטבלה הימנית (מסד נתונים) ---
          let sortedColors = Colors ? [...Colors].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid) : [];
          sortedColors = sortedColors.filter(c => {
              const hex = c.ColorHexCode ? String(c.ColorHexCode).trim().toLowerCase() : "";
              const meaning = c.ColorMeaning ? String(c.ColorMeaning).trim() : "";
              
              const isWhite = ['#ffffff', '#fff', 'white', '#f5f5f5'].includes(hex);
              const isUnassigned = ['לא נבחר לתוכנית', 'לא נבחר תכנית', 'ללא תיוג'].includes(meaning);
              
              return !(isWhite || isUnassigned);
          });
          
          sortedColors.forEach(c => {
              options.push({ ColorHexCode: c.ColorHexCode, ColorMeaning: c.ColorMeaning });
          });
      }
      
      // סינון כפילויות צבע כדי למנוע צורך בלחיצה כפולה על אותו צבע
      const uniqueOptions = [];
      const seen = new Set();
      for (const opt of options) {
          const hex = String(opt.ColorHexCode).trim().toLowerCase();
          if (!seen.has(hex)) {
              seen.add(hex);
              uniqueOptions.push(opt);
          }
      }

      return uniqueOptions;
  }, [Colors, canClear, WHITE_MEANING]);

  const onClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!ColorOptions || ColorOptions.length === 0) return;

    const currentBg = String(Color.background).trim().toLowerCase();
    
    const normalizeHex = (hex: string) => hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

    const currentIndex = ColorOptions.findIndex(c => {
        if (!c.ColorHexCode) return false;
        return normalizeHex(String(c.ColorHexCode).trim().toLowerCase()) === normalizeHex(currentBg);
    });
    
    // מעבר לצבע הבא במערך (או חזרה להתחלה)
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % ColorOptions.length : 0;
    const nextColor = ColorOptions[nextIndex];

    if (!nextColor || !nextColor.ColorHexCode) return;

    const newHex = nextColor.ColorHexCode;
    const newMeaning = nextColor.ColorMeaning || "";

    setColor({ background: newHex, meaning: newMeaning });
    setColorCandidate(props.data.Guideid, currentProgram.value, newHex);
    
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
        if (props.data && (props.data as any).aiAssignedColor) {
            setColor({ background: (props.data as any).aiAssignedColor, meaning: WHITE_MEANING });
            if (props.setValue) props.setValue(WHITE_MEANING);
            return; 
        }

        const ColorCandidate = AllColorCandidates?.find((res) => 
            res.Guideid === props.data.Guideid && res.Programid === currentProgram.value
        )
        
        let initialColorHex = CLEAR_HEX; 
        let initialMeaning = WHITE_MEANING;

        if (ColorCandidate && ColorCandidate.ColorHexCode) {
            initialColorHex = ColorCandidate.ColorHexCode;
            
            // בדיקה אם הצבע נמצא בסבב המותאם כדי לתת לו את התווית המעודכנת (כמו "אולי" במקום "בהמתנה")
            const mappedOption = ColorOptions.find(o => 
                String(o.ColorHexCode).trim().toLowerCase() === String(initialColorHex).trim().toLowerCase()
            );
            
            if (mappedOption) {
                initialMeaning = mappedOption.ColorMeaning;
            } else {
                // גיבוי מהמסד הכללי אם הצבע חריג
                const colorObj = Colors?.find((res) => 
                    res.ColorHexCode && 
                    String(res.ColorHexCode).trim().toLowerCase() === String(initialColorHex).trim().toLowerCase()
                );
                if (colorObj) initialMeaning = colorObj.ColorMeaning;
            }
        }
        
        setColor({ background: initialColorHex, meaning: initialMeaning });
        
        if (props.setValue) {
            props.setValue(initialMeaning);
        }
      }
    }
    initColor()
  }, [currentProgram, AllColorCandidates, Colors, props.data, ColorOptions, WHITE_MEANING]) 

  const getPicker = useCallback(() => {
    return (
      <OverlayTrigger
        key={Color.background} 
        placement="left"
        overlay={<Tooltip id={`tooltip-${props.data.Guideid}`} className="absolute">{Color.meaning}</Tooltip>}
      >
        <button
          style={{ background: Color.background }}
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