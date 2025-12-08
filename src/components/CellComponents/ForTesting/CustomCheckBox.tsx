import { randomInt } from "crypto";
import React, { useEffect, useState } from "react";

export const CustomCheckboxRenderer = (props: any) => {

  const [checked, Updatecheck] = useState(false);

  const onCheckboxChange = (event:any) => {
       
    if (!checked) {
      props.node.setDataValue("boolean", true);
      Updatecheck(true);
      return;
    }
    props.node.setDataValue("boolean", false);
    Updatecheck(false);
  };
   
 const onHeaderCheckBoxChange = (event:any) => {
    
    props.node.setDataValue("boolean", event.data);
   Updatecheck(event.data)

 }

  useEffect(() => {
    props.api.addEventListener('HeaderCheckboxChanged',(event:any)=> onHeaderCheckBoxChange(event));
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[] );
  
  return (
    <input type="checkbox" checked={checked} onChange={onCheckboxChange} />
  );
};
