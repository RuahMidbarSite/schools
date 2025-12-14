// @ts-nocheck
import { School } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import { useCallback, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import heLocale from 'date-fns/locale/he';
import { CiCalendarDate } from "react-icons/ci";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { forwardRef, useMemo } from "react";
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDateCelLEditor.css';

registerLocale('he', heLocale);
setDefaultLocale('he');

export const CustomDateCellEditor = (props: ICellEditorParams<any>) => {
    const [startDate, setStartDate] = useState(props.data.Date ? new Date(props.data.Date) : null);

    const range = useCallback((start, end) => {
        return Array.from({ length: end - start }, (_, i) => start + i);
    }, []);

    const years = useMemo(() => range(1900, new Date().getFullYear() + 1), [range]);
    const months = useMemo(() => [
        "ינואר",
        "פברואר",
        "מרץ",
        "אפריל",
        "מאי",
        "יוני",
        "יולי",
        "אוגוסט",
        "ספטמבר",
        "אוקטובר",
        "נובמבר",
        "דצמבר"
    ], []);

    const [selectedMonth, setMonth] = useState((startDate || new Date()).getMonth());
    const [selectedYear, setYear] = useState((startDate || new Date()).getFullYear());

    const changeMonth = useCallback((month: number) => {
        setMonth(month);
    }, []);

    const changeYear = useCallback((year: string) => {
        setYear(year);
    }, []);

    const onChange = useCallback((date) => {
        if (date) {
            const newDate = new Date(date);
            setStartDate(newDate);
            props.node.setDataValue(props.column.colId, newDate);
            props.api.stopEditing();
        }
    }, [props.column.colId, props.node, props.api]);

    // --- השינוי החשוב כאן ---
    // מקבלים את האירוע (e) ועוצרים את ברירת המחדל כדי למנוע התנגשויות
    const onClear = useCallback((e: any) => {
        e.preventDefault(); // מונע התנהגות ברירת מחדל
        e.stopPropagation(); // מונע מהאירוע לבעבע למעלה

        setStartDate(null);
        props.node.setDataValue(props.column.colId, null); // מאפס את הערך בטבלה
        props.api.stopEditing(); // סוגר את העריכה
    }, [props.column.colId, props.node, props.api]);

    const customHeader = useCallback(({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled
    }) => {

        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();

        return (
            <div
                style={{
                    margin: 10,
                    display: "flex",
                    justifyContent: "center",
                    fontSize: "1.4em",
                }}
            >
                <button onClick={() => {
                    decreaseMonth();
                    setMonth(currentMonth === 0 ? 11 : currentMonth - 1);
                    setYear(currentMonth === 0 ? currentYear - 1 : currentYear);
                }} disabled={prevMonthButtonDisabled}>
                    {"<"}
                </button>
                <select
                    className="bg-inherit"
                    value={currentYear}
                    onChange={({ target: { value } }) => {
                        changeYear(value);
                        setYear(value);
                    }}
                >
                    {years.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>

                <select
                    className="bg-inherit"
                    value={months[currentMonth]}
                    onChange={({ target: { value } }) => {
                        const monthIndex = months.indexOf(value);
                        changeMonth(monthIndex);
                        setMonth(monthIndex);
                    }}
                >
                    {months.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>

                <button onClick={() => {
                    increaseMonth();
                    setMonth(currentMonth === 11 ? 0 : currentMonth + 1);
                    setYear(currentMonth === 11 ? currentYear + 1 : currentYear);
                }} disabled={nextMonthButtonDisabled}>
                    {">"}
                </button>
            </div>
        );
    }, [months, years]);

    // eslint-disable-next-line react/display-name
    const CustomInput = forwardRef(
        ({ value, onClick }, ref) => {
            useEffect(() => {
                if (onClick) {
                    onClick();
                }
            }, [onClick]);

            return (
                <button className="hover:bg-slate-700 w-[100%] float-right font-bold py-0 px-2 rounded min-h-[30px]" onClick={onClick} ref={ref}>
                    {value || "בחר תאריך"}
                </button>
            );
        },
    );

    return (
        <>
            <DatePicker
                className="bg-[#12242E] w-[100%]"
                renderCustomHeader={customHeader}
                selected={startDate}
                onChange={(date) => onChange(date)}
                dateFormat="dd/MM/yyyy"
                locale="he"
                customInput={<CustomInput />}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                portalId="root-portal"
                popperPlacement="top-start"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            >
                <div className="flex justify-center p-2 border-t border-slate-600 bg-[#12242E]">
                    {/* שינוי: שימוש ב-onMouseDown במקום onClick */}
                    <button
                        onMouseDown={onClear} 
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded text-sm w-full"
                    >
                        נקה תאריך
                    </button>
                </div>
            </DatePicker>
        </>
    );
};