import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "YYYY-MM-DD", className, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || "");

  // Sync input value with external value changes
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const dateValue = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setInputValue(formattedDate);
      onChange(formattedDate);
      setIsOpen(false);
    } else {
      setInputValue("");
      onChange("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Try to parse the typed date
    if (val.length === 10) {
      const parsedDate = parse(val, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate)) {
        onChange(val);
      }
    }
  };

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        className="w-full pl-10 pr-3 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-emerald-500"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute left-0 h-full px-3 py-2 hover:bg-transparent text-emerald-600 dark:text-emerald-400 opacity-60 hover:opacity-100"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-slate-200 dark:border-slate-800 shadow-xl rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            initialFocus
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear() + 5}
            classNames={{
              caption_dropdowns: "flex gap-2 w-full justify-center pt-1",
              dropdown: "rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500",
              caption_label: "hidden",
              vhidden: "hidden"
            }}
            className="rounded-xl"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
