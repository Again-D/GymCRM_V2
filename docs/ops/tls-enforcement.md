---
title: TLS Enforcement Policy
type: ops
status: active
date: 2026-05-08
related: NFR-012
---

# TLS Enforcement Policy

## Requirement

`NFR-012`: All client-server traffic must use HTTPS with TLS 1.2 or higher.

## Enforcement Boundary

TLS termination is handled at the **reverse proxy layer**, not the application server.

The Spring Boot application itself does not enforce HTTPS redirection. It serves plaintext HTTP
on the internal network. The reverse proxy (Nginx or equivalent) is responsible for:

1. Accepting HTTPS on port 443 with a valid certificate.
2. Enforcing TLS 1.2 as the minimum protocol version.
3. Redirecting plain HTTP (port 80) to HTTPS.
4. Forwarding requests to the application over HTTP on the internal network.

The application trusts the `X-Forwarded-Proto` header from the reverse proxy to identify
the original protocol when needed (e.g., redirect URL construction).

## Required Reverse Proxy Configuration

Minimum Nginx TLS configuration (adapt for other proxies):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # Enforce TLS 1.2+ (NFR-012)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # HSTS - instruct browsers to use HTTPS for 1 year
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass         http://app:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.example.com;
    return 301 https://$host$request_uri;
}
```

## Verification Checklist

Run the following checks before each staging and production deployment.

### Check 1: TLS version and cipher

```bash
# Should show TLS 1.2 or TLS 1.3
openssl s_client -connect your-domain.example.com:443 </dev/null 2>&1 | grep -E "Protocol|Cipher"
```

### Check 2: HTTP redirects to HTTPS

```bash
# Should return 301 and Location: https://...
curl -I http://your-domain.example.com/api/v1/health
```

### Check 3: TLS 1.0 and 1.1 are rejected

```bash
# Should fail with "handshake failure" or similar
openssl s_client -tls1 -connect your-domain.example.com:443 </dev/null 2>&1 | grep -E "handshake|alert"
openssl s_client -tls1_1 -connect your-domain.example.com:443 </dev/null 2>&1 | grep -E "handshake|alert"
```

### Check 4: HSTS header present

```bash
# Should include Strict-Transport-Security header
curl -sI https://your-domain.example.com/api/v1/health | grep -i strict-transport
```

## Application Layer Notes

The Spring Boot application (`SecurityConfig`) does not contain HTTPS enforcement at this time.
It relies entirely on the reverse proxy for TLS.

If the application must enforce HTTPS directly (e.g., no reverse proxy), add the following
to the security filter chain:

```java
http.requiresChannel(channel -> channel.anyRequest().requiresSecure());
```

This is not currently required because the reverse proxy handles TLS exclusively.

## Status

- [x] Policy decision documented: TLS enforced at reverse proxy layer
- [ ] Nginx config applied to staging environment
- [ ] Nginx config applied to production environment
- [ ] Verification checklist passed in staging
- [ ] Verification checklist passed in production
