app galago

## Web deploy notes
- Use `npm run build:web` (it runs `expo export -p web --clear`) before `eas deploy --prod --path dist`.
- If the site still shows old UI, hard-refresh (Ctrl+Shift+R) or clear site data for `galago.expo.app`.
