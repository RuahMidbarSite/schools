import { School } from "@prisma/client";
import { ICellRenderer, ICellRendererParams } from "ag-grid-community"
import { CustomCellRendererProps } from "ag-grid-react";
import { useCallback, useState } from "react";
import { MdExpandCircleDown } from "react-icons/md"

interface CellWithExpandedInfo extends ICellRendererParams<School> {
    grid_expanded: boolean,
    /**  this is because we can enter here from a child table. */
    father_expanded_node_set: (boolean) => void,
    father_redrawRows: () => void,
    father_node_set_row_height: (number) => void,
}


const ExpandMasterGridComponent = ({ father_node_set_row_height, father_redrawRows, father_expanded_node_set, grid_expanded, node, api, ...props }: CellWithExpandedInfo) => {


    const onClick = useCallback(() => {
        if (!grid_expanded) {
            node.setExpanded(true)
            node.setRowHeight(600)
            api.redrawRows()
        } else {
            if (father_expanded_node_set && father_redrawRows && father_node_set_row_height) {
                father_expanded_node_set(false)
                father_node_set_row_height(42)
                father_redrawRows()
            }
            node.setExpanded(false)
            node.setRowHeight(42)
            //api.redrawRows()
        }

    }, [node, api, father_expanded_node_set, father_node_set_row_height, father_redrawRows, grid_expanded]);


    const getButton = () => {
        if (grid_expanded) {
            return (<button onClick={onClick} className="float-left mt-[10px] ">
                <MdExpandCircleDown className="w-[30px] h-[30px]  fill-slate-500 hover:fill-slate-300" />
            </button>)

        } else {
            return (<button onClick={onClick} className="float-left mt-[10px] ">
                <MdExpandCircleDown className="w-[30px] h-[30px] rotate-90 fill-slate-500 hover:fill-slate-300" />
            </button>)

        }

    }

    return (
        <div>
            {props.data.Schoolid}
 
            {getButton()}
        </div>


    )


}
export default ExpandMasterGridComponent