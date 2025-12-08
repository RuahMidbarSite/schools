import Script from "next/script";
import { Suspense } from "react"
import Spinner from 'react-bootstrap/Spinner';

 
// i am adding suspense in the layout because one of the pages is composed of serveral different data-calling components.
export default function DashboardLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode
}) {
  return (
    <section className="h-full overflow-hidden flex flex-col">    
      <Script src="https://apis.google.com/js/api.js" strategy='afterInteractive' />
      <Script src="https://accounts.google.com/gsi/client" strategy='afterInteractive' />
      <Suspense fallback={<Spinner animation="border" role="status" className="ml-[50%] mt-[300px] w-[200px] h-[200px]" />}> 
      {children}
     </Suspense> 
    </section>
  )
}


// const model: any = await getModelFields("Program");

//     const initialColDefs = [
//       ...model[0]?.map((value: any, index: any) => ({
//         field: value,
//         headerName: model[1][index], // or use He_name[index] if needed
//         valueGetter:
//           value === "TotalLessonNumbers"
//             ? (params: ICellRendererParams) => {
//                 const totalLessons =
//                   params.data.FreeLessonNumbers + params.data.PaidLessonNumbers;
//                 return totalLessons;
//               }
//             : value === "FinalPrice"
//             ? (params: ICellRendererParams) => {
//                 const totalPrice =
//                   params.data.PaidLessonNumbers *
//                   params.data.PricingPerPaidLesson;
//                 return totalPrice;
//               }
//             : undefined,

//         editable: value === "Programid" ? false : true,

//         cellRenderer: value === "Programid" ? "CustomMasterGrid" : undefined,
//         rowDrag: value === "Programid" ? true : undefined,

//         cellEditor:
//           value === "CheckDate" || value === "IssuingDate"
//             ? "agDateCellEditor"
//             : value === "Programid" ||
//               value === "Schoolid" ||
//               value === "FreeLessonNumbers" ||
//               value === "PaidLessonNumbers" ||
//               value === "FinalPrice"
//             ? "agNumberCellEditor"
//             : "agTextCellEditor",
//       })),
//       {
//         headerName: "",
//         cellRenderer: DeleteButtonRenderer,
//         width: 100,
//         suppressMenu: true,
//       },
//     ];
//     console.log(initialColDefs);

//     setInitialColDefs(initialColDefs);
//   };