

"use client"


import { Cities, Distances } from "@prisma/client"
import { createCities, deleteCities } from "./generalrequests"
import { createDistances, deleteDistances } from "./instructorsrequest"

const DistanceResource = "bc5293d3-1023-4d9e-bdbe-082b58f93b65"

/** This gives all the cities and junctions in israel with their codes */
const JunctionResource = "b282b438-0066-47c6-b11f-8277b3f5a0dc"
const address = "https://data.gov.il/api/3/action/datastore_search"
/**
  Distances taken from here : @link https://data.gov.il/dataset/distance/resource/bc5293d3-1023-4d9e-bdbe-082b58f93b65
  # ResourceID for Distances.ZIP : "bc5293d3-1023-4d9e-bdbe-082b58f93b65",
  # ResourceID for SETL_JUNC.ZIP : "b282b438-0066-47c6-b11f-8277b3f5a0dc"
  This function returns only the new possible additions.
 */
export const getAllNewOptions = async (ExistingOptions: Cities[]): Promise<{ _id: number, "סמל ישוב": number, "תיאור ישוב": string }[]> => {


    const options = {
        method: "GET"
    }
    let promise = fetch(address + `?resource_id=${JunctionResource}`, options)
        .then((response) => response.json())
        .then((data) => {
            const records: { _id: number, "סמל ישוב": number, "תיאור ישוב": string }[] = data.result.records;

            let citiesFilter: number[] = Array.isArray(ExistingOptions)
                ? ExistingOptions.map((value) => value.CityCode)
                : [];

            let filtered_records = records.filter((res) => !citiesFilter.includes(res["סמל ישוב"]));

            return filtered_records; // Return the filtered records
        })
        .catch((err) => {
            console.error(err);
            return []
        });
    return promise

}
/** Origin cities does not exist inside our city database.
 we add them and the distances between our existing cities and the new ones we get using the api.
 We use a route endpoint because the server require pre-flight because we posted with json body.
 */
export const AddCitiesDistances = async (DestinationCities: Cities[], OriginCities: { _id: number, "סמל ישוב": number, "תיאור ישוב": string }[], AllDistances: Distances[]): Promise<{ Distances: Distances[], Cities: Cities[] }> => {
    const url = '/api/Distances';
    
    // תיקון ה-ID (הקוד החדש)
    const maxId = DestinationCities.length > 0 
        ? Math.max(...DestinationCities.map(c => typeof c.Cityid === 'number' ? c.Cityid : 0)) 
        : 0;

   const new_entries: Cities[] = OriginCities.map((val: any, index: number) => {
        // אנחנו בודקים את כל האופציות לשמות השדות כדי לא לקבל NaN
        const cityCode = val["סמל ישוב"] || val.CityCode || val.cityCode || val.value;
        const cityName = val["תיאור ישוב"] || val.CityName || val.cityName || val.label;

        return { 
            Cityid: maxId + index + 1,
            CityCode: Number(cityCode), 
            CityName: String(cityName)
        };
    }) as Cities[];

    let validCodes = DestinationCities.map((val) => val.CityCode);
    let validNotExisting = OriginCities.map((val) => val["סמל ישוב"]);

    const filters = {
        "קוד מוצא": [...validCodes, ...validNotExisting],
        "קוד יעד": [...validNotExisting],
    };

    const requestBody = {
        resource_id: "bc5293d3-1023-4d9e-bdbe-082b58f93b65",
        filters: filters,
        limit: 1000,
        records_format: "objects"
    };

    const method = {
        body: JSON.stringify(requestBody), 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
    };

    try {
        const response = await fetch(url, method);
        const data = await response.json();
        const records = data.result.records || [];

        // יצירת רשימת המרחקים מהתוצאות (יכולה להיות ריקה וזה בסדר)
        const new_distances_list: Partial<Distances>[] = records.map((record: any) => ({
            OriginId: record["קוד מוצא"],
            DestinationId: record["קוד יעד"],
            Distance: record["מרחק ממרכז למרכז"]
        }));

        // **החלק החשוב**: אנחנו שומרים את הערים בכל מקרה, גם אם לא נמצאו מרחקים
        await createCities(new_entries);
        
        // שומרים מרחקים רק אם נמצאו כאלו
        if (new_distances_list.length > 0) {
            await createDistances(new_distances_list);
        }

        return {
            Distances: [...AllDistances, ...new_distances_list] as Distances[],
            Cities: [...DestinationCities, ...new_entries] as Cities[]
        };

    } catch (err) {
        console.error("Error in AddCitiesDistances:", err);
        // מחזירים את המצב הקיים כדי לא לשבור את האפליקציה
        return { Distances: AllDistances, Cities: DestinationCities };
    }
}


export const DeleteCitiesDitances = 
async (All_Cities: Cities[], Cities_To_Delete: { value: number, label: string }[],AllDistances:Distances[])=> {

let deleted_cities_city_codes= Cities_To_Delete.map((val)=>val.value)
let deleted_cities = All_Cities.filter((val)=>deleted_cities_city_codes.includes(val.CityCode))
let remaining_cities:Cities[] = All_Cities?.filter((val)=>!deleted_cities_city_codes.includes(val.CityCode))
let deleted_distances:Distances[] = AllDistances?.filter((val)=>deleted_cities_city_codes.includes(val.DestinationId) || deleted_cities_city_codes.includes(val.OriginId))
let remainig_distances:Distances[] = AllDistances?.filter((val)=>!deleted_cities_city_codes.includes(val.DestinationId) && !deleted_cities_city_codes.includes(val.OriginId))

return Promise.all([deleteCities(All_Cities,deleted_cities), deleteDistances(deleted_distances)]).then(()=> {

     return {Distances:remainig_distances, Cities:remaining_cities}

 })


}