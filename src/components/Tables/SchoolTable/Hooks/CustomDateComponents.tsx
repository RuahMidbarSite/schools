import { useCallback } from "react"



const useCustomDateComponents = ():{valueParserDate:any,valueFormatterDate:any}=> {



  const valueParserDate = useCallback((params) => {
    console.log(params)
    return new Date(params.newValue)
  }, [])
   const valueFormatterDate = useCallback((params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [])



  return {valueParserDate:valueParserDate,valueFormatterDate:valueFormatterDate}


}


export default useCustomDateComponents