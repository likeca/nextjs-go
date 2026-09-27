// Package mail abstracts outbound email so transactional flows (OTP, password
// reset, email change) can be implemented now and given a real transport later
// (Phase 6). The default sender logs instead of sending, matching Django's
// fail_silently=True behaviour in development; SMTPSender delivers over SMTP.
package mail

import (
	"bytes"
	"context"
	"crypto/tls"
	"net"
	"net/smtp"
	"strconv"

	"go.uber.org/zap"
)

// Message is a single outbound email.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Sender delivers a message.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// LogSender is the default dev sender — it logs rather than delivering.
type LogSender struct {
	Logger *zap.Logger
}

func (s LogSender) Send(_ context.Context, msg Message) error {
	if s.Logger != nil {
		s.Logger.Info("email not sent (dev sender)",
			zap.String("to", msg.To),
			zap.String("subject", msg.Subject),
			zap.String("body", msg.Body),
		)
	}
	return nil
}

// SMTPSender delivers plain-text email over SMTP, mirroring Django's
// django.core.mail.backends.smtp.EmailBackend (EMAIL_HOST/PORT/USER/PASSWORD,
// EMAIL_USE_TLS/EMAIL_USE_SSL).
type SMTPSender struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	UseTLS   bool // STARTTLS upgrade after plain connect
	UseSSL   bool // implicit TLS from the first byte (SMTPS)
	Logger   *zap.Logger
}

// Send connects to the SMTP server, (optionally) upgrades to TLS, authenticates
// when credentials are set, and sends one message.
func (s SMTPSender) Send(ctx context.Context, msg Message) error {
	addr := net.JoinHostPort(s.Host, strconv.Itoa(s.Port))

	var (
		c   *smtp.Client
		err error
	)
	switch {
	case s.UseSSL:
		conn, terr := tls.Dial("tcp", addr, &tls.Config{ServerName: s.Host})
		if terr != nil {
			return terr
		}
		c, err = smtp.NewClient(conn, s.Host)
	case s.UseTLS:
		c, err = smtp.Dial(addr)
	default:
		c, err = smtp.Dial(addr)
	}
	if err != nil {
		return err
	}
	defer func() { _ = c.Quit() }()

	if s.UseTLS && !s.UseSSL {
		if err := c.StartTLS(&tls.Config{ServerName: s.Host}); err != nil {
			return err
		}
	}
	if s.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", s.Username, s.Password, s.Host)); err != nil {
			return err
		}
	}
	if err := c.Mail(s.From); err != nil {
		return err
	}
	if err := c.Rcpt(msg.To); err != nil {
		return err
	}
	wc, err := c.Data()
	if err != nil {
		return err
	}
	var buf bytes.Buffer
	buf.WriteString("From: " + s.From + "\r\n")
	buf.WriteString("To: " + msg.To + "\r\n")
	buf.WriteString("Subject: " + msg.Subject + "\r\n")
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(msg.Body)
	if _, err := wc.Write(buf.Bytes()); err != nil {
		_ = wc.Close()
		return err
	}
	if err := wc.Close(); err != nil {
		return err
	}
	return nil
}

var _ Sender = LogSender{}
var _ Sender = SMTPSender{}
