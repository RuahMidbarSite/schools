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

export default function useDrivePicker(input_type: "Guide" | "Program"):
  (name: "delete" | "open" | "OnlyAuth") => (config: any) => any {
  const defaultScopes = useMemo(() => ["https://www.googleapis.com/auth/drive"], []);
  const [pickerApiLoaded, setpickerApiLoaded] = useState(false);
  const [Config, setConfig] =
    useState<PickerConfiguration>(defaultConfiguration);
  const [authRes, setAuthRes] = useState<authResult>();
  const [loaded, error] = useInjectScript("https://apis.google.com/js/api.js");
  const [loadedGsi, errorGsi] = useInjectScript(
    "https://accounts.google.com/gsi/client"
  );
  const [type, setType] = useState<"Guide" | "Program">(input_type)
  var folder_id: string = "";
  var innerfolder_id: string = "";
  let picker = useRef(null)

  const [tokenClient, setClient] = useState(null)
  const expiresInSeconds = useRef(0)
  
  // get the apis from googleapis
  useEffect(() => {
    if (!pickerApiLoaded && loaded && loadedGsi) {
      loadApis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadedGsi]);

 

  const AuthAndActivate = useCallback(async (config: PickerConfiguration, callBack: (args) => {}) => {

    const client = google.accounts.oauth2.initTokenClient({
      // תיקון: שימוש ב-NEXT_PUBLIC אם לא קיים בקונפיג
      client_id: config.clientId || process.env.NEXT_PUBLIC_CLIENT_ID,
      scope: (config.customScopes
        ? [...defaultScopes, ...config.customScopes]
        : defaultScopes
      ).join(" "),
      callback: (tokenResponse: authResult) => {
        callBack({ ...config, token: tokenResponse.access_token });
        if (type === "Program") {
          expiresInSeconds.current = tokenResponse.expires_in
          UpdateProgramsAuthStorage({ authResult: tokenResponse, timeStamp: Date.now() })
        }
        else {

          expiresInSeconds.current = tokenResponse.expires_in
          UpdateGuidesAuthStorage({ authResult: tokenResponse, timeStamp: Date.now() })
        }

      },
    });
    // we could also use only () since the default is consent
    client.requestAccessToken({ prompt: "consent" });
    // we use this to request tokens before expire time.  
    setClient(client)
  }, [defaultScopes, type])
  // open the picker


  const onPickerApiLoad = async () => {
    setpickerApiLoaded(true);

  };


  const gapiInted = useCallback(async () => {

    await gapi.client.init({
      // תיקון: שימוש במשתני סביבה ציבוריים כדי שיהיו זמינים בדפדפן
      apiKey: process.env.NEXT_PUBLIC_DEVELOPER_KEY,
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    }).then(() => {
      console.log("Gapi initialized successfully");
    })

  }, [])
  // load the Drive picker api
  const loadApis = useCallback(() => {
    if (window.gapi) {
      window.gapi.load("client", gapiInted);
      window.gapi.load("picker", { callback: onPickerApiLoad });
      setpickerApiLoaded(true)
    }

  }, [gapiInted]);

  const { searchFolder, createFolder, findOrCreateFolder } = useFolderFunctions()



  /** We go from the first folder to the last. To know it is the folder and not a folder with the same name, 
   we check that the parents are in the same order that we are expecting them*/
  const createFolderStructure = useCallback(async (config: { token: string, developerKey: string, folderStructure: folderStructure }) => {
    const structure: string[] = config.folderStructure.parents_folders_by_left_to_right_order
    var handled_folders: gapi.client.drive.File[] = []
    // empty promise with null
    var promise = Promise.resolve(null)
    for (const [index, folderName] of structure.entries()) {
      if (index == 0) {
        promise = promise.then(() => {
          return findOrCreateFolder(folderName, null, config);

        })

      }
      else {
        promise = promise.then((folderId) => {

          return findOrCreateFolder(folderName, folderId, config);

        })

      }

    }
    promise = promise.then((folderId) => {
      console.log("Folder tree created successfully, or part of it already existed.");
      return folderId

    }).catch((error) => {

      console.error("Error creating folder tree: ", error);

    })

    return await promise

  }, [findOrCreateFolder])



  const createPicker = useCallback(async ({
    token,
    appId = "",
    supportDrives = false,
    developerKey,
    viewId = "DOCS",
    disabled,
    multiselect,
    setOrigin,
    showUploadView = false,
    showUploadFolders,
    setParentFolder = "",
    viewMimeTypes,
    customViews,
    locale = "he",
    setIncludeFolders,
    setSelectFolderEnabled,
    disableDefaultView = false,
    callbackFunction,
    folderStructure,

  }: PickerConfiguration) => {
    if (disabled) return false;

    // Use passed developerKey or fallback to env var
    const apiKeyToUse = developerKey || process.env.NEXT_PUBLIC_DEVELOPER_KEY;


    // We want it to return the parentID at the end
    createFolderStructure({ token: token, developerKey: apiKeyToUse, folderStructure: folderStructure }).then((lastParentID) => {
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

      if (setOrigin) {
        picker.current.setOrigin(setOrigin);
      }

      if (showUploadView) picker.current.addView(uploadView);

      if (!disableDefaultView) {
        picker.current.addView(view);
      }

      if (customViews) {
        picker.current.map((view) => picker.current.addView(view));
      }


      picker.current.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);

      picker.current.enableFeature(google.picker.Feature.MINE_ONLY);


      picker.current.build().setVisible(true);
      return true;

    })


  }, [createFolderStructure]);

  const deleteData = useCallback(async ({
    token,
    clientId,
    developerKey,
    customScopes = ["https://www.googleapis.com/auth/contacts"],
    data,
    callbackFunction = (res: {result:"Success",data:any}|{result:"Error",data:any}) => { },
  }) => {
   gapi.client.setToken({ access_token: token });
   // תיקון: fallback גם כאן
    const apiKeyToUse = developerKey || process.env.NEXT_PUBLIC_DEVELOPER_KEY;
    gapi.client.setApiKey(apiKeyToUse);
    
    // https://drive.google.com/file/d/FILE_ID/view?usp=sharing is the general form of drive file
    // [0] is for the /d/ part, [1] is for FILE_ID until / not included(what we need)
    const fileID: string = (data.match(/\/d\/([a-zA-Z0-9_-]+)/))[1];
    if (!fileID) {
      callbackFunction({result:"Error",data:"Incorrect fileID"})
      return;
    }
    gapi.client.drive.files.delete({
      fileId: fileID,
      access_token:token,
      key: apiKeyToUse
    }).then(
      (response) => { 
        callbackFunction({result:"Success",data:response.result})
        console.log('File deleted successfully', response);
      },
      (error) => {
        callbackFunction({result:"Error",data:error})
        console.error('Error deleting file:', error);
      }
    );
 
  }, [])




  const getFunction = useCallback((name: "delete" | "open" | "OnlyAuth"): any => {
    if (name === "delete") {
      return deleteData
    }

    if (name === "open") {
      return createPicker
    }

    if (name === "OnlyAuth") {
      return () => { }
    }

  }, [deleteData, createPicker])

  const AuthenticateActivate = useCallback((name: "delete" | "open" | "OnlyAuth") => {
    const func = (config: any) => {
      const callback = getFunction(name)
      if (!config.token) {
        AuthAndActivate(config, callback)
      }
      else {
        callback(config)
      }

    }
    return func

  }, [AuthAndActivate, getFunction])
  return AuthenticateActivate;
}