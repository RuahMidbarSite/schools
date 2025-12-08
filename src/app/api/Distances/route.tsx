
export const dynamic = 'force-dynamic' // defaults to auto

/**
  We use the route to handle the  pre-flight request from the api server.
 */ 

export async function POST(req:Request) {
    const url = 'https://data.gov.il/api/3/action/datastore_search';
     return req.json().then((requestBody)=> {
               return fetch(url,{
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody), // Send the request body to the external API
        }).then((response)=>response.json().then((data)=> {

              return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            },
        });

      }))

 
    })
      
       

    
}