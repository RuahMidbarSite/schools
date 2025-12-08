import { useCallback } from "react";

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Button } from "@mui/material";


const useErrorValidationComponents = (setOpen, setDialogType, setDialogMessage, open, dialogType, dialogMessage): { handleClose: any, validateFields: any, ErrorModule: any } => {

  const handleClose = useCallback(() => {
    setOpen(false);
    setDialogType("");
    setDialogMessage("");
  }, [setDialogMessage, setDialogType, setOpen]);

  const validateCellphone = (cellphone: string) => {
    // Check if the cellphone contains only digits
    let isNumeric = /^\d+$/.test(cellphone);
    if (!isNumeric) {
      return false;
    }
    return true

  };

  const validateFields = useCallback((rowData: object, rowIndex, numbers) => {

    if (!rowData.hasOwnProperty("Schoolid")) {
      setDialogType("validationError");
      setDialogMessage(`אנא בחר בית ספר בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }
    if (!rowData.hasOwnProperty("FirstName")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא שם פרטי בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }
    if (!rowData.hasOwnProperty("Role")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא תפקיד בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }

    if (rowData["Cellphone"].charAt(0) === '0') {
      rowData["Cellphone"] = rowData["Cellphone"].substring(1)
    }
    console.log("Cellphone: ", rowData["Cellphone"]);

    if (!rowData.hasOwnProperty("Cellphone")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא טלפון בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    } else if (!validateCellphone(rowData["Cellphone"])) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון לא תקין בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    } else if (numbers.includes(rowData["Cellphone"])) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון קיים בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }

    return true;
  }, [setDialogMessage, setDialogType, setOpen]);


  const ErrorModule = useCallback(() => {
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

  }, [dialogMessage, dialogType, handleClose, open])


  return { handleClose: handleClose, validateFields: validateFields, ErrorModule: ErrorModule }

}


export default useErrorValidationComponents