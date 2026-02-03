"use client"

import { updateProfessions } from "@/db/instructorsrequest";
import { Guide } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import { forwardRef, useCallback, useMemo } from "react"
import Select from "react-select";

interface ProfessionOption {
  label: string;
  value: string;
}

interface ChooseProfessionsProps extends ICellEditorParams<Guide> {
  professionsList?: ProfessionOption[];
}

// eslint-disable-next-line react/display-name
export const ChooseProfessions = forwardRef((props: ChooseProfessionsProps, ref: any) => {
  
  // רק מקצועות מבסיס הנתונים - ללא fallback
  const Choices: any = useMemo(() => {
    if (!props.professionsList || props.professionsList.length === 0) {
      return [];
    }
    return props.professionsList;
  }, [props.professionsList]);

  const defaultValues: any = useMemo(() => {
    if (typeof props.data.Professions !== null) {
      if (props.data.Professions) {
        const r: string[] = props.data.Professions?.split(",");
        return r?.map((r) => ({
          label: r,
          value: Choices?.filter((val) => val.label === r)[0]?.value
        }));
      }
      return null;
    }
  }, [Choices, props.data.Professions]);

  const onChange = useCallback((event: { label: string, value: string }[]) => {
    const prof: string[] = event.map((val) => val.label);
    const eng: string[] = [...event.map((val) => val.value)];
    
    if (prof.length > 0) {
      props.node.setDataValue("Professions", prof.join(','));
      //updateProfessions(eng, true, props.data.Guideid);
    } else {
      props.node.setDataValue("Professions", '');
    }
  }, [props.node]);

    return (
    <div className="absolute overflow-y-visible z-1 w-[200px]">
      <Select
        isMulti
        closeMenuOnSelect={false}
        className="basic-multi-select"
        classNamePrefix="select"
        placeholder="בחר מקצועות"
        isRtl={true}
        classNames={{
          control: () => "rounded-md bg-[#12242E]",
          multiValueLabel: (data) => "border-[white] border-[2px] bg-white",
          menuList: () => "",
          menuPortal: () => "",
          placeholder: () => "bg-[#4075be] text-white text-center",
          multiValue: () => "",
          option: () => "hover:bg-sky-700 bg-neutral-300 text-center",
          menu: () => "",
          container: () => "",
        }}
        menuPlacement={"auto"}
        menuPosition={"fixed"}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        noOptionsMessage={() => "אין מקצועות זמינים"}
        autoFocus={true}
        openMenuOnFocus={true}
        options={Choices}
        defaultValue={defaultValues}
        controlShouldRenderValue={true}
        isSearchable={true}
        onChange={onChange}
      />
    </div>
  );
});