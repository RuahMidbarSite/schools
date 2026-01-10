"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { authResult } from "../typeDefs";
import {
  UpdateContactConfiguration,
  UploadContactConfiguration,
  callBackdata,
} from "./ContactTypes";
import { updateStorage } from "@/components/Auth/Storage/AuthContactsStorage";

declare let google: any;
declare let window: any;

const defaultScopes = [
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/drive.file"
];

const SESSION_KEYS = {
    CONTACTS: 'google_token_contacts',
    PLANS: 'google_token_plans',
    GUIDES: 'google_token_guides',
    SCHOOLS: 'google_token_schools', 
    DEFAULT: 'google_token_default'
};

// 🔥 פונקציה חדשה לשמירה בשרת
const saveTokenToServer = async (token: string, type: string = 'contacts') => {
  try {
    const response = await fetch('/api/google/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, type }),
    });
    
    if (!response.ok) {
      console.error('Failed to save token to server');
    } else {
      console.log('✅ Token saved to server successfully');
    }
  } catch (error) {
    console.error('Error saving token to server:', error);
  }
};

export const useContactComponent = (): [
  (name: "upload" | "delete" | "update" | "onlyAuth" | "create_contact" | "update_contact" | "delete_contact", contextId?: string) => (config: any) => any,
  authResult | undefined
] => {

  const [authRes, setAuthRes] = useState<authResult>();
  const tokenClientRef = useRef<any>(null);
  
  const stopRefreshRef = useRef(false);

  const pendingAction = useRef<{
      config: any, 
      callback: (config: any) => void,
      contextKey: string
  } | null>(null);

  const initClient = useCallback(() => {
    if (typeof window === "undefined" || !window.google || tokenClientRef.current) return;

    const envClientId = process.env.NEXT_PUBLIC_CLIENT_ID || process.env.clientId;
    if (!envClientId) return;

    try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: envClientId,
          scope: defaultScopes.join(" "),
          callback: async (tokenResponse: authResult) => { // 🔥 הוספתי async
            if (tokenResponse && tokenResponse.access_token) {
              setAuthRes(tokenResponse);
              stopRefreshRef.current = false;
              updateStorage({ authResult: tokenResponse, timeStamp: Date.now() });

              // 🔥 שמירה בשרת!
              await saveTokenToServer(tokenResponse.access_token, 'contacts');

              if (pendingAction.current) {
                  const { config, callback, contextKey } = pendingAction.current;
                  sessionStorage.setItem(contextKey, tokenResponse.access_token);
                  const configWithToken = { ...config, token: tokenResponse.access_token };
                  callback(configWithToken);
                  pendingAction.current = null;
              }
            } else {
               console.error("Token response invalid", tokenResponse);
            }
          },
        });
        tokenClientRef.current = client;
    } catch (error) {
        console.error("Google Client Init Error:", error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        if (typeof window !== "undefined" && window.google) {
            initClient();
            clearInterval(interval);
        }
    }, 200);
    return () => clearInterval(interval);
  }, [initClient]);

  const gapiInted = useCallback(async () => {
    const apiKey = process.env.developerKey || process.env.NEXT_PUBLIC_API_KEY; 
    const clientId = process.env.clientId || process.env.NEXT_PUBLIC_CLIENT_ID;

    if (!window.gapi) return;

    await gapi.client.init({
      apiKey: apiKey,
      clientId: clientId,
      discoveryDocs: [
        "https://people.googleapis.com/$discovery/rest?version=v1",
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
      ],
    }).then(() => console.log("GAPI Loaded")).catch(err => console.error("GAPI Error", err));
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.gapi) {
       window.gapi.load("client", gapiInted);
    }
  }, [gapiInted]);

  useEffect(() => {
    if (!tokenClientRef.current || stopRefreshRef.current) return;

    const refreshToken = async () => { // 🔥 הוספתי async
        if (stopRefreshRef.current) return;
        
        try {
            console.log("Attempting silent refresh...");
            tokenClientRef.current.requestAccessToken({ prompt: '' });
            
            // 🔥 אחרי רענון, שמור שוב בשרת
            const savedToken = sessionStorage.getItem(SESSION_KEYS.CONTACTS);
            if (savedToken) {
              await saveTokenToServer(savedToken, 'contacts');
            }
        } catch (err) {
            console.error("Refresh failed, stopping auto-refresh to prevent loop.", err);
            stopRefreshRef.current = true;
        }
    };

    const interval = setInterval(refreshToken, 45 * 60 * 1000); 
    return () => clearInterval(interval);
  }, [authRes]);


  const AuthAndActivate = useCallback((config: any, callbackToRun: (args: any) => void, contextId: string = 'default') => {
    
    let storageKey = SESSION_KEYS.DEFAULT;
    if (contextId === 'contacts') storageKey = SESSION_KEYS.CONTACTS;
    if (contextId === 'plans') storageKey = SESSION_KEYS.PLANS;
    if (contextId === 'guides') storageKey = SESSION_KEYS.GUIDES;
    if (contextId === 'schools') storageKey = SESSION_KEYS.SCHOOLS;

    const savedToken = sessionStorage.getItem(storageKey);
    
    if (savedToken) {
        callbackToRun({ ...config, token: savedToken });
        return;
    }

    if (!tokenClientRef.current) {
        initClient();
        if (!tokenClientRef.current) {
             alert("מערכת עדיין נטען, נסה שוב בעוד רגע.");
             return;
        }
    }

    pendingAction.current = { config, callback: callbackToRun, contextKey: storageKey };
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });

  }, [initClient]);

  // --- Implementation Functions ---
  
  const onlyAuthImpl = useCallback(async ({ token, callbackFunction = () => { } }: any) => {
    console.log("✅ onlyAuth completed with token");
    
    // 🔥 שמירה בשרת
    await saveTokenToServer(token, 'contacts');
    
    if (callbackFunction) {
      callbackFunction({ token, success: true });
    }
  }, []);

  const createContactImpl = useCallback(async ({ token, data, callbackFunction = () => { } }: UploadContactConfiguration) => {
    gapi.client.setToken({ access_token: token });
    try {
        const res = await gapi.client.request({
          method: "POST",
          path: 'https://people.googleapis.com/v1/people:createContact',
          body: {
            "names": [{ givenName: data?.name }],
            "emailAddresses": [{ value: data?.emailAddress }],
            "phoneNumbers": [{ value: data?.cellPhone }],
          }
        });
        const resourceName = res.result.resourceName.replace("people", "person");
        callbackFunction({ resourceName: resourceName, state: 0 });
    } catch (err: any) { 
        console.error("Create Contact Error", err); 
        if(err.status === 401) {
            alert("פג תוקף החיבור. אנא רענן את הדף והתחבר מחדש.");
            sessionStorage.clear();
        } else {
            alert("שגיאה ביצירת איש קשר: " + (err.result?.error?.message || "Unknown error")); 
        }
    }
  }, [])

  const deleteContactImpl = useCallback(async ({ token, data, callbackFunction = (res) => { } }) => {
    gapi.client.setToken({ access_token: token });
    let resourceName = data.row.GoogleContactLink;
    if (resourceName && resourceName.includes("person/")) {
        resourceName = resourceName.substring(resourceName.indexOf("person/") + 7);
    }
    if (!resourceName || !resourceName.startsWith('c')) return;

    try {
        const res = await gapi.client.request({
            method: "DELETE",
            path: `https://people.googleapis.com/v1/people/${resourceName}:deleteContact`,
        });
        if (res.status === 200 || res.status === 204) callbackFunction(res);
    } catch (err) { console.error("Delete Error", err); }
  }, [])

  const updateContactImpl = useCallback(async ({ token, data, callbackFunction = (res) => { } }: UpdateContactConfiguration) => {
    gapi.client.setToken({ access_token: token });
     const dat = data.row;
     const school = data.school;
     let resourceName = dat.GoogleContactLink;
     if (resourceName.includes("person/")) resourceName = resourceName.substring(resourceName.indexOf("person/") + 7);
     
     gapi.client.people.people.get({
       resourceName: `people/${resourceName}`,
       personFields: 'names,phoneNumbers,emailAddresses'
     }).then((res) => {
         const contact = res.result;
         let new_name = dat.FirstName; 
         if(school) new_name += " " + school.SchoolName;
         
         gapi.client.request({
           method: "PATCH",
           path: `https://people.googleapis.com/v1/people/${resourceName}:updateContact?updatePersonFields=names%2CphoneNumbers%2CemailAddresses`,
           body: {
             etag: contact.etag,
             names: [{ givenName: new_name }],
             emailAddresses: [{ value: dat.Email }],
             phoneNumbers: [{ value: dat.Cellphone }],
           }
         }).then((res2) => callbackFunction(res2));
     });
  }, []);

  const uploadFileImpl = useCallback(async ({ token, data, callbackFunction = () => { } }: any) => {
    const file = data.file;
    const metadata = { name: file.name, mimeType: file.type, parents: data.parents || [] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + token }),
      body: form,
    }).then((res) => res.json()).then((val) => callbackFunction(val));
  }, []);

  const deleteFileImpl = useCallback(async ({ token, data, callbackFunction = () => {} }: any) => {
      const fileId = data.fileId || data.id; 
      if(!fileId) return;
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
      }).then(res => { if (res.status === 204 || res.status === 200) callbackFunction(res); });
  }, []);

  const getFunction = useCallback((name: string): any => {
    if (name === "onlyAuth") return onlyAuthImpl;
    if (name === "create_contact") return createContactImpl;
    if (name === "delete_contact") return deleteContactImpl;
    if (name === "update_contact") return updateContactImpl;
    if (name === "upload") return uploadFileImpl;
    if (name === "delete") return deleteFileImpl;
    return null;
  }, [onlyAuthImpl, createContactImpl, deleteContactImpl, updateContactImpl, uploadFileImpl, deleteFileImpl]);

  const AuthenticateActivate = useCallback((name: any, contextId: string = 'default') => {
    return (config: any) => {
      const callback = getFunction(name);
      if (callback) {
          if (config && config.token) {
              callback(config);
          } else {
              AuthAndActivate(config, callback, contextId);
          }
      } else {
          console.error(`Function ${name} not found!`);
      }
    }
  }, [AuthAndActivate, getFunction]);

  return [AuthenticateActivate, authRes];
};