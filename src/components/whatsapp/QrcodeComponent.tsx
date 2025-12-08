"use client";

import { Dialog, Transition } from "@headlessui/react";
import { useState, Fragment, useEffect, useRef, useMemo } from "react";
import QRCode, { QRCodeCanvas } from "qrcode.react";
import { sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { usePathname, useRouter } from 'next/navigation'
export default function QrCode() {

  // i want to show the "Successfully Connected" only at pages that use whatsapp
  const currentRoute = usePathname()

  const releventRoutes = useMemo(() => ["/messagesForm", "/placementsPage"], [])

  let [isOpen, setIsOpen] = useState(false);

  const [show, setShow] = useState(null);

  const [Authenticated, setAuthenticated] = useState(false);
  const [Initialized, setInitialized] = useState(false);
  const [loaded_Qr, setloadedQr] = useState(false);
  const [ShownAuthentication, setShownAutentication] = useState(false);

  // this will detect if request is emitted so that the request will not be emitted more than ocne.
  const emitRequest = useRef(false)

  useEffect(() => {
    console.log(currentRoute)


  }, [currentRoute])


  useEffect(() => {
    // if session does not exist, return qr, else return ready string.
    const RequestSession = async () => {
      emitRequest.current = true
     const req_address: string = `${process.env.NEXT_PUBLIC_IP_ADDRESS}/Initialize`
      fetch(req_address, {
        method: "GET",
      }).then(async (res) => {
        if (res.status == 500) {


        }

        const res_parse: { result: string, data?: string } = await res.json();
        // if there is already a saved session.
        if (res_parse && res_parse.result === 'ready') {
          setIsOpen(false);
          setAuthenticated(true);
          return;
        }
        // if session does not exist, wait for ready flag.
        else if (res_parse && res_parse.data) {
          setIsOpen(true);
          setShow(res_parse.data);
          setloadedQr(true);
          // make it return so that the qr screen will render and then wait for ready.
          const req_address: string = "https://".concat(process.env.NEXT_PUBLIC_IP_ADDRESS, "/WaitQr")
          fetch(req_address, {
            method: "GET",
          }).then(async (res_2) => {
            // if timedout, send another request.
            if (res_2.status == 500) {


            }
            else {
              const result_qr = await res_2.json();
              if (result_qr) {
                setIsOpen(false);
                setAuthenticated(true);
              }

            }

          })
        };
      })
    }

    if (!emitRequest.current) {
      RequestSession();

    }



  }, []);

  // this will stop showing the Authentication Success window.
  useEffect(() => {
    if (Authenticated === true) {
      const timeoutId = setTimeout(() => setShownAutentication(true), 2000); // Change 1000 to adjust delay (in milliseconds)

      return () => clearTimeout(timeoutId); // Cleanup function to prevent memory leaks
    }

  }, [Authenticated]);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }
  const getSuccessModal = () => {
    return (
      <div style={{ display: ShownAuthentication ? "none" : "block" }}>
        <div
          id="successModal"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed flex content-center overflow-y-auto overflow-x-hidden  right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-modal md:h-full"
        >
          <div className="relative p-4 w-full max-w-md h-full md:h-auto">
            <div className="relative p-4 text-center bg-white rounded-lg shadow dark:bg-gray-800 sm:p-5">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5">
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 text-green-500 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="sr-only">Success</span>
              </div>
              <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                התחבר לוואטסאפ בהצלחה
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const getModal = (): any => {
    if (Authenticated === true && releventRoutes.includes(currentRoute)) {
      return getSuccessModal();
    } else {
      return (
        <>
          <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={closeModal}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/25" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-[600px] h-[700px]  transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        לא זוהה חיבור לוואטסאפ
                        <p />
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          <li>:סרוק את הקוד הבא</li>
                        </p>
                      </div>
                      <div>
                        <div className="block ml-auto mr-auto absolute">
                          <QRCodeCanvas value={show} size={512} />
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        </>
      );
    }
  };

  return getModal();
}