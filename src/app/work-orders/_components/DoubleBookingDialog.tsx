'use client';

import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WorkOrderWithDetails } from '@/types/database';

interface DoubleBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictingOrders: WorkOrderWithDetails[];
  onChangeTime: () => void;
  onScheduleAnyway: () => void;
}

export function DoubleBookingDialog({
  open,
  onOpenChange,
  conflictingOrders,
  onChangeTime,
  onScheduleAnyway,
}: DoubleBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/20">
              <AlertCircle size={20} className="text-warning" />
            </div>
            Schedule Conflict
          </DialogTitle>
          <DialogDescription>
            There {conflictingOrders.length === 1 ? 'is' : 'are'} already {conflictingOrders.length} appointment{conflictingOrders.length !== 1 ? 's' : ''} scheduled at this time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-32 overflow-y-auto space-y-2">
            {conflictingOrders.map(order => (
              <div key={order.id} className="p-3 bg-bg-light rounded-lg border border-border-muted">
                <p className="font-medium text-text text-sm">{order.customer_name}</p>
                <p className="text-xs text-text-muted">{order.service_type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-text-muted">
            Do you still want to schedule this appointment at the same time?
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onChangeTime}
              className="flex-1"
            >
              Change Time
            </Button>
            <Button
              type="button"
              onClick={onScheduleAnyway}
              className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              Schedule Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
