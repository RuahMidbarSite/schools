"use client"
import React, { useCallback } from 'react'

import { CustomPicker } from 'react-color'
import { EditableInput, Hue } from 'react-color/lib/components/common'
import {Circle} from 'react-color/lib/components/circle/Circle'

export const CustomColorPicker = ({ colors, onChange }:{colors:string[],onChange:any}) => {
  
  const getCircle = useCallback(()=> {
  const res= colors.map((val)=> <button onClick={(event)=>onChange(val)} key={val} style={{background:`${val}`}} className="border-r-[50%] rounded-full w-[40px] h-[40px]"> </button>)
 return (
  <div className="flex flex-col">
   {res}
 </div>
 )


},[colors, onChange])
  
  return (
     <div className=" h-[200px] overflow-y-scroll relative z-[1]">
      {getCircle()}
     
    </div>
  )
}

export default CustomPicker(CustomColorPicker)