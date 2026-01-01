"use client";

import { Dialog, Transition } from "@headlessui/react";
import { useState, Fragment, useEffect, useRef, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { usePathname } from 'next/navigation';

export default function QrcodeComponent() {
  const currentRoute = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [show, setShow] = useState<string | null>(null);
  const [Authenticated, setAuthenticated] = useState(false);
  const [ShownAuthentication, setShownAutentication] = useState(false);
  const emitRequest = useRef(false);

  // הגדרה: הרכיב פעיל אך ורק בדף שליחת ההודעות
  const isRelevantPage = useMemo(() => currentRoute === "/messagesForm", [currentRoute]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isRelevantPage) return;
    if (emitRequest.current) return;

    const RequestSession = async () => {
      emitRequest.current = true;
      const baseUrl = "http://localhost:3000";
      const initUrl = `${baseUrl}/Initialize`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(initUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) return;
        const res_parse = await res.json();

        if (res_parse?.result === 'ready') {
          setAuthenticated(true);
        } else if (res_parse?.data) {
          setIsOpen(true);
          setShow(res_parse.data);
          
          const waitUrl = `${baseUrl}/WaitQr`;
          const res_2 = await fetch(waitUrl);
          if (res_2.ok) {
              const result_qr = await res_2.json();
              if (result_qr) {
                setIsOpen(false);
                setAuthenticated(true);
              }
          }
        }
      } catch (error) {
        console.warn("WhatsApp Server offline - bypassing.");
      }
    };

    RequestSession();
  }, [isMounted, isRelevantPage]);

  if (!isMounted || !isRelevantPage) return null;

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl text-center">
                <Dialog.Title className="text-xl font-bold mb-4">חיבור לוואטסאפ</Dialog.Title>
                {show ? <QRCodeCanvas value={show} size={250} className="mx-auto" /> : <p>טוען קוד...</p>}
                <button className="mt-6 px-4 py-2 bg-gray-100 rounded" onClick={() => setIsOpen(false)}>סגור</button>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
      {Authenticated && !ShownAuthentication && (
        <div className="fixed top-4 left-4 bg-green-500 text-white p-3 rounded-lg z-50 shadow-lg">✓ מחובר לוואטסאפ</div>
      )}
    </>
  );
}