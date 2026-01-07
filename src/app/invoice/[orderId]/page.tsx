'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  tire: {
    brand: string;
    model: string;
    size: string;
  };
}

interface WorkOrder {
  id: string;
  service_type: string;
  status: string;
  scheduled_date: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  customer: {
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
  };
  work_order_items: OrderItem[];
}

// Service pricing map
const SERVICE_PRICES: Record<string, number> = {
  tire_replacement: 0, // Included with tire purchase
  rotation: 25,
  balance: 20,
  alignment: 75,
  repair: 30,
  installation: 15,
};

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { shop } = useAuth();
  const supabase = createClient();

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.orderId as string;

  useEffect(() => {
    async function loadOrder() {
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select(`
            id,
            service_type,
            status,
            scheduled_date,
            notes,
            total_amount,
            created_at,
            customer:customers(name, email, phone, address),
            work_order_items(
              id,
              quantity,
              unit_price,
              tire:inventory(brand, model, size)
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data as unknown as WorkOrder);
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId, supabase]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const tiresSubtotal = order.work_order_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const servicePrice = SERVICE_PRICES[order.service_type] || 0;
  const subtotal = tiresSubtotal + servicePrice;
  const taxRate = shop?.tax_rate || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format service name
  const serviceName = order.service_type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <>
      {/* Print-hidden controls */}
      <div className="print:hidden fixed top-4 left-4 right-4 z-50 flex justify-between items-center bg-white p-4 rounded-xl shadow-xl border border-gray-200">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Printer size={16} />
          Print / Save PDF
        </Button>
      </div>

      {/* Invoice Content - Modern Minimal Design */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8 pt-24 print:pt-8 print:bg-white">
        <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-2xl rounded-2xl print:rounded-none overflow-hidden">
          {/* Header with accent bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 print:h-1"></div>

          <div className="p-12 print:p-8">
            {/* Top Section */}
            <div className="flex justify-between items-start mb-12">
              {/* Company Info */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">{shop?.name || 'Tire Shop'}</h1>
                <div className="space-y-1 text-gray-600">
                  {shop?.address && <p>{shop.address}</p>}
                  {shop?.phone && <p>{shop.phone}</p>}
                  {shop?.email && <p>{shop.email}</p>}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="text-right">
                <div className="inline-block bg-blue-50 px-6 py-3 rounded-lg mb-4">
                  <h2 className="text-3xl font-bold text-blue-600">INVOICE</h2>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-gray-500">Invoice #</span>
                    <span className="font-semibold text-gray-900">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold text-gray-900">{invoiceDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="mb-12">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bill To</div>
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200">
                <p className="font-bold text-xl text-gray-900 mb-2">{order.customer.name}</p>
                <div className="space-y-1 text-gray-600">
                  {order.customer.address && <p>{order.customer.address}</p>}
                  <p>{order.customer.phone}</p>
                  {order.customer.email && <p>{order.customer.email}</p>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">Description</th>
                    <th className="text-center py-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">Qty</th>
                    <th className="text-right py-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">Price</th>
                    <th className="text-right py-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Tire Items */}
                  {order.work_order_items.map((item, index) => (
                    <tr key={item.id} className={index !== order.work_order_items.length - 1 || servicePrice > 0 ? 'border-b border-gray-100' : ''}>
                      <td className="py-5">
                        <p className="font-semibold text-gray-900 text-base">
                          {item.tire.brand} {item.tire.model}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{item.tire.size}</p>
                      </td>
                      <td className="text-center py-5 text-gray-900 font-medium">{item.quantity}</td>
                      <td className="text-right py-5 text-gray-700">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="text-right py-5 text-gray-900 font-semibold">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Service Line Item */}
                  {servicePrice > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-5">
                        <p className="font-semibold text-gray-900 text-base">{serviceName}</p>
                        <p className="text-sm text-gray-500 mt-1">Professional service</p>
                      </td>
                      <td className="text-center py-5 text-gray-900 font-medium">1</td>
                      <td className="text-right py-5 text-gray-700">
                        ${servicePrice.toFixed(2)}
                      </td>
                      <td className="text-right py-5 text-gray-900 font-semibold">
                        ${servicePrice.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-12">
              <div className="w-80">
                <div className="space-y-3">
                  <div className="flex justify-between py-3 text-base">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between py-3 text-base border-t border-gray-100">
                      <span className="text-gray-600">Tax ({taxRate}%)</span>
                      <span className="font-semibold text-gray-900">${tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-4 border-t-2 border-gray-900">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</div>
                <p className="text-gray-700 leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-900 font-semibold text-lg mb-2">Thank you for your business!</p>
              <p className="text-gray-500 text-sm">We appreciate your trust in {shop?.name || 'our services'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      `}</style>
    </>
  );
}
