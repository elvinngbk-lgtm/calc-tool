# calc-tool — Malaysia Home Loan Calculator

A phone-first home loan calculator. Lock any one of the four loan figures and it
solves for that one while you move the other three.

**Live site:** https://elvinngbk-lgtm.github.io/calc-tool/

## What it does

**What you're financing** — enter a property price; it adds the fixed 11%, plus
MRTA/MLTA and the valuation fee, and rounds the total up to the next whole
RM 1,000. That total becomes the loan amount. It also shows the proposed SPA
price (total ÷ 0.9, for a 90% margin of finance), likewise rounded up.

**Lock one, move three** — tap a padlock on Loan amount, Interest rate, Loan
tenure or Monthly instalment and that figure becomes the one the calculator
works out. The other three get an input, a slider and preset chips.

**Property they can afford** — works backwards from the loan amount: strips the
MRTA and valuation fee, divides out the 11%, and gives the raw property price.

Figures round to the nearest thousand for the headline (RM 316,952.70 reads as
`317k`) with the exact amount shown beside it. The amount boxes accept shorthand
— type `450k` or `1.2m`.

Maths is reducing balance on monthly rest, the way Malaysian banks quote a term
loan. Stamp duty and legal fees are not included; fold them into the valuation
line if you want them borrowed too.

## Repo layout

```
index.html     the built, self-contained site — this is what GitHub Pages serves
app/           React + TypeScript source
  src/App.tsx    the UI
  src/lib/loan.ts  the loan maths (solvers + formatting)
  src/index.css    design tokens, light and dark
```

`index.html` has every script and style inlined, so it needs no build step and
no server — open it straight from disk and it works.

## Publishing on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder:
`/ (root)` → Save. The site is live a minute or two later at the URL above.

## Rebuilding after a code change

```bash
cd app
pnpm install
pnpm exec parcel build index.html --dist-dir dist --no-source-maps
pnpm exec html-inline dist/index.html > ../index.html
```

Then commit the regenerated `../index.html`.

For live reload while editing, `cd app && pnpm dev`.

## Note

An estimate for planning, not a bank offer.
