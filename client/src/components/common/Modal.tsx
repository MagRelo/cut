import React, { Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
  showCloseButton?: boolean;
  /** Skip title bar; shows floating close + sr-only title for accessibility */
  hideHeader?: boolean;
  headerClassName?: string;
  contentClassName?: string;
  scrollable?: boolean;
  maxHeight?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-modal",
  "4xl": "max-w-modal-wide",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "2xl",
  showCloseButton = true,
  hideHeader = false,
  headerClassName = "",
  contentClassName = "",
  scrollable = false,
  maxHeight,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-5">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={`relative w-full ${maxWidthClasses[maxWidth]} transform rounded-sm bg-white text-left align-middle shadow-xl transition-all`}
              >
                {hideHeader ? (
                  <DialogTitle className="sr-only">{title || "Dialog"}</DialogTitle>
                ) : (
                  <div
                    className={`flex items-center justify-between rounded-t-sm border-b border-slate-200 bg-slate-100 px-4 py-3 ${headerClassName}`}
                  >
                    <DialogTitle className="font-display text-base font-semibold tracking-tight text-slate-600">
                      {title}
                    </DialogTitle>
                    {showCloseButton && (
                      <button
                        type="button"
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        onClick={onClose}
                        aria-label="Close"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div
                  className={`${scrollable ? "overflow-y-auto" : ""} ${contentClassName}`.trim()}
                  style={maxHeight ? { maxHeight } : undefined}
                >
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
