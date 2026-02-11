# Debug Save Session

## Check if the issue is frontend or backend:

### Step 1: Open Browser Console
1. Open http://localhost:3000
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. Upload image and wait for results
5. Click "Save This Session"

### Step 2: Look for errors in Console

**If you see:**
```
❌ Error saving session: ...
```
Copy the full error message

**If you see:**
```
✅ Session saved successfully!
```
Then check the Network tab for the actual request

### Step 3: Check Server Terminal

After clicking "Save Session", look at the server terminal.

**Should see:**
```
POST /api/save-session
```

**If you see error:**
```
❌ Save session error: ...
```
Copy the full error message

### Step 4: Test Save Endpoint Directly

Run this in a NEW terminal (while server is running):

```bash
curl -X POST http://localhost:3000/api/save-session ^
  -H "Content-Type: application/json" ^
  -d "{\"imagePath\":\"/test.jpg\",\"items\":[{\"type\":\"sofa\",\"description\":\"test\"}],\"results\":[{\"item\":{\"type\":\"sofa\"},\"products\":[{\"title\":\"Test\",\"product_url\":\"http://test.com\",\"store\":\"Test\",\"price\":\"KD 100\"}]}]}"
```

**Expected response:**
```json
{"sessionId":1}
```

**If error:**
Copy the error message

---

## Common Issues:

### Issue 1: "db.createSession is not a function"
- db.js not updated correctly
- Restart server after updating db.js

### Issue 2: "Cannot find module 'better-sqlite3'"
- Run: `npm install better-sqlite3`

### Issue 3: Frontend not sending data
- Check browser console for errors
- Check Network tab → save-session request

---

Share what you see and I'll fix it!
