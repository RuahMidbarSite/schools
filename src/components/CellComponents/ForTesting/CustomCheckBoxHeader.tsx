import { randomInt } from "crypto";
import React, { useState } from "react";

export const HeaderCustomCheckboxRenderer = (props: any) => {
  const [checked, Updatecheck] = useState(false);

  const onCheckboxChange = (event: any) => {


    if (!checked) {
      const boxevent = {
        type: "HeaderCheckboxChanged",
        data: true,
      };

     Updatecheck(true);
      props.api.dispatchEvent(boxevent);
      return;
    }
  const boxevent_2 = {
        type: "HeaderCheckboxChanged",
        data: false,
      };

    Updatecheck(false);
    props.api.dispatchEvent(boxevent_2);

  };

  return (
    <input type="checkbox" checked={checked} onChange={onCheckboxChange} />
  );
};
