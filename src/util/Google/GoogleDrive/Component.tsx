"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  authResult,
  defaultConfiguration,
  FolderID,
  PickerConfiguration,
  files,
  list,
  folderStructure,
} from "../typeDefs";
import useInjectScript from "../useInjectScript";
import useFolderFunctions from "./FolderFunctions";
import { getInfo } from "@/db/instructorsrequest";
import { StoreAuthDriveGuides } from "@/offlineStorage/authStorage";
import { updateStorage as UpdateProgramsAuthStorage } from "@/components/Auth/Storage/AuthDrivePrograms";
import { updateStorage as UpdateGuidesAuthStorage } from "@/components/Auth/Storage/AuthDriveGuides";

declare let google: any;
declare let gapi: any;

let cachedSessionToken: string | null = null;

// 🔥 פונקציה חדשה לשמירה בשרת
const saveTokenToServer = async (token: string, type: 'guides' | 'programs') => {
  try {
    const response = await fetch('/api/google-drive/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, type }),
    });
    
    if (!response.ok) {
      console.error('Failed to save Drive token to server');
    } else {
      console.log(`✅ Drive token saved to server successfully (${type})`);
    }
  } catch (error) {
    console.error('Error saving Drive token to server:', error);
  }
};


export default function useDrivePicker(input_type: "Guide" | "Program"):
  (name: "delete" | "open" | "OnlyAuth") => (config: any) => any {
  
  const defaultScopes = useMemo(() => [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file"
  ], []);

  const [pickerApiLoaded, setpickerApiLoaded] = useState(false);
  const [Config, setConfig] = useState<PickerConfiguration>(defaultConfiguration);
  const [authRes, setAuthRes] = useState<authResult>();
  
  const [loaded, error] = useInjectScript("https://apis.google.com/js/api.js");
  const [loadedGsi, errorGsi] = useInjectScript("https://accounts.google.com/gsi/client");
  
  const [type, setType] = useState<"Guide" | "Program">(input_type)
  let picker = useRef(null)
  
  const tokenClientRef = useRef<any>(null);
  const expiresInSeconds = useRef(0)
  
  useEffect(() => {
    if (!pickerApiLoaded && loaded && loadedGsi) {
      loadApis();
    }
  }, [loaded, loadedGsi]);

  const gapiInted = useCallback(async () => {
    if (typeof gapi === 'undefined') return;
    await gapi.client.init({
      apiKey: process.env.NEXT_PUBLIC_DEVELOPER_KEY,
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    }).then(() => {
      console.log("Gapi initialized successfully");
      if (gapi.client.getToken()) {
          cachedSessionToken = gapi.client.getToken().access_token;
      }
    })
  }, [])
  
  const onPickerApiLoad = async () => {
    setpickerApiLoaded(true);
  };

  const loadApis = useCallback(() => {
    if (typeof window !== 'undefined' && window.gapi) {
      window.gapi.load("client", gapiInted);
      window.gapi.load("picker", { callback: onPickerApiLoad });
      setpickerApiLoaded(true)
    }
  }, [gapiInted]);

  const AuthAndActivate = useCallback(async (config: PickerConfiguration, callBack: (args) => {}) => {
    if (typeof google === 'undefined' || !google.accounts) return;

    if (!tokenClientRef.current) {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: config.clientId || process.env.NEXT_PUBLIC_CLIENT_ID,
          scope: (config.customScopes ? [...defaultScopes, ...config.customScopes] : defaultScopes).join(" "),
          callback: async (tokenResponse: authResult) => { // 🔥 הוספתי async
            if (tokenResponse.access_token) {
                cachedSessionToken = tokenResponse.access_token;
                
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                }

                // 🔥 שמירה בשרת!
                const serverType = type === "Program" ? "programs" : "guides";
                await saveTokenToServer(tokenResponse.access_token, serverType);
            }

            callBack({ ...config, token: tokenResponse.access_token });
            
            if (type === "Program") {
              expiresInSeconds.current = tokenResponse.expires_in
              UpdateProgramsAuthStorage({ authResult: tokenResponse, timeStamp: Date.now() })
            } else {
              expiresInSeconds.current = tokenResponse.expires_in
              UpdateGuidesAuthStorage({ authResult: tokenResponse, timeStamp: Date.now() })
            }
          },
        });
    }
    
    tokenClientRef.current.requestAccessToken({ prompt: '' }); 
  }, [defaultScopes, type])

  const { searchFolder, createFolder, findOrCreateFolder } = useFolderFunctions()

  const createFolderStructure = useCallback(async (config: { token: string, developerKey: string, folderStructure: folderStructure }) => {
    const structure: string[] = config.folderStructure.parents_folders_by_left_to_right_order
    var promise = Promise.resolve(null)
    for (const [index, folderName] of structure.entries()) {
      if (index == 0) {
        promise = promise.then(() => findOrCreateFolder(folderName, null, config))
      } else {
        promise = promise.then((folderId) => findOrCreateFolder(folderName, folderId, config))
      }
    }
    return await promise
  }, [findOrCreateFolder])

  const createPicker = useCallback(async ({
    token, appId = "", developerKey, viewId = "DOCS", disabled, showUploadView = false,
    showUploadFolders, viewMimeTypes, customViews, locale = "he", setIncludeFolders,
    setSelectFolderEnabled, disableDefaultView = false, callbackFunction, folderStructure, setOrigin,
  }: PickerConfiguration) => {
    if (disabled) return false;
    const apiKeyToUse = developerKey || process.env.NEXT_PUBLIC_DEVELOPER_KEY;

    createFolderStructure({ token: token, developerKey: apiKeyToUse, folderStructure: folderStructure }).then((lastParentID) => {
      if (typeof google === 'undefined' || !google.picker) return;

      const view = new google.picker.DocsView(google.picker.ViewId[viewId]);
      if (viewMimeTypes) view.setMimeTypes(viewMimeTypes);
      if (setIncludeFolders) view.setIncludeFolders(true);
      if (setSelectFolderEnabled) view.setSelectFolderEnabled(true);

      const uploadView = new google.picker.DocsUploadView();
      if (viewMimeTypes) uploadView.setMimeTypes(viewMimeTypes);
      uploadView.setParent(lastParentID);
      if (showUploadFolders) uploadView.setIncludeFolders(true);

      picker.current = new google.picker.PickerBuilder()
        .setAppId(appId)
        .setOAuthToken(token)
        .setDeveloperKey(apiKeyToUse)
        .setLocale(locale)
        .setCallback(callbackFunction);

      if (setOrigin) picker.current.setOrigin(setOrigin);
      if (showUploadView) picker.current.addView(uploadView);
      if (!disableDefaultView) picker.current.addView(view);
      if (customViews) picker.current.map((view) => picker.current.addView(view));

      picker.current.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      picker.current.enableFeature(google.picker.Feature.MINE_ONLY);
      picker.current.build().setVisible(true);
      return true;
    })
  }, [createFolderStructure]);

  const deleteData = useCallback(async ({
    token, developerKey, data,
    callbackFunction = (res: {result:"Success",data:any}|{result:"Error",data:any}) => { },
  }) => {
   
   if (typeof gapi === 'undefined' || !gapi.client) {
       callbackFunction({result:"Error",data:"Gapi not loaded"});
       return;
   }

   let effectiveToken = token || cachedSessionToken;
   if (!effectiveToken && gapi.client.getToken()) {
       effectiveToken = gapi.client.getToken().access_token;
   }
   
   if(effectiveToken) {
       gapi.client.setToken({ access_token: effectiveToken });
   } else {
       callbackFunction({result:"Error",data:"No token available"});
       return;
   }
   
   const apiKeyToUse = developerKey || process.env.NEXT_PUBLIC_DEVELOPER_KEY;
   gapi.client.setApiKey(apiKeyToUse);
   
   let fileID = "";
   try {
       if (data && typeof data === 'string' && data.includes('/d/')) {
           const match = data.match(/\/d\/([a-zA-Z0-9_-]+)/);
           fileID = match ? match[1] : data;
       } else {
           fileID = data;
       }
   } catch(e) {
       callbackFunction({result:"Error",data:"Invalid Link Format"});
       return;
   }

   if (!fileID) {
     callbackFunction({result:"Error",data:"Incorrect fileID"})
     return;
   }

   gapi.client.drive.files.delete({
     fileId: fileID,
   }).then(
     (response) => { 
       console.log('File deleted successfully via Hook', response);
       callbackFunction({result:"Success",data:response.result})
     },
     (error) => {
       console.error('Error deleting file via Hook:', error);
       callbackFunction({result:"Error",data:error})
     }
   );
  }, [])

  // 🔥 פונקציה חדשה ל-OnlyAuth שרק מתחברת ושומרת בשרת
  const onlyAuthImpl = useCallback(async ({ callbackFunction = () => {} }: any) => {
    console.log("✅ onlyAuth for Drive completed");
    if (callbackFunction) {
      callbackFunction({ success: true });
    }
  }, []);

  const getFunction = useCallback((name: "delete" | "open" | "OnlyAuth"): any => {
    if (name === "delete") return deleteData;
    if (name === "open") return createPicker;
    if (name === "OnlyAuth") return onlyAuthImpl; // 🔥 הוספתי
  }, [deleteData, createPicker, onlyAuthImpl])

  const AuthenticateActivate = useCallback((name: "delete" | "open" | "OnlyAuth") => {
    const func = (config: any) => {
      const callback = getFunction(name)
      
      if (!config.token && cachedSessionToken) {
          config.token = cachedSessionToken;
      }

      if (!config.token && typeof window !== 'undefined' && window.gapi?.client?.getToken()) {
          const gapiToken = window.gapi.client.getToken().access_token;
          if (gapiToken) {
              cachedSessionToken = gapiToken;
              config.token = gapiToken;
          }
      }

      if (config.token) {
        callback(config);
      } else {
        AuthAndActivate(config, callback)
      }
    }
    return func
  }, [AuthAndActivate, getFunction])
  
  return AuthenticateActivate;
}