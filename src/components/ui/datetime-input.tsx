import React from "react";
import { Input } from "@/components/ui/input";

interface DateTimeInputProps {
    value?: string; // Expects ISO-like string YYYY-MM-DDTHH:mm or similar
    onChange: (value: string) => void;
    id?: string;
    className?: string; // Add className prop to satisfy basic component usage
}

/**
 * A component that splits DateTime input into two controlled fields: Date and Time.
 * Forces the browser to strictly respect 24h format by using type="time".
 */
export function DateTimeInput({ value, onChange, id }: DateTimeInputProps) {
    // Value is expected to be "YYYY-MM-DDTHH:mm" (local literal)
    // If it comes as a full ISO with Z, we might need to be careful, but the parent form usually holds the local literal for editing.

    // Safety check parsing
    const datePart = value ? value.split('T')[0] : "";
    const timePart = value && value.includes('T') ? value.split('T')[1].substring(0, 5) : "";

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        if (!newDate) {
            // If date is cleared, we effectively clear the whole thing? 
            // Or keep time? Let's keep time if exists, but usually date is required.
            // If we return just "T12:00", it's invalid.
            // If date is empty, value is empty.
            onChange("");
            return;
        }
        const currentTime = timePart || "00:00";
        onChange(`${newDate}T${currentTime}`);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        const currentDate = datePart;

        if (!currentDate) {
            // Cannot set time without date effectively
            return;
        }
        onChange(`${currentDate}T${newTime}`);
    };

    return (
        <div className="flex gap-2 w-full" id={id}>
            <div className="flex-1">
                <Input
                    type="date"
                    value={datePart}
                    onChange={handleDateChange}
                    className="block w-full"
                />
            </div>
            <div className="w-32">
                <Input
                    type="time"
                    value={timePart}
                    onChange={handleTimeChange}
                    className="block w-full"
                // step="60" // Optional: force seconds or not. Default is usually minutes.
                />
            </div>
        </div>
    );
}
