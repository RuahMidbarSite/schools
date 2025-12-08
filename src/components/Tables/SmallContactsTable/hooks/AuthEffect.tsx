import { AuthContactsStore, getFromStorage } from "@/components/Auth/Storage/AuthContactsStorage"
import { getInfo } from "@/db/instructorsrequest"
import { useCallback } from "react"



const useAuthEffect = (AuthenticateActivate):{authEffect:any } => {

const checkAuth =useCallback(async ()=> {
         const checkDiffInMili = (Stamp:number) => {
          return Date.now() - Stamp
    }
      
        var timeStamp:number = undefined
        const hour = 60 * 60 * 1000
         var diff:number = 0
         getFromStorage().then(async ({authResult,timeStamp}:AuthContactsStore)=> {
                diff = checkDiffInMili(timeStamp)
               if(!(authResult&&timeStamp)|| diff >hour) {
                            const info = await getInfo()
                    const authFunc =  AuthenticateActivate("onlyAuth")
                    authFunc({clientId:info.clientId,developerKey:info.developerKey})


                     }


            })
        
       
     
   },[AuthenticateActivate])
   
   return {authEffect:checkAuth }

}

export default useAuthEffect