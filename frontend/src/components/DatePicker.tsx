import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fmtDate, parseDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string // 'YYYY-MM-DD'
  onChange: (iso: string) => void
  max?: string // 可選的最晚日(含)
  disabled?: boolean
  className?: string
}

export default function DatePicker({ value, onChange, max, disabled, className }: DatePickerProps) {
  const selected = parseDate(value)
  const maxDate = max ? parseDate(max) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('h-10 justify-start gap-2 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="h-4 w-4" />
          {value || '選擇日期'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => d && onChange(fmtDate(d))}
          disabled={maxDate ? { after: maxDate } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
