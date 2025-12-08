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
    setDialogType('');
    setDialogMessage('');
  },[setDialogMessage, setDialogType, setOpen]);

  const validateFields = useCallback((rowData: object, rowIndex) => {
    if (!rowData.hasOwnProperty('SchoolName')) {
      setDialogType('validationError');
      setDialogMessage(`נא הכנס שם בית ספר בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }
    if (!rowData.hasOwnProperty('EducationStage')) {
      setDialogType('validationError');
      setDialogMessage(`נא הכנס שלב חינוך בשורה ${rowIndex}`)
      setOpen(true);
      return false
    }
    if (!rowData.hasOwnProperty('City')) {
      setDialogType('validationError');
      setDialogMessage(`נא הכנס עיר בשורה ${rowIndex}`)
      setOpen(true);
      return false
    }

    return true;

  }, [setDialogMessage, setDialogType, setOpen])


   const ErrorModule = useCallback(()=> {
        return (

               <Dialog open={open} onClose={handleClose}>
        {dialogType === 'validationError' && (
          <>
            <DialogTitle>{"Input Error"}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {dialogMessage}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
        {dialogType === 'success' && (
          <>
            <DialogTitle>{"Success"}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {dialogMessage}
              </DialogContentText>
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