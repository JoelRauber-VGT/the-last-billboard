# Realtime Implementation - Phase 2

## Overview

This document describes the implementation of Supabase Realtime subscriptions and Live Ticker component for real-time billboard updates in The Last Billboard project.

## Components Implemented

### 1. Updated Billboard Data Hook (`src/hooks/useBillboardData.ts`)

**Features:**
- Real-time subscriptions to `slots` table changes
- Optimized update handling with 500ms debouncing
- Page Visibility API integration to pause updates when tab is not visible
- Automatic sorting after updates
- Duplicate prevention
- Proper cleanup of channels and timeouts

**Optimizations:**
- Debouncing: Max 1 update per 500ms to prevent spam
- Visibility API: Pauses processing when tab is hidden, refetches on visibility
- Efficient sorting: Only re-sorts when bid amounts change
- Memory leak prevention: Cleans up all subscriptions and timeouts

### 2. Live Ticker Hook (`src/hooks/useLiveTicker.ts`)

**Features:**
- Subscribes to `slot_history` table INSERT events
- Fetches initial 20 most recent history entries
- Differentiates between "new" and "outbid" events
- Automatic event deduplication
- Configurable event limit (default 20)

**Event Types:**
- `new`: New slot entry (no displaced_by_id, no ended_at)
- `outbid`: Slot that was displaced (has ended_at or displaced_by_id)

### 3. Live Ticker Component (`src/components/billboard/LiveTicker.tsx`)

**Features:**
- Displays recent billboard activity in real-time
- Smooth fade-in animations for new events
- Relative timestamps with i18n support (date-fns)
- Scroll behavior respects user interaction
- Responsive design with scrollable container
- Localized date formatting (en, de, fr, es)

**Styling:**
- Maximum height: 384px (96 in Tailwind units)
- Smooth animations with staggered delays
- Custom scrollbar styling
- Accent color highlights for display names and bid amounts

### 4. Realtime Status Indicator (`src/components/billboard/RealtimeStatus.tsx`)

**Features:**
- Shows connection status: connected, connecting, disconnected
- Visual indicator with color-coded dot
- Automatic reconnection detection
- Auth state monitoring

**States:**
- Green + "Live": Successfully connected
- Yellow + "Connecting..." (pulsing): Establishing connection
- Gray + "Offline": Disconnected or error

### 5. Landing Page Integration (`src/app/[locale]/page.tsx`)

**Layout:**
- Grid layout: 2/3 for Billboard Preview, 1/3 for Live Ticker
- Responsive: Stacks on mobile, side-by-side on desktop
- Realtime status indicator positioned above ticker
- Integrated with existing freeze banner and countdown

## Translation Keys Added

All 4 languages updated (en, de, fr, es):

```json
{
  "ticker": {
    "title": "...",
    "empty": "...",
    "enteredFor": "...",
    "outbidFor": "...",
    "displaced": "...",
    "justNow": "..."
  }
}
```

## Performance Considerations

### 1. Update Debouncing
- Prevents excessive re-renders during rapid changes
- Batches multiple updates within 500ms window
- Uses refs to avoid stale closures

### 2. Page Visibility API
- Pauses realtime processing when tab is hidden
- Refetches data when tab becomes visible again
- Reduces unnecessary processing and network usage

### 3. Memory Management
- Proper cleanup of all subscriptions in useEffect
- Clears timeouts on unmount
- Removes event listeners

### 4. Scroll Behavior
- Tracks user scroll activity
- Doesn't auto-scroll when user is actively scrolling
- 2-second timeout before resuming auto-scroll

### 5. Event Deduplication
- Prevents duplicate events in both hooks
- Uses ID-based checking before adding new items

## Database Requirements

### Realtime Publication

Supabase Realtime requires tables to be added to the publication:

```sql
-- Enable realtime for slots table
ALTER PUBLICATION supabase_realtime ADD TABLE slots;

-- Enable realtime for slot_history table
ALTER PUBLICATION supabase_realtime ADD TABLE slot_history;
```

**Note:** Check with Supabase dashboard or run:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## Testing Instructions

### Manual Testing

1. **Two-Window Test:**
   - Open application in two browser windows
   - Log in as different users in each
   - Place a bid in window 1
   - Verify window 2 updates automatically
   - Check live ticker shows event in both windows

