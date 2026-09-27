package seedimages

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const userAgent = "lhchub-seed/1.0 (demo data; contact: dev@lhchub.local)"

var httpClient = &http.Client{Timeout: 30 * time.Second}

// fetchBytes downloads a URL, retrying on 429 (Wikimedia rate limit) like the
// Django command's fetch().
func fetchBytes(ctx context.Context, rawURL string) ([]byte, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", userAgent)
		resp, err := httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests && attempt < 2 {
			time.Sleep(time.Duration(2*(attempt+1)) * time.Second)
			continue
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("http %d", resp.StatusCode)
		}
		return body, nil
	}
	return nil, lastErr
}

func getJSON(ctx context.Context, rawURL string, out any) error {
	body, err := fetchBytes(ctx, rawURL)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}

// wikidataPhoto resolves a Wikipedia page title to its curated representative
// photo (P18), mirroring the Django seed_discovery_images.wikidata_photo.
func wikidataPhoto(ctx context.Context, pageTitle string) string {
	q := url.Values{}
	q.Set("action", "query")
	q.Set("titles", pageTitle)
	q.Set("prop", "pageprops")
	q.Set("ppprop", "wikibase_item")
	q.Set("redirects", "1")
	q.Set("format", "json")

	var pageResp struct {
		Query struct {
			Pages map[string]struct {
				PageProps struct {
					WikibaseItem string `json:"wikibase_item"`
				} `json:"pageprops"`
			} `json:"pages"`
		} `json:"query"`
	}
	if err := getJSON(ctx, "https://en.wikipedia.org/w/api.php?"+q.Encode(), &pageResp); err != nil {
		return ""
	}
	var qid string
	for _, p := range pageResp.Query.Pages {
		if p.PageProps.WikibaseItem != "" {
			qid = p.PageProps.WikibaseItem
			break
		}
	}
	if qid == "" {
		return ""
	}

	cq := url.Values{}
	cq.Set("action", "wbgetclaims")
	cq.Set("entity", qid)
	cq.Set("property", "P18")
	cq.Set("format", "json")
	var claimsResp struct {
		Claims map[string][]struct {
			Mainsnak struct {
				Datavalue struct {
					Value string `json:"value"`
				} `json:"datavalue"`
			} `json:"mainsnak"`
		} `json:"claims"`
	}
	if err := getJSON(ctx, "https://www.wikidata.org/w/api.php?"+cq.Encode(), &claimsResp); err != nil {
		return ""
	}
	p18 := claimsResp.Claims["P18"]
	if len(p18) == 0 || p18[0].Mainsnak.Datavalue.Value == "" {
		return ""
	}
	filename := p18[0].Mainsnak.Datavalue.Value
	return "https://commons.wikimedia.org/wiki/Special:FilePath/" + url.PathEscape(filename) + "?width=800"
}
