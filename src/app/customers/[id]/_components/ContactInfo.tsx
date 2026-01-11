'use client';

import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import type { Customer } from '@/types/database';

interface ContactInfoProps {
  customer: Customer;
}

export function ContactInfo({ customer }: ContactInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card-glass p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <User className="text-blue-400" size={20} />
        </div>
        <h2 className="text-xl font-semibold dark:text-white">Contact Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail className="text-blue-400 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-text">{customer.email || 'Not provided'}</p>
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Mail size={16} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3">
          <Phone className="text-green-400 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-text">{customer.phone}</p>
              <a
                href={`tel:${customer.phone}`}
                className="text-green-600 dark:text-green-400 hover:underline cursor-pointer"
              >
                <Phone size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3 md:col-span-2">
          <MapPin className="text-red-400 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
            <p className="font-medium text-text">{customer.address || 'Not provided'}</p>
          </div>
        </div>

        {/* Customer Since */}
        <div className="flex items-start gap-3">
          <Calendar className="text-purple-400 mt-1" size={20} />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Since</p>
            <p className="font-medium text-text">
              {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
