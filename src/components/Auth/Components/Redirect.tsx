"use client";
import SchoolsTable from "@/components/Tables/SchoolTable/schooltable";
import prisma from "@/db/prisma";
import { School } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

import QrCode from "@/components/whatsapp/QrcodeComponent";
import { sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { AuthContactsStore, getFromStorage as getAuthContacts, updateStorage as setAuthContacts } from "../Storage/AuthContactsStorage";
import { AuthDriveStore, getFromStorage as getAuthPrograms, updateStorage as setAuthPrograms } from "../Storage/AuthDrivePrograms";
import { getFromStorage as getAuthGuides, updateStorage as setAuthGuides } from "../Storage/AuthDriveGuides";
import { OAuthTokenResponseGoogle, OAuthTokenWithoutRefresh } from "@/app/googleCallback/page";
import { getAuth, updateAuth } from "@/db/authRequests";
import { getEnv, getInfo } from "@/db/instructorsrequest";
import { authResult } from "@/util/Google/typeDefs";
import { fetchWithTimeout } from "@/app/utilities/fetchwithTimeout";
export type AuthPageOptions = "Programs" | "Contacts" | "Guides"

export const StorageMapAuthRedirect: Map<AuthPageOptions, { getFromStorage: () => Promise<AuthContactsStore | AuthDriveStore>, updateStorage: (data: AuthDriveStore | AuthContactsStore) => Promise<void> }> = new Map()
StorageMapAuthRedirect.set('Contacts', { getFromStorage: getAuthContacts, updateStorage: setAuthContacts })
StorageMapAuthRedirect.set('Programs', { getFromStorage: getAuthPrograms, updateStorage: setAuthPrograms })
StorageMapAuthRedirect.set('Guides', { getFromStorage: getAuthGuides, updateStorage: setAuthGuides })
type GoogleScopes = "Drive" | "Contacts"


/**
  This component handles the authentication with google. If we have invalid credantials, it will ask
  to login (if we have no valid refresh token) or ask from google a new token using a valid refresh token.
  Three cases:
  1. We saved the details in the database. If token is still not expired,use it, else, request new one.
  2. We saved the details only in local storage. This might happen if database is deleted somehow.
  3. Database don't have have the auth details so we handle the getting the data type.
  The token expiry time is 60 minutes, after that we have to refresh it.
 */
const Redirect = ({ type, ScopeType }: { type: AuthPageOptions, ScopeType: GoogleScopes }) => {


  const router = useRouter();
  //  must add NEXT_PUBLIC if you want to acces env variables from client (except for NODE_ENV) 
  const CLIENT_ID = useMemo(() => process.env.NEXT_PUBLIC_CLIENTID, [])

  const REDIRECT_URI = useMemo(() => {

    if (process.env.NODE_ENV === "development") {
      return 'http://localhost:3666/api/GoogleAuth'
    } else {
      return 'https://ruahmidbarproject.vercel.app/api/GoogleAuth'
    }


  }, []);
  const MAIN_PAGE = useMemo(() => {
    if (process.env.NODE_ENV === "development") {
      return 'http://localhost:3666'
    } else {
      return 'https://ruahmidbarproject.vercel.app'
    }

  }, [])
  const SCOPE: string = useMemo(() => {
    if (ScopeType === "Contacts") {
      return "https://www.googleapis.com/auth/contacts"
    } else {
      return "https://www.googleapis.com/auth/drive"

    }

  }, [ScopeType])
  /** Must be added to get back a refresh token. */
  const ACCESS_TYPE = 'offline';

  const PROMPT = 'consent';

  const handleLogin = useCallback((type: AuthPageOptions) => {
    // this is the page i will return to after getting the details from google.
    const currentUrl = encodeURIComponent(`${MAIN_PAGE}/googleCallback`);
    // If you need to add custom parameters, you must add through the state=...
    // else, google will not return it back when they redirect to the callback page(in api/googleAuth)
    const state = encodeURIComponent(JSON.stringify({
      page_redirect: currentUrl,
      redirecttype: type
    }));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=${ACCESS_TYPE}&prompt=${PROMPT}&state=${state}`;

    const windowFeatures = 'width=600,height=400,left=100,top=100,resizable=yes,scrollbars=yes';
    let new_window = window.open(authUrl, '_blank', windowFeatures)
    // window == null means pop ups are blocked for the user, so will try to redirect instead.
    if (new_window == null) {
      //router.push(authUrl)
    }
  }, [CLIENT_ID, MAIN_PAGE, REDIRECT_URI, SCOPE]);

  const getTokenFromRefresh = useCallback(async (Data: { authResult: OAuthTokenResponseGoogle, timeStamp: number }): Promise<OAuthTokenWithoutRefresh | { Error: any }> => {
    const { clientId, developerKey } = await getInfo()
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        refresh_token: Data.authResult.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
    return fetchWithTimeout(tokenEndpoint, options, 5000)
      .then((response) => {
        if (!response.ok) {
          return { Error: "Failed to refresh access token" }
        }
        return response.json(); // Parse JSON response
      })
      .catch((error) => {
        return { Error: error }
      });

  }, [])


  useEffect(() => {
    const { getFromStorage, updateStorage } = StorageMapAuthRedirect.get(type)
    Promise.all([getFromStorage(), getAuth(type)]).then(([ResponseOffilineStorage, ResponseDataBase]) => {
      if (ResponseDataBase && ResponseDataBase.Auth) {
        const difference = (Date.now() - ResponseDataBase.TimeStamp) / 60000
        if (difference >= 58) {
          getTokenFromRefresh({ authResult: ResponseDataBase.Auth, timeStamp: ResponseDataBase.TimeStamp }).then((response) => {
            if ('Error' in response) {
              // failed to fresh token
            } else {
              const object: OAuthTokenResponseGoogle = { ...response, refresh_token: ResponseDataBase.Auth.refresh_token }
              const time_stamp = Date.now()
              updateStorage({ authResult: object, timeStamp: time_stamp })
              updateAuth(object, time_stamp, type)
            }

          })
        } else {
          updateStorage({ authResult: ResponseDataBase.Auth, timeStamp: ResponseDataBase.TimeStamp })
        }


      } else if (ResponseOffilineStorage && ResponseOffilineStorage.authResult) {
        const difference = (Date.now() - ResponseOffilineStorage.timeStamp) / 60000

        if (difference >= 58) {
          getTokenFromRefresh({ authResult: ResponseOffilineStorage.authResult, timeStamp: ResponseOffilineStorage.timeStamp }).then((response) => {
            if ('Error' in response) {
              // failed to fresh token
            } else {
              const object: OAuthTokenResponseGoogle = { ...response, refresh_token: ResponseOffilineStorage.authResult.refresh_token }
              const time_stamp = Date.now()
              updateStorage({ authResult: object, timeStamp: Date.now() })
              updateAuth(object, time_stamp, type)
            }

          })
        }

      } else {
        handleLogin(type)

      }


    })


  }, [getTokenFromRefresh, handleLogin, type])
  //TODO: Maybe add a button that shows if we have valid credentials and also allow it to disconnect when clicking again.
  return <> </>
}

export default Redirect