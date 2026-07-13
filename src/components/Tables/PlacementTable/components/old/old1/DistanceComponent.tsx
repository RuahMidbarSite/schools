import { Cities, Distances, Guide, Program } from "@prisma/client";
import { ICellRendererParams } from 'ag-grid-community';
import { useEffect, useState } from "react";

interface DistanceComponentParams extends ICellRendererParams<Guide> {
    currentProgram: { label: string, value: number },
    Distances: Distances[],
    Cities: Cities[],
    Programs: Program[]
}

// מילון נרמול לשגיאות כתיב נפוצות
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

// פנייה ל-Geoapify מפות + שמירה ב-LocalStorage (Cache)
// מטמון נפרד לקואורדינטות כדי לחסוך Geocoding כפול
const coordsCache = new Map<string, number[]>();

export const fetchGeoapifyDistance = async (originCity: string, destCity: string): Promise<number | null> => {
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

        const originCoords = await getCoordsWithCache(originCity);
        const destCoords = await getCoordsWithCache(destCity);

        if (!originCoords || !destCoords) return null;

        const body = {
            mode: "drive",
            sources: [{ location: originCoords }],
            targets: [{ location: destCoords }]
        };

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
        console.error("Geoapify Error:", e);
        return null;
    }
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

            // 1. חיפוש מהיר במסד הנתונים הקיים (קודם כל מנסים בחינם ובלי רשת!)
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

            // 2. Fallback ל-Geoapify אם העיר חסרה בטבלה הממשלתית
            const apiDist = await fetchGeoapifyDistance(guideCityName, programCityName);

            if (apiDist !== null) {
                setValue(apiDist);
                if (isMounted) setDisplayVal(apiDist);
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