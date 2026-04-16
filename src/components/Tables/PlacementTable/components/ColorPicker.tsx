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
  canClear?: boolean; 
}

const CLEAR_HEX = '#FFFFFF';
const CLEAR_MEANING = 'לא נבחר תוכנית';

const ColorPicker = ({ currentProgram, Colors, AllColorCandidates, onColorChange, canClear = false, ...props }: CellWithProgramNumber) => {
  const [Color, setColor] = useState({ background: CLEAR_HEX, meaning: CLEAR_MEANING })
  
  const ColorOptions: Partial<Colors>[] = useMemo(
    () => {
      let sortedColors = Colors ? [...Colors].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid) : [];
      
      if (canClear) {
          // Strip exact DB hexes for unassigned/white states to avoid duplication
          sortedColors = sortedColors.filter(c => {
              const hex = c.ColorHexCode ? String(c.ColorHexCode).trim().toLowerCase() : "";
              const meaning = c.ColorMeaning ? String(c.ColorMeaning).trim() : "";
              
              const isWhite = ['#ffffff', '#fff', 'white', '#f5f5f5'].includes(hex);
              const isUnassigned = ['לא נבחר תוכנית', 'לא נבחר תכנית', 'ללא תיוג'].includes(meaning);
              
              return !(isWhite || isUnassigned);
          });

          const clearOption = { 
              Colorid: -9999, 
              ColorHexCode: CLEAR_HEX, 
              ColorMeaning: CLEAR_MEANING 
          };
          
          return [clearOption, ...sortedColors];
      }
      
      return sortedColors;
    },
    [Colors, canClear]
  );

  const onClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!ColorOptions || ColorOptions.length === 0) return;

    const currentBg = String(Color.background).trim().toLowerCase();
    
    // Normalize 3-digit to 6-digit hex for accurate comparison
    const normalizeHex = (hex: string) => hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

    const currentIndex = ColorOptions.findIndex(c => {
        if (!c.ColorHexCode) return false;
        return normalizeHex(String(c.ColorHexCode).trim().toLowerCase()) === normalizeHex(currentBg);
    });
    
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % ColorOptions.length : 0;
    const nextColor = ColorOptions[nextIndex];

    if (!nextColor || !nextColor.ColorHexCode) return;

    const newHex = nextColor.ColorHexCode;
    let newMeaning = nextColor.ColorMeaning || "";

    const cleanHex = newHex.trim().toLowerCase();
    
    // Override DB legacy labels dynamically, including specific DB hex codes
    if (newMeaning === "לא מעוניין" || ['#ffe0a7', '#d3d3d3', '#cccccc'].includes(cleanHex)) {
        newMeaning = "לפנות";
    } else if (['לא נבחר תוכנית', 'לא נבחר תכנית', 'ללא תיוג'].includes(newMeaning) || ['#ffffff', '#fff', 'white', '#f5f5f5'].includes(cleanHex)) {
        newMeaning = CLEAR_MEANING;
    }

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
            setColor({ background: (props.data as any).aiAssignedColor, meaning: CLEAR_MEANING });
            if (props.setValue) props.setValue(CLEAR_MEANING);
            return; 
        }

        const ColorCandidate = AllColorCandidates?.find((res) => 
            res.Guideid === props.data.Guideid && res.Programid === currentProgram.value
        )
        
        let initialColorHex = CLEAR_HEX; 
        let initialMeaning = CLEAR_MEANING;

        if (ColorCandidate && ColorCandidate.ColorHexCode) {
            const candidateHex = ColorCandidate.ColorHexCode;
            
            const colorObj = Colors?.find((res) => 
                res.ColorHexCode && 
                String(res.ColorHexCode).trim().toLowerCase() === String(candidateHex).trim().toLowerCase()
            );
            
            initialColorHex = candidateHex;
            
            if (colorObj) {
                const cleanHex = initialColorHex.trim().toLowerCase();
                
                // Ensure dynamic override applies on mount
                if (colorObj.ColorMeaning === "לא מעוניין" || ['#ffe0a7', '#d3d3d3', '#cccccc'].includes(cleanHex)) {
                    initialMeaning = "לפנות";
                } else if (['לא נבחר תוכנית', 'לא נבחר תכנית', 'ללא תיוג'].includes(colorObj.ColorMeaning) || ['#ffffff', '#fff', 'white', '#f5f5f5'].includes(cleanHex)) {
                    initialMeaning = CLEAR_MEANING;
                } else {
                    initialMeaning = colorObj.ColorMeaning;
                }
            }
        }
        
        setColor({ background: initialColorHex, meaning: initialMeaning });
        
        if (props.setValue) {
            props.setValue(initialMeaning);
        }
      }
    }
    initColor()
  }, [currentProgram, AllColorCandidates, Colors, props.data]) 

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