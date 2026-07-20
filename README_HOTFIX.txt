GIWA Forecast frontend hotfix

This fixes the Market Detail white-screen error caused by inconsistent tuple/object serialization from the GIWA RPC response.

How to apply:
1. Stop the frontend dev server (Ctrl+C).
2. Extract this ZIP directly into your existing project root:
   D:\py\小田的giwa\2\giwa-forecast\giwa-forecast\
3. Choose Replace files when Windows asks.
4. Double-click APPLY_GIWA_FORECAST_HOTFIX.bat.
5. Start frontend again: npm run dev
6. Visit http://localhost:5173/terminal and click Trade Market.

This update does NOT change contracts, market data, backend config, wallet keys, or deployments.
