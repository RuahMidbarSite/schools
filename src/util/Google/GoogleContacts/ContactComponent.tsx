"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import useInjectScript from "../useInjectScript";
import { authResult } from "../typeDefs";
import {
  Connection,
  ContactData,
  DeleteContactConfiguration,
  People,
  UpdateContactConfiguration,
  UploadContactConfiguration,
  callBackState,
  callBackdata,
  defaultuploadConfiguration,
  onlyAuth,
} from "./ContactTypes";
import { School, SchoolsContact } from "@prisma/client";
import { updateStorage } from "@/components/Auth/Storage/AuthContactsStorage";

declare let google: any;
declare let window: any;
const defaultScopes = ["https://www.googleapis.com/auth/contacts"];





export const useContactComponent = (): [
  (name: "upload" | "delete" | "update" | "onlyAuth") => (config: UploadContactConfiguration | UpdateContactConfiguration | onlyAuth) => any,
  authResult | undefined
] => {


  const [pickerApiLoaded, setpickerApiLoaded] = useState(false);
  const [openAfterAuth, setOpenAfterAuth] = useState(false);
  const [authWindowVisible, setAuthWindowVisible] = useState(false);
  const [authRes, setAuthRes] = useState<authResult>();

  const [tokenClient, setClient] = useState(null)
  const expiresInSeconds = useRef(0)

  const AuthAndActivate = useCallback(async (config: UploadContactConfiguration | UpdateContactConfiguration | onlyAuth, authResCallback: any, callBack: (args) => {}) => {

    const client = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: (config.customScopes
        ? [...defaultScopes, ...config.customScopes]
        : defaultScopes
      ).join(" "),
      callback: (tokenResponse: authResult) => {
        authResCallback(tokenResponse);
        callBack({ ...config, token: tokenResponse.access_token });
        expiresInSeconds.current = tokenResponse.expires_in

        updateStorage({ authResult: tokenResponse, timeStamp: Date.now() })

      },
    });
    // we could also use only () since the default is consent
    client.requestAccessToken({ prompt: "consent" });
    setClient(client)
  }, [])

  useEffect(() => {

    if (tokenClient == null || expiresInSeconds.current == 0) {
      return
    }
    // Function to request a new access token
    const refreshToken = () => {
      console.log('Refreshing token...');
      tokenClient.requestAccessToken({ prompt: '' }); // Silent refresh
    };

    // Set up an interval to refresh the token one minute before expiration
    const interval = setInterval(() => {
      refreshToken();
    }, expiresInSeconds.current * 1000 - 60000); // one minute before expiration.

    // Initial refresh immediately when the component mounts
    refreshToken();

    // Cleanup function to clear the interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [tokenClient]);
  // get the apis from googleapis
  useEffect(() => {
    if (!pickerApiLoaded) {
      loadApis();
      setpickerApiLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gapiInted = useCallback(async () => {

    await gapi.client.init({
      apiKey: process.env.developerKey,
      clientId: process.env.clientId,
      discoveryDocs: ["https://people.googleapis.com/$discovery/rest?version=v1"],
    }).then(() => {

    })

  }, [])

  // load the Drive picker api
  const loadApis = useCallback(() => {
    if (window.gapi) {
      window.gapi.load("client", gapiInted);
    }

  }, [gapiInted]);

  const OnlyAuth = useCallback(async (config) => {
    AuthAndActivate(config, setAuthRes, () => null)

  }, [AuthAndActivate])

  const getAllContacts = () => {
    let nextToken = null





  }

  const getContacts = useCallback(async (pageToken: string) => {
    return gapi.client.people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 100,
      personFields: 'names,emailAddresses,phoneNumbers',
      pageToken: pageToken,

    })

  }, [])

  /** Finds if the contact already exist */
  const filterContacts = useCallback((data: ContactData, connections: gapi.client.people.Person[]) => {
    if (!connections) { return [] }
    // Filter contacts based on search criteria
    const foundContacts = connections?.filter((person: any) => {
      const nameMatches = data.name && person.names?.some((n: any) => n.displayName.includes(data.name));
      const emailMatches = data.emailAddress && person.emailAddresses?.some((e: any) => e.value === data.emailAddress);
      const phoneMatches = data.cellPhone !== '' && person.phoneNumbers?.some((p: any) => p.value === data.cellPhone);
      return nameMatches || emailMatches || phoneMatches;
    });
    return foundContacts

  }, [])

  const findContact = useCallback(async (new_contact_info: ContactData): Promise<gapi.client.people.Person[]> => {
    let pageToken = null
    let res;
    let result = [];
    do {
      res = await getContacts(pageToken)
      // Extract connections and next pageToken
      const connections = res.result.connections || [];
      pageToken = res.result.nextPageToken;
      // Filter contacts
      result = filterContacts(new_contact_info, connections);

      // If result is found, break out of the loop
      if (result.length > 0) {
        break;
      }
    } while (pageToken)
    return result

  }, [filterContacts, getContacts])

  const uploadContact = useCallback(async ({
    token,
    clientId,
    developerKey,
    customScopes = ["https://www.googleapis.com/auth/contacts"],
    data,
    callbackFunction = () => { },
  }: UploadContactConfiguration) => {
    // Set the access token for gapi client requests
    gapi.client.setToken({ access_token: token });

    gapi.client.request({
      method: "POST",
      path: 'https://people.googleapis.com/v1/people:createContact',
      body: {
        "names": [{ givenName: data?.name }],
        "emailAddresses": [{ value: data?.emailAddress }],
        "phoneNumbers": [{ value: data?.cellPhone }],
      }
    }).then((res) => {
      if (res.status === 200) {
        const new_contact: gapi.client.people.Person = res.result
        var ResourceName: string = new_contact.resourceName;
        const resourceName = ResourceName.replace("people", "person");
        const obj: callBackdata = {
          resourceName: resourceName,
          state: callBackState.Success,
        };
        callbackFunction(obj);
      }


    })







    return;
  }, [])

  const deleteContact = useCallback(async ({
    token,
    clientId,
    developerKey,
    customScopes = ["https://www.googleapis.com/auth/contacts"],
    data,
    callbackFunction = (res) => { },
  }) => {
    // Set the access token for gapi client requests
    gapi.client.setToken({ access_token: token });
    console.log('deleting contact...')
    const dat: SchoolsContact = data.row
    const resourceName = data.row.GoogleContactLink?.substring(dat.GoogleContactLink.indexOf("person/") + 7)
    // invalid data
    if (resourceName[0] !== 'c') {
      return
    }

    gapi.client.request({
      method: "DELETE",
      path: `https://people.googleapis.com/v1/people/${resourceName}:deleteContact`,
    }).then((res) => {

      if (res.status === 200) {
        console.log('deleted successfully..')
        callbackFunction(res);
      }


    })

  }, [])
  /** Easy way to create the name without the need to check if null or not for every entry */
  const createName = useCallback((contact: SchoolsContact, school: School) => {
    var new_name: string[] = []
    new_name.push(contact.FirstName)
    new_name.push(contact.Role)
    new_name.push(school.EducationStage)
    new_name.push(school.SchoolName)
    new_name.push(school.City)

    return new_name.join(' ')


  }, [])

  const updateContact = useCallback(async ({
    token,
    clientId,
    developerKey,
    customScopes = ["https://www.googleapis.com/auth/contacts"],
    data,
    callbackFunction = (res) => { },
  }: UpdateContactConfiguration) => {
    // Set the access token for gapi client requests
    gapi.client.setToken({ access_token: token });

    console.log('updating contact...')

    const dat: SchoolsContact = data.row
    const school: School = data.school

    const resourceName = data.row.GoogleContactLink.substring(dat.GoogleContactLink.indexOf("person/") + 7)
    // invalid data
    if (resourceName[0] !== 'c') {
      return
    }

    gapi.client.people.people.get({
      resourceName: `people/${resourceName}`,
      personFields: 'names,phoneNumbers,emailAddresses'
    }).then((res) => {
      if (res.status === 200) {
        const contact: gapi.client.people.Person = res.result
        const new_name = createName(dat, school)

        gapi.client.request({
          method: "PATCH",
          path: `https://people.googleapis.com/v1/people/${resourceName}:updateContact?updatePersonFields=names%2CphoneNumbers%2CemailAddresses`,
          body: {
            etag: contact.etag,
            names: [{ givenName: new_name }],
            emailAddresses: [{ value: dat.Email }],
            phoneNumbers: [{ value: dat.Cellphone }],
          }
        }).then((res) => {

          if (res.status === 200) {
            console.log('updated successfully')
            callbackFunction(res);
          }


        })


      }


    })


  }, [createName])
  const getFunction = useCallback((name: "upload" | "delete" | "update" | "onlyAuth"): any => {
    if (name === "upload") {
      return uploadContact

    }
    if (name === "delete") {

      return deleteContact
    }

    if (name === "update") {

      return updateContact
    }
    if (name === "onlyAuth") {
      return OnlyAuth
    }

  }, [OnlyAuth, deleteContact, updateContact, uploadContact])

  const AuthenticateActivate = useCallback((name: "upload" | "delete" | "update" | "onlyAuth") => {
    const func = (config: UploadContactConfiguration | UpdateContactConfiguration | DeleteContactConfiguration | DeleteContactConfiguration | onlyAuth) => {
      const callback = getFunction(name)
      if (name === "onlyAuth") {
        callback(config)
      }
      else if (config && !config.token) {
        AuthAndActivate(config, setAuthRes, callback)
      }
      else {
        callback(config)
      }

    }
    return func


  }, [AuthAndActivate, getFunction])

  return [AuthenticateActivate, authRes];
};