2. **Connection Status Test:**
   - Load page and verify green "Live" indicator
   - Disconnect network (turn off WiFi)
   - Verify status changes to "Offline"
   - Reconnect network
   - Verify status returns to "Live"

3. **Performance Test:**
   - Load page with 50+ slots
   - Place multiple rapid bids
   - Verify no duplicate events
   - Verify smooth animations
   - Check browser console for errors

4. **Visibility Test:**
   - Load page and verify updates
   - Switch to different tab
   - Place bid in another window
   - Switch back to original tab
   - Verify data refetches and updates

5. **Scroll Behavior Test:**
   - Load page with 20+ events in ticker
   - Start scrolling in ticker
   - Place new bid
   - Verify scroll position doesn't jump
   - Wait 2 seconds
   - Verify new events appear

### Automated Testing

Run build to verify TypeScript types:
```bash
npm run build
```

Check for console errors:
```bash
npm run dev
# Open browser console and verify no errors
```

## Known Limitations

1. **Realtime Latency:** Updates may take 100-500ms depending on network
2. **Initial Load:** First fetch may be slower with many history entries
3. **Event Limit:** Ticker shows max 20 events (configurable)
4. **No Pagination:** Ticker doesn't support loading older events
5. **Browser Support:** Page Visibility API supported in modern browsers only

## Future Enhancements

1. **Reconnection Logic:** Exponential backoff for failed connections
2. **Optimistic Updates:** Show changes immediately before server confirms
3. **Sound Notifications:** Optional audio alerts for new bids
4. **Filter Options:** Filter ticker by bid amount, user, etc.
5. **Infinite Scroll:** Load older events on scroll
6. **Presence:** Show active user count
7. **Typing Indicators:** Show who's about to bid

## Troubleshooting

### Issue: No real-time updates

**Check:**
1. Supabase Realtime is enabled in project settings
2. Tables are added to `supabase_realtime` publication
3. Browser console for subscription errors
4. Network tab for WebSocket connection

### Issue: Duplicate events

**Check:**
1. Multiple subscriptions not created
2. Component mounting/unmounting behavior
3. useEffect dependencies

### Issue: Ticker not showing events

**Check:**
1. `slot_history` table has data
2. Query permissions in RLS policies
3. Date format compatibility
4. Locale configuration

### Issue: High memory usage

**Check:**
1. Channels are properly cleaned up
2. No memory leaks in event handlers
3. Event limit is set appropriately
4. Visibility API is working

## Files Modified/Created

**Created:**
- `/src/hooks/useLiveTicker.ts`
- `/src/components/billboard/LiveTicker.tsx`
- `/src/components/billboard/RealtimeStatus.tsx`
- `/docs/REALTIME_IMPLEMENTATION.md`

**Modified:**
- `/src/hooks/useBillboardData.ts` (enhanced with optimizations)
- `/src/app/[locale]/page.tsx` (added LiveTicker and RealtimeStatus)
- `/messages/en.json` (added ticker translations)
- `/messages/de.json` (added ticker translations)
- `/messages/fr.json` (added ticker translations)
- `/messages/es.json` (added ticker translations)

## Dependencies Used

- `@supabase/supabase-js` - Realtime subscriptions
- `date-fns` - Date formatting and localization
- `lucide-react` - Icons (Circle for status indicator)
- `next-intl` - Internationalization
- React hooks: `useState`, `useEffect`, `useCallback`, `useRef`

## Security Considerations

1. **RLS Policies:** Ensure Row Level Security allows reading slot_history
2. **Rate Limiting:** Consider Supabase rate limits for realtime connections
3. **Data Validation:** Validate incoming realtime payloads
4. **PII Protection:** Don't expose sensitive user data in ticker

## Performance Metrics

**Expected Performance:**
- Initial load: < 1 second
- Update latency: 100-500ms
- Memory overhead: ~5-10MB per connection
- CPU usage: Minimal (< 1% on modern hardware)

## Conclusion

The realtime implementation provides a smooth, performant experience for users to see live billboard activity. All optimizations follow React and Supabase best practices, with proper cleanup, error handling, and user experience considerations.
