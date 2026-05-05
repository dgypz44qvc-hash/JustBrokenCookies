# JustBrokenCookies — Deployment Guide

## Your Website Files

Your website folder contains:

```
website/
  index.html          ← Home page
  about.html           ← About page
  services.html        ← Services page
  portfolio.html       ← Portfolio page
  blog.html            ← Blog listing page
  contact.html         ← Contact page with form
  css/
    style.css          ← All styling
  js/
    main.js            ← Navigation, animations, form handling
  blog/
    post-01.html       ← Sample blog post
  images/              ← Put your images here
```

---

## STEP 1: Set Up the Contact Form

The contact form uses **Formspree** (free for up to 50 submissions/month).

1. Go to **https://formspree.io** and create a free account
2. Click **"New Form"**, name it "JustBrokenCookies Contact"
3. Copy the form endpoint (looks like `https://formspree.io/f/xyzabc123`)
4. Open `contact.html` in a text editor
5. Find `action="https://formspree.io/f/YOUR_FORM_ID"` and replace `YOUR_FORM_ID` with your actual form ID

---

## STEP 2: Add the "Against" Font (Optional)

The website currently uses **Playfair Display** (Google Fonts) as a fallback. To use your custom "Against" font:

1. Create a `fonts/` folder inside your website folder
2. Place your Against font files inside (`Against-Regular.woff2` and/or `.woff`)
3. Open `css/style.css`
4. Find the commented-out `@font-face` block near the top and uncomment it
5. The site will now use Against for all display headings

---

## STEP 3: Add Your Real Content

Replace placeholder content:

- **Images**: Drop your photos into the `images/` folder. In the HTML files, replace `<div class="portfolio-placeholder">` blocks with `<img src="images/your-image.jpg" alt="description">`
- **Team Photos**: Same approach on `about.html`
- **Blog Posts**: Duplicate `blog/post-01.html` as a template for new posts. Update the links in `blog.html`
- **Social Links**: Search for `href="#"` across all HTML files and replace with your actual Instagram, LinkedIn, Vimeo, Behance, and TikTok URLs
- **Email**: Search for `hello@justbrokencookies.com` and replace with your actual email if different

---

## STEP 4: Deploy to Hosting

### Option A: Netlify (RECOMMENDED — Free, Easiest)

1. Go to **https://netlify.com** and sign up (free)
2. From the dashboard, click **"Add new site" → "Deploy manually"**
3. **Drag and drop your entire `website` folder** onto the upload area
4. Netlify gives you a live URL instantly (e.g., `random-name.netlify.app`)
5. To use your custom domain (`justbrokencookies.com`):
   - Go to **Site settings → Domain management → Add custom domain**
   - Follow Netlify's instructions to update your DNS records at your domain registrar
   - Netlify provides free SSL (HTTPS) automatically

**To update your site later**: Just drag and drop the folder again, or connect to GitHub for automatic deploys.

### Option B: GitHub Pages (Free, Developer-Friendly)

1. Create a GitHub account at **https://github.com**
2. Create a new repository named `justbrokencookies-website`
3. Upload all your website files to the repository
4. Go to **Settings → Pages**
5. Under "Source", select **"Deploy from a branch"** → choose `main` → `/ (root)`
6. Your site will be live at `yourusername.github.io/justbrokencookies-website`
7. To use a custom domain, add it in the "Custom domain" field and update your DNS

### Option C: Hostinger / GoDaddy / cPanel Hosting

1. Log into your hosting account's **File Manager** or connect via **FTP** (FileZilla)
2. Navigate to the `public_html` folder (this is your website root)
3. Upload ALL files and folders from your `website` folder into `public_html`
4. Make sure `index.html` is directly inside `public_html` (not inside a subfolder)
5. Your site should now be live at your domain

**FTP Upload (if using FileZilla):**
- Host: Your hosting provider's FTP address
- Username/Password: From your hosting account
- Navigate to `public_html` on the remote side
- Drag all files from your local `website` folder to the remote `public_html`

---

## STEP 5: Connect Your Domain

If you already own `justbrokencookies.com`:

1. Log into your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
2. Go to **DNS Settings**
3. Update the DNS records based on your hosting provider's instructions:
   - **Netlify**: Add a CNAME record pointing to your Netlify site URL
   - **GitHub Pages**: Add an A record pointing to GitHub's IPs (185.199.108-111.153)
   - **Traditional hosting**: Point nameservers to your hosting provider

If you don't own the domain yet, purchase it from Namecheap or Google Domains (typically around $10-15/year).

---

## Quick Customization Reference

| What to Change | Where to Find It |
|---|---|
| Colors | `css/style.css` — look for `:root` variables at the top |
| Font sizes | `css/style.css` — search for `font-size` |
| Email address | Search all HTML files for `hello@justbrokencookies.com` |
| Social media links | Search all HTML files for `href="#"` with `aria-label` |
| Page text/copy | Edit directly in each HTML file |
| Add new blog post | Duplicate `blog/post-01.html`, update content and links |
