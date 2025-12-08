// credit for react-google-drive-picker

export type CallbackDoc = {
  downloadUrl?: string;
  uploadState?: string;
  description: string;
  driveSuccess: boolean;
  embedUrl: string;
  iconUrl: string;
  id: string;
  isShared: boolean;
  lastEditedUtc: number;
  mimeType: string;
  name: string;
  rotation: number;
  rotationDegree: number;
  serviceId: string;
  sizeBytes: number;
  type: string;
  url: string;
};

export type PickerCallback = {
  action: string;
  docs: CallbackDoc[];
};

export type authResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  authuser: string;
  prompt: string;
};

type ViewIdOptions =
  | "DOCS"
  | "DOCS_IMAGES"
  | "DOCS_IMAGES_AND_VIDEOS"
  | "DOCS_VIDEOS"
  | "DOCUMENTS"
  | "DRAWINGS"
  | "FOLDERS"
  | "FORMS"
  | "PDFS"
  | "SPREADSHEETS"
  | "PRESENTATIONS";

export type folderStructure =  {
 parents_folders_by_left_to_right_order?:string[]

}

export type PickerConfiguration = {
  clientId: string;
  developerKey: string;
  viewId?: ViewIdOptions;
  viewMimeTypes?: string;
  setIncludeFolders?: boolean;
  setSelectFolderEnabled?: boolean;
  disableDefaultView?: boolean;
  token?: string;
  setOrigin?: string;
  multiselect?: boolean;
  disabled?: boolean;
  appId?: string;
  supportDrives?: boolean;
  showUploadView?: boolean;
  showUploadFolders?: boolean;
 /**the setParentFolder function is used to set the default folder that the user will see when the picker opens.*/
  setParentFolder?: string;
  
  customViews?: any[];
  locale?: string;
  customScopes?: string[];
  callbackFunction: (data: PickerCallback) => any;
    folderStructure?:folderStructure,
};



export const defaultConfiguration: PickerConfiguration = {
  clientId: "",
  developerKey: "",
  viewId: "DOCS",
  callbackFunction: () => null,
};

export interface FolderID {
  folder_id: string;
}
export interface files {
  kind: string;
  mimeType: string;
  id: string;
  name: string;
}
export interface list {
  files: files[];
  incompleteSearch: boolean;
  kind: string;
}



