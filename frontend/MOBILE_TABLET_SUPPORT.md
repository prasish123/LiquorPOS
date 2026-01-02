# Mobile & Tablet Support Documentation

## Overview

The POS Terminal application is optimized for tablet-based POS terminals with comprehensive mobile and tablet support including:

- ✅ Responsive design for 10-13" tablets
- ✅ Touch-optimized controls (44x44px minimum tap targets)
- ✅ Progressive Web App (PWA) capabilities
- ✅ Offline functionality with service workers
- ✅ Installation prompts for native-like experience

## Supported Devices

### Primary Target: Tablet POS Terminals
- **iPad Pro 12.9"** (2732 x 2048, landscape)
- **iPad Pro 11"** (2388 x 1668, landscape)
- **iPad Air 10.9"** (2360 x 1640, landscape)
- **iPad 10.2"** (2160 x 1620, landscape)
- **Microsoft Surface Pro** (2736 x 1824, landscape)
- **Samsung Galaxy Tab S** (2560 x 1600, landscape)
- **Generic 10-13" Android Tablets**

### Secondary Support
- **Large phones in landscape** (6-7" displays)
- **Desktop browsers** (for testing and admin)

## Responsive Breakpoints

The application uses the following breakpoints optimized for tablets:

```css
/* Large tablets (1024px - 1366px) */
- iPad Pro 12.9", Surface Pro
- Optimized layout with 380px sidebar

/* Medium tablets (768px - 1023px) */
- iPad 10.2", iPad Air
- Compact layout with 360px sidebar

/* Small tablets/phones (<768px) */
- Stacked layout
- Full-width components
```

## Touch Optimization

### Minimum Tap Targets
All interactive elements follow Apple's Human Interface Guidelines:
- **Minimum size**: 44x44px (iOS standard)
- **Recommended**: 48x48px (Android Material Design)
- **Large buttons**: 88px height for primary actions

### Touch Gestures
- ✅ Tap to select products
- ✅ Swipe to scroll lists
- ✅ Pull-to-refresh disabled (prevents accidental refreshes)
- ✅ Pinch-to-zoom disabled (maintains consistent UI)
- ✅ Long-press disabled on UI elements

### CSS Touch Features
```css
touch-action: manipulation;          /* Prevents double-tap zoom */
-webkit-tap-highlight-color: rgba(); /* Custom tap feedback */
-webkit-overflow-scrolling: touch;   /* Smooth scrolling */
overscroll-behavior-y: contain;      /* Prevents pull-to-refresh */
```

## Progressive Web App (PWA)

### Features
1. **Installable**: Users can install the app to their home screen
2. **Offline Support**: Works without internet connection
3. **Fast Loading**: Service worker caches assets
4. **Native Feel**: Runs in standalone mode without browser chrome

### Installation

#### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

#### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home Screen"
4. Tap "Install"

#### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install"
3. Or use the automatic prompt that appears

### Manifest Configuration

Located at `/public/manifest.json`:

```json
{
  "name": "Liquor POS Terminal",
  "short_name": "POS",
  "display": "standalone",
  "orientation": "landscape-primary",
  "theme_color": "#6366f1"
}
```

### Service Worker

Located at `/public/service-worker.js`:

**Caching Strategy**:
- **Static Assets**: Cache-first (fast loading)
- **API Requests**: Network-first with cache fallback (offline support)
- **Runtime Caching**: Dynamic content cached as used

**Features**:
- Offline order queue
- Background sync when connection restored
- Push notification support (future)

## Offline Capabilities

### What Works Offline
- ✅ Browse cached products
- ✅ Add items to cart
- ✅ View previous orders (cached)
- ✅ Access UI and navigation
- ✅ Queue orders for sync

### What Requires Connection
- ❌ Real-time inventory updates
- ❌ Payment processing
- ❌ New product data
- ❌ Admin functions

### Offline Indicator
The app displays a banner when offline:
```
⚠️ Offline Mode - Some features may be limited
```

## Testing on Tablets

### Chrome DevTools (Desktop)
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select tablet preset:
   - iPad Pro
   - iPad
   - Surface Pro
4. Test in both orientations

### Real Device Testing
1. Connect tablet to same network as dev server
2. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access: `http://YOUR_IP:5173`
4. Test touch interactions and gestures

### Responsive Design Mode (Firefox)
1. Open DevTools (F12)
2. Click responsive design mode (Ctrl+Shift+M)
3. Set custom dimensions:
   - 1024x768 (iPad landscape)
   - 1366x1024 (iPad Pro landscape)

## Performance Optimization

### For Tablets
- Smooth 60fps animations
- Hardware-accelerated transforms
- Optimized touch event handling
- Reduced motion for accessibility

### Bundle Size
- Code splitting for faster initial load
- Lazy loading for admin features
- Optimized vendor chunks

### Network
- Service worker caching
- API request batching
- Optimistic UI updates

## Accessibility

### Touch Accessibility
- Large, easy-to-tap buttons
- Clear visual feedback on touch
- High contrast for readability
- Support for screen readers

### Keyboard Support
- Full keyboard navigation (for hybrid devices)
- Tab order optimization
- Enter/Space for activation

## Browser Support

### Minimum Versions
- **iOS Safari**: 14.0+
- **Chrome (Android)**: 90+
- **Samsung Internet**: 14+
- **Edge**: 90+
- **Firefox**: 88+

### PWA Support
- **iOS**: Limited (no background sync, limited push)
- **Android**: Full support
- **Desktop**: Full support (Chrome, Edge)

## Known Limitations

### iOS Specific
- No background sync (orders sync when app opened)
- No push notifications
- Limited service worker capabilities
- Must use Safari for installation

### Android Specific
- Varies by manufacturer (Samsung, Xiaomi, etc.)
- Some devices may restrict background processes

## Development Guidelines

### Adding New Touch Features
1. Ensure 44x44px minimum tap target
2. Add touch-action: manipulation
3. Test on real devices
4. Use @media (hover: hover) for hover states
5. Provide visual feedback on :active

### Testing Checklist
- [ ] Test on iPad (10.2" or larger)
- [ ] Test in landscape orientation
- [ ] Verify touch targets are easy to tap
- [ ] Check scrolling performance
- [ ] Test offline functionality
- [ ] Verify PWA installation
- [ ] Test with slow 3G connection
- [ ] Check battery usage

## Troubleshooting

### Service Worker Not Updating
```javascript
// Force update in console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.update());
});
```

### Clear Cache
```javascript
// Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### PWA Not Installing
1. Ensure HTTPS (or localhost)
2. Check manifest.json is valid
3. Verify service worker is registered
4. Check browser console for errors

## Future Enhancements

### Planned Features
- [ ] Barcode scanner integration (camera API)
- [ ] NFC payment support
- [ ] Bluetooth receipt printer support
- [ ] Multi-window support (iPad)
- [ ] Apple Pencil support for signatures
- [ ] Haptic feedback

### Under Consideration
- [ ] Voice commands
- [ ] Gesture shortcuts
- [ ] Dark mode
- [ ] Customizable layouts per device

## Resources

### Documentation
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Apple HIG - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)

### Tools
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Can I Use - PWA](https://caniuse.com/?search=service%20worker)

## Support

For issues or questions about mobile/tablet support:
1. Check browser console for errors
2. Verify device meets minimum requirements
3. Test in latest browser version
4. Report issues with device model and OS version

