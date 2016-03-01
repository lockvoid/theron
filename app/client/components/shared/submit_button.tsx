import * as React from 'react';

import { AppSpinner } from '../../../../lib/components/app_spinner';

export const SubmitButton = ({ title, submitting, className } : { title: string, className?: string, submitting?: boolean }) => (
  <button type="submit" className={`primary ${className}`}>
    {submitting ? <AppSpinner /> : title}
  </button>
);
