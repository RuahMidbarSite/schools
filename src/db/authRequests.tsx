"use server"

import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page"
import { AuthPageOptions } from "@/components/Auth/Components/Redirect"
import { Auth } from "@prisma/client"
import prisma from "./prisma"



export const updateAuth = async (Auth: OAuthTokenResponseGoogle, timeStamp: number, type: AuthPageOptions): Promise<void> => {
    return prisma.auth.upsert({
        where: { TableName: type },
        update: { TokenObject: JSON.stringify(Auth), TableName: type, TimeStamp: Date.now() },
        create: { TokenObject: JSON.stringify(Auth), TableName: type, TimeStamp: Date.now() }

    }).then((res) => console.log('success in updating/adding auth')).catch((err) => console.error(err))


}

export const deleteAuth =async  (type: AuthPageOptions): Promise<void> => {

    return prisma.auth.delete({ where: { TableName: type } }).
        then((res) => console.log('success in deleting auth')).catch((err) => console.error(err))

}

export const getAuth = async (type: AuthPageOptions): Promise<{ Auth: OAuthTokenResponseGoogle, TimeStamp: number } | undefined> => {
    return prisma.auth.findUnique({ where: { TableName: type }, select: { TokenObject: true, TimeStamp: true } }).then((result) => {
        if (result === null) {
            return undefined
        } else {
            const { TokenObject, TimeStamp } = result
            return { Auth: JSON.parse(TokenObject), TimeStamp: TimeStamp }
        }


    })

}