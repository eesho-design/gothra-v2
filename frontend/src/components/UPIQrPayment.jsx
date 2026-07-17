import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const UPI_ID = typeof import.meta !== "undefined" && import.meta.env?.VITE_UPI_ID 
  || "gpay-12196746481@okbizaxis";

export default function UPIQrPayment({ amount, orderId, businessName = "GOTHRA", showCopyButton = true }) {
  const [copied, setCopied] = React.useState(false);
  const amountInRupees = amount 
    ? (amount % 100 === 0 ? amount / 100 : (amount / 100).toFixed(2))
    : null;
  const tn = orderId || `order_${Date.now()}`;
  // am must be in paise (smallest currency unit) per UPI spec
  const upiAmount = amount || '';
  const upiURI = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(businessName)}${upiAmount ? `&am=${upiAmount}` : ''}&cu=INR&tn=${tn}`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = UPI_ID;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md border border-gray-100 max-w-sm mx-auto my-4">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Pay with GPay / UPI</h2>
      {amountInRupees && (
        <p className="text-sm text-gray-500 mb-4">
          Amount: <span className="font-semibold text-gray-800">₹{amountInRupees}</span>
        </p>
      )}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
        <QRCodeSVG value={upiURI} size={220} bgColor="#ffffff" fgColor="#000000" level="M" />
      </div>
      <p className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full font-medium mb-3">
        Scan with GPay, PhonePe, or Paytm
      </p>
      {showCopyButton && (
        <button
          onClick={copyUpiId}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full py-2.5 px-4 text-sm font-medium transition-colors mb-3 border border-gray-200"
        >
          {copied ? '✓ Copied!' : '📋 Copy UPI ID'}
        </button>
      )}
      <div className="text-xs text-gray-400 text-center space-y-1 max-w-[260px]">
        <p>UPI ID: <span className="font-mono text-gray-600">{UPI_ID}</span></p>
        {amountInRupees && <p>Amount: ₹{amountInRupees}</p>}
        {orderId && <p className="truncate">Order: {orderId}</p>}
      </div>
    </div>
  );
}
