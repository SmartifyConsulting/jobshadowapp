# Worldwide location suggestions

The sign-up and own-profile Country → City → Suburb controls use Google Places Autocomplete (New). Suggestions are optional; manual entry remains available if the service is not configured, unavailable, or does not list a suburb.

Before enabling production suggestions:

1. In Google Cloud, enable **Maps JavaScript API** and **Places API (New)** with billing on the intended project.
2. Create a browser API key with **HTTP referrer** restrictions for the authorised Job Shadow production and preview domains. Restrict its allowed APIs to those required above. Configure daily and rate quotas in Google Cloud.
3. Set `VITE_GOOGLE_PLACES_API_KEY` in the app's build environment / Lovable project settings, then rebuild and publish. This is a browser key and is visible to browsers by design; the domain and API restrictions are required. Never use an unrestricted server key here or commit the key to Git.
4. Ensure the app's published Terms and Privacy notices cover Google Maps Platform use before enabling the service.

The integration debounces typing, uses a session token for each search/selection, limits city results to the chosen country, and restricts suburb searches to the selected city's viewport. Selected country/city components are checked before updating the form. Changing Country clears City and Suburb; changing City clears Suburb. Suggestions and viewports are not saved as a location catalogue; only the user's confirmed location fields are saved with their profile.

No device GPS access is requested. No names, emails or CVs are sent to Google. Tests use synthetic responses and make no Google calls. No API key, billing setting or Google Cloud quota has been configured by this code change.

References: [Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data), [API billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [attribution](https://developers.google.com/maps/documentation/javascript/policies).
