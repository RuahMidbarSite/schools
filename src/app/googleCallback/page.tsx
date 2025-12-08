"use client"
// We direct to here from the api call after we received the google page. This is in another window so when we end,
// we close.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TokenResponse } from '@react-oauth/google';
import { AuthPageOptions, StorageMapAuthRedirect } from '@/components/Auth/Components/Redirect';
import { authResult } from '@/util/Google/typeDefs';
import { updateAuth } from '@/db/authRequests';

export interface OAuthTokenResponseGoogle {
  /** The access token used for authenticated requests */
  access_token: string;

  /** The refresh token (optional) */
  refresh_token?: string;

  /** The number of seconds until the access token expires */
  expires_in: number;

  /** The scopes that were granted */
  scope: string;

  /** Usually 'Bearer' */
  token_type: string;

  /** JWT token containing user info (optional, returned for OpenID Connect) */
  id_token?: string;
}
interface SearchParamsResult {
  token: string;
  type: string;
}
export type OAuthTokenWithoutRefresh = Omit<OAuthTokenResponseGoogle, 'refresh_token'>;
const fetchSearchParams = (searchParams: ReturnType<typeof useSearchParams>): Promise<SearchParamsResult | null> => {
  return new Promise((resolve) => {
    const tokenResponse = searchParams.get('token');
    const type = searchParams.get('type');

    if (tokenResponse && type) {
      resolve({ token: tokenResponse, type: type });
    } else {
      resolve(null);
    }
  });
};

const TokenHandler = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");

  useEffect(() => {
    const updateToken = async () => {
      fetchSearchParams(searchParams).then(async (response) => {
        if (response && response.token) {
          const { token: tokenResponse, type: typeString } = response
          if (tokenResponse) {
            let token: OAuthTokenResponseGoogle = JSON.parse(tokenResponse);
            const type: AuthPageOptions = JSON.parse(typeString);
            const { updateStorage } = StorageMapAuthRedirect.get(type);

            await Promise.all([
              updateStorage({ authResult: token, timeStamp: Date.now() }),
              updateAuth(token, Date.now(), type)
            ]);

            setToken(token.access_token);
            window.close();
          }

        }else {
             console.error('Failed to get a response from google')
             window.close()
          }
      })

    };

    updateToken();
  }, [searchParams, router]);

  return <div>{token ? token : "Processing..."}</div>;
};

const CallbackPage = () => {


  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TokenHandler />
    </Suspense>
  );



};

export default CallbackPage;