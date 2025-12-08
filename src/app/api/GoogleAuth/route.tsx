
export const dynamic = 'force-dynamic' // defaults to auto

import { fetchWithTimeout } from '@/app/utilities/fetchwithTimeout';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {




}

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code'); // Get the authorization code from the query parameters
  // Custom parameters we passed to google from the client.
  const state = searchParams.get('state')
  const decoded = decodeURIComponent(state)
  const { page_redirect, redirecttype } = JSON.parse(decoded)

 return fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.clientId,
      client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.NODE_ENV === "development" ? 'http://localhost:3666/api/GoogleAuth' : 'https://ruahmidbarproject.vercel.app/api/GoogleAuth',
      grant_type: 'authorization_code',
    }),
  },5000).then((tokenResponse) => {

    if (!tokenResponse.ok) {
      return Response.redirect('/'); // Handle token error
    }
    return tokenResponse.json().then((tokenData) => {

      // Construct a URL to redirect back to the original page with the token data
      const redirectUrl = new URL(page_redirect);
      redirectUrl.searchParams.set('token', JSON.stringify(tokenData));
      redirectUrl.searchParams.set('type', JSON.stringify(redirecttype))
      // Redirect back to the original URL with token data as query parameters
      return NextResponse.redirect(redirectUrl.toString());

    })


  }).catch((err)=> {
      const redirectUrl = new URL(page_redirect);
      return NextResponse.redirect(redirectUrl.toString());

 })






}