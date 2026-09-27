package seedimages

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// s3Client is a minimal S3-compatible client (Cloudflare R2) implementing just
// enough of AWS SigV4 to PUT and HEAD objects. R2 uses region "auto" and
// path-style URLs.
type s3Client struct {
	endpoint  string // https://<account_id>.r2.cloudflarestorage.com
	bucket    string
	accessKey string
	secretKey string
	region    string
	http      *http.Client
}

func newS3Client(endpoint, bucket, accessKey, secretKey string) *s3Client {
	return &s3Client{
		endpoint:  strings.TrimSuffix(endpoint, "/"),
		bucket:    bucket,
		accessKey: accessKey,
		secretKey: secretKey,
		region:    "auto",
		http:      &http.Client{Timeout: 60 * time.Second},
	}
}

// headObject returns true when the object exists (200), false on 404.
func (s *s3Client) headObject(ctx context.Context, key string) (bool, error) {
	resp, err := s.request(ctx, http.MethodHead, key, nil, "")
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return true, nil
	}
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	return false, fmt.Errorf("r2 HEAD %s: %s", key, resp.Status)
}

// putObject uploads an object.
func (s *s3Client) putObject(ctx context.Context, key string, data []byte) error {
	resp, err := s.request(ctx, http.MethodPut, key, data, "image/jpeg")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("r2 PUT %s: %s %s", key, resp.Status, strings.TrimSpace(string(b)))
	}
	return nil
}

// request signs and performs a SigV4 request. contentType may be empty.
func (s *s3Client) request(ctx context.Context, method, key string, body []byte, contentType string) (*http.Response, error) {
	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	payloadHash := sha256hex(body)

	u, err := url.Parse(s.endpoint)
	if err != nil {
		return nil, err
	}
	host := u.Host
	canonicalURI := "/" + s.bucket + "/" + key

	headers := map[string]string{
		"host":                 host,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date":           amzDate,
	}
	if contentType != "" {
		headers["content-type"] = contentType
	}
	names := make([]string, 0, len(headers))
	for n := range headers {
		names = append(names, n)
	}
	sort.Strings(names)

	var canonicalHeaders strings.Builder
	signedHeaders := make([]string, 0, len(names))
	for _, n := range names {
		canonicalHeaders.WriteString(n + ":" + strings.TrimSpace(headers[n]) + "\n")
		signedHeaders = append(signedHeaders, n)
	}
	signedHeadersStr := strings.Join(signedHeaders, ";")

	canonicalRequest := strings.Join([]string{
		method,
		canonicalURI,
		"", // canonical query string (none)
		canonicalHeaders.String(),
		signedHeadersStr,
		payloadHash,
	}, "\n")

	scope := dateStamp + "/" + s.region + "/s3/aws4_request"
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		sha256hex([]byte(canonicalRequest)),
	}, "\n")

	signingKey := s.signingKey(dateStamp)
	signature := hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))
	authorization := fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.accessKey, scope, signedHeadersStr, signature)

	req, err := http.NewRequestWithContext(ctx, method, s.endpoint+canonicalURI, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authorization)
	req.Header.Set("x-amz-content-sha256", payloadHash)
	req.Header.Set("x-amz-date", amzDate)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return s.http.Do(req)
}

func (s *s3Client) signingKey(dateStamp string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+s.secretKey), []byte(dateStamp))
	kRegion := hmacSHA256(kDate, []byte(s.region))
	kService := hmacSHA256(kRegion, []byte("s3"))
	return hmacSHA256(kService, []byte("aws4_request"))
}

func sha256hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func hmacSHA256(key, data []byte) []byte {
	m := hmac.New(sha256.New, key)
	m.Write(data)
	return m.Sum(nil)
}
