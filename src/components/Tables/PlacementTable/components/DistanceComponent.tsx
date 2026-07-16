import { Cities, Distances, Guide, Program } from "@prisma/client";
import { ICellRendererParams } from 'ag-grid-community';
import { useEffect, useState } from "react";

interface DistanceComponentParams extends ICellRendererParams<Guide> {
    currentProgram: { label: string, value: number },
    Distances: Distances[],
    Cities: Cities[],
    Programs: Program[]
}

// check if the city name is in the alias map, if so return the alias, otherwise return the original name
export const cityAliasMap: Record<string, string> = {
    // מרכז וגוש דן
    "תל אביב": "תל אביב-יפו",
    "תל-אביב": "תל אביב-יפו",
    "תל אביב יפו": "תל אביב-יפו",
    "ת\"א": "תל אביב-יפו",
    "ראשלצ": "ראשון לציון",
    "ראשל\"צ": "ראשון לציון",
    "ראשון": "ראשון לציון",
    "פתח תקווה": "פתח תקוה",
    "פ\"ת": "פתח תקוה",
    "יהוד": "יהוד-מונסון",
    "יהוד מונסון": "יהוד-מונסון",
    "מודיעין": "מודיעין-מכבים-רעות",
    "מודיעין מכבים רעות": "מודיעין-מכבים-רעות",
    "קריית אונו": "קרית אונו",
    "אונו": "קרית אונו",
    "קריית גת": "קרית גת",
    "גת": "קרית גת",
    "קריית שמונה": "קרית שמונה",
    "שמונה": "קרית שמונה",
    "קריית מלאכי": "קרית מלאכי",
    "קריית ביאליק": "קרית ביאליק",
    "ביאליק": "קרית ביאליק",
    "קריית ים": "קרית ים",
    "קריית אתא": "קרית אתא",
    "אתא": "קרית אתא",
    "מוצקין": "קריית מוצקין",
    "פרדס חנה": "פרדס חנה-כרכור",
    "כרכור": "פרדס חנה-כרכור",
    "פרדס חנה כרכור": "פרדס חנה-כרכור",
    "נצרת עילית": "נוף הגליל",
    "מעלות": "מעלות-תרשיחא",
    "מעלות תרשיחא": "מעלות-תרשיחא",
    "בנימינה": "בנימינה-גבעת עדה",
    "גבעת עדה": "בנימינה-גבעת עדה",
    "אום אל פחם": "אום אל פחם",
    "באקה": "באקה אל גרביה",
    "קלנסוה": "קלנסווה",
    "בת-ים": "בת ים",
    "הוד-השרון": "הוד השרון",
};

export const normalizeCityName = (cityName?: string | null) => {
    if (!cityName) return "";
    const cleanName = cityName.trim();
    return cityAliasMap[cleanName] || cleanName;
};
// caching coordinates in memory to avoid redundant API calls during the same session
const coordsCache = new Map<string, number[]>();

export const fetchGeoapifyDistance = async (originCity: string, destCity: string): Promise<number | null> => {
    // 5 seconds timeout to prevent server hang
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const distCacheKey = `geo_dist_${originCity}_${destCity}`;
    const cachedDist = localStorage.getItem(distCacheKey);
    if (cachedDist) return parseInt(cachedDist, 10);

    try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        if (!apiKey) return null;

        const getCoordsWithCache = async (city: string) => {
            if (coordsCache.has(city)) return coordsCache.get(city);

            const cachedCoords = localStorage.getItem(`coords_${city}`);
            if (cachedCoords) {
                const parsed = JSON.parse(cachedCoords);
                coordsCache.set(city, parsed);
                return parsed;
            }

            // using Geoapify's geocoding API to get coordinates for the city
            const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(city + ", ישראל")}&limit=1&apiKey=${apiKey}`);
            clearTimeout(timeoutId);
            const data = await res.json();
            if (data?.features?.length > 0) {
                const c = data.features[0].geometry.coordinates;
                localStorage.setItem(`coords_${city}`, JSON.stringify(c));
                coordsCache.set(city, c);
                return c;
            }
            return null;
        };

        const originCoords = await getCoordsWithCache(originCity);
        const destCoords = await getCoordsWithCache(destCity);

        if (!originCoords || !destCoords) return null;

        const body = {
            mode: "drive",
            sources: [{ location: originCoords }],
            targets: [{ location: destCoords }]
        };

        // calling Geoapify's route matrix API to get the distance between the two cities
        const matrixRes = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const matrixData = await matrixRes.json();

        if (matrixData?.sources_to_targets?.[0]?.[0]?.distance) {
            const distanceInKm = Math.ceil(matrixData.sources_to_targets[0][0].distance / 1000);
            localStorage.setItem(distCacheKey, distanceInKm.toString());
            return distanceInKm;
        }
        return null;
    } catch (e) {
        clearTimeout(timeoutId);
        console.error("Geoapify Error:", e);
        return null;
    }
};

type DistanceQueueItem = {
    guideCityName: string;
    programCityName: string;
    resolve: (distance: number | null) => void;
};

let distanceQueue: DistanceQueueItem[] = [];
let debounceTimer: NodeJS.Timeout | null = null;

const processDistanceQueue = async () => {
    if (distanceQueue.length === 0) return;

    const queueToProcess = [...distanceQueue];
    distanceQueue = [];

    try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        if (!apiKey) {
            queueToProcess.forEach(item => item.resolve(null));
            return;
        }

        const getCoordsWithCache = async (city: string) => {
            if (coordsCache.has(city)) return coordsCache.get(city);

            const cachedCoords = localStorage.getItem(`coords_${city}`);
            if (cachedCoords) {
                const parsed = JSON.parse(cachedCoords);
                coordsCache.set(city, parsed);
                return parsed;
            }

            const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(city + ", ישראל")}&limit=1&apiKey=${apiKey}`);
            const data = await res.json();
            if (data?.features?.length > 0) {
                const c = data.features[0].geometry.coordinates;
                localStorage.setItem(`coords_${city}`, JSON.stringify(c));
                coordsCache.set(city, c);
                return c;
            }
            return null;
        };

        const programCityName = queueToProcess[0].programCityName;
        const programCoords = await getCoordsWithCache(programCityName);

        if (!programCoords) {
            queueToProcess.forEach(item => item.resolve(null));
            return;
        }

        const uniqueGuideCities = Array.from(new Set(queueToProcess.map(item => item.guideCityName)));
        const targetCoordsMap = new Map<string, number[]>();

        for (const city of uniqueGuideCities) {
            const isCached = coordsCache.has(city) || localStorage.getItem(`coords_${city}`);
            const coords = await getCoordsWithCache(city);
            if (coords) targetCoordsMap.set(city, coords);

            // Throttle API requests to stay safely below 5 req/sec limit
            if (!isCached) {
                await new Promise(r => setTimeout(r, 250));
            }
        }

        const validTargets = uniqueGuideCities.filter(city => targetCoordsMap.has(city));
        if (validTargets.length === 0) {
            queueToProcess.forEach(item => item.resolve(null));
            return;
        }

        const body = {
            mode: "drive",
            sources: [{ location: programCoords }],
            targets: validTargets.map(city => ({ location: targetCoordsMap.get(city) }))
        };

        console.log("Fetching matrix from Geoapify for targets...", validTargets);

        const matrixRes = await fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const matrixData = await matrixRes.json();

        const distanceResultMap = new Map<string, number>();

        if (matrixData?.sources_to_targets?.[0]) {
            validTargets.forEach((city, index) => {
                const targetData = matrixData.sources_to_targets[0][index];
                if (targetData?.distance !== undefined) {
                    const distanceInKm = Math.ceil(targetData.distance / 1000);
                    distanceResultMap.set(city, distanceInKm);

                    const distCacheKey = `geo_dist_${city}_${programCityName}`;
                    localStorage.setItem(distCacheKey, distanceInKm.toString());
                }
            });
        }

        queueToProcess.forEach(item => {
            const dist = distanceResultMap.get(item.guideCityName);
            item.resolve(dist !== undefined ? dist : null);
        });

    } catch (e) {
        queueToProcess.forEach(item => item.resolve(null));
    }
};

