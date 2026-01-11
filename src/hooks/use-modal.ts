import { useState, useCallback } from 'react';

/**
 * Modal state management hook with optional data context
 *
 * @template T - The type of data associated with the modal (optional)
 * @returns Modal state and control functions
 *
 * @example
 * // Simple modal without data
 * const { isOpen, open, close, toggle } = useModal();
 *
 * @example
 * // Modal with associated data (e.g., editing a customer)
 * const modal = useModal<Customer>();
 * modal.open(customerToEdit);
 * // Later: access modal.data to get the customer
 */
export function useModal<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  /**
   * Open the modal, optionally with associated data
   */
  const open = useCallback((modalData?: T) => {
    if (modalData !== undefined) {
      setData(modalData);
    }
    setIsOpen(true);
  }, []);

  /**
   * Close the modal and optionally clear data
   */
  const close = useCallback((clearData: boolean = true) => {
    setIsOpen(false);
    if (clearData) {
      setData(undefined);
    }
  }, []);

  /**
   * Toggle modal open/closed state
   */
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Update modal data without closing
   */
  const updateData = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData: updateData,
  };
}

/**
 * Confirmation modal hook - specialized version with confirm/cancel callbacks
 *
 * @template T - The type of data to confirm action on
 * @param {(data: T) => void | Promise<void>} onConfirm - Function to call on confirmation
 * @returns Confirmation modal state and controls
 *
 * @example
 * const deleteModal = useConfirmModal<Customer>(async (customer) => {
 *   await deleteCustomer(customer.id);
 * });
 *
 * // Trigger confirmation
 * deleteModal.prompt(customerToDelete);
 *
 * // In your component
 * <ConfirmDialog
 *   isOpen={deleteModal.isOpen}
 *   onConfirm={deleteModal.confirm}
 *   onCancel={deleteModal.cancel}
 * />
 */
export function useConfirmModal<T = undefined>(
  onConfirm?: (data: T) => void | Promise<void>
) {
  const modal = useModal<T>();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Open modal with data to confirm action on
   */
  const prompt = useCallback((data: T) => {
    modal.open(data);
  }, [modal]);

  /**
   * Confirm the action
   */
  const confirm = useCallback(async () => {
    if (onConfirm && modal.data !== undefined) {
      setIsProcessing(true);
      try {
        await onConfirm(modal.data);
        modal.close();
      } catch (error) {
        console.error('Confirmation action failed:', error);
        // Don't close on error - let user retry
      } finally {
        setIsProcessing(false);
      }
    } else {
      modal.close();
    }
  }, [modal, onConfirm]);

  /**
   * Cancel the action
   */
  const cancel = useCallback(() => {
    modal.close();
  }, [modal]);

  return {
    isOpen: modal.isOpen,
    data: modal.data,
    isProcessing,
    prompt,
    confirm,
    cancel,
  };
}
