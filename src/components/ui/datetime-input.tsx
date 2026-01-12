import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
    value?: string;
    onChange: (value: string) => void;
    id?: string;
    className?: string;
    includeTime?: boolean; // New prop to control time input
}

export function DateTimeInput({ value, onChange, id, className, includeTime = true }: DateTimeInputProps) {
    // Parse initial values
    const datePart = value ? value.split('T')[0] : "";
    const timePart = value && value.includes('T') ? value.split('T')[1].substring(0, 5) : "";

    // Local state for time input to allow typing without jitter
    const [timeInput, setTimeInput] = useState(timePart);

    useEffect(() => {
        setTimeInput(timePart);
    }, [timePart]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        if (!newDate) {
            onChange("");
            return;
        }

        if (!includeTime) {
            onChange(`${newDate}T00:00:00`); // Normalize to midnight if time invalid/hidden
            return;
        }

        // Keep existing time or default to 00:00
        const currentTime = timeInput || "00:00";
        onChange(`${newDate}T${currentTime}`);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Basic filtering: only numbers and colon
        if (!/^[0-9:]*$/.test(input)) return;

        // Auto-insert colon
        if (input.length === 2 && timeInput.length === 1 && !input.includes(':')) {
            input += ':';
        }

        setTimeInput(input);

        // Update parent only if valid HH:mm
        if (input.length === 5 && input.includes(':')) {
            const [hh, mm] = input.split(':').map(Number);
            if (!isNaN(hh) && !isNaN(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                const currentDate = datePart;
                if (currentDate) {
                    onChange(`${currentDate}T${input}`);
                }
            }
        }
    };

    const handleTimeBlur = () => {
        // Validation on blur
        if (timeInput.length === 5) {
            const [hh, mm] = timeInput.split(':').map(Number);
            if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) {
                setTimeInput(""); // Clear invalid
            }
        } else {
            // Incomplete
            setTimeInput("");
        }
    }

    return (
        <div className={cn("flex gap-2 w-full", className)} id={id}>
            <div className={`flex-1 ${!includeTime ? 'w-full' : ''}`}>
                <Input
                    type="date"
                    value={datePart}
                    onChange={handleDateChange}
                    className="block w-full"
                />
            </div>
            {includeTime && (
                <div className="w-24 shrink-0">
                    <Input
                        type="text"
                        value={timeInput}
                        onChange={handleTimeChange}
                        onBlur={handleTimeBlur}
                        className="block w-full text-center"
                        placeholder="HH:mm"
                        maxLength={5}
                    />
                </div>
            )}
        </div>
    );
}
