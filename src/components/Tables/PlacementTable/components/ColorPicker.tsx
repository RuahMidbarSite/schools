"use client"
import { getColorCandidate, setColorCandidate } from '@/db/instructorsrequest';
import { ICellRendererParams } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CirclePicker } from 'react-color';
import CustomColorPicker from './CustomColorPicker';
import { ColorCandidate, Colors, Guide } from '@prisma/client';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { updateStorage } from '../Storage/PlacementDataStorage';

interface CellWithProgramNumber extends ICellRendererParams<Guide> {
  currentProgram: { label: '', value: -1 },
  Colors: Colors[],
  AllColorCandidates: ColorCandidate[]
}
const ColorPicker = ({ currentProgram, Colors, AllColorCandidates, ...props }: CellWithProgramNumber) => {
  const [Color, setColor]: [{ displayColorPicker: boolean, background: string, meaning: string }, any] = useState({ displayColorPicker: false, background: '#F5F5F5', meaning: "לא נבחר תכנית" })
  const [Loaded, setLoaded] = useState(false)

  const ColorOptions: Colors[] = useMemo(
    () => {
      return Colors.sort((arg1, arg2) => arg1.Colorid - arg2.Colorid) ? Colors : []
    },
    [Colors]
  );

  //  const [ColorOptions, setColorOptions] = useState(['#4D4D4D',"#FF0000", '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#FCDC00', '#DBDF00', '#A4DD00', '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF', '#333333', '#808080', '#cccccc', '#D33115', '#E27300', '#FCC400', '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF', '#000000', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FB9E00', '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E'])
  const [Index, setIndex] = useState<number>(0)
  const onChange = useCallback((color: any) => {
    setColor({ displayColorPicker: false, background: color.hex })
    setColorCandidate(props.data.Guideid, currentProgram.value, color.hex)
  }, [currentProgram, props])



  const onClick = useCallback((event) => {

    var new_color_index = Index + 1
    if (new_color_index >= ColorOptions.length) {
      new_color_index = 0
    }
    const color = ColorOptions[new_color_index]

    setIndex(Index => Index + 1 >= ColorOptions.length ? 0 : Index + 1)

    setColor({ displayColorPicker: false, background: color.ColorHexCode, meaning: color.ColorMeaning })
    setColorCandidate(props.data.Guideid, currentProgram.value, color.ColorHexCode).then((res) => {
      let color_candidates = []
      let old_entry = false
      for (let candidate of AllColorCandidates) {
        if (candidate.Guideid === props.data.Guideid && candidate.Programid === currentProgram.value) {
          let entry = candidate
          entry.ColorHexCode = color.ColorHexCode
          color_candidates.push(entry)
          old_entry = true
        } else {
          color_candidates.push(candidate)
        }
      }
      let updated_candidates = old_entry ? color_candidates : [...color_candidates, res].sort((arg1, arg2) => arg1.Colorid - arg2.Colorid)
      updateStorage({ ColorCandidates: updated_candidates })

    })


  }, [ColorOptions, Index, currentProgram, props.data.Guideid, AllColorCandidates])



  useEffect(() => {

    const getColor = async () => {
      if (props.data.Guideid && Color.displayColorPicker === false) {
        const ColorCandidate: ColorCandidate = AllColorCandidates.find((res) => res.Guideid === props.data.Guideid && res.Programid === currentProgram.value)
        const color = Colors.find((res) => res.ColorHexCode === ColorCandidate?.ColorHexCode)
        if (color) {
          setColor({ displayColorPicker: Color.displayColorPicker, background: ColorCandidate?.ColorHexCode, meaning: color.ColorMeaning })
          props.setValue(color.ColorName)
          // this is for index
          const index: number = ColorOptions.findIndex((res) => res.ColorHexCode === ColorCandidate?.ColorHexCode)
          setIndex(index != -1 ? index : 0)

          setLoaded(true)
        }

      }
    }
    getColor()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProgram, AllColorCandidates])


  const getPicker = useCallback(() => {
    return (
      <OverlayTrigger key={Color.background} placement={"left"} overlay={<Tooltip className="absolute">{Color.meaning}</Tooltip>}>

        <button style={{ background: Color.background }} className="border-r-[50%] rounded-full w-[40px] h-[40px] relative z-0" onClick={onClick} />
      </OverlayTrigger>
    )

    // else {
    //   return (
    //        <CustomColorPicker colors={ColorOptions} onChange={onChange}/> 

    //   )

    // }

  }, [Color, onClick])





  return (
    getPicker()

  )



}
export default ColorPicker