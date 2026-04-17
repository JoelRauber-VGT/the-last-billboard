# Error Handling Examples - Visual Guide

## Toast Notifications

### Success Toast (Green)
```
┌─────────────────────────────────────┐
│ ✓ Report submitted successfully    │
│   Thank you!                        │
└─────────────────────────────────────┘
```

### Error Toast (Red)
```
┌─────────────────────────────────────┐
│ ✕ Failed to load data              │
│   Please try again                  │
└─────────────────────────────────────┘
```

### Warning Toast (Yellow)
```
┌─────────────────────────────────────┐
│ ⚠ Processing your payment          │
│   Please check back in a moment     │
└─────────────────────────────────────┘
```

## Error States

### Dashboard Error State
```
┌─────────────────────────────────────────────────┐
│ ⚠ Failed to load data                          │
│                                                 │
│ Something went wrong. Please try again.        │
│                                                 │
│ [Retry]                                        │
└─────────────────────────────────────────────────┘
```

### Admin Reports Error State
```
┌─────────────────────────────────────────────────┐
│ ⚠ Failed to load data                          │
│                                                 │
│ Something went wrong. Please try again.        │
│                                                 │
│ [Retry]                                        │
└─────────────────────────────────────────────────┘
```

## Stripe Pages

### Success Page
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              ✓ (green circle)                   │
│                                                 │
│       Payment Successful                        │
│                                                 │
│   Your bid is being processed.                 │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Your bid is being processed. You should    │ │
│ │ see your slot appear on the billboard      │ │
│ │ shortly.                                   │ │
│ │                                            │ │
│ │ Check your email for a payment             │ │
│ │ confirmation.                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [View Billboard]  [Go to Dashboard]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Cancel Page
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              ✕ (yellow circle)                  │
│                                                 │
│       Payment Cancelled                         │
│                                                 │
│   You can try again or return to the           │
│   billboard.                                    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Your payment was not completed. No charges │ │
│ │ have been made to your account.            │ │
│ │                                            │ │
│ │ You can try again or return to the         │ │
│ │ billboard to browse other options.         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Try Again]  [Back to Billboard]               │
│                                                 │
│ ❓ Contact Support                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Bid Form Error States

### Image Upload Error
```
┌─────────────────────────────────────────────────┐
│ Image (optional)                               │
│                                                 │
│ [Choose File] No file chosen                   │
│                                                 │
│ Max 2MB, PNG/JPEG/WEBP                         │
│                                                 │
│ Toast appears: ✕ File too large (max 2MB)      │
└─────────────────────────────────────────────────┘
```

### Upload Failed Error
```
┌─────────────────────────────────────────────────┐
│ ⚠ Upload failed. Please try again.             │
│                                                 │
│ Toast appears: ✕ Upload failed. Please try     │
│                  again.                         │
└─────────────────────────────────────────────────┘
```

## API Error Examples

### 401 Unauthorized
```
Toast: ✕ You must be logged in to do that.
Action: Redirects to /login after 1.5s
```

### 403 Forbidden
```
Toast: ✕ You don't have permission to do that.
```

### 429 Rate Limit
```
Toast: ✕ Too many requests. Please wait and try again.
```

### 500 Server Error
```
Toast: ✕ Server error. We've been notified and are working on it.
Console: Detailed error logged for debugging
```

### Network Error
```
Toast: ✕ Network error. Please check your connection.
```

## Admin Action Examples

### Dismiss Report Success
```
Toast: ✓ Report dismissed successfully
```

### Remove Slot with Refund
```
Toast: ✓ Slot removed with refund
```

### Toggle Admin Status
```
Toast: ✓ Admin status updated successfully
```

### Action Failed
```
Toast: ✕ Action failed. Please try again.
```

## Error Boundary (500 Page)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              ⚠ (red circle)                     │
│                                                 │
│                500                              │
│                                                 │
│       Something went wrong                      │
│                                                 │
│   We've been notified of the issue and are     │
│   working to fix it.                           │
│                                                 │
│   Error ID: abc123def456                       │
│                                                 │
│ [Try Again]  [Back to Home]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Translation Examples

### English
- "Something went wrong. Please try again."
- "Failed to load data."
- "You must be logged in to do that."

### German
- "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut."
- "Daten konnten nicht geladen werden."
- "Sie müssen angemeldet sein, um dies zu tun."

### French
- "Une erreur s'est produite. Veuillez réessayer."
- "Échec du chargement des données."
- "Vous devez être connecté pour faire cela."

### Spanish
- "Algo salió mal. Por favor, inténtelo de nuevo."
- "Error al cargar datos."
- "Debes iniciar sesión para hacer esto."

## Code Usage Examples

### Simple Toast
```typescript
import { toast } from 'sonner';

toast.success('Bid submitted successfully!');
toast.error('Failed to submit bid');
toast.warning('Session expiring soon');
```

### API Error Handling
```typescript
import { handleApiError } from '@/lib/errors';

try {
  const res = await fetch('/api/endpoint');
  if (!res.ok) {
    handleApiError(res, t);
    return;
  }
} catch (error) {
  handleApiError(error, t);
}
```

### Error Capture
```typescript
import { captureError } from '@/lib/errors';

try {
  // risky operation
} catch (error) {
  captureError(error, {
    component: 'BidForm',
    action: 'submitBid',
    userId: user.id,
  });
}
```
