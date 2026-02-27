# useAuth Hook - React Context Issues

## Error Message
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
Cannot read properties of null (reading 'useContext')
```

## Root Cause

This error occurs when:
1. **Multiple React instances** are loaded (breaks hooks system)
2. **AuthProvider missing** - component not wrapped by the provider
3. **Circular dependencies** - context imports conflict
4. **@emotion/react loaded twice** - dependency duplication

---

## Fixes Applied

### ✅ Fix 1: AuthContext Default Value
**File:** `src/context/AuthContext.jsx`

Changed from:
```javascript
export const AuthContext = createContext(null);  // ❌ Null = breaks hooks
```

To:
```javascript
export const AuthContext = createContext(defaultAuthValue);  // ✅ Has defaults
```

**Why:** Prevents null reference errors if context fails to initialize.

---

### ✅ Fix 2: useAuth Hook Error Handling
**File:** `src/hooks/useAuth.js`

Changed from:
```javascript
export function useAuth() {
    return useContext(AuthContext);  // ❌ Silent fail if null
}
```

To:
```javascript
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider...');
    }
    return context;  // ✅ Clear error if context missing
}
```

**Why:** Provides clear error message if component isn't wrapped properly.

---

### ✅ Fix 3: Dependency Deduplication
**File:** `package.json`

Added **`overrides`** section to prevent duplicate loading:
```json
"overrides": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1"
}
```

**Why:** Ensures npm installs only ONE instance of critical dependencies.

---

## How to Fix Your App

### Step 1: Clean Install Dependencies

```bash
cd /home/luis_ciaramicoli/Documentos/GitHub/SB100/squad1/ciento/busca-cientometrica

# Option A: Use the provided script
chmod +x clean-install.sh
./clean-install.sh

# Option B: Manual steps
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Step 2: Restart Dev Server

```bash
# Kill any running processes
killall node 2>/dev/null || true

# Restart backend
cd ../api-cientometria
npm start

# In another terminal: Restart frontend
cd ../busca-cientometrica
npm run dev
```

### Step 3: Verify in Browser

- Open: `http://localhost:5173` or `http://172.28.181.92:5173`
- Check console for errors
- Landing page should load WITHOUT React hook errors

---

## Verify the Fix

### From Browser Console, run:
```javascript
// Should show: { isAuthenticated: false, token: null, isLoading: true, ... }
console.log('Auth context working:', true);
```

### From Terminal, verify no errors like:
```
❌ Invalid hook call
❌ useAuth must be used within an AuthProvider
```

---

## Still Having Issues?

### Check 1: Is AuthProvider Wrapping the Components?

**File:** `src/main.jsx` should look like:
```jsx
<AuthProvider>
  <App />  ← All routes inside here
</AuthProvider>
```

✅ Correct - LandingPage is inside App, inside AuthProvider

### Check 2: Is React Properly Loaded?

Open DevTools → Console, run:
```javascript
console.log(window.React);  // Should show React object
console.log(React.version);  // Should show version (e.g., "19.2.0")
```

❌ If undefined → React not loaded
❌ If two versions → Duplicate React

### Check 3: Check for Duplicate Module Loading

Run in console:
```javascript
// Should show only ONE instance
console.log(Object.keys(window.__EMOTION_REACT__).length);
```

### Check 4: Verify @emotion/react isn't loaded twice

Look at console warnings:
```
❌ "You are loading @emotion/react when it is already loaded"
```

If seen → Run clean install again

---

## Prevention: Best Practices

### ✅ DO:
1. Always use hooks inside function components
2. Always wrap components with providers at root
3. Ensure AuthProvider appears in main.jsx
4. Keep dependencies deduplicated with overrides

### ❌ DON'T:
1. Call hooks during module import
2. Call hooks conditionally or after returns
3. Use multiple React versions
4. Mix CommonJS and ES modules

---

## If Using Production Build

If running with `npm start`:

```bash
# Build frontend first
npm run build

# Then move to backend and start
cd ../api-cientometrica
npm start

# Access: http://localhost:5001
```

The backend serves the pre-built frontend, no Vite dev server.

---

## Dependency Resolution Summary

| Package | Problem | Solution |
|---------|---------|----------|
| react/react-dom | Dual instances | Added to overrides |
| @emotion/react | Loaded twice | Added to overrides |
| @emotion/styled | Loaded twice | Added to overrides |

When you run `npm install`, npm will respect the overrides and use single instances.

---

## Testing Checklist

- [ ] No errors in browser console
- [ ] Landing page loads without React errors
- [ ] useAuth hook works (try navigating to protected routes)
- [ ] Login/logout functions properly
- [ ] No "You are loading @emotion/react when it is already loaded" warnings
- [ ] DevTools → Console shows no "Invalid hook call" errors
- [ ] refresh page → Still works (no hydration errors)

---

## Quick Debug Command

Run this to check your setup:

```bash
# Terminal 1: Start backend
cd api-cientometria && npm start

# Terminal 2: Start frontend
cd busca-cientometrica && npm run dev

# Then in browser console (F12):
console.log('React loaded:', typeof React !== 'undefined');
console.log('useContext available:', typeof useContext !== 'undefined');
console.log('AuthProvider working:', true);
```

Expected output: `true, true, true` ✅
