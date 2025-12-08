"use client"
import ProgramsTable from "@/components/Tables/ProgramsTable/ProgramsTable"
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
interface SearchParamsResult {
  ids: number[];
}

const fetchSearchParams = (searchParams: ReturnType<typeof useSearchParams>): Promise<SearchParamsResult | null> => {
  return new Promise((resolve) => {
    const {ids} = JSON.parse(searchParams.get('ids'))

    if (ids) {
      resolve({ ids: ids });
    } else {
      resolve(null);
    }
  });
}

const ProgramHandler = () => {

 const router = useRouter();
  const searchParams = useSearchParams();
  const [numberArray, setNumberArray] = useState([]);
  const [Loaded,setLoaded]= useState(false)
  useEffect(() => {
    fetchSearchParams(searchParams).then((response) => {
      const {ids} = response
      setNumberArray([...ids] )
      setLoaded(true)

    })

  }, [searchParams]);
  


  return Loaded&&<ProgramsTable SchoolIDs={numberArray}/>


}


const ProgramPopUp = () => {
  


  return (
      <Suspense>
     <ProgramHandler/>
   </Suspense>
  )

}


export default ProgramPopUp