export const fetchBatchedGeoapifyDistance = (guideCityName: string, programCityName: string): Promise<number | null> => {
    return new Promise((resolve) => {
        const distCacheKey = `geo_dist_${guideCityName}_${programCityName}`;
        const cachedDist = localStorage.getItem(distCacheKey);

        if (cachedDist) {
            resolve(parseInt(cachedDist, 10));
            return;
        }

        distanceQueue.push({ guideCityName, programCityName, resolve });
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(processDistanceQueue, 200);
    });
};

export const DistanceComponent = ({ Programs, Cities, Distances, currentProgram, getValue, setValue, ...props }: DistanceComponentParams) => {

    const [displayVal, setDisplayVal] = useState<string | number>(() => {
        const currentVal = getValue();
        if (currentVal !== undefined && currentVal !== null) return currentVal;
        return "...";
    });

    useEffect(() => {
        let isMounted = true;

        const updateDistance = async () => {
            if (currentProgram.value === -1) {
                if (isMounted) setDisplayVal("");
                return;
            }

            const this_program = Programs.find((program) => program.Programid === currentProgram.value);
            if (!this_program) return;

            const guideCityName = normalizeCityName(props.data.City);
            const programCityName = normalizeCityName(this_program.CityName);

            if (!guideCityName || guideCityName === "לא צוין" || guideCityName === "לא ידוע") {
                if (isMounted) setDisplayVal("לא ידוע");
                return;
            }

            if (guideCityName === programCityName) {
                setValue(0);
                if (isMounted) setDisplayVal(0);
                return;
            }

            // first 
            const guideCityCode = Cities.find((city) => normalizeCityName(city.CityName) === guideCityName)?.CityCode;
            const programCityCode = Cities.find((city) => normalizeCityName(city.CityName) === programCityName)?.CityCode;

            if (guideCityCode && programCityCode) {
                const distance = Distances?.find((distance) =>
                    (distance?.OriginId === guideCityCode && distance?.DestinationId === programCityCode) ||
                    (distance.OriginId === programCityCode && distance?.DestinationId === guideCityCode)
                );

                if (distance) {
                    setValue(Math.ceil(distance.Distance));
                    if (isMounted) setDisplayVal(Math.ceil(distance.Distance));
                    return;
                }
            }

            if (guideCityName && programCityName) {
                const apiDist = await fetchBatchedGeoapifyDistance(guideCityName, programCityName);
                if (apiDist !== null) {
                    setValue(apiDist);
                    if (isMounted) setDisplayVal(apiDist);
                } else {
                    if (isMounted) setDisplayVal("לא ידוע");
                }
            } else {
                if (isMounted) setDisplayVal("לא ידוע");
            }
        };

        updateDistance();

        return () => { isMounted = false; };
    }, [Cities, Distances, Programs, currentProgram.value, props.data.City, setValue]);

    return (
        <div style={{
            color: displayVal === "..." ? '#3b82f6' : 'inherit',
            fontStyle: displayVal === "לא ידוע" ? 'italic' : 'normal',
            fontWeight: (typeof displayVal === 'number') ? '500' : 'normal'
        }}>
            {displayVal}
        </div>
    );
};