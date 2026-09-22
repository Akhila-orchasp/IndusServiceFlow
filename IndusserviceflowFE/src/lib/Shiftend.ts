import { useEffect, useRef, useState } from "react";
import { resolveShiftEndQueue } from "../services/employeeService";

export interface ShiftEndGuardShift {
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

export interface ShiftEndResult {
  left_queue_count: number;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function useShiftEndGuard(
  employeeId: string | number | null | undefined,
  shift: ShiftEndGuardShift | null | undefined,
  hasUnattendedCustomers: boolean,
  onResolved?: (result: ShiftEndResult) => void
) {
  const [now, setNow] = useState(new Date());
  const firedForShiftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!employeeId || !shift) return;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = toMinutes(shift.start_time);
    const endMinutes = toMinutes(shift.end_time);
    const shiftKey = `${shift.start_time}-${shift.end_time}-${now.toDateString()}`;
    const shiftHasEnded =
      startMinutes < endMinutes && nowMinutes >= endMinutes;
    const alreadyFiredForThisShift = firedForShiftKeyRef.current === shiftKey;

    if (shiftHasEnded && !alreadyFiredForThisShift && hasUnattendedCustomers) {
      firedForShiftKeyRef.current = shiftKey;
      resolveShiftEndQueue(employeeId)
        .then((response) => {
          onResolved?.(response.data.data);
        })
    .catch(() => {
         
        });
    }
  }, [now, employeeId, shift, hasUnattendedCustomers, onResolved]);

  return { now };
}