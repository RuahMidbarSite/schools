import { useCallback } from "react";

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Button } from "@mui/material";


const useErrorValidationComponents = (setOpen,setDialogType,setDialogMessage,open,dialogType,dialogMessage):{handleClose:any,validateFields:any,ErrorModule:any}=> {

    const handleClose = useCallback(() => {
    setOpen(false);
    setDialogType("");
    setDialogMessage("");
  },[setDialogMessage, setDialogType, setOpen])

  const validateCellphone = (cellphone: string) => {
      const formatted_cellPhone = cellphone.replace('+972', '').replace(/[-\s]/g, '');
    // Check if the cellphone contains only digits
    let isNumeric = /^\d+$/.test(formatted_cellPhone);
    if (!isNumeric) {
      return false; // Not all characters are digits
    }

    // Check the length based on whether it starts with '0' or not
    if (formatted_cellPhone.startsWith("0")) {
      return formatted_cellPhone.length === 10;
    } else {
      return formatted_cellPhone.length === 9;
    }
  };

  const validateFields = useCallback((rowData: object, rowIndex) => {
    if (!rowData.hasOwnProperty("FirstName")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא שם פרטי בשורה ${rowIndex+1}`);
      setOpen(true);
      return false;
    }
    if (!rowData.hasOwnProperty("Role")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא תפקיד בשורה ${rowIndex+1}`);
      setOpen(true);
      return false;
    }
    if (!rowData.hasOwnProperty("Cellphone")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא טלפון בשורה ${rowIndex+1}`);
      setOpen(true);
      return false;
    } else if (!validateCellphone(rowData["Cellphone"])) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון לא תקין בשורה ${rowIndex+1}`);
      setOpen(true);
      return false;
    }

    return true;
  }, [setDialogMessage, setDialogType, setOpen]);


  const ErrorModule = useCallback(()=> {
        return (
<Dialog open={open} onClose={handleClose}>
         {dialogType === "validationError" && (
           <>
             <DialogTitle>{"Input Error"}</DialogTitle>
             <DialogContent>
               <DialogContentText>{dialogMessage}</DialogContentText>
            </DialogContent>
             <DialogActions>
               <Button onClick={handleClose}>Close</Button>
             </DialogActions>
           </>
         )}
         {dialogType === "success" && (
           <>
             <DialogTitle>{"Success"}</DialogTitle>
            <DialogContent>
               <DialogContentText>{dialogMessage}</DialogContentText>
             </DialogContent>
             <DialogActions>
               <Button onClick={handleClose}>Close</Button>
             </DialogActions>
           </>
         )}
       </Dialog>
         )

    },[dialogMessage, dialogType, handleClose, open])


    return {handleClose:handleClose,validateFields:validateFields,ErrorModule:ErrorModule}
   
}


export default useErrorValidationComponents