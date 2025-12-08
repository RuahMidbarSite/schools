export const fetchWithTimeout = (
    url: string,
    options: { method: string; headers: { 'Content-Type': string }; body: URLSearchParams },
    timeout = 5000
): Promise<Response> => {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]).catch(error => {
        // You can choose how to handle errors here (e.g., rethrow or handle them)
        throw error;  // This ensures the Promise type remains `Promise<Response>`
    });
};