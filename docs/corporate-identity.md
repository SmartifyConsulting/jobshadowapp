# Job Shadow corporate identity

Implemented from the owner-supplied CI guidebook, Adobe packaging report and font files.

## Digital palette

| Colour    | Guidebook HEX | Main use                                          |
| --------- | ------------- | ------------------------------------------------- |
| Pink      | `#e81c44`     | Primary brand panels and actions                  |
| Teal      | `#6dc6c1`     | Forms, supporting panels and photography overlays |
| Green     | `#96c93d`     | Booking calls to action                           |
| Yellow    | `#e5c61e`     | Highlights and supporting panels                  |
| 70% black | `#4d4d4d`     | Body copy on white and yellow                     |

The guide's explicit HEX values are the digital source of truth where rounded RGB values differ. CSS stores equivalent OKLCH values. A darker pink supports white navigation text; darker neutral text supports readable controls on teal and green.

## Typography

- Gotham Book: normal body text and interface copy.
- Gotham ExtraLight and Light: lighter treatments; Light Italic for emphasis.
- Gotham Black: strong labels and actions.
- DK Cinnabar Brush: display and major page headings.
- All six supplied fonts are bundled as full-glyph WOFF2 assets under `public/fonts`. Font conversion does not subset the originals.
- The application does not request the previous Google Fonts substitutes. Open Sans remains an allowed fallback in the font stack.

## Artwork and layout

- `public/assets/jobshadow-logo-square.svg` is vector artwork extracted from the approved pink-background logo in the supplied guidebook, preserving its proportions and original colours.
- `BrandLogo` keeps a square canvas. The public header centres the logo on compact screens and places it on the right on desktop. The footer uses a right-aligned logo; the administration sidebar centres it.
- Do not stretch, reverse, recolour or crop the logo.
- The homepage heading is real, responsive DK Cinnabar Brush text.
- Scholar photography uses grayscale with a coloured multiply treatment, as specified in the guide. Host-company logos retain their own artwork.

The Adobe font-list cache and InDesign printing report are reference metadata and are not web assets. Booking logic, data exports and email integrations are outside this visual change.
