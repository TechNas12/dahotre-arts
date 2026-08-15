"use client";

import { useEffect, useState } from "react";
import { Printer, CheckCircle2, AlertCircle, Building2, CreditCard, Shield, Settings2, Save } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";

type Tab = "general" | "printer" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // General Settings State
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [upiId, setUpiId] = useState("");

  // Printer & POS Settings State
  const [pageSize, setPageSize] = useState<"a4" | "a5">("a5");
  const [autoPrint, setAutoPrint] = useState(false);
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // USB Printer State
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [usbSupported, setUsbSupported] = useState<boolean>(true);
  const [isSecure, setIsSecure] = useState<boolean>(true);

  useEffect(() => {
    // Load saved settings
    setBusinessName(localStorage.getItem("settings_businessName") || "Dahotre Arts");
    setBusinessAddress(localStorage.getItem("settings_businessAddress") || "Mumbai, Maharashtra");
    setBusinessPhone(localStorage.getItem("settings_businessPhone") || "");
    setGstin(localStorage.getItem("settings_gstin") || "");
    setUpiId(localStorage.getItem("settings_upiId") || "");
    setAutoPrint(localStorage.getItem("settings_autoPrint") === "true");

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
          checkPrinters();
        }
      });
    } else {
      setUsbSupported(false);
    }
  }, []);

  const isPrinterDevice = (device: any) => {
    return device.configuration?.interfaces.some(
      (iface: any) => iface.alternates.some((alt: any) => alt.interfaceClass === 7)
    ) || device.deviceClass === 7;
  };

  const checkPrinters = async () => {
    try {
      const nav: any = navigator;
      const devices = await nav.usb.getDevices();
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

  const requestPrinter = async () => {
    try {
      const nav: any = navigator;
      if (!nav.usb) return;
      const device = await nav.usb.requestDevice({
        filters: []
      });
      if (device) {
        setPrinterConnected(true);
        setPrinterName(device.productName || "Unknown Printer");
      }
    } catch (error) {
      console.error("User cancelled or no device selected", error);
    }
  };

  const handleSaveGeneral = () => {
    setIsSaving(true);
    localStorage.setItem("settings_businessName", businessName);
    localStorage.setItem("settings_businessAddress", businessAddress);
    localStorage.setItem("settings_businessPhone", businessPhone);
    localStorage.setItem("settings_gstin", gstin);
    localStorage.setItem("settings_upiId", upiId);
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("General settings saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    }, 800);
  };

  const handleSavePrinter = () => {
    setIsSaving(true);
    localStorage.setItem("printerPageSize", pageSize);
    localStorage.setItem("settings_autoPrint", autoPrint.toString());
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Printer & POS settings saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    }, 800);
  };

  const handleSaveSecurity = async () => {
    if (newPassword !== confirmPassword) {
      setSaveMessage("Passwords do not match!");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }
    setIsSaving(true);
    
    const res = await updatePasswordAction(currentPassword, newPassword);
    
    setIsSaving(false);
    
    if (res.error) {
      setSaveMessage(`Error: ${res.error}`);
    } else {
      setSaveMessage("Security settings updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      <div className="p-6 border-b border-[#1F1F1F]">
        <h2 className="text-2xl font-bold text-[#F5F5F5] flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-orange-500" />
          Settings
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Manage your business profile, POS preferences, and security.</p>
      </div>
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#1F1F1F] bg-[#111111] p-4 space-y-2 shrink-0">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "general" ? "bg-orange-500/10 text-orange-500" : "text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
            }`}
          >
            <Building2 className="w-5 h-5" />
            General
          </button>
          <button
            onClick={() => setActiveTab("printer")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "printer" ? "bg-orange-500/10 text-orange-500" : "text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
            }`}
          >
            <Printer className="w-5 h-5" />
            Printer & POS
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "security" ? "bg-orange-500/10 text-orange-500" : "text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
            }`}
          >
            <Shield className="w-5 h-5" />
            Security
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-3xl">
            {saveMessage && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                saveMessage.includes("match") ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
              } animate-[fadeInDown_0.2s_ease-out]`}>
                {saveMessage.includes("match") ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                <span className="font-medium">{saveMessage}</span>
              </div>
            )}

            {/* General Settings Tab */}
            {activeTab === "general" && (
              <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                <section className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#F5F5F5] mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-orange-500" />
                    Business Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Business Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full ds-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Phone Number</label>
                      <input
                        type="text"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className="w-full ds-input"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Business Address</label>
                      <textarea
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        rows={2}
                        className="w-full ds-input resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">GSTIN (Optional)</label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        className="w-full ds-input uppercase"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#F5F5F5] mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    Payment Preferences
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2 max-w-md">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Store UPI ID</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="merchant@upi"
                        className="w-full ds-input"
                      />
                      <p className="text-xs text-[#737373]">Used to generate QR codes for customer payments.</p>
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="ds-btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Printer & POS Settings Tab */}
            {activeTab === "printer" && (
              <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                <section className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#F5F5F5] mb-6 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-orange-500" />
                    Receipt Settings
                  </h3>
                  <div className="space-y-6 max-w-md">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Default Page Size</label>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(e.target.value as "a4" | "a5")}
                        className="w-full ds-select"
                      >
                        <option value="a4">A4 (210 x 297 mm)</option>
                        <option value="a5">A5 (148 x 210 mm)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]">
                      <input
                        type="checkbox"
                        id="autoPrint"
                        checked={autoPrint}
                        onChange={(e) => setAutoPrint(e.target.checked)}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#111111] text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                      />
                      <label htmlFor="autoPrint" className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-[#F5F5F5]">Auto-print receipts</div>
                        <div className="text-xs text-[#A3A3A3]">Automatically print when an order is completed</div>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#F5F5F5] mb-6 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-orange-500" />
                    Hardware Connection
                  </h3>
                  
                  {!usbSupported ? (
                    <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-[#F5F5F5]">
                        {!isSecure ? (
                          <>
                            <span className="font-semibold block mb-1">Network Access Detected</span>
                            Hardware printer detection requires a secure context. Because you are accessing the app over a local network IP instead of <span className="font-mono text-orange-400 bg-[#0A0A0A] px-1 py-0.5 rounded">localhost</span>, this feature is disabled. Your system print dialog will still work.
                          </>
                        ) : (
                          "Your browser doesn't support WebUSB detection. Your system print dialog will be used instead."
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      {printerConnected ? (
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-green-500">Printer Connected</div>
                            <div className="text-xs text-green-500/70">{printerName || "USB Printer Active"}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                          <AlertCircle className="w-5 h-5 text-[#A3A3A3] shrink-0" />
                          <div className="text-sm text-[#A3A3A3]">
                            No hardware printer detected.
                          </div>
                        </div>
                      )}

                      <button
                        onClick={requestPrinter}
                        className="w-full py-2.5 px-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F5F5F5] text-sm font-medium rounded-lg border border-[#2A2A2A] transition-colors"
                      >
                        Detect USB Printer
                      </button>
                      <p className="text-xs text-[#737373] text-center">
                        Requires a direct USB connection to this device.
                      </p>
                    </div>
                  )}
                </section>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePrinter}
                    disabled={isSaving}
                    className="ds-btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                <section className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#F5F5F5] mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-500" />
                    Change Password
                  </h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full ds-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full ds-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#A3A3A3]">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full ds-input"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSecurity}
                    disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                    className="ds-btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
