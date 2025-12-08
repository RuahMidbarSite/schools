

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
export const AddCitiesDistances = async (DestinationCities: Cities[], OriginCities: { _id: number, "סמל ישוב": number, "תיאור ישוב": string }[],AllDistances:Distances[]):Promise<{Distances:Distances[],Cities:Cities[]}> => {
    const url = '/api/Distances';
    // Unlike the other tables, this starts from 1.
    const city_amounts = DestinationCities.length
    // First, we create from each new city a city entry.
    const new_entries: Partial<Cities>[] = OriginCities.map((val, index) => ({ CityCode: val["סמל ישוב"], CityName: val["תיאור ישוב"], Cityid: city_amounts + index + 1 }))



    let validCodes = DestinationCities.map((val) => val.CityCode)
    let validNotExisting = OriginCities.map((val) => val["סמל ישוב"])
    // if we add more than one city, we need to also calculate the distances between the new cities.
    const filters = {
        "קוד מוצא": [...validCodes, ...validNotExisting],
        "קוד יעד": [...validNotExisting],

    };

    const requestBody = {
        resource_id: "bc5293d3-1023-4d9e-bdbe-082b58f93b65",
        filters: filters,
        q: "",
        distinct: true,
        plain: true,
        limit: 1000,
        offset: 0,
        fields: [],
        sort: "",
        include_total: true,
        records_format: "objects"
    };
    const method = {
        body: JSON.stringify(requestBody), method: 'POST', headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
        },
    }

    return fetch(url, method).then(async (response) =>response.json().then((data)=> {

        let records: { _id: string, "קוד יעד": number, "קוד מוצא": number, "רדיוס יעד": number, "מרחק ממרכז למרכז": number, "רדיוס מוצא": number }[] = data.result.records
            // now we create the distances entry.
            let new_distances_list: Partial<Distances>[] = []
            for (const record of records) {
                let new_distance: Partial<Distances> = { OriginId: record["קוד מוצא"], DestinationId: record["קוד יעד"], Distance: record["מרחק ממרכז למרכז"] }
                new_distances_list.push(new_distance)

            }
           

            return Promise.all([createCities(new_entries), createDistances(new_distances_list)]).then(async (_) => {
                let p = AllDistances
                return {Distances:[...AllDistances,...new_distances_list] as Distances[],Cities:[...DestinationCities,...new_entries] as Cities[]}
            })

        }).catch((err) => {
            return {Distances:[] as Distances[],Cities:[] as Cities[]}
         
        }))

       
    
           







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