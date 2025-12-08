
import Redirect from '@/components/Auth/Components/Redirect';
import SchoolsTable from '@/components/Tables/SchoolTable/schooltable';
import { getModelFields } from '@/db/generalrequests';





export default async function SchoolsPage() {
   console.log("renders schoolsPage")

   return (

      <SchoolsTable />

   )
}

