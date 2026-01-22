import { useCallback } from "react";




const useFolderFunctions = () => {


const searchFolder = useCallback((folderName, parentId, config) => {
    // תיקון: החלפת גרש בודד (') בגרש עם לוכסן (\') כדי לא לשבור את השאילתה
    const escapedFolderName = folderName.replace(/'/g, "\\'");

    const query = [
      `name='${escapedFolderName}'`,
      "mimeType='application/vnd.google-apps.folder'",
      parentId ? `'${parentId}' in parents` : " 'root' in parents",

    ].join(" and ");

    return gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      access_token: config.token,
      key: config.developerKey
    }).then((response) => {
      const files = response.result.files;
      return files.length > 0 ? files[0].id : null; // Return folder ID if found
    });
  }, [])
const  createFolder = useCallback((folderName, parentId,config) =>{
  return gapi.client.drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []  // Parent folder ID
    },
    fields: 'id',  // Return only the folder ID
     access_token: config.token,
    key: config.developerKey
  }).then((response) => {
    const folderId = response.result.id;
    console.log(`Created folder '${folderName}' with ID: ${folderId}`);
    return folderId;
  });
},[])
const findOrCreateFolder =  useCallback((folderName, parentId,config) =>{
  // Step 1: Search for the folder by name and parent
  return searchFolder(folderName, parentId,config).then((folderId) => {
    if (folderId) {
      console.log(`Folder '${folderName}' already exists with ID: ${folderId}`);
      return folderId; // Folder exists, return its ID
    } else {
      // Step 2: Folder does not exist, create it
      return createFolder(folderName, parentId,config);
    }
  });
},[createFolder, searchFolder])


 const listFolders = useCallback(async (config) => {
    // GIS has automatically updated gapi.client with the newly issued access token.
    console.log('gapi.client access token: ' + JSON.stringify(gapi.client.getToken()));

    gapi.client.drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false and 'me' in owners",
      fields: 'files(id, name, parents)',
      access_token: config.token,
      key: config.developerKey,
    }).then(function (response) {
      const folders = response.result.files;
      if (folders && folders.length > 0) {
        console.log(folders)
      } else {
        console.log('No folders found.');
      }
    }, function (error) {
      console.error('Error listing folders:', error);
    });
  }, [])




  return {searchFolder:searchFolder,createFolder:createFolder,findOrCreateFolder:findOrCreateFolder}


}

export default useFolderFunctions