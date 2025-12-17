# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released]

## [2.0.0] - 2025-12-17
### Changed
- Complete rebuild from Gatsby to Astro framework

### Added
- Automated Discogs inventory sync via GitHub Actions (daily)
- Stripe Checkout integration for direct payments ($5 flat rate shipping)
- Cloudflare Pages Functions for checkout and webhooks
- Automatic sold item removal when purchases complete
- New minimal/clean design with Tailwind CSS
- TypeScript throughout the codebase

### Removed
- Gatsby framework and related dependencies
- Manual MDX content management
- Discogs listing links (now sells directly via Stripe)

### TODO
- Migrate hosting from Netlify to Cloudflare Pages
- Move DNS to Cloudflare
- Set up Cloudflare KV for sold item tracking

## [1.0.2] - 2024-20-27
### Added
- this project originated from the following Gatsby project - https://github.com/LekoArts/gatsby-starter-portfolio-emilia

## [1.0.1] - 2024-10-17
### Added
- testing changes

## [1.0.0] - 2024-10-17
### Added
- Initial Setup
