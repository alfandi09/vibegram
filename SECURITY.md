# Security Policy

## Supported Versions

Security fixes are provided for the latest published stable version of VibeGram. Older
versions may receive fixes when the issue is severe and the patch can be applied safely.

| Version | Supported |
| ------- | :-------: |
| 1.0.x   |    Yes    |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through GitHub Security Advisories:

https://github.com/alfandi09/vibegram/security/advisories/new

Do not open a public issue for security-sensitive reports. Include a clear description,
affected versions, reproduction steps, impact, and any suggested mitigation.

## Response Timeline

- Initial acknowledgement: within 72 hours.
- Triage update: within 7 days.
- Fix target: as soon as practical based on severity and release risk.

If a vulnerability is confirmed, maintainers will coordinate disclosure, patch release,
and advisory publication after users have a reasonable upgrade path.

## Security Expectations

- Secrets must be provided through environment variables.
- Webhook deployments should use HTTPS and a Telegram secret token.
- Public endpoints should use rate limiting and strict CORS where applicable.
- Dependencies should be audited before release.
