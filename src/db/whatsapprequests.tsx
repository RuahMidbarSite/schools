"use client"


/** If you send a PatternID, if file was added just takes the file, else will check if the pattern file is saved(it will be check at the server.) */
export const sendMessageViaWhatsApp = async (message_1: string,message_2:string,addedFile:File, cellPhone: string, countryCode: string,PatternID?:number) => {
     const req_address:string = "https://".concat(process.env.NEXT_PUBLIC_IP_ADDRESS,"/SendMessage")
      
  
     if (cellPhone[0] === "0") {
       cellPhone = cellPhone.substring(1);
     
    // Add the country code to the phone number
    var fullPhoneNumber = `${countryCode}${cellPhone}@c.us`;

    const formData = new FormData();
  
  if (fullPhoneNumber) formData.append('PhoneNumber', fullPhoneNumber);
if (message_1) formData.append('Message_1', message_1);
if (message_2) formData.append('Message_2', message_2);
if (addedFile) formData.append('file', addedFile);
if (PatternID) formData.append('PatternID', String(PatternID));

    

    const options = {method:"POST",body:formData}
fetch(req_address,options).then(async (response) => {
    if(response.status !== 200) {
        console.error('Error: ',response.json())
     }
    else {
          console.log('success')
          // do something?
 
     }
      

 })
  
  }
  
}
  

export const savePatternFile = async (PatternID:number,addedFile:File) => {
   const req_address:string = "https://".concat(process.env.NEXT_PUBLIC_IP_ADDRESS,`/SavePatternFile/${PatternID}`)
   if(!addedFile) {
   return

 }

   const formData = new FormData();
   formData.append('file', addedFile);
  
   const options = {method:"POST",body:formData}

  fetch(req_address,options).then(async (response) => {
    if(response.status !== 200) {
        console.error('Error: ',response.json())
     }
    else {
          console.log('success')
          // do something?
 
     }
      

 })



}

export const deletePatternFile = async (PatternID:number) => {
  const req_address:string = "https://".concat(process.env.NEXT_PUBLIC_IP_ADDRESS,`/DeletePatternFile/${PatternID}`)


    const options = {method:"DELETE"}
   
  fetch(req_address,options).then(async (response) => {
    if(response.status !== 200) {
        console.error('Error: ',response.json())
     }
    else {
          console.log('success')
          // do something?
 
     }



})
}

