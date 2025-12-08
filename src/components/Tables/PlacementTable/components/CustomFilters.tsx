"use client"

import { getAllProfessions, getModelFields } from "@/db/generalrequests"
import { Profession } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useEffect, useState } from "react"

type Data = {
RightApi?:GridApi|null
Professions?:Profession[]
setProfession?:any
setFilter:any
}
const CustomFilter = (data:Data)=> {

const [Filter, setFilter] = useState([])
const [filterFlag, setFilterFlag] = useState(0)

useEffect(()=> {
     const getProfessions =async ()=> {
           if(data.setFilter && Filter.length == 0) {
              getModelFields("Profession").then((mat)=> { 
                 const res = mat[1].map((val,index)=> ({eng_value:mat[0][index],value:val, active:false}))
                 setFilter(res)
                 data.setFilter(res)
          }) 
       }
          

     }
        getProfessions()
   
    },[Filter.length, data])


 const onClick = (val:{eng_value:string, value:string, active:boolean}) => {
  var k = Filter

  for( const index in  k) {
   if(k[index].value===val.value) {
        
        k[index].active= !val.active
        break
    }
    
 }
  setFilter(k)
  data.setFilter(k)
  setFilterFlag(()=>filterFlag === 0 ? 1: 0)

  
  data.RightApi.onFilterChanged()
}



return (

    <div key={filterFlag}>{Filter.map((val:{eng_value:string,value:string,active:boolean})=> <button onClick={(event)=>onClick(val)} className={`${ val.active === false? 'bg-gray-500':'bg-red-200'} hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow w-[50px]`} key={val.value}> {val.value} </button>)}  </div>
 )

}

export default CustomFilter