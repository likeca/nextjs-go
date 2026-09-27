'use client';

import * as React from 'react';
import PhoneInputWithCountrySelect, { type Value } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

export type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> & {
  onChange: (value: Value | undefined) => void;
  value?: Value | undefined;
  error?: boolean;
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, error, ...props }, ref) => {
    return (
      <PhoneInputWithCountrySelect
        international
        defaultCountry="US"
        value={value}
        onChange={onChange}
        className={cn(
          'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input',
          className
        )}
        numberInputProps={{
          className: 'outline-none bg-transparent flex-1 border-none focus:ring-0',
        }}
        countrySelectProps={{
          className: 'outline-none bg-transparent border-none focus:ring-0',
        }}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
