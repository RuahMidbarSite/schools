import axios from "axios";

// הגדרות בסיס ל-Axios
const api = axios.create({
    baseURL: 'http://localhost:8000',
    timeout: 30000,
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'x-csrftoken',
});

const config = {
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 60 * 1000 
};

// הגדרת טיפוס לתשובה
interface ServerResponse {
    success: boolean;
    message: string;
}

export async function updatePeopleCreds(): Promise<ServerResponse> {
    try {
        const response = await api.post('/updatepeoplecreds/', {}, config);
        // אנו מצפים שהשרת יחזיר שדה בשם 'email' או 'status'
        const connectedEmail = response.data.email || response.data.status || 'בוצע בהצלחה (לא התקבל אימייל)';
        return { success: true, message: connectedEmail };
    } catch (error: any) {
        console.error("Error updating people creds:", error);
        // החזרת הודעת השגיאה האמיתית מהשרת או מהרשת
        const errorMsg = error.response?.data?.detail || error.message || "שגיאה לא ידועה";
        return { success: false, message: errorMsg };
    }
}

export async function updateInstructorsCreds(): Promise<ServerResponse> {
    try {
        const response = await api.post('/updateinstructorscreds/', {}, config);
        const connectedEmail = response.data.email || response.data.status || 'בוצע בהצלחה';
        return { success: true, message: connectedEmail };
    } catch (error: any) {
        console.error("Error updating instructors creds:", error);
        const errorMsg = error.response?.data?.detail || error.message || "שגיאה לא ידועה";
        return { success: false, message: errorMsg };
    }
}

export async function updateProposalCreds(): Promise<ServerResponse> {
    try {
        const response = await api.post('/updateproposalcreds/', {}, config);
        const connectedEmail = response.data.email || response.data.status || 'בוצע בהצלחה';
        return { success: true, message: connectedEmail };
    } catch (error: any) {
        console.error("Error updating proposal creds:", error);
        const errorMsg = error.response?.data?.detail || error.message || "שגיאה לא ידועה";
        return { success: false, message: errorMsg };
    }
}