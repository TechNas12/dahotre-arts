"use client";

import { useEffect, useState } from "react";
import { Printer, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [pageSize, setPageSize] = useState<"a4" | "a5">("a5");
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [usbSupported, setUsbSupported] = useState<boolean>(true);
  const [isSecure, setIsSecure] = useState<boolean>(true);

  useEffect(() => {
    // Load saved settings (default to A5 if not set)
    const savedSize = localStorage.getItem("printerPageSize");
    if (savedSize === "a4" || savedSize === "a5") {
      setPageSize(savedSize);
    } else {
      setPageSize("a5");
      localStorage.setItem("printerPageSize", "a5");
    }

    // Check for WebUSB support
    const nav: any = typeof navigator !== "undefined" ? navigator : undefined;
    const secure = typeof window !== "undefined" ? window.isSecureContext : false;
    setIsSecure(secure);
    
    if (!secure) {
      setUsbSupported(false);
      // We will show a specific message in the UI for insecure contexts
    } else if (nav && nav.usb) {
      checkPrinters();
      
      nav.usb.addEventListener("connect", (event: any) => {
        if (isPrinterDevice(event.device)) {
          setPrinterConnected(true);
          setPrinterName(event.device.productName || "Unknown Printer");
        }
      });

      nav.usb.addEventListener("disconnect", (event: any) => {
        if (isPrinterDevice(event.device)) {
          checkPrinters(); // re-evaluate remaining connected devices
        }
      });
    } else {
      setUsbSupported(false);
    }
  }, []);

  // Basic check if a USB device might be a printer based on its class
  // Class 7 is the standard USB class for printers
  const isPrinterDevice = (device: any) => {
    // Some printers might hide under vendor-specific classes, but we'll try checking interfaces if class is 7.
    // If we can't be sure, we'll just check if it's generally available.
    return device.configuration?.interfaces.some(
      (iface: any) => iface.alternates.some((alt: any) => alt.interfaceClass === 7)
    ) || device.deviceClass === 7;
  };

  const checkPrinters = async () => {
    try {
      const nav: any = navigator;
      const devices = await nav.usb.getDevices();
      // Assume any granted device might be our printer, or specifically look for printer class
      const printer = devices.find((d: any) => isPrinterDevice(d) || d.productName?.toLowerCase().includes("print"));
      if (printer) {
        setPrinterConnected(true);
        setPrinterName(printer.productName || "Unknown Printer");
      } else {
        setPrinterConnected(false);
        setPrinterName(null);
      }
    } catch (error) {
      console.error("Error checking USB devices", error);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "a4" | "a5";
    setPageSize(val);
    localStorage.setItem("printerPageSize", val);
  };

  const requestPrinter = async () => {
    try {
      const nav: any = navigator;
      if (!nav.usb) return;
      const device = await nav.usb.requestDevice({
        filters: [] // Allow user to pick any device if they know it's a printer
      });
      if (device) {
        setPrinterConnected(true);
        setPrinterName(device.productName || "Unknown Printer");
      }
    } catch (error) {
      console.error("User cancelled or no device selected", error);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto h-full">
      <h2 className="text-2xl font-bold text-[#F5F5F5] mb-8">Settings</h2>
      
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6 shadow-lg space-y-8">
        
        {/* Printer Settings */}
        <section>
          <div className="flex items-center gap-3 border-b border-[#1F1F1F] pb-4 mb-6">
            <Printer className="text-emerald-500 w-6 h-6" />
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Printer Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Page Size Option */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#A3A3A3]">
                Default Page Size (Bills)
              </label>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
              >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="a5">A5 (148 x 210 mm)</option>
              </select>
              <p className="text-xs text-[#F5F5F5]0">
                Determines the PDF document dimensions generated for orders.
              </p>
            </div>

            {/* Printer Connection Status */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#A3A3A3]">
                Hardware Connection
              </label>
              
              {!usbSupported ? (
                <div className="flex items-start gap-2 p-3 bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-[#F5F5F5]">
                    {!isSecure ? (
                      <>
                        <span className="font-semibold block mb-1">Network Access Detected</span>
                        Hardware printer detection requires a secure context. Because you are accessing the app over a local network IP instead of <span className="font-mono text-emerald-400 bg-[#111111] px-1 py-0.5 rounded">localhost</span>, this feature is disabled for security. Your system print dialog will still work.
                      </>
                    ) : (
                      "Your browser doesn't support WebUSB detection. Your system print dialog will be used instead."
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {printerConnected ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-emerald-400">Printer Connected</div>
                        <div className="text-xs text-[#A3A3A3]">{printerName || "USB Printer Active"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-lg">
                      <AlertCircle className="w-5 h-5 text-[#F5F5F5]0 shrink-0" />
                      <div className="text-sm text-[#A3A3A3]">
                        No printer detected natively.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={requestPrinter}
                    className="w-full py-2 px-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F5F5F5] text-sm font-medium rounded-lg border border-[#2A2A2A] transition-colors"
                  >
                    Detect USB Printer
                  </button>
                  <p className="text-xs text-[#F5F5F5]0 text-center">
                    (Requires a direct USB connection to this device)
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}


