# GIS map setup

The project map supports Google satellite imagery through the Google Maps
Platform Map Tiles API. Add the restricted browser key to the local `.env`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-restricted-api-key
```

Enable the Map Tiles API and billing for its Google Cloud project, then restrict
the key to the application's HTTP referrers and the Map Tiles API. Restart the
Next.js development server after changing the environment.

Google Earth Engine is a separate service for displaying computed imagery and
requires an Earth Engine-enabled Cloud project and OAuth/IAM authorization. It
is not a public basemap endpoint; Google Earth Pro imagery must not be loaded
from undocumented tile URLs.