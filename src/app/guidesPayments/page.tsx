"use client";
import { useState, useContext, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { YearContext } from "@/context/YearContext";
import { checkIsAdmin } from "@/lib/authUtils"; // מוודא שיש לך גישה לפונקציה הזו
import UnpaidReportsTab from "./tabs/UnpaidReportsTab";
import PaidPaymentsTab from "./tabs/PaidPaymentsTab";
import ReceiptsTab from "./tabs/ReceiptsTab";

export default function GuidesPaymentsDashboard() {
  const { user } = useUser();
  const { selectedYear } = useContext(YearContext);
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid" | "accounting">("unpaid");

  // בדיקה האם המשתמש המחובר הוא אדמין
  const isAdmin = useMemo(() => checkIsAdmin(user), [user]);

  return (
    <div className="p-8 max-w-7xl mx-auto rtl w-full" dir="rtl">
      {/* כותרת משתנה לפי סוג המשתמש */}
    <h1 className="text-3xl font-bold text-gray-800 mb-8">
  {isAdmin 
    ? `ניהול תשלומים למדריכים ${selectedYear || ""}` 
    : `דיווח שעות מדריכים/ות ${selectedYear || ""}`}
</h1>

      {/* תפריט הניווט מוצג רק לאדמין */}
     {isAdmin && (
        <div className="flex space-x-reverse space-x-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("unpaid")}
            className={`py-3 px-6 text-sm font-medium transition-colors ${
              activeTab === "unpaid" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            דיווחי מדריכים (טרם שולמו)
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`py-3 px-6 text-sm font-medium transition-colors ${
              activeTab === "paid" ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            שולם למדריכים (ממתין לקבלה)
          </button>
          {/* הכפתור החדש */}
          <button
            onClick={() => setActiveTab("accounting")}
            className={`py-3 px-6 text-sm font-medium transition-colors ${
              activeTab === "accounting" ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            קבלות והנהח
          </button>
        </div>
      )}

      {/* הצגת התוכן */}
      <div className="animate-in fade-in duration-300">
        {/* הוספת ה-key מבטיחה שהלשונית תתרענן כשנחליף שנה */}
        {activeTab === "unpaid" && (
          <UnpaidReportsTab key={selectedYear} isAdmin={isAdmin} />
        )}
        
        {activeTab === "paid" && isAdmin && (
          <PaidPaymentsTab key={selectedYear} />
        )}

        {/* הצגת הלשונית השלישית */}
        {activeTab === "accounting" && isAdmin && (
          <ReceiptsTab key={selectedYear} />
        )}
      </div>
    </div>
  );
}