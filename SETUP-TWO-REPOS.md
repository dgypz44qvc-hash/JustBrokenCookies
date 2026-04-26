# How to Set Up Both Versions on GitHub

You'll have two repos:
- **JustBrokenCookies** (your current repo) → the NEW 1950s version
- **JustBrokenCookies-Original** (new repo) → the original brutalist version

---

## STEP 1: Commit the new 1950s version (your current website folder)

Open Terminal, navigate to your website folder, and run:

```
cd /path/to/your/website/folder
rm -f .git/index.lock
git add about.html blog.html blog/post-01.html contact.html css/style.css index.html js/editor-refs.js js/main.js portfolio.html services.html
git commit -m "Rebuild: 1950s polished illustration theme with premium animations"
git push origin master
```

That's it — your existing JustBrokenCookies repo now has the new 1950s design.

---

## STEP 2: Create the original version repo on GitHub

1. Go to https://github.com/new
2. Name the repo: **JustBrokenCookies-Original**
3. Keep it Public or Private (your choice)
4. Do NOT check "Add a README" or any other option
5. Click "Create repository"
6. GitHub will show you a Quick Setup page — copy the repo URL (it will look like:
   `https://github.com/YOUR-USERNAME/JustBrokenCookies-Original.git`)

---

## STEP 3: Push the original version

I already copied the original files into your "jbc website" folder under `JustBrokenCookies-Original/`.

Open Terminal and run:

```
cd "/path/to/jbc website/JustBrokenCookies-Original"
git init
git add .
git commit -m "Original brutalist version of JustBrokenCookies website"
git remote add origin https://github.com/YOUR-USERNAME/JustBrokenCookies-Original.git
git push -u origin master
```

Replace YOUR-USERNAME with your actual GitHub username.

---

## STEP 4: Deploy on Netlify (if you want both live)

### For the 1950s version (already set up if you were using Netlify):
- Just push to your existing repo and Netlify will auto-deploy

### For the original version:
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub → select **JustBrokenCookies-Original**
4. Build settings: leave blank (it's a static site, no build needed)
5. Click Deploy

---

Done! You'll have both versions live and manageable separately.
