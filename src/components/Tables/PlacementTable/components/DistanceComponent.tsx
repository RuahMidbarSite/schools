import { Cities, Distances, Guide, Program } from "@prisma/client";
import { ICellRendererParams } from 'ag-grid-community';
import { getImgProps } from "next/dist/shared/lib/get-img-props";
import { useEffect, useState } from "react";
interface DistanceComponent extends ICellRendererParams<Guide> {
    currentProgram: { label: '', value: -1 },
    Distances: Distances[],
    Cities: Cities[],
    Programs: Program[]
}


export const DistanceComponent = ({ Programs, Cities, Distances, currentProgram, getValue, setValue, ...props }: DistanceComponent) => {




    useEffect(() => {

        if (currentProgram.value !== -1) {
            const CityCode = Cities.find((city) => city.CityName === props.data.City)?.CityCode
           
            const this_program: Program = Programs.find((program) => program.Programid === currentProgram.value)
            if (this_program) {
                const ProgramCity = Cities.find((city) => city.CityName === this_program.CityName)
                  console.log(ProgramCity)
                if (ProgramCity?.CityCode === CityCode) {
                    setValue(0)
                    return
                }
                if (ProgramCity) {
                    const Programcode = ProgramCity['CityCode']
                    const distance = Distances?.find((distance) => (distance?.OriginId === CityCode && distance?.DestinationId === Programcode) || (distance.OriginId === Programcode && distance?.DestinationId === CityCode))
                    console.log('distance:',distance)
                    if (distance) {
                        setValue(Math.ceil(distance?.Distance))
                    }

                }



            }

        }






    }, [Cities, Distances, Programs, currentProgram.value, props.data.City, setValue])



    return (<div> {getValue()} </div>)

}

