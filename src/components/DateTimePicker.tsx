'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateTimePickerProps {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  label?: string;
}

export default function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  label = 'Schedule',
}: DateTimePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (!date) return new Date();
    // Parse date in local timezone to avoid day-off issues
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
        setShowTimePicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    // Parse date in local timezone to avoid day-off issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'pm' : 'am';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const handleDateSelect = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateChange(dateStr);
    setShowCalendar(false);
  };

  const generateTimeOptions = () => {
    const times = [];
    const startHour = 5; // 5:00 AM
    const endHour = 21; // 9:00 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        // Skip times after 9:00 PM
        if (hour === endHour && minute > 0) break;

        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        times.push(timeStr);
      }
    }
    return times;
  };

  const getNextAvailableTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Round up to next 5-min slot
    const nextMinute = Math.ceil(currentMinute / 5) * 5;
    const nextHour = nextMinute >= 60 ? currentHour + 1 : currentHour;
    const finalMinute = nextMinute >= 60 ? 0 : nextMinute;

    // Clamp to business hours (5 AM - 9 PM)
    const clampedHour = Math.max(5, Math.min(21, nextHour));

    // If we're past 9 PM, default to 9:00 AM next day
    if (clampedHour >= 21 && finalMinute > 0) {
      return '09:00';
    }

    return `${String(clampedHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
  };

  const isOutsideBusinessHours = (timeStr: string) => {
    if (!timeStr) return false;
    const [hours] = timeStr.split(':').map(Number);
    return hours < 5 || hours >= 21;
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number, month: number, year: number) => {
    if (!date) return false;
    // Parse date in local timezone to avoid day-off issues
    const [selectedYear, selectedMonth, selectedDay] = date.split('-').map(Number);
    return (
      day === selectedDay &&
      month === selectedMonth - 1 &&
      year === selectedYear
    );
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date Picker */}
        <div ref={calendarRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowCalendar(!showCalendar);
              setShowTimePicker(false);
            }}
            className="w-full h-11 px-3 rounded-lg border border-border-muted bg-bg-light text-text flex items-center gap-2 hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent"
          >
            <Calendar size={16} className="text-text-muted flex-shrink-0" />
            <span className="flex-1 text-left text-xs">{formatDisplayDate(date)}</span>
          </button>

          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl bg-bg-light backdrop-blur-xl border border-border-muted shadow-2xl z-50"
                suppressHydrationWarning
              >
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCurrentMonth(newMonth);
                    }}
                    className="p-2 rounded-lg bg-bg-light hover:bg-bg border border-border-muted transition-all"
                  >
                    <ChevronLeft size={16} className="text-text-muted" />
                  </button>
                  <h4 className="text-sm font-semibold text-text">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCurrentMonth(newMonth);
                    }}
                    className="p-2 rounded-lg bg-bg-light hover:bg-bg border border-border-muted transition-all"
                  >
                    <ChevronRight size={16} className="text-text-muted" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-text-muted py-2">
                      {day}
                    </div>
                  ))}
                  {(() => {
                    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                    const days = [];

                    // Empty cells
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(<div key={`empty-${i}`} className="aspect-square" />);
                    }

                    // Days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const today = isToday(day, month, year);
                      const selected = isSelected(day, month, year);

                      days.push(
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDateSelect(day, month, year)}
                          className={`aspect-square rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            selected
                              ? 'bg-bg-light text-text hover:bg-highlight hover:text-text'
                              : today
                              ? 'bg-info/20 text-text ring-1 ring-info hover:bg-highlight hover:text-text'
                              : 'text-text hover:bg-highlight hover:text-text'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }

                    return days;
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Time Picker */}
        <div ref={timeRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTimePicker(!showTimePicker);
              setShowCalendar(false);
            }}
            className="w-full h-11 px-3 rounded-lg border border-border-muted bg-bg-light text-text flex items-center gap-2 hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent"
          >
            <Clock size={16} className="text-text-muted flex-shrink-0" />
            <span className="flex-1 text-left text-xs">{formatDisplayTime(time)}</span>
          </button>

          <AnimatePresence>
            {showTimePicker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-bg-light backdrop-blur-xl border border-border-muted shadow-2xl z-50 max-h-64 overflow-y-auto"
              >
                {(() => {
                  const timeOptions = generateTimeOptions();
                  const hasCurrentTime = time && timeOptions.includes(time);
                  const showCurrentTimeOutsideHours = time && !hasCurrentTime && isOutsideBusinessHours(time);

                  return (
                    <>
                      {/* Show current time if it's outside business hours (for saved work orders) */}
                      {showCurrentTimeOutsideHours && (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            onTimeChange(time);
                            setShowTimePicker(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm transition-all border-b border-border-muted bg-primary/20 text-primary font-semibold flex items-center justify-between cursor-pointer hover:bg-highlight"
                        >
                          <span>{formatDisplayTime(time)}</span>
                          <span className="text-xs text-warning">(Outside hours)</span>
                        </button>
                      )}

                      {/* Regular business hours time options */}
                      {timeOptions.map((timeOption) => (
                        <button
                          key={timeOption}
                          type="button"
                          onClick={() => {
                            onTimeChange(timeOption);
                            setShowTimePicker(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-all border-b border-border-muted last:border-b-0 cursor-pointer ${
                            time === timeOption
                              ? 'bg-bg-light text-text hover:bg-highlight font-semibold'
                              : 'text-text hover:bg-highlight'
                          }`}
                        >
                          {formatDisplayTime(timeOption)}
                        </button>
                      ))}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
