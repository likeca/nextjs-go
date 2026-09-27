package seedimages

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	_ "image/png" // register PNG decoder (Wikimedia occasionally serves PNG)
	"math"
	"net/url"
)

// cardWidth/cardHeight mirror settings.DISCOVERY_IMAGE_SIZE.
const (
	cardWidth  = 800
	cardHeight = 450
)

// toCardJPEG cover-crops an image to the 800×450 card contract and re-encodes
// it as JPEG, mirroring discovery.models.to_card_jpeg (ImageOps.fit with a
// slight top bias: centering (0.5, 0.3)).
func toCardJPEG(data []byte) ([]byte, error) {
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	dst := coverCrop(src, cardWidth, cardHeight, 0.5, 0.3)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// coverCrop scales src to cover w×h then center-crops, using the fractional
// centering point (cx, cy) ∈ [0,1] for the crop offset (PIL's ImageOps.fit).
func coverCrop(src image.Image, w, h int, cx, cy float64) image.Image {
	sw, sh := src.Bounds().Dx(), src.Bounds().Dy()
	scale := math.Max(float64(w)/float64(sw), float64(h)/float64(sh))
	scaled := resize(src, int(math.Round(float64(sw)*scale)), int(math.Round(float64(sh)*scale)))

	x0 := int(math.Round(float64(scaled.Bounds().Dx()-w) * cx))
	y0 := int(math.Round(float64(scaled.Bounds().Dy()-h) * cy))
	if x0 < 0 {
		x0 = 0
	}
	if y0 < 0 {
		y0 = 0
	}

	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dst.Set(x, y, scaled.At(x0+x, y0+y))
		}
	}
	return dst
}

// resize is a bilinear resampler (stdlib only — no x/image dependency).
func resize(src image.Image, w, h int) *image.RGBA {
	sw, sh := src.Bounds().Dx(), src.Bounds().Dy()
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	xr := float64(sw) / float64(w)
	yr := float64(sh) / float64(h)
	for y := 0; y < h; y++ {
		sy := float64(y) * yr
		y0 := int(sy)
		y1 := y0 + 1
		if y1 >= sh {
			y1 = sh - 1
		}
		fy := sy - float64(y0)
		for x := 0; x < w; x++ {
			sx := float64(x) * xr
			x0 := int(sx)
			x1 := x0 + 1
			if x1 >= sw {
				x1 = sw - 1
			}
			fx := sx - float64(x0)
			dst.Set(x, y, bilerp(
				src.At(x0, y0), src.At(x1, y0), src.At(x0, y1), src.At(x1, y1),
				fx, fy,
			))
		}
	}
	return dst
}

func bilerp(c00, c10, c01, c11 color.Color, fx, fy float64) color.Color {
	f := func(c color.Color) (r, g, b float64) {
		rgba := color.NRGBAModel.Convert(c).(color.NRGBA)
		return float64(rgba.R), float64(rgba.G), float64(rgba.B)
	}
	r00, g00, b00 := f(c00)
	r10, g10, b10 := f(c10)
	r01, g01, b01 := f(c01)
	r11, g11, b11 := f(c11)

	lerp := func(a, b, t float64) float64 { return a + (b-a)*t }
	r := lerp(lerp(r00, r10, fx), lerp(r01, r11, fx), fy)
	g := lerp(lerp(g00, g10, fx), lerp(g01, g11, fx), fy)
	b := lerp(lerp(b00, b10, fx), lerp(b01, b11, fx), fy)
	return color.NRGBA{R: uint8(clamp(r)), G: uint8(clamp(g)), B: uint8(clamp(b)), A: 0xff}
}

func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return v
}

// photoURL mirrors discovery seed_discovery_images.photo_url: curated Wikidata
// photos for known landmarks, else a deterministic picsum.photos stock image.
func photoURL(ctx context.Context, name string) string {
	if page, ok := wikipediaPages[name]; ok {
		if u := wikidataPhoto(ctx, page); u != "" {
			return u
		}
	}
	seed := url.PathEscape(slugify(name))
	return "https://picsum.photos/seed/" + seed + "/800/450"
}

// wikipediaPages mirrors WIKIPEDIA_PAGES (landmark → Wikipedia page title).
var wikipediaPages = map[string]string{
	"CN Tower":             "CN Tower",
	"Royal Ontario Museum": "Royal Ontario Museum",
	"Toronto Islands":      "Toronto Islands",
	"St. Lawrence Market":  "St. Lawrence Market",
	"High Park":            "High Park",
	"Distillery District":  "Distillery District",
}

func slugify(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			out = append(out, r)
		case r >= 'A' && r <= 'Z':
			out = append(out, r+('a'-'A'))
		case r == ' ':
			out = append(out, '-')
		}
	}
	return string(out)
}
