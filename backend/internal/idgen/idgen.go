// Package idgen provides UUID generation. Django model PKs are UUIDField with a
// Python-side default (uuid.uuid4), so the database columns carry no DEFAULT —
// Go INSERTs must supply their own UUIDv4 values.
package idgen

import (
	"crypto/rand"
	"fmt"
)

// NewUUID returns a random (v4) UUID string, matching django uuid.uuid4 output.
func NewUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
