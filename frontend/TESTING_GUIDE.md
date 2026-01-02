# Mobile/Tablet Testing Guide

## Quick Start Testing

### 1. Start the Development Server

```bash
cd frontend
npm run dev
```

The server will start at `http://localhost:5173`

### 2. Test Responsive Design

#### Using Chrome DevTools

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Toggle Device Toolbar**: Press `Ctrl+Shift+M` (Windows) / `Cmd+Shift+M` (Mac)
3. **Select Tablet Presets**:
   - iPad Pro (1366 x 1024)
   - iPad (1024 x 768)
   - iPad Mini (1024 x 768)
   - Surface Pro 7 (1368 x 912)

4. **Test Both Orientations**:
   - Click the rotation icon to switch between landscape and portrait
   - Verify layout adapts correctly

5. **Test Touch Simulation**:
   - Click the three dots menu in DevTools
   - Enable "Show rulers" and "Show device frame"
   - Use mouse to simulate touch interactions

#### Using Firefox Responsive Design Mode

1. **Open Responsive Design Mode**: Press `Ctrl+Shift+M` (Windows) / `Cmd+Option+M` (Mac)
2. **Set Custom Dimensions**:
   - 1024x768 (iPad landscape)
   - 768x1024 (iPad portrait)
   - 1366x1024 (iPad Pro landscape)
   - 1280x800 (10" tablet)

3. **Test Touch Events**:
   - Enable "Touch simulation" in the toolbar
   - Test tap, scroll, and swipe gestures

### 3. Test on Real Devices

#### Connect Tablet to Dev Server

1. **Find your computer's IP address**:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Ensure devices are on same network**

3. **Access from tablet**:
   - Open browser on tablet
   - Navigate to `http://YOUR_IP:5173`
   - Example: `http://192.168.1.100:5173`

4. **Test touch interactions**:
   - Tap products to add to cart
   - Scroll through product list
   - Test checkout flow
   - Verify button sizes are comfortable

### 4. Test PWA Installation

#### Desktop (Chrome/Edge)

1. Navigate to `http://localhost:5173`
2. Look for install icon in address bar (⊕ or computer icon)
3. Click "Install"
4. Verify app opens in standalone window
5. Check it appears in Start Menu/Applications

#### Android (Chrome)

1. Open app in Chrome
2. Wait for install prompt (or tap menu → "Install app")
3. Tap "Install"
4. Verify icon appears on home screen
5. Open from home screen
6. Verify runs in standalone mode (no browser UI)

#### iOS (Safari)

1. Open app in Safari
2. Tap Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Verify icon appears on home screen
6. Open from home screen

### 5. Test Offline Functionality

#### Method 1: Chrome DevTools

1. Open DevTools (F12)
2. Go to "Network" tab
3. Check "Offline" checkbox
4. Reload page
5. Verify app still loads
6. Check offline banner appears
7. Test adding items to cart
8. Uncheck "Offline" to restore connection

#### Method 2: Application Tab

1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in sidebar
4. Check "Offline" checkbox
5. Test app functionality
6. Verify cached resources load

#### Method 3: Real Device

1. Enable airplane mode on device
2. Open installed PWA
3. Verify app loads from cache
4. Test offline features
5. Disable airplane mode
6. Verify app syncs data

### 6. Test Service Worker

#### Verify Registration

1. Open DevTools → Application → Service Workers
2. Verify service worker is registered
3. Check status is "activated and running"
4. Click "Update" to force update
5. Click "Unregister" to test re-registration

#### Check Cache Storage

1. Open DevTools → Application → Cache Storage
2. Verify caches exist:
   - `liquor-pos-v1` (precache)
   - `liquor-pos-runtime-v1` (runtime cache)
3. Expand caches to see cached files
4. Right-click to delete cache for testing

#### Monitor Network Requests

1. Open DevTools → Network tab
2. Look for "(from ServiceWorker)" in Size column
3. Verify static assets load from cache
4. Verify API requests go to network first

## Automated Testing

### Lighthouse PWA Audit

1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Review scores and recommendations

**Target Scores**:
- PWA: 100
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+

### Playwright E2E Tests (Future)

```bash
cd frontend
npm run test:e2e
```

## Testing Checklist

### Responsive Design
- [ ] Layout adapts at 1366px (large tablets)
- [ ] Layout adapts at 1024px (medium tablets)
- [ ] Layout adapts at 768px (small tablets)
- [ ] Landscape orientation works correctly
- [ ] Portrait orientation stacks layout
- [ ] Product grid adjusts columns
- [ ] Cart sidebar resizes appropriately
- [ ] Text remains readable at all sizes
- [ ] No horizontal scrolling

### Touch Optimization
- [ ] All buttons are minimum 44x44px
- [ ] Buttons provide visual feedback on tap
- [ ] No accidental double-tap zoom
- [ ] Smooth scrolling on touch
- [ ] No pull-to-refresh on main content
- [ ] Product cards easy to tap
- [ ] Payment buttons large and clear
- [ ] Quantity controls easy to use
- [ ] Input fields don't cause zoom on iOS

### PWA Features
- [ ] Manifest.json loads correctly
- [ ] Service worker registers successfully
- [ ] Install prompt appears (after delay)
- [ ] App can be installed to home screen
- [ ] Installed app opens in standalone mode
- [ ] App icon appears correctly
- [ ] Splash screen shows on launch (iOS)
- [ ] Theme color applies to browser chrome

### Offline Functionality
- [ ] App loads when offline
- [ ] Offline banner displays
- [ ] Cached products display
- [ ] Can add items to cart offline
- [ ] API calls fallback to cache
- [ ] Error messages are user-friendly
- [ ] Data syncs when connection restored

### Performance
- [ ] Initial load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Smooth 60fps animations
- [ ] No janky scrolling
- [ ] Images load progressively
- [ ] Service worker caches efficiently

### Cross-Browser
- [ ] Works in Chrome (desktop & mobile)
- [ ] Works in Safari (desktop & iOS)
- [ ] Works in Edge
- [ ] Works in Firefox
- [ ] Works in Samsung Internet

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Touch targets well-spaced

## Common Issues & Solutions

### Issue: Service Worker Not Updating

**Solution**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then refresh page
```

### Issue: PWA Install Prompt Not Showing

**Checklist**:
- [ ] Using HTTPS or localhost
- [ ] Manifest.json is valid
- [ ] Service worker registered
- [ ] Not previously dismissed
- [ ] Using supported browser

### Issue: Offline Mode Not Working

**Checklist**:
- [ ] Service worker activated
- [ ] Cache populated (visit pages first)
- [ ] Check console for errors
- [ ] Verify fetch event handler

### Issue: Layout Breaks on Specific Device

**Debug Steps**:
1. Check browser console for errors
2. Verify viewport meta tag
3. Test in Chrome DevTools with same dimensions
4. Check for device-specific CSS bugs
5. Test in different browser on same device

### Issue: Touch Targets Too Small

**Fix**:
- Increase button padding
- Add min-width/min-height: 44px
- Increase gap between elements
- Test with real fingers, not mouse

## Performance Testing

### Measure Load Time

```javascript
// In browser console
performance.getEntriesByType('navigation')[0].loadEventEnd
```

### Check Bundle Size

```bash
cd frontend
npm run build
# Check dist/ folder size
```

### Lighthouse Performance

1. Run Lighthouse audit
2. Check metrics:
   - First Contentful Paint < 1.8s
   - Speed Index < 3.4s
   - Largest Contentful Paint < 2.5s
   - Time to Interactive < 3.8s
   - Total Blocking Time < 200ms
   - Cumulative Layout Shift < 0.1

## Network Conditions Testing

### Simulate Slow 3G

1. DevTools → Network tab
2. Throttling dropdown → "Slow 3G"
3. Test app loading and interactions
4. Verify loading states appear
5. Check timeout handling

### Simulate Fast 3G

1. DevTools → Network tab
2. Throttling dropdown → "Fast 3G"
3. Test typical usage scenarios
4. Verify acceptable performance

## Reporting Issues

When reporting mobile/tablet issues, include:

1. **Device Information**:
   - Device model (e.g., iPad Pro 12.9" 2021)
   - OS version (e.g., iOS 15.4)
   - Browser and version (e.g., Safari 15.4)

2. **Issue Description**:
   - What you expected to happen
   - What actually happened
   - Steps to reproduce

3. **Screenshots/Video**:
   - Screenshot of the issue
   - Video of the behavior (if applicable)

4. **Console Logs**:
   - Any errors in browser console
   - Network tab showing failed requests

5. **Environment**:
   - Orientation (landscape/portrait)
   - Network conditions (online/offline/slow)
   - Installed as PWA or in browser

## Resources

- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Firefox Responsive Design Mode](https://firefox-source-docs.mozilla.org/devtools-user/responsive_design_mode/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [PWA Testing Checklist](https://web.dev/pwa-checklist/)

