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

// הגדרת משתני גוגל גלובליים
declare let google: any;
declare let gapi: any;

// משתנה גלובלי (מחוץ לריאקט) לשמירת הטוקן כל עוד הדף פתוח
let cachedSessionToken: string | null = null;

export default function useDrivePicker(input_type: "Guide" | "Program"):
  (name: "delete" | "open" | "OnlyAuth") => (config: any) => any {
  
  // הוספת סקופים נדרשים למחיקה
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
  
  // שמירת ה-Client כדי לא לאתחל אותו כל פעם מחדש
  const tokenClientRef = useRef<any>(null);
  const expiresInSeconds = useRef(0)
  
  useEffect(() => {
    if (!pickerApiLoaded && loaded && loadedGsi) {
      loadApis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadedGsi]);

  // פונקציית הטעינה הראשונית של Gapi
  const gapiInted = useCallback(async () => {
    if (typeof gapi === 'undefined') return;
    await gapi.client.init({
      apiKey: process.env.NEXT_PUBLIC_DEVELOPER_KEY,
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    }).then(() => {
      console.log("Gapi initialized successfully");
      // בדיקה אם כבר קיים טוקן ב-gapi ושמירתו בקש
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

  // פונקציית ההתחברות (מעודכנת למניעת פופ-אפים מיותרים)
  const AuthAndActivate = useCallback(async (config: PickerConfiguration, callBack: (args) => {}) => {
    if (typeof google === 'undefined' || !google.accounts) return;

    // יצירת ה-Client פעם אחת בלבד ושמירתו ב-Ref
    if (!tokenClientRef.current) {
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: config.clientId || process.env.NEXT_PUBLIC_CLIENT_ID,
          scope: (config.customScopes ? [...defaultScopes, ...config.customScopes] : defaultScopes).join(" "),
          callback: (tokenResponse: authResult) => {
            if (tokenResponse.access_token) {
                // שמירת הטוקן בזיכרון הגלובלי
                cachedSessionToken = tokenResponse.access_token;
                
                // עדכון gapi כדי שקריאות עתידיות (כמו מחיקה) יכירו את הטוקן
                if (window.gapi && window.gapi.client) {
                    window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                }
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
    
    // שימוש ב-prompt: '' במקום 'consent' כדי למנוע חלון בחירה אם כבר מחוברים
    tokenClientRef.current.requestAccessToken({ prompt: '' }); 
  }, [defaultScopes, type])

  const { searchFolder, createFolder, findOrCreateFolder } = useFolderFunctions()

  // יצירת מבנה תיקיות
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

  // יצירת הפיקר (חלון העלאה)
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

  // פונקציית המחיקה
  const deleteData = useCallback(async ({
    token, developerKey, data,
    callbackFunction = (res: {result:"Success",data:any}|{result:"Error",data:any}) => { },
  }) => {
   
   if (typeof gapi === 'undefined' || !gapi.client) {
       callbackFunction({result:"Error",data:"Gapi not loaded"});
       return;
   }

   // ניסיון להשיג טוקן מכל מקור אפשרי
   let effectiveToken = token || cachedSessionToken;
   if (!effectiveToken && gapi.client.getToken()) {
       effectiveToken = gapi.client.getToken().access_token;
   }
   
   // אם מצאנו טוקן, מעדכנים את gapi
   if(effectiveToken) {
       gapi.client.setToken({ access_token: effectiveToken });
   } else {
       // אם עדיין אין טוקן - מחזירים שגיאה
       callbackFunction({result:"Error",data:"No token available"});
       return;
   }
   
   const apiKeyToUse = developerKey || process.env.NEXT_PUBLIC_DEVELOPER_KEY;
   gapi.client.setApiKey(apiKeyToUse);
   
   // חילוץ ID
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

   // ביצוע המחיקה בפועל
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

  const getFunction = useCallback((name: "delete" | "open" | "OnlyAuth"): any => {
    if (name === "delete") return deleteData;
    if (name === "open") return createPicker;
    if (name === "OnlyAuth") return () => { };
  }, [deleteData, createPicker])

  // פונקציית המעטפת הראשית - "המוח" שמחליט אם לפתוח חלון או לא
  const AuthenticateActivate = useCallback((name: "delete" | "open" | "OnlyAuth") => {
    const func = (config: any) => {
      const callback = getFunction(name)
      
      // 1. בדיקה אם כבר יש טוקן גלובלי שמור בזיכרון
      if (!config.token && cachedSessionToken) {
          config.token = cachedSessionToken;
      }

      // 2. בדיקה נוספת מול gapi אם במקרה יש טוקן שם
      if (!config.token && typeof window !== 'undefined' && window.gapi?.client?.getToken()) {
          const gapiToken = window.gapi.client.getToken().access_token;
          if (gapiToken) {
              cachedSessionToken = gapiToken;
              config.token = gapiToken;
          }
      }

      // 3. אם יש טוקן - רצים ישר לפעולה (מחיקה/העלאה) בלי לפתוח חלון
      if (config.token) {
        callback(config);
      } else {
        // 4. רק אם באמת אין שום טוקן - מבקשים התחברות
        AuthAndActivate(config, callback)
      }
    }
    return func
  }, [AuthAndActivate, getFunction])
  
  return AuthenticateActivate;
